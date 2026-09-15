import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { CalorieRing } from '../../components/nutrition/CalorieRing';
import { MacroBars } from '../../components/nutrition/MacroBars';
import { FoodThumb } from '../../components/meals/FoodThumb';
import { landingDemo } from './landing-demo-data';
import { LandingWeekChart } from './LandingWeekChart';

const steps = [
  {
    id: 'goal',
    label: 'Set your goal',
    title: 'One current goal. Not a history of abandoned plans.',
    body: 'Calories and macros for a day. You can track without a goal; Today will not invent a limit for you.',
  },
  {
    id: 'log',
    label: 'Log a meal',
    title: 'Catalog, photo, barcode, or a name you type.',
    body: 'Pick a food, set the quantity, and save. Custom dishes work the same way. Sage can propose a plate; it is not logged until you confirm.',
  },
  {
    id: 'nutrition',
    label: 'Review nutrition',
    title: 'Calories and macros on the meal you just saved.',
    body: 'Protein, carbs, and fat sit next to the calorie total. Micronutrients can ride along on the same entry.',
  },
  {
    id: 'today',
    label: 'Track the day',
    title: 'Today adds the meal to the ring and the meal list.',
    body: 'Breakfast, lunch, dinner, snacks. Remaining calories come from your goal minus what you logged.',
  },
  {
    id: 'progress',
    label: 'See the week',
    title: 'Reports is the week against the same goal.',
    body: 'Calorie and macro charts are built from entries you actually saved. There is no cached daily total in the background.',
  },
] as const;

function GoalStage() {
  const form = landingDemo.goalForm;
  return (
    <div className="lp-stage-panel">
      <p className="lp-stage-kicker">Goals</p>
      <label>
        Daily calories
        <input readOnly value={form.calories} />
      </label>
      <label>
        Protein (g)
        <input readOnly value={form.protein} />
      </label>
      <label>
        Carbs (g)
        <input readOnly value={form.carbs} />
      </label>
      <label>
        Fat (g)
        <input readOnly value={form.fat} />
      </label>
    </div>
  );
}

function LogStage() {
  return (
    <div className="lp-stage-panel">
      <p className="lp-stage-kicker">Log meal</p>
      <ul className="lp-stage-foods">
        {['Oats', 'Eggs', 'Chicken breast', 'Salmon', 'Mixed salad', 'Greek yogurt'].map((name) => (
          <li key={name}>
            <FoodThumb name={name} />
            <span>{name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NutritionStage() {
  const meal = landingDemo.meal;
  return (
    <div className="lp-stage-panel">
      <p className="lp-stage-kicker">{meal.name}</p>
      <p className="lp-stage-kcal">{meal.calories} kcal</p>
      <MacroBars protein={meal.protein} carbs={meal.carbs} fat={meal.fat} proteinTarget={50} carbTarget={80} fatTarget={22} />
    </div>
  );
}

function TodayStage() {
  const day = landingDemo.day;
  return (
    <div className="lp-stage-panel lp-stage-today">
      <CalorieRing consumed={day.calories} target={day.calorieGoal} />
      <ul>
        {landingDemo.entries.map((entry) => (
          <li key={entry.name}>
            {entry.meal}: {entry.name}
            <b>{entry.kcal}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProgressStage() {
  return (
    <div className="lp-stage-panel lp-stage-chart">
      <p className="lp-stage-kicker">Calories this week</p>
      <LandingWeekChart />
    </div>
  );
}

const stages = [GoalStage, LogStage, NutritionStage, TodayStage, ProgressStage];

export function LandingTutorial() {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  const step = steps[index] ?? steps[0];
  const Stage = stages[index] ?? GoalStage;
  const last = index === steps.length - 1;

  function onTabsKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      setIndex((value) => Math.min(steps.length - 1, value + 1));
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIndex((value) => Math.max(0, value - 1));
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setIndex(0);
    }
    if (event.key === 'End') {
      event.preventDefault();
      setIndex(steps.length - 1);
    }
  }

  return (
    <section className="lp-section lp-tutorial" id="tutorial" aria-labelledby="tutorial-heading">
      <div className="lp-wrap">
        <p className="lp-kicker">How to use it</p>
        <h2 id="tutorial-heading">A first day, in five moves.</h2>
        <p className="lp-lede">
          Click a step to see the matching screen. These are the same surfaces you will use after you create an
          account.
        </p>

        <div className="lp-tutorial-layout">
          <div
            className="lp-steps"
            role="tablist"
            aria-label="Tutorial steps"
            onKeyDown={onTabsKey}
          >
            {steps.map((item, stepIndex) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tutorial-tab-${item.id}`}
                aria-selected={stepIndex === index}
                aria-controls="tutorial-panel"
                tabIndex={stepIndex === index ? 0 : -1}
                className={stepIndex === index ? 'is-active' : undefined}
                onClick={() => setIndex(stepIndex)}
              >
                <span>{String(stepIndex + 1).padStart(2, '0')}</span>
                {item.label}
              </button>
            ))}
          </div>

          <div className="lp-tutorial-main">
            <div className="lp-progress" aria-hidden="true">
              <span style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
            </div>
            <p className="sr-only" aria-live="polite">
              Step {index + 1} of {steps.length}
            </p>
            <div id="tutorial-panel">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                role="tabpanel"
                aria-labelledby={`tutorial-tab-${step.id}`}
                className="lp-tutorial-pane"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                <Stage />
                <div className="lp-tutorial-copy">
                  <p className="lp-kicker">
                    Step {index + 1} of {steps.length}
                  </p>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </motion.div>
            </AnimatePresence>
            </div>
            <div className="lp-tutorial-controls">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setIndex((value) => Math.max(0, value - 1))}
                disabled={index === 0}
              >
                Previous
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => setIndex((value) => Math.min(steps.length - 1, value + 1))}
                disabled={last}
              >
                Next
              </button>
              <Link className="lp-tutorial-walkthrough" to="/get-started">
                Open the slower walkthrough
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
