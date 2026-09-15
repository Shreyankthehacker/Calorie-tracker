import { useMemo, useState } from 'react';
import { addCalendarDays, calendarDateInTimeZone } from '../lib/dates';
import { INITIAL_GLASSES, WATER_GOAL, weekHydration } from '../mock/water';

export function WaterPage() {
  const [goal, setGoal] = useState(WATER_GOAL);
  const [glasses, setGlasses] = useState(INITIAL_GLASSES);
  const [everyTwoHours, setEveryTwoHours] = useState(true);
  const [pauseAfterEight, setPauseAfterEight] = useState(true);
  const [syncFamily, setSyncFamily] = useState(false);
  const fillPct = goal > 0 ? Math.min(100, Math.round((glasses / goal) * 100)) : 0;
  const today = calendarDateInTimeZone(new Date(), 'UTC');

  const week = useMemo(() => {
    const start = addCalendarDays(today, -6);
    return weekHydration.map((day, index) => {
      const date = addCalendarDays(start, index);
      const isToday = date === today;
      return {
        ...day,
        date,
        isToday,
        label: new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' }).format(
          new Date(`${date}T12:00:00.000Z`),
        ),
      };
    });
  }, [today]);

  const weeklyAverage = Math.round(week.reduce((sum, day) => sum + day.fill, 0) / week.length / (100 / goal));
  const daysOnPace = week.filter((day) => day.fill >= 100 || (day.isToday && glasses >= goal)).length;

  function addGlass() {
    setGlasses((value) => Math.min(goal, value + 1));
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
                /{' '}
                <label className="goal-edit">
                  <span className="sr-only">Daily glass goal</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={goal}
                    onChange={(event) => {
                      const next = Math.max(1, Math.min(20, Number(event.target.value) || 1));
                      setGoal(next);
                      setGlasses((value) => Math.min(value, next));
                    }}
                  />
                </label>{' '}
                glasses
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
              {Array.from({ length: goal }, (_, index) => (
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
              <button type="button" onClick={() => setGlasses((value) => Math.min(goal, value + 2))}>
                + 500ml
              </button>
            </div>
          </div>

          <div>
            <h2>Last 7 days</h2>
            <div className="week-bars">
              {week.map((day) => (
                <div key={day.date} className={`col${day.isToday ? ' is-today' : ''}`}>
                  <div className="bar">
                    <div className="fill" style={{ height: `${day.isToday ? fillPct : day.fill}%` }} />
                  </div>
                  <div className="lbl">{day.label}</div>
                </div>
              ))}
            </div>
            <p className="muted small">
              Weekly average about {weeklyAverage} glasses. {daysOnPace} of these bars are at or above the current goal.
            </p>

            <div className="side-card">
              <div className="who">Sage on hydration</div>
              <p>
                {glasses === 0
                  ? '"No glasses logged yet today, so there is not a hydration trend to comment on."'
                  : `"You're ${glasses} of ${goal} glasses today. That's from the counter on this page — not a weather or family forecast."`}
              </p>
            </div>

            <div className="side-card">
              <h2 className="reminders-title">Reminders</h2>
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
                <span>
                  Sync with family goals
                  <small className="hint">
                    When on, this glass target is treated as a household reminder only. Each person still logs their own
                    glasses.
                  </small>
                </span>
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
