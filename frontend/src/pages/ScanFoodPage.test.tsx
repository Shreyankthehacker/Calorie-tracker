import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { ScanFoodPage } from './ScanFoodPage';
import { renderWithProviders } from '../test/render';
import { ApiError, type BarcodeProduct, type NutritionExtraction } from '../api/types';
import * as aiApi from '../api/ai';
import * as barcodeApi from '../api/barcode';
import * as foodEntriesApi from '../api/food-entries';
import * as authApi from '../api/auth';
import { tokenStorage } from '../api/tokenStorage';

vi.mock('../api/ai', async () => {
  const actual = await vi.importActual<typeof import('../api/ai')>('../api/ai');
  return {
    ...actual,
    extractNutrition: vi.fn(),
  };
});
vi.mock('../api/barcode', () => ({
  lookupBarcode: vi.fn(),
}));
vi.mock('../api/food-entries');
vi.mock('../api/auth', async () => {
  const actual = await vi.importActual<typeof import('../api/auth')>('../api/auth');
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  };
});

const user = {
  id: 'u1',
  email: 'ada@example.com',
  timezone: 'UTC',
  familyId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const barcodeProduct: BarcodeProduct = {
  barcode: '3017620422003',
  name: 'Nutella',
  brand: 'Ferrero',
  quantity: 100,
  quantityUnit: 'g',
  calories: 539,
  protein: 6.3,
  carbs: 57.5,
  fat: 30.9,
  micronutrients: [],
  imageUrl: null,
  source: 'open_food_facts',
};

const extraction: NutritionExtraction = {
  foodName: 'Chicken rice bowl',
  quantity: 1,
  quantityUnit: 'serving',
  calories: 620,
  protein: 42,
  carbs: 65,
  fat: 18,
  micronutrients: [{ nutrientKey: 'iron', amount: 3.2, unit: 'mg' }],
  confidence: 0.87,
  notes: 'Estimated from visible nutrition information.',
  source: 'label',
  mealType: null,
};

function jpegFile(name = 'food.jpg') {
  return new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], name, { type: 'image/jpeg' });
}

function renderScan() {
  return renderWithProviders(
    <Routes>
      <Route path="/scan" element={<ScanFoodPage />} />
      <Route path="/meals" element={<p>Meals list</p>} />
    </Routes>,
    { route: '/scan' },
  );
}

