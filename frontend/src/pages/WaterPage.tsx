import { useState } from 'react';
import { INITIAL_GLASSES, WATER_GOAL, weekHydration } from '../mock/water';

export function WaterPage() {
  const [glasses, setGlasses] = useState(INITIAL_GLASSES);
  const [everyTwoHours, setEveryTwoHours] = useState(true);
  const [pauseAfterEight, setPauseAfterEight] = useState(true);
  const [syncFamily, setSyncFamily] = useState(false);
  const fillPct = Math.min(100, Math.round((glasses / WATER_GOAL) * 100));

  function addGlass() {
    setGlasses((value) => Math.min(WATER_GOAL, value + 1));
  }

  return (
    <div className="page-water">
      <div className="main-inner">
        <div className="top-row">
          <div>
            <div className="kicker">Hydration</div>
            <h1 className="page-title">Water intake</h1>
          </div>
          <button type="button" className="btn-primary" onClick={addGlass}>
            + Log a glass
          </button>
        </div>

        <div className="grid">
          <div className="wave-card">
            <div className="cap">Today's hydration</div>
            <div className="n">
              {glasses}
              <span>
                {' '}
                / {WATER_GOAL} glasses
              </span>
            </div>
            <div className="bottle">
              <svg viewBox="0 0 96 200" fill="none" aria-hidden="true">
                <path
                  d="M34 6h28v20c10 6 16 16 16 30v120c0 8-7 14-15 14H33c-8 0-15-6-15-14V56c0-14 6-24 16-30V6Z"
                  stroke="#3A3733"
                  strokeWidth="2"
                />
              </svg>
              <div className="water" style={{ height: `${Math.max(8, fillPct)}%` }} />
            </div>
            <div className="glass-row">
              {Array.from({ length: WATER_GOAL }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`glass-btn${index < glasses ? ' filled' : ''}`}
                  aria-label={`Glass ${index + 1}`}
                  onClick={() => setGlasses(index + 1)}
                />
              ))}
            </div>
            <div className="add-water-row">
              <button type="button" onClick={addGlass}>
                + 250ml
              </button>
              <button type="button" onClick={() => setGlasses((value) => Math.min(WATER_GOAL, value + 2))}>
                + 500ml
              </button>
            </div>
          </div>

          <div>
            <h2>Last 7 days</h2>
            <div className="week-bars">
              {weekHydration.map((day) => (
                <div key={day.label} className="col">
                  <div className="bar" style={{ height: '70%' }}>
                    <div className="fill" style={{ height: `${day.fill}%` }} />
                  </div>
                  <div className="lbl">{day.label}</div>
                </div>
              ))}
            </div>

            <div className="side-card">
              <div className="who">🐾 Sage on hydration</div>
              <p>
                "You're {glasses} glasses in with warm weather today — try to front-load another glass before dinner
                rather than catching up late tonight."
              </p>
            </div>

            <div className="side-card">
              <h2 style={{ fontSize: 15, marginBottom: 4 }}>Reminders</h2>
              <div className="reminder-row">
                <span>Remind me every 2 hours</span>
                <button
                  type="button"
                  className={`toggle${everyTwoHours ? ' on' : ''}`}
                  aria-pressed={everyTwoHours}
                  onClick={() => setEveryTwoHours((value) => !value)}
                />
              </div>
              <div className="reminder-row">
                <span>Pause reminders after 8pm</span>
                <button
                  type="button"
                  className={`toggle${pauseAfterEight ? ' on' : ''}`}
                  aria-pressed={pauseAfterEight}
                  onClick={() => setPauseAfterEight((value) => !value)}
                />
              </div>
              <div className="reminder-row">
                <span>Sync with family goals</span>
                <button
                  type="button"
                  className={`toggle${syncFamily ? ' on' : ''}`}
                  aria-pressed={syncFamily}
                  onClick={() => setSyncFamily((value) => !value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
