import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bmiCategories, defaultBmiInputs } from '../mock/bmi';

function categoryFor(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export function BmiPage() {
  const [heightCm, setHeightCm] = useState(String(defaultBmiInputs.heightCm));
  const [weightKg, setWeightKg] = useState(String(defaultBmiInputs.weightKg));
  const [age, setAge] = useState(String(defaultBmiInputs.age));

  const bmi = useMemo(() => {
    const height = Number(heightCm);
    const weight = Number(weightKg);
    if (!height || !weight) return 0;
    const meters = height / 100;
    return weight / (meters * meters);
  }, [heightCm, weightKg]);

  const display = bmi ? bmi.toFixed(1) : '—';
  const markerPct = bmi ? Math.min(100, Math.max(0, ((bmi - 15) / (40 - 15)) * 100)) : 0;

  return (
    <div className="page-bmi">
      <div className="main-inner">
        <div className="top-row">
          <div className="kicker">Health reference</div>
          <h1 className="page-title">BMI info centre</h1>
        </div>

        <div className="panel">
          <h2>Calculate your BMI</h2>
          <div className="field-row">
            <div>
              <label htmlFor="bmi-height">Height (cm)</label>
              <input
                id="bmi-height"
                type="number"
                value={heightCm}
                onChange={(event) => setHeightCm(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="bmi-weight">Weight (kg)</label>
              <input
                id="bmi-weight"
                type="number"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="bmi-age">Age</label>
              <input id="bmi-age" type="number" value={age} onChange={(event) => setAge(event.target.value)} />
            </div>
          </div>

          <div className="result-band">
            <div>
              <div className="l">Your BMI</div>
              <div className="n">{display}</div>
            </div>
            <div className="cat">{bmi ? categoryFor(bmi) : '—'}</div>
          </div>

          <div className="marker" style={{ marginLeft: `calc(${markerPct}% - 1px)` }}>
            <div className="flag" />
          </div>
          <div className="scale">
            <span className="under" style={{ flex: 2 }} />
            <span className="normal" style={{ flex: 3 }} />
            <span className="over" style={{ flex: 2 }} />
            <span className="obese" style={{ flex: 3 }} />
          </div>
          <div className="scale-labels">
            <span>15</span>
            <span>18.5</span>
            <span>25</span>
            <span>30</span>
            <span>40+</span>
          </div>

          <div className="cat-grid">
            {bmiCategories.map((item) => (
              <div key={item.title} className="cat-card">
                <b>{item.title}</b>
                {item.range}
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>What BMI does and doesn't tell you</h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-soft)', margin: 0 }}>
            BMI is a quick screening ratio of weight to height — useful for spotting trends over time, but it doesn't
            account for muscle mass, bone density, age, or where fat is carried on the body. Two people with the same
            BMI can have very different body compositions. Treat it as one data point among several, not a verdict.
          </p>
        </div>

        <div className="grid">
          <div className="side-card" style={{ margin: 0 }}>
            <div className="who">🐾 Sage on BMI</div>
            <p>
              "Your BMI has stayed in the normal range for 3 months. Given your logged protein intake, this looks like a
              stable, healthy trend rather than a number to chase further."
            </p>
          </div>
          <div className="side-card" style={{ margin: 0 }}>
            <div className="who">📎 Related tools</div>
            <p>
              Use your BMI category alongside the{' '}
              <Link to="/goals" style={{ color: 'var(--crimson)' }}>
                Goals &amp; target
              </Link>{' '}
              page to set a realistic calorie pool, or the{' '}
              <Link to="/portions" style={{ color: 'var(--crimson)' }}>
                portion calculator
              </Link>{' '}
              to size individual meals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
