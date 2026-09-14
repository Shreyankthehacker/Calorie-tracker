import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { extractNutrition, isAiImageOversized, isSupportedAiImage } from '../api/ai';
import { createFoodEntry } from '../api/food-entries';
import { ApiError, type FoodEntry, type FoodEntryWritePayload, type NutritionExtraction } from '../api/types';
import { MealForm } from '../components/meals/MealForm';

function sourceMessage(source: NutritionExtraction['source']): string {
  if (source === 'label') {
    return 'Values extracted from visible label.';
  }
  if (source === 'photo_estimate') {
    return 'Nutrition values are estimated from the image.';
  }
  return 'AI estimate — please review before saving.';
}

function toDraftEntry(extraction: NutritionExtraction): FoodEntry {
  const now = new Date().toISOString();
  return {
    id: 'draft',
    mealType: extraction.mealType ?? 'LUNCH',
    foodName: extraction.foodName,
    quantity: extraction.quantity,
    quantityUnit: extraction.quantityUnit,
    calories: extraction.calories,
    protein: extraction.protein,
    carbs: extraction.carbs,
    fat: extraction.fat,
    consumedAt: now,
    createdAt: now,
    updatedAt: now,
    micronutrients: extraction.micronutrients,
  };
}

export function ScanFoodPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<NutritionExtraction | null>(null);

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
      setLocalError(null);
    },
    onError: (err: unknown) => {
      setExtraction(null);
      setLocalError(err instanceof ApiError ? err.message : 'Could not analyze this image.');
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
    setLocalError(null);
    extractMutation.reset();
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

  function handleCancel() {
    setExtraction(null);
    setFile(null);
    setLocalError(null);
    extractMutation.reset();
    saveMutation.reset();
  }

  function handleSave(payload: FoodEntryWritePayload) {
    saveMutation.mutate(payload);
  }

  const saveError =
    saveMutation.error instanceof ApiError
      ? saveMutation.error.message
      : saveMutation.isError
        ? 'Could not save meal.'
        : null;

  return (
    <section className="page">
        <header className="page-header">
          <h1>Scan Food</h1>
          <p className="muted">Upload a photo or nutrition label. Review everything before it is saved.</p>
        </header>

      {!extraction ? (
        <section className="dropzone scan-panel">
          <label className="field">
            <span className="field-label">Upload image</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
            />
          </label>
          {previewUrl ? (
            <div className="scan-stage">
              <img className="scan-preview" src={previewUrl} alt="Selected food to analyze" />
              <div className="scan-frame" aria-hidden="true" />
            </div>
          ) : null}
          {file ? <p className="muted small">{file.name}</p> : null}
          {localError ? (
            <p className="error-text" role="alert">
              {localError}
            </p>
          ) : null}
          <div className="action-row">
            <button
              type="button"
              className="button button-primary"
              onClick={handleAnalyze}
              disabled={extractMutation.isPending}
            >
              {extractMutation.isPending ? 'Analyzing nutrition…' : 'Analyze nutrition'}
            </button>
          </div>
          {extractMutation.isPending ? (
            <p className="muted" role="status">
              Processing… Analyzing nutrition…
            </p>
          ) : null}
        </section>
      ) : (
        <section className="panel">
          <h2>Extracted nutrition</h2>
          <p className="muted">AI estimate — please review before saving.</p>
          <p className="muted small">{sourceMessage(extraction.source)}</p>
          {extraction.confidence !== null ? (
            <p className="muted small">Confidence: {Math.round(extraction.confidence * 100)}%</p>
          ) : null}
          {extraction.notes ? <p className="muted small">{extraction.notes}</p> : null}
          {previewUrl ? (
            <div className="scan-stage">
              <img className="scan-preview" src={previewUrl} alt="Analyzed food" />
              <div className="scan-frame" aria-hidden="true" />
            </div>
          ) : null}
          <MealForm
            initial={toDraftEntry(extraction)}
            submitting={saveMutation.isPending}
            error={saveError}
            submitLabel="Use this information"
            onSubmit={handleSave}
            onCancel={handleCancel}
          />
        </section>
      )}
    </section>
  );
}
