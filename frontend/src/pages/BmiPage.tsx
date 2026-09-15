import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { bmiCategories, defaultBmiInputs } from '../mock/bmi';

function categoryFor(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  return { feet, inches };
}

function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}

export function BmiPage() {
  const { user } = useAuth();
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [heightCm, setHeightCm] = useState(String(defaultBmiInputs.heightCm));
  const [weightKg, setWeightKg] = useState(String(defaultBmiInputs.weightKg));
  const [age, setAge] = useState(String(defaultBmiInputs.age));
  const imperialHeight = cmToFeetInches(Number(heightCm) || 0);
  const [heightFt, setHeightFt] = useState(String(imperialHeight.feet || 5));
  const [heightIn, setHeightIn] = useState(String(imperialHeight.inches || 7));
  const [weightLb, setWeightLb] = useState(String(Math.round((Number(weightKg) || 0) * 2.20462)));

  const heightMeters = useMemo(() => {
    if (units === 'imperial') {
      return feetInchesToCm(Number(heightFt) || 0, Number(heightIn) || 0) / 100;
    }
    return (Number(heightCm) || 0) / 100;
  }, [units, heightCm, heightFt, heightIn]);

  const weight = useMemo(() => {
    if (units === 'imperial') {
      return (Number(weightLb) || 0) * 0.453592;
    }
    return Number(weightKg) || 0;
  }, [units, weightKg, weightLb]);

  const bmi = heightMeters > 0 && weight > 0 ? weight / (heightMeters * heightMeters) : 0;
  const display = bmi ? bmi.toFixed(1) : '—';
  const markerPct = bmi ? Math.min(100, Math.max(0, ((bmi - 15) / (40 - 15)) * 100)) : 0;
  const accountDays = user?.createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86_400_000))
    : 0;

  return (
    <div className="page-bmi">
      <div className="main-inner">
        <div className="top-row">
          <div className="kicker">Health reference</div>
          <h1 className="page-title">BMI info centre</h1>
        </div>

        <div className="panel">
          <div className="unit-toggle" role="group" aria-label="Measurement units">
            <button type="button" className={units === 'metric' ? 'is-active' : ''} onClick={() => setUnits('metric')}>
              Metric
            </button>
            <button
              type="button"
              className={units === 'imperial' ? 'is-active' : ''}
              onClick={() => setUnits('imperial')}
            >
              Imperial
            </button>
          </div>
          <h2>Calculate your BMI</h2>
          <div className="field-row">
            {units === 'metric' ? (
              <>
                <label className="field" htmlFor="bmi-height">
                  <span className="field-label">Height (cm)</span>
                  <input
                    id="bmi-height"
                    type="number"
                    value={heightCm}
                    onChange={(event) => setHeightCm(event.target.value)}
                  />
                </label>
                <label className="field" htmlFor="bmi-weight">
                  <span className="field-label">Weight (kg)</span>
                  <input
                    id="bmi-weight"
                    type="number"
                    value={weightKg}
                    onChange={(event) => setWeightKg(event.target.value)}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="field" htmlFor="bmi-height-ft">
                  <span className="field-label">Height (ft / in)</span>
                  <div className="qty-unit">
                    <input
                      id="bmi-height-ft"
                      type="number"
                      value={heightFt}
                      onChange={(event) => setHeightFt(event.target.value)}
                    />
                    <input
                      id="bmi-height-in"
                      type="number"
                      aria-label="Height inches"
                      value={heightIn}
                      onChange={(event) => setHeightIn(event.target.value)}
                    />
                  </div>
                </label>
                <label className="field" htmlFor="bmi-weight-lb">
                  <span className="field-label">Weight (lb)</span>
                  <input
                    id="bmi-weight-lb"
                    type="number"
                    value={weightLb}
                    onChange={(event) => setWeightLb(event.target.value)}
                  />
                </label>
              </>
            )}
            <label className="field" htmlFor="bmi-age">
              <span className="field-label">Age</span>
              <input id="bmi-age" type="number" value={age} onChange={(event) => setAge(event.target.value)} />
            </label>
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
            <span className="under" />
            <span className="normal" />
            <span className="over" />
            <span className="obese" />
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
          <p className="copy">
            BMI is a quick screening ratio of weight to height — useful for spotting trends over time, but it doesn't
            account for muscle mass, bone density, age, or where fat is carried on the body. Two people with the same
            BMI can have very different body compositions. Treat it as one data point among several, not a verdict.
          </p>
        </div>

        <div className="grid">
          <div className="side-card">
            <div className="who">Sage on BMI</div>
            <p>
              {accountDays < 14
                ? `"This calculator is a snapshot from the height and weight you just entered. The account is ${accountDays} day${accountDays === 1 ? '' : 's'} old, so there is not enough BMI history for a trend."`
                : `"This is today's calculated BMI from the values on this page. There is still no stored BMI history to chart yet."`}
            </p>
          </div>
          <div className="side-card">
            <div className="who">📎 Related tools</div>
            <p>
              Use your BMI category alongside the{' '}
              <Link className="link-accent" to="/goals">
                Goals &amp; target
              </Link>{' '}
              page to set a realistic calorie pool, or the{' '}
              <Link className="link-accent" to="/portions">
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