describe('ScanFoodPage', () => {
  beforeEach(() => {
    tokenStorage.setTokens('access', 'refresh');
    vi.clearAllMocks();
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(user);
  });

  it('shows the initial upload UI', async () => {
    renderScan();
    expect(await screen.findByRole('heading', { name: 'Scan Food' })).toBeInTheDocument();
    expect(screen.getByLabelText(/upload image/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyze nutrition/i })).toBeInTheDocument();
  });

  it('rejects an unsupported file without calling the API', async () => {
    renderScan();
    const gif = new File(['gif'], 'food.gif', { type: 'image/gif' });
    fireEvent.change(screen.getByLabelText(/upload image/i), { target: { files: [gif] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/unsupported image type/i);
    expect(aiApi.extractNutrition).not.toHaveBeenCalled();
  });

  it('rejects an oversized file without calling the API', async () => {
    const userEvt = userEvent.setup();
    renderScan();
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'huge.jpg', { type: 'image/jpeg' });
    await userEvt.upload(screen.getByLabelText(/upload image/i), big);
    expect(await screen.findByRole('alert')).toHaveTextContent(/too large/i);
    expect(aiApi.extractNutrition).not.toHaveBeenCalled();
  });

  it('uploads a valid image for extraction', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(aiApi.extractNutrition).mockResolvedValue(extraction);
    renderScan();
    await userEvt.upload(screen.getByLabelText(/upload image/i), jpegFile());
    await userEvt.click(screen.getByRole('button', { name: /analyze nutrition/i }));
    await waitFor(() => {
      expect(aiApi.extractNutrition).toHaveBeenCalledTimes(1);
    });
  });

  it('shows a loading state while analyzing', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(aiApi.extractNutrition).mockImplementation(() => new Promise(() => undefined));
    renderScan();
    await userEvt.upload(screen.getByLabelText(/upload image/i), jpegFile());
    await userEvt.click(screen.getByRole('button', { name: /analyze nutrition/i }));
    expect(await screen.findByRole('status')).toHaveTextContent(/processing/i);
    expect(screen.getByRole('button', { name: /analyzing nutrition/i })).toBeDisabled();
  });

  it('displays extracted values after a successful extraction', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(aiApi.extractNutrition).mockResolvedValue(extraction);
    renderScan();
    await userEvt.upload(screen.getByLabelText(/upload image/i), jpegFile());
    await userEvt.click(screen.getByRole('button', { name: /analyze nutrition/i }));
    expect(await screen.findByRole('heading', { name: /extracted nutrition/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Chicken rice bowl')).toBeInTheDocument();
    expect(screen.getByDisplayValue('620')).toBeInTheDocument();
    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
    expect(screen.getByDisplayValue('iron')).toBeInTheDocument();
    expect(screen.getByText(/values extracted from visible label/i)).toBeInTheDocument();
  });

  it('lets the user edit extracted values', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(aiApi.extractNutrition).mockResolvedValue(extraction);
    renderScan();
    await userEvt.upload(screen.getByLabelText(/upload image/i), jpegFile());
    await userEvt.click(screen.getByRole('button', { name: /analyze nutrition/i }));
    const food = await screen.findByLabelText(/^food$/i);
    await userEvt.clear(food);
    await userEvt.type(food, 'Edited bowl');
    expect(screen.getByDisplayValue('Edited bowl')).toBeInTheDocument();
  });

  it('lets the user select meal type', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(aiApi.extractNutrition).mockResolvedValue(extraction);
    renderScan();
    await userEvt.upload(screen.getByLabelText(/upload image/i), jpegFile());
    await userEvt.click(screen.getByRole('button', { name: /analyze nutrition/i }));
    await screen.findByLabelText(/^meal$/i);
    await userEvt.click(screen.getByLabelText(/^meal$/i));
    await userEvt.click(screen.getByRole('option', { name: 'Dinner' }));
    expect(screen.getByLabelText(/^meal$/i)).toHaveTextContent('Dinner');
  });

  it('lets the user set consumedAt', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(aiApi.extractNutrition).mockResolvedValue(extraction);
    renderScan();
    await userEvt.upload(screen.getByLabelText(/upload image/i), jpegFile());
    await userEvt.click(screen.getByRole('button', { name: /analyze nutrition/i }));
    const consumed = await screen.findByLabelText(/consumed at/i);
    await userEvt.clear(consumed);
    await userEvt.type(consumed, '2026-09-13T12:30');
    expect((consumed as HTMLInputElement).value).toBe('2026-09-13T12:30');
  });

  it('creates a FoodEntry through the normal FoodEntry API on confirm', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(aiApi.extractNutrition).mockResolvedValue(extraction);
    vi.mocked(foodEntriesApi.createFoodEntry).mockResolvedValue({
      id: 'e1',
      mealType: 'DINNER',
      foodName: 'Chicken rice bowl',
      quantity: 1,
      quantityUnit: 'serving',
      calories: 620,
      protein: 42,
      carbs: 65,
      fat: 18,
      consumedAt: '2026-09-13T12:30:00.000Z',
      createdAt: '2026-09-13T12:31:00.000Z',
      updatedAt: '2026-09-13T12:31:00.000Z',
      micronutrients: extraction.micronutrients,
    });
    renderScan();
    await userEvt.upload(screen.getByLabelText(/upload image/i), jpegFile());
    await userEvt.click(screen.getByRole('button', { name: /analyze nutrition/i }));
    await userEvt.click(await screen.findByLabelText(/^meal$/i));
    await userEvt.click(screen.getByRole('option', { name: 'Dinner' }));
    await userEvt.click(screen.getByRole('button', { name: /use this information/i }));
    await waitFor(() => {
      expect(foodEntriesApi.createFoodEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          foodName: 'Chicken rice bowl',
          calories: 620,
          mealType: 'DINNER',
        }),
        expect.anything(),
      );
    });
    expect(await screen.findByText('Meals list')).toBeInTheDocument();
  });

  it('shows an extraction failure', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(aiApi.extractNutrition).mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Unsupported image type'),
    );
    renderScan();
    await userEvt.upload(screen.getByLabelText(/upload image/i), jpegFile());
    await userEvt.click(screen.getByRole('button', { name: /analyze nutrition/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/unsupported image type/i);
    expect(foodEntriesApi.createFoodEntry).not.toHaveBeenCalled();
  });

  it('displays a provider error', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(aiApi.extractNutrition).mockRejectedValue(
      new ApiError(502, 'AI_PROVIDER_ERROR', 'AI extraction failed'),
    );
    renderScan();
    await userEvt.upload(screen.getByLabelText(/upload image/i), jpegFile());
    await userEvt.click(screen.getByRole('button', { name: /analyze nutrition/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/ai extraction failed/i);
  });

  it('cancels without creating a FoodEntry', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(aiApi.extractNutrition).mockResolvedValue(extraction);
    renderScan();
    await userEvt.upload(screen.getByLabelText(/upload image/i), jpegFile());
    await userEvt.click(screen.getByRole('button', { name: /analyze nutrition/i }));
    await userEvt.click(await screen.findByRole('button', { name: /cancel/i }));
    expect(foodEntriesApi.createFoodEntry).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /analyze nutrition/i })).toBeInTheDocument();
  });

  it('looks up a barcode and fills the shared meal form', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(barcodeApi.lookupBarcode).mockResolvedValue(barcodeProduct);
    renderScan();
    await userEvt.type(screen.getByLabelText(/^barcode$/i), '3017620422003');
    await userEvt.click(screen.getByRole('button', { name: /look up barcode/i }));
    expect(await screen.findByRole('heading', { name: /product nutrition/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Nutella')).toBeInTheDocument();
    expect(screen.getByDisplayValue('539')).toBeInTheDocument();
    expect(aiApi.extractNutrition).not.toHaveBeenCalled();
    expect(foodEntriesApi.createFoodEntry).not.toHaveBeenCalled();
  });

  it('does not automatically save after extraction', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(aiApi.extractNutrition).mockResolvedValue(extraction);
    renderScan();
    await userEvt.upload(screen.getByLabelText(/upload image/i), jpegFile());
    await userEvt.click(screen.getByRole('button', { name: /analyze nutrition/i }));
    await screen.findByRole('heading', { name: /extracted nutrition/i });
    expect(foodEntriesApi.createFoodEntry).not.toHaveBeenCalled();
  });
});
