import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { extractNutrition, isAiImageOversized, isSupportedAiImage } from '../api/ai';
import { lookupBarcode } from '../api/barcode';
import { createFoodEntry } from '../api/food-entries';
import { ApiError, type FoodEntryWritePayload, type NutritionExtraction } from '../api/types';
import { MealForm } from '../components/meals/MealForm';
import { nutritionToDraftEntry } from '../lib/meal-draft';

function sourceMessage(source: NutritionExtraction['source']): string {
  if (source === 'label') {
    return 'Values extracted from visible label.';
  }
  if (source === 'photo_estimate') {
    return 'Nutrition values are estimated from the image.';
  }
  return 'AI estimate — please review before saving.';
}

export function ScanFoodPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [barcode, setBarcode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<NutritionExtraction | null>(null);
  const [productDraft, setProductDraft] = useState<ReturnType<typeof nutritionToDraftEntry> | null>(null);
  const [productMeta, setProductMeta] = useState<{ brand: string | null; barcode: string } | null>(null);

  const previewUrl = useMemo(() => {
    if (!file || typeof URL.createObjectURL !== 'function') {
      return null;
    }
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const extractMutation = useMutation({
    mutationFn: extractNutrition,
    onSuccess: (result) => {
      setExtraction(result);
      setProductDraft(null);
      setProductMeta(null);
      setLocalError(null);
    },
    onError: (err: unknown) => {
      setExtraction(null);
      setLocalError(err instanceof ApiError ? err.message : 'Could not analyze this image.');
    },
  });

  const barcodeMutation = useMutation({
    mutationFn: lookupBarcode,
    onSuccess: (product) => {
      setExtraction(null);
      setProductDraft(
        nutritionToDraftEntry({
          foodName: product.name,
          quantity: product.quantity,
          quantityUnit: product.quantityUnit,
          calories: product.calories,
          protein: product.protein,
          carbs: product.carbs,
          fat: product.fat,
          micronutrients: product.micronutrients,
        }),
      );
      setProductMeta({ brand: product.brand, barcode: product.barcode });
      setLocalError(null);
    },
    onError: (err: unknown) => {
      setProductDraft(null);
      setProductMeta(null);
      setLocalError(err instanceof ApiError ? err.message : 'Could not look up that barcode.');
    },
  });

  const saveMutation = useMutation({
    mutationFn: createFoodEntry,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['food-entries'] }),
        queryClient.invalidateQueries({ queryKey: ['reports'] }),
      ]);
      navigate('/meals');
    },
  });

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setExtraction(null);
    setProductDraft(null);
    setProductMeta(null);
    setLocalError(null);
    extractMutation.reset();
    barcodeMutation.reset();
    if (!next) {
      setFile(null);
      return;
    }
    if (!isSupportedAiImage(next)) {
      setFile(null);
      setLocalError('Unsupported image type. Choose a JPEG, PNG, or WebP file.');
      return;
    }
    if (isAiImageOversized(next)) {
      setFile(null);
      setLocalError('Image is too large. Maximum size is 5MB.');
      return;
    }
    setFile(next);
  }

  function handleAnalyze() {
    if (!file) {
      setLocalError('Choose an image to analyze.');
      return;
    }
    extractMutation.mutate(file);
  }

  function handleBarcodeLookup(event?: FormEvent) {
    event?.preventDefault();
    const value = barcode.trim();
    if (value.length < 6) {
      setLocalError('Enter a barcode with at least 6 digits.');
      return;
    }
    barcodeMutation.mutate(value);
  }

  function handleCancel() {
    setExtraction(null);
    setProductDraft(null);
    setProductMeta(null);
    setFile(null);
    setLocalError(null);
    extractMutation.reset();
    barcodeMutation.reset();
    saveMutation.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleSave(payload: FoodEntryWritePayload) {
    saveMutation.mutate(payload);
  }

  function openPicker() {
    fileInputRef.current?.click();
  }

  const saveError =
    saveMutation.error instanceof ApiError
      ? saveMutation.error.message
      : saveMutation.isError
        ? 'Could not save meal.'
        : null;

  const reviewDraft = productDraft ?? (extraction ? nutritionToDraftEntry(extraction) : null);
  const reviewing = reviewDraft !== null;

  return (
    <div className="page-scan">
      <div className="main-inner">
        <div className="top-row">
          <div className="kicker">Free tool</div>
          <h1 className="sr-only">Scan Food</h1>
          <h1 className="page-title">Barcode &amp; label scanning</h1>
        </div>

        {!reviewing ? (
          <>
            <div className="scan-hero">
              <div className="viewfinder">
                {previewUrl ? (
                  <img src={previewUrl} alt="Selected food to analyze" />
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
                <div className="t">Point your camera at a barcode or nutrition label</div>
                <div className="s">
                  Barcode lookup reads packaged codes against Open Food Facts. Label photos use Sage vision — they are
                  separate flows.
                </div>
                <form className="barcode-lookup" onSubmit={handleBarcodeLookup}>
                  <label className="sr-only" htmlFor="barcode-value">
                    Barcode
                  </label>
                  <input
  id="barcode-value"
  ref={barcodeInputRef}
  value={barcode}
  inputMode="numeric"
  autoComplete="off"
  placeholder="Enter barcode digits"
  onChange={(event) => setBarcode(event.target.value)}
  style={{
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #d6d3d1",
    borderRadius: "6px",
    background: "#ffffff",
    color: "#292524",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
  }}
/>
                  <button type="submit" className="primary" disabled={barcodeMutation.isPending}>
                    {barcodeMutation.isPending ? 'Looking up…' : 'Look up barcode'}
                  </button>
                </form>
                <div className="btns">
                  <button type="button" className="primary" onClick={() => barcodeInputRef.current?.focus()}>
                    Scan barcode
                  </button>
                  <button type="button" className="secondary" onClick={openPicker}>
                    Scan label instead
                  </button>
                  <button
                    type="button"
                    className="primary"
                    onClick={handleAnalyze}
                    disabled={extractMutation.isPending}
                  >
                    {extractMutation.isPending ? 'Analyzing nutrition…' : 'Analyze nutrition'}
                  </button>
                </div>
                <label className="sr-only" htmlFor="scan-upload">
                  Upload image
                </label>
                <input
                  id="scan-upload"
                  ref={fileInputRef}
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                />
                {file ? <p className="s">{file.name}</p> : null}
                {localError ? (
                  <p className="error-text" role="alert">
                    {localError}
                  </p>
                ) : null}
                {extractMutation.isPending ? (
                  <p className="s" role="status">
                    Processing… Analyzing nutrition…
                  </p>
                ) : null}
                {barcodeMutation.isPending ? (
                  <p className="s" role="status">
                    Looking up product…
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid">
              <div>
                <h2>Last scan result</h2>
                <div className="empty-panel">
                  <p>No scan yet.</p>
                  <p className="muted">
                    Look up a barcode or analyze a nutrition label. Review the values here before anything is saved.
                  </p>
                </div>
              </div>
              <div>
                <div className="side-card">
                  <div className="who">🐾 Sage on scanning</div>
                  <p>
                    "Barcode lookup and label photos are different tools. If a barcode isn't recognized, snap the
                    nutrition label instead and Sage will read it."
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="review-stack">
              <h2>{extraction ? 'Extracted nutrition' : 'Product nutrition'}</h2>
              <p className="muted">
                {extraction ? 'AI estimate — please review before saving.' : 'Product lookup — please review before saving.'}
              </p>
              {extraction ? (
                <>
                  <p className="muted small">{sourceMessage(extraction.source)}</p>
                  {extraction.confidence !== null ? (
                    <p className="muted small">Confidence: {Math.round(extraction.confidence * 100)}%</p>
                  ) : null}
                  {extraction.notes ? <p className="muted small">{extraction.notes}</p> : null}
                </>
              ) : (
                <p className="muted small">
                  {productMeta?.brand ? `${productMeta.brand} · ` : ''}Barcode {productMeta?.barcode}
                </p>
              )}
              {previewUrl && extraction ? (
                <div className="result-card">
                  <img src={previewUrl} alt="Analyzed food" />
                  <div className="info">
                    <div className="title">{extraction.foodName}</div>
                    <div className="brand">
                      {extraction.quantity} {extraction.quantityUnit}
                    </div>
                    <div className="macro-mini">
                      <div>
                        <b>{extraction.calories}</b>kcal
                      </div>
                      <div>
                        <b>{extraction.protein}g</b>protein
                      </div>
                      <div>
                        <b>{extraction.carbs}g</b>carbs
                      </div>
                      <div>
                        <b>{extraction.fat}g</b>fat
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="panel">
                <MealForm
                  key={extraction ? `extract-${extraction.foodName}` : `barcode-${productMeta?.barcode}`}
                  initial={reviewDraft}
                  submitting={saveMutation.isPending}
                  error={saveError}
                  submitLabel="Use this information"
                  onSubmit={handleSave}
                  onCancel={handleCancel}
                />
              </div>
              <div className="side-card">
                <div className="who">🐾 Sage on scanning</div>
                <p>
                  Review the extracted values before they hit your ledger. You can still swap the meal slot or fix
                  macros here.
                </p>
                <Link to="/log-meal" className="ask-sage">
                  Or enter the meal by hand
                </Link>
              </div>
          </div>
        )}
      </div>
    </div>
  );
}
