import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { ImportPdfPage } from './ImportPdfPage';
import { renderWithProviders } from '../test/render';
import { ApiError, type PdfPreviewResponse } from '../api/types';
import * as pdfApi from '../api/pdf-import';
import * as authApi from '../api/auth';
import { tokenStorage } from '../api/tokenStorage';

vi.mock('../api/pdf-import', async () => {
  const actual = await vi.importActual<typeof import('../api/pdf-import')>('../api/pdf-import');
  return {
    ...actual,
    previewFoodDiary: vi.fn(),
    confirmFoodDiary: vi.fn(),
  };
});
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const preview: PdfPreviewResponse = {
  filename: 'diary.pdf',
  pageCount: 1,
  warnings: [{ code: 'NOTE', message: 'Review quantities before importing.' }],
  records: [
    {
      id: 'preview-1',
      foodName: 'Oatmeal',
      quantity: 1,
      quantityUnit: 'bowl',
      mealType: 'BREAKFAST',
      consumedAt: '2026-09-13T08:00:00.000Z',
      calories: 320,
      protein: 12,
      carbs: 52,
      fat: 8,
      micronutrients: [],
      status: 'valid',
      confidence: 0.9,
      issues: [],
      layout: 'table',
      duplicate: false,
    },
    {
      id: 'preview-2',
      foodName: 'Mystery stew',
      quantity: 1,
      quantityUnit: 'serving',
      mealType: 'LUNCH',
      consumedAt: '2026-09-13T12:00:00.000Z',
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      micronutrients: [],
      status: 'warning',
      confidence: 0.55,
      issues: ['Could not determine calories for this item.'],
      layout: 'line',
      duplicate: false,
    },
  ],
};

function pdfFile() {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], 'diary.pdf', { type: 'application/pdf' });
}

function renderImport() {
  return renderWithProviders(
    <Routes>
      <Route path="/import" element={<ImportPdfPage />} />
      <Route path="/meals" element={<p>Meals list</p>} />
    </Routes>,
    { route: '/import' },
  );
}

describe('ImportPdfPage', () => {
  beforeEach(() => {
    tokenStorage.setTokens('access', 'refresh');
    vi.clearAllMocks();
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(user);
  });

  it('shows the idle upload state', async () => {
    renderImport();
    expect(await screen.findByRole('heading', { name: 'Import PDF' })).toBeInTheDocument();
    expect(screen.getByText(/no file selected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /parse pdf/i })).toBeDisabled();
  });

  it('rejects an unsupported file without calling the API', async () => {
    renderImport();
    const input = await screen.findByLabelText(/pdf file/i);
    const unsupported = new File(['x'], 'notes.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [unsupported] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/unsupported file type/i);
    expect(pdfApi.previewFoodDiary).not.toHaveBeenCalled();
  });

  it('shows a parsing state while uploading', async () => {
    vi.mocked(pdfApi.previewFoodDiary).mockImplementation(() => new Promise(() => undefined));
    renderImport();
    await userEvent.upload(await screen.findByLabelText(/pdf file/i), pdfFile());
    await userEvent.click(screen.getByRole('button', { name: /parse pdf/i }));
    expect(await screen.findByRole('status')).toHaveTextContent(/parsing pdf/i);
  });

  it('renders preview records, warnings, and confidence', async () => {
    vi.mocked(pdfApi.previewFoodDiary).mockResolvedValue(preview);
    renderImport();
    await userEvent.upload(await screen.findByLabelText(/pdf file/i), pdfFile());
    await userEvent.click(screen.getByRole('button', { name: /parse pdf/i }));
    expect(await screen.findByDisplayValue('Oatmeal')).toBeInTheDocument();
    expect(screen.getByText(/review quantities/i)).toBeInTheDocument();
    expect(screen.getByText(/parsed confidently/i)).toBeInTheDocument();
    expect(screen.getByText(/could not determine calories/i)).toBeInTheDocument();
    expect(screen.getByText(/1 meal will be imported/i)).toBeInTheDocument();
  });

  it('can edit and remove records before confirm', async () => {
    vi.mocked(pdfApi.previewFoodDiary).mockResolvedValue(preview);
    renderImport();
    await userEvent.upload(await screen.findByLabelText(/pdf file/i), pdfFile());
    await userEvent.click(screen.getByRole('button', { name: /parse pdf/i }));
    const food = await screen.findByDisplayValue('Oatmeal');
    await userEvent.clear(food);
    await userEvent.type(food, 'Steel-cut oats');
    await userEvent.click(screen.getAllByRole('button', { name: /remove/i })[1]!);
    expect(screen.queryByDisplayValue('Mystery stew')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Steel-cut oats')).toBeInTheDocument();
  });

  it('shows an API error', async () => {
    vi.mocked(pdfApi.previewFoodDiary).mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'The PDF could not be read. Upload a valid text-based PDF.'),
    );
    renderImport();
    await userEvent.upload(await screen.findByLabelText(/pdf file/i), pdfFile());
    await userEvent.click(screen.getByRole('button', { name: /parse pdf/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be read/i);
  });

  it('shows an empty PDF state', async () => {
    vi.mocked(pdfApi.previewFoodDiary).mockResolvedValue({
      filename: 'blank.pdf',
      pageCount: 1,
      records: [],
      warnings: [{ code: 'NO_TEXT', message: 'Unable to extract text from this PDF. Scanned/image-only PDFs are not supported.' }],
    });
    renderImport();
    await userEvent.upload(await screen.findByLabelText(/pdf file/i), pdfFile());
    await userEvent.click(screen.getByRole('button', { name: /parse pdf/i }));
    expect(await screen.findByText(/no meals found/i)).toBeInTheDocument();
    expect(screen.getByText(/scanned\/image-only/i)).toBeInTheDocument();
  });

  it('rejects an oversized PDF without calling the API', async () => {
    const oversized = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], 'huge.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(oversized, 'size', { value: 5 * 1024 * 1024 + 1 });
    renderImport();
    const input = await screen.findByLabelText(/pdf file/i);
    await userEvent.upload(input, oversized);
    expect(await screen.findByRole('alert')).toHaveTextContent(/5MB/i);
    expect(pdfApi.previewFoodDiary).not.toHaveBeenCalled();
  });

  it('shows a confirmation failure', async () => {
    vi.mocked(pdfApi.previewFoodDiary).mockResolvedValue(preview);
    vi.mocked(pdfApi.confirmFoodDiary).mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Invalid request'),
    );
    renderImport();
    await userEvent.upload(await screen.findByLabelText(/pdf file/i), pdfFile());
    await userEvent.click(screen.getByRole('button', { name: /parse pdf/i }));
    await userEvent.click(await screen.findByRole('button', { name: /import meals/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid request/i);
  });

  it('confirms complete records and shows success', async () => {
    vi.mocked(pdfApi.previewFoodDiary).mockResolvedValue(preview);
    vi.mocked(pdfApi.confirmFoodDiary).mockResolvedValue({
      importedCount: 1,
      foodEntries: [],
    });
    renderImport();
    await userEvent.upload(await screen.findByLabelText(/pdf file/i), pdfFile());
    await userEvent.click(screen.getByRole('button', { name: /parse pdf/i }));
    await userEvent.click(await screen.findByRole('button', { name: /import meals/i }));
    await waitFor(() => {
      expect(pdfApi.confirmFoodDiary).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            foodName: 'Oatmeal',
            calories: 320,
            mealType: 'BREAKFAST',
          }),
        ],
        expect.anything(),
      );
    });
    expect(await screen.findByText(/1 meal imported successfully/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view meals/i })).toBeInTheDocument();
  });
});
