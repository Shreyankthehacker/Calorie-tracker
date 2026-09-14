import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ChangeEvent } from 'react';
import { extractNutrition, isAiImageOversized, isSupportedAiImage } from '../api/ai';
import { lookupBarcode } from '../api/barcode';
import { createFoodEntry } from '../api/food-entries';
import { ApiError, type FoodEntry, type FoodEntryWritePayload } from '../api/types';
import { FoodCatalog } from '../components/meals/FoodCatalog';
import { MealForm } from '../components/meals/MealForm';
import { nutritionToDraftEntry } from '../lib/meal-draft';

export function LogMealPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [draft, setDraft] = useState<FoodEntryWritePayload | null>(null);
  const [formSeed, setFormSeed] = useState<FoodEntry | undefined>();
  const [formEpoch, setFormEpoch] = useState(0);
  const [imageName, setImageName] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [barcode, setBarcode] = useState('');
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createFoodEntry,
    onSuccess: async () => {
      setFormError(null);
      setDraft(null);
      await queryClient.invalidateQueries({ queryKey: ['food-entries'] });
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      navigate('/meals');
    },
    onError: (err: unknown) => {
      setFormError(err instanceof ApiError ? err.message : 'Could not add meal.');
    },
  });

  const extractMutation = useMutation({
    mutationFn: extractNutrition,
    onSuccess: (extraction) => {
      applySeed(
        nutritionToDraftEntry({
          foodName: extraction.foodName,
          quantity: extraction.quantity,
          quantityUnit: extraction.quantityUnit,
          calories: extraction.calories,
          protein: extraction.protein,
          carbs: extraction.carbs,
          fat: extraction.fat,
          micronutrients: extraction.micronutrients,
          mealType: extraction.mealType,
        }),
      );
      setImageError(null);
    },
    onError: (err: unknown) => {
      setImageError(err instanceof ApiError ? err.message : 'Could not analyze this image.');
    },
  });

  const barcodeMutation = useMutation({
    mutationFn: lookupBarcode,
    onSuccess: (product) => {
      applySeed(
        nutritionToDraftEntry({
          foodName: product.brand ? `${product.name} (${product.brand})` : product.name,
          quantity: product.quantity,
          quantityUnit: product.quantityUnit,
          calories: product.calories,
          protein: product.protein,
          carbs: product.carbs,
          fat: product.fat,
          micronutrients: product.micronutrients,
        }),
      );
      setBarcodeError(null);
    },
    onError: (err: unknown) => {
      setBarcodeError(err instanceof ApiError ? err.message : 'Could not look up that barcode.');
    },
  });

  function applySeed(entry: FoodEntry) {
    setFormSeed(entry);
    setFormEpoch((value) => value + 1);
    setDraft({
      mealType: entry.mealType,
      foodName: entry.foodName,
      quantity: entry.quantity,
      quantityUnit: entry.quantityUnit,
      calories: entry.calories,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
      consumedAt: entry.consumedAt,
      micronutrients: entry.micronutrients,
    });
    document.getElementById('manual-entry')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImageError(null);
    extractMutation.reset();
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (!file) {
      setImageName(null);
      return;
    }
    if (!isSupportedAiImage(file)) {
      setImageName(null);
      setImageError('Unsupported image type. Choose a JPEG, PNG, or WebP file.');
      return;
    }
    if (isAiImageOversized(file)) {
      setImageName(null);
      setImageError('Image is too large. Maximum size is 5MB.');
      return;
    }
    setImageName(file.name);
    setImagePreview(URL.createObjectURL(file));
    extractMutation.mutate(file);
  }

  function focusCatalogSearch() {
    const input = document.querySelector<HTMLInputElement>('.page-log-meal input.search');
    input?.focus();
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div className="page-log-meal">
      <div className="main-inner">
        <div className="kicker">
          Split workspace
        </div>
        <h1 className="page-title">Log food intake</h1>

        <div className="log-ways" aria-label="Ways to log food">
          <button type="button" className="tool-card" onClick={focusCatalogSearch}>
            <div className="ic" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M10 10 13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
            <div className="t">Search or type</div>
            <div className="s">Catalog search and manual nutrition entry.</div>
          </button>
          <button
            type="button"
            className="tool-card"
            onClick={() => {
              document.getElementById('log-from-image')?.scrollIntoView({ behavior: 'smooth' });
              imageInputRef.current?.click();
            }}
          >
            <div className="ic" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M2.5 11 6 7.5l2.5 2.5 2-2 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="t">Upload image</div>
            <div className="s">Photo of a plate — Sage estimates the meal.</div>
          </button>
          <Link className="tool-card" to="/import">
            <div className="ic" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 2.5h5.5L12.5 6v7.5H4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M9.5 2.5V6h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="t">Upload PDF</div>
            <div className="s">Parse a nutrition or food diary PDF.</div>
          </Link>
          <button
            type="button"
            className="tool-card"
            onClick={() => {
              document.getElementById('log-from-barcode')?.scrollIntoView({ behavior: 'smooth' });
              barcodeInputRef.current?.focus();
            }}
          >
            <div className="ic" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2.5 3v10M5 3v10M6.6 3v10M9 3v10M10.6 3v10M13.5 3v10" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </div>
            <div className="t">Barcode</div>
            <div className="s">Look up a packaged product by barcode.</div>
          </button>
        </div>

        <FoodCatalog
          onLogged={async () => {
            await queryClient.invalidateQueries({ queryKey: ['food-entries'] });
            await queryClient.invalidateQueries({ queryKey: ['reports'] });
          }}
        />

        <div className="grid">
          <div>
            <h2 id="manual-entry">Manual entry specifics</h2>
            <div className="panel">
              <MealForm
                key={formEpoch}
                {...(formSeed ? { initial: formSeed } : {})}
                submitting={createMutation.isPending}
                error={formError}
                submitLabel="Commit meal entry"
                onDraftChange={setDraft}
                onCancel={() => navigate('/meals')}
                onSubmit={(payload) => {
                  setDraft(payload);
                  createMutation.mutate(payload);
                }}
              >
              <div className="scan-card" id="log-from-image">
                <div className="viewfinder">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Selected meal photo" />
                  ) : (
                    <div className="viewfinder-idle" />
                  )}
                  <div className="scanline" />
                  <div className="frame">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
                <div className="scan-copy">
                  <div className="t">Analyze with a food photo instead</div>
                  <div className="s">
                    Point your camera at the plate — Sage estimates calories and macros from the image in seconds. For
                    packaged food, look up a barcode here or try{' '}
                    <Link to="/scan">barcode &amp; label scanning</Link>.
                  </div>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    Choose image
                  </button>
                  <input
                    ref={imageInputRef}
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                  />
                  {imageName ? <p className="s">{imageName}</p> : null}
                  {extractMutation.isPending ? (
                    <p className="s" role="status">
                      Analyzing meal photo…
                    </p>
                  ) : null}
                  {imageError ? (
                    <p className="s" role="alert">
                      {imageError}
                    </p>
                  ) : null}
                </div>
              </div>
              </MealForm>
            </div>
          </div>
          <div>
            <h2>This meal tray</h2>
            <div className="tray">
              <div className="tray-row">
                <span>Calories</span>
                <b>{draft?.calories ?? 0} kcal</b>
              </div>
              <div className="tray-row">
                <span>Protein</span>
                <b>{draft?.protein ?? 0}g</b>
              </div>
              <div className="tray-row">
                <span>Carbohydrates</span>
                <b>{draft?.carbs ?? 0}g</b>
              </div>
              <div className="tray-row">
                <span>Fat</span>
                <b>{draft?.fat ?? 0}g</b>
              </div>
            </div>
            <div className="side-card" id="log-from-barcode">
              <div className="who">Barcode lookup</div>
              <p>Packaged products use a barcode lookup, not the meal-photo vision flow.</p>
              <div className="field">
                <span className="field-label">Barcode</span>
                <div className="barcode-lookup">
                  <input
                    ref={barcodeInputRef}
                    id="log-barcode"
                    aria-label="Barcode"
                    value={barcode}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="e.g. 3017620422003"
                    onChange={(event) => setBarcode(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        barcodeMutation.mutate(barcode.trim());
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={barcodeMutation.isPending || barcode.trim().length < 6}
                    onClick={() => barcodeMutation.mutate(barcode.trim())}
                  >
                    {barcodeMutation.isPending ? 'Looking up…' : 'Look up'}
                  </button>
                </div>
              </div>
              {barcodeError ? (
                <p className="error-text" role="alert">
                  {barcodeError}
                </p>
              ) : null}
            </div>
            <div className="side-card">
              <div className="who">Log from PDF</div>
              <p>Upload a nutrition label sheet or food diary. The existing PDF parser reviews rows before they are saved.</p>
              <Link className="btn-outline" to="/import">
                Upload PDF
              </Link>
            </div>
            <div className="side-card">
              <div className="who">🐾 Sage help</div>
              <p>
                &quot;If you&apos;re logging a meal, commit below to update the ledger. Want the exact portion for your
                goal? Try the <Link className="link-accent" to="/portions">portion calculator</Link>.&quot;
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
