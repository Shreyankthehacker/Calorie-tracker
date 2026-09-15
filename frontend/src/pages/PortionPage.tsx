import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SelectField } from '../components/ui/SelectField';
import { nutritionToDraftEntry } from '../lib/meal-draft';
import { portionDefaults } from '../mock/portions';

function slotToMealType(slot: string): 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS' {
  if (slot === 'Lunch') return 'LUNCH';
  if (slot === 'Snack') return 'SNACKS';
  return 'DINNER';
}

export function PortionPage() {
  const navigate = useNavigate();
  const [food, setFood] = useState(portionDefaults.food);
  const [mealSlot, setMealSlot] = useState(portionDefaults.mealSlot);
  const [remaining, setRemaining] = useState(String(portionDefaults.remaining));
  const [split, setSplit] = useState(portionDefaults.split);

  function logThisMeal() {
    navigate('/log-meal', {
      state: {
        portionDraft: nutritionToDraftEntry({
          foodName: food,
          quantity: 1,
          quantityUnit: 'serving',
          calories: portionDefaults.calories,
          protein: portionDefaults.protein,
          carbs: portionDefaults.carbs,
          fat: portionDefaults.fat,
          mealType: slotToMealType(mealSlot),
        }),
      },
    });
  }

  return (
    <div className="page-portion">
      <div className="main-inner">
        <div className="top-row">
          <div className="kicker">Free tool</div>
          <h1 className="page-title">Portion auto-calculator</h1>
        </div>

        <div className="grid">
          <div className="panel">
            <h2>Fit a meal to your remaining calories</h2>
            <div className="field-row">
              <label className="field" htmlFor="portion-food">
                <span className="field-label">Food or dish</span>
                <input
                  id="portion-food"
                  type="text"
                  value={food}
                  onChange={(event) => setFood(event.target.value)}
                />
              </label>
              <SelectField
                id="portion-slot"
                label="Meal slot"
                value={mealSlot}
                onChange={setMealSlot}
                options={[
                  { value: 'Dinner', label: 'Dinner' },
                  { value: 'Lunch', label: 'Lunch' },
                  { value: 'Snack', label: 'Snack' },
                ]}
              />
            </div>
            <div className="field-row">
              <label className="field" htmlFor="portion-remaining">
                <span className="field-label">Calories remaining today, before this meal</span>
                <input
                  id="portion-remaining"
                  type="number"
                  value={remaining}
                  onChange={(event) => setRemaining(event.target.value)}
                />
              </label>
              <SelectField
                id="portion-split"
                label="Preferred protein-lean split"
                value={split}
                onChange={setSplit}
                options={[
                  { value: 'Balanced', label: 'Balanced' },
                  { value: 'High protein', label: 'High protein' },
                  { value: 'Lower carb', label: 'Lower carb' },
                ]}
              />
            </div>

            <p className="muted small">Calories remaining today, before this meal. The meal slot does not subtract anything by itself.</p>
            <div className="plate-wrap">
              <div className="plate">
                <svg width="200" height="200" viewBox="0 0 200 200" aria-hidden="true">
                  <circle cx="100" cy="100" r="98" fill="none" />
                  <path d="M100 100 L100 2 A98 98 0 0 1 184 149 Z" fill="var(--crimson)" />
                  <path d="M100 100 L184 149 A98 98 0 0 1 41 190 Z" fill="#2B2A28" />
                  <path d="M100 100 L41 190 A98 98 0 0 1 100 2 Z" fill="#D8D5D0" />
                </svg>
              </div>
            </div>
            <div className="plate-legend">
              <span>
                <span className="dot dot-protein" />
                Protein 40%
              </span>
              <span>
                <span className="dot dot-carbs" />
                Carbs 35%
              </span>
              <span>
                <span className="dot dot-veg" />
                Veg &amp; fat 25%
              </span>
            </div>
          </div>

          <div>
            <div className="remaining-band">
              <div className="l">Suggested portion</div>
              <div className="n">{portionDefaults.suggestion}</div>
            </div>
            <div className="side-card breakdown">
              <h2>Portion breakdown</h2>
              <div className="result-row">
                <span>Calories</span>
                <b>{portionDefaults.calories} kcal</b>
              </div>
              <div className="result-row">
                <span>Protein</span>
                <b>{portionDefaults.protein}g</b>
              </div>
              <div className="result-row">
                <span>Carbohydrates</span>
                <b>{portionDefaults.carbs}g</b>
              </div>
              <div className="result-row">
                <span>Fat</span>
                <b>{portionDefaults.fat}g</b>
              </div>
              <div className="result-row">
                <span>Leaves you with</span>
                <b>{portionDefaults.leftover} kcal</b>
              </div>
              <button type="button" className="btn-primary" onClick={logThisMeal}>
                Log this meal
              </button>
            </div>
            <div className="side-card">
              <div className="who">🐾 Sage on portions</div>
              <p>
                "This suggestion is a calculator output for the remaining calories you typed, before logging this meal.
                Use Log this meal to review it on the Log meal page."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
