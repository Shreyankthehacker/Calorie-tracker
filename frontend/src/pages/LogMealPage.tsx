import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { extractNutrition, isAiImageOversized, isSupportedAiImage } from '../api/ai';
import { lookupBarcode } from '../api/barcode';
import { createFoodEntry } from '../api/food-entries';
import { toUserMessage } from '../api/errors';
import type { FoodEntry } from '../api/types';
import { BarcodeLookup } from '../components/meals/BarcodeLookup';
import { FoodCatalog } from '../components/meals/FoodCatalog';
import { MealForm } from '../components/meals/MealForm';
import { sanitizeFoodName } from '../lib/food-name';
import { nutritionToDraftEntry } from '../lib/meal-draft';

type LogMethod = 'search' | 'photo' | 'barcode' | 'pdf';

const METHODS: Array<{ id: LogMethod; label: string; hint: string }> = [
  { id: 'search', label: 'Search', hint: 'Catalog and manual entry' },
  { id: 'photo', label: 'Photo', hint: 'Estimate from a plate photo' },
  { id: 'barcode', label: 'Barcode', hint: 'Look up a packaged product' },
  { id: 'pdf', label: 'PDF', hint: 'Import a food diary' },
];

export function LogMealPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [method, setMethod] = useState<LogMethod>('search');
  const [formError, setFormError] = useState<string | null>(null);
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
      await queryClient.invalidateQueries({ queryKey: ['food-entries'] });
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      navigate('/meals');
    },
    onError: (err: unknown) => {
      setFormError(toUserMessage(err, 'Could not add meal.'));
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
      setImageError(toUserMessage(err, 'Could not analyze this image.'));
    },
  });

  const barcodeMutation = useMutation({
    mutationFn: lookupBarcode,
    onSuccess: (product) => {
      applySeed(
        nutritionToDraftEntry({
          foodName: sanitizeFoodName(product.brand ? `${product.name} (${product.brand})` : product.name),
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
      setBarcodeError(toUserMessage(err, 'Could not look up that barcode.'));
    },
  });

  function applySeed(entry: FoodEntry) {
    setFormSeed(entry);
    setFormEpoch((value) => value + 1);
    document.getElementById('manual-entry')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  useEffect(() => {
    const incoming = (location.state as { portionDraft?: FoodEntry } | null)?.portionDraft;
    if (!incoming) {
      return;
    }
    applySeed(incoming);
    setMethod('search');
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

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

  const showForm = method === 'search' || Boolean(formSeed);

  return (
    <div className="page-log-meal">
      <div className="main-inner">
        <div className="kicker">Log a meal</div>
        <h1 className="page-title">Log food intake</h1>

        <div className="log-method-tabs" role="tablist" aria-label="How to log this meal">
          {METHODS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={method === item.id}
              className={`log-method-tab${method === item.id ? ' is-active' : ''}`}
              onClick={() => setMethod(item.id)}
            >
              <span className="t">{item.label}</span>
              <span className="s">{item.hint}</span>
            </button>
          ))}
        </div>

        {method === 'search' ? (
          <FoodCatalog
            onLogged={async () => {
              await queryClient.invalidateQueries({ queryKey: ['food-entries'] });
              await queryClient.invalidateQueries({ queryKey: ['reports'] });
            }}
          />
        ) : null}

        {method === 'photo' ? (
          <div className="scan-card" id="log-from-image">
            <div className="viewfinder">
              {imagePreview ? (
                <img src={imagePreview} alt="Selected meal photo" />
              ) : (
                <div className="viewfinder-idle">
                  <span>Photo preview</span>
                  <small>Choose a plate photo to analyze. This is not a live camera.</small>
                </div>
              )}
              <div className="frame">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="scan-copy">
              <div className="t">Estimate nutrition from a photo</div>
              <div className="s">
                Sage estimates calories and macros from a still image. Review the values in the form before saving.
              </div>
              <button type="button" className="btn-outline" onClick={() => imageInputRef.current?.click()}>
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
        ) : null}

        {method === 'barcode' ? (
          <div className="side-card" id="log-from-barcode">
            <BarcodeLookup
              id="log-barcode"
              value={barcode}
              pending={barcodeMutation.isPending}
              error={barcodeError}
              onChange={setBarcode}
              onLookup={(value) => barcodeMutation.mutate(value)}
              inputRef={barcodeInputRef}
            />
          </div>
        ) : null}

        {method === 'pdf' ? (
          <div className="side-card">
            <div className="who">Bulk logging</div>
            <p>PDF food diaries are imported on the Bulk logging page, with a review step before anything is saved.</p>
            <Link className="btn-outline" to="/import">
              Open bulk logging
            </Link>
          </div>
        ) : null}

        {showForm ? (
          <div id="manual-entry">
            <h2>{formSeed ? 'Review and save' : 'Manual entry'}</h2>
            <div className="panel">
              <MealForm
                key={formEpoch}
                {...(formSeed ? { initial: formSeed } : {})}
                submitting={createMutation.isPending}
                error={formError}
                submitLabel="Commit meal entry"
                onCancel={() => navigate('/meals')}
                onSubmit={(payload) => {
                  createMutation.mutate({
                    ...payload,
                    foodName: sanitizeFoodName(payload.foodName),
                  });
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
