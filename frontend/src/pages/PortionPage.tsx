import { useState } from 'react';
import { Link } from 'react-router-dom';
import { portionDefaults } from '../mock/portions';

export function PortionPage() {
  const [food, setFood] = useState(portionDefaults.food);
  const [mealSlot, setMealSlot] = useState(portionDefaults.mealSlot);
  const [remaining, setRemaining] = useState(String(portionDefaults.remaining));
  const [split, setSplit] = useState(portionDefaults.split);

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
              <label className="field" htmlFor="portion-slot">
                <span className="field-label">Meal slot</span>
                <select
                  id="portion-slot"
                  value={mealSlot}
                  onChange={(event) => setMealSlot(event.target.value)}
                >
                  <option>Dinner</option>
                  <option>Lunch</option>
                  <option>Snack</option>
                </select>
              </label>
            </div>
            <div className="field-row">
              <label className="field" htmlFor="portion-remaining">
                <span className="field-label">Calories remaining today</span>
                <input
                  id="portion-remaining"
                  type="number"
                  value={remaining}
                  onChange={(event) => setRemaining(event.target.value)}
                />
              </label>
              <label className="field" htmlFor="portion-split">
                <span className="field-label">Preferred protein-lean split</span>
                <select id="portion-split" value={split} onChange={(event) => setSplit(event.target.value)}>
                  <option>Balanced</option>
                  <option>High protein</option>
                  <option>Lower carb</option>
                </select>
              </label>
            </div>

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
                <span className="dot" style={{ background: 'var(--crimson)' }} />
                Protein 40%
              </span>
              <span>
                <span className="dot" style={{ background: '#2B2A28' }} />
                Carbs 35%
              </span>
              <span>
                <span className="dot" style={{ background: '#D8D5D0' }} />
                Veg &amp; fat 25%
              </span>
            </div>
          </div>

          <div>
            <div className="remaining-band">
              <div className="l">Suggested portion</div>
              <div className="n">{portionDefaults.suggestion}</div>
            </div>
            <div className="side-card" style={{ background: 'var(--white)', border: '1px solid var(--line)' }}>
              <h2 style={{ fontSize: 15, marginBottom: 2 }}>Portion breakdown</h2>
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
            </div>
            <div className="side-card">
              <div className="who">🐾 Sage on portions</div>
              <p>
                "This portion leaves room for a light snack later. Scan the salmon packaging with the{' '}
                <Link to="/scan" style={{ color: 'var(--crimson)' }}>
                  barcode scanner
                </Link>{' '}
                to log the exact cut you're using."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
