import { useEffect, useRef, useState, type RefObject } from 'react';
import { useReducedMotion } from 'framer-motion';
import { landingDemo } from './landing-demo-data';

function useInView<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(node);
    const fallback = window.setTimeout(() => setVisible(true), 1200);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [visible]);

  return [ref, visible];
}

function useCount(target: number, active: boolean, duration = 900): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);

  useEffect(() => {
    if (!active) {
      return;
    }
    if (reduce) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(target * eased);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, duration, reduce, target]);

  return value;
}

export function LandingLive() {
  const [ref, active] = useInView<HTMLElement>();
  const meal = landingDemo.meal;
  const calories = Math.round(useCount(meal.calories, active));
  const protein = Math.round(useCount(meal.protein, active, 1000));
  const carbs = Math.round(useCount(meal.carbs, active, 1050));
  const fat = Math.round(useCount(meal.fat, active, 1100));
  const proteinPct = Math.round(useCount(78, active, 1200));

  return (
    <section className="lp-section lp-live" aria-labelledby="live-heading" ref={ref}>
      <div className="lp-wrap lp-live-solo">
        <div>
          <p className="lp-kicker">From a meal to numbers</p>
          <h2 id="live-heading">A meal becomes nutrition the moment it is logged.</h2>
          <p className="lp-lede">
            This card is a demonstration of the logging flow. It does not write to your account. Catalog foods,
            photos, barcodes, and custom dishes all land in the same place: calories and macros on the day you
            ate them.
          </p>
        </div>
          <article className="lp-nutrition-card" aria-live="polite">
            <p className="lp-nutrition-meal">{meal.mealType}</p>
            <h3>{meal.name}</h3>
            <dl>
              <div>
                <dt>Calories</dt>
                <dd>
                  {calories} <span>kcal</span>
                </dd>
              </div>
              <div>
                <dt>Protein</dt>
                <dd>
                  {protein} <span>g</span>
                </dd>
              </div>
              <div>
                <dt>Carbs</dt>
                <dd>
                  {carbs} <span>g</span>
                </dd>
              </div>
              <div>
                <dt>Fat</dt>
                <dd>
                  {fat} <span>g</span>
                </dd>
              </div>
            </dl>
            <ul className={`lp-live-flags${active ? ' is-on' : ''}`}>
              <li>Meal logged</li>
              <li>Daily total updated</li>
              <li>Protein goal: {proteinPct}%</li>
            </ul>
          </article>
      </div>
    </section>
  );
}
