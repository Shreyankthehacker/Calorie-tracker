import { CalorieRing } from '../../components/nutrition/CalorieRing';
import { MacroBars } from '../../components/nutrition/MacroBars';
import { FoodThumb } from '../../components/meals/FoodThumb';
import { landingMedia } from '../../lib/landing-media';
import { landingDemo } from './landing-demo-data';
import { LandingPhoto } from './LandingPhoto';

export function LandingPreview() {
  const day = landingDemo.day;

  return (
    <section className="lp-section lp-preview" aria-labelledby="preview-heading">
      <div className="lp-wrap">
        <div className="lp-preview-intro">
          <div className="lp-preview-copy">
            <p className="lp-kicker">Today</p>
            <h2 id="preview-heading">Your whole day, at a glance.</h2>
            <p className="lp-lede">
              This is the actual Today layout: calories against your goal, meals grouped by time of day, macros, and
              water if you use it. The numbers here are a sample day, not live account data.
            </p>
          </div>
          <div className="lp-preview-photo">
            <LandingPhoto
              src={landingMedia.today.src}
              srcSet={landingMedia.today.srcSet}
              fallback={landingMedia.today.fallback}
              alt={landingMedia.today.alt}
              width={landingMedia.today.width}
              height={landingMedia.today.height}
              sizes="(max-width: 980px) 100vw, 42vw"
            />
          </div>
        </div>

        <div className="lp-device">
          <div className="lp-device-bar">
            <span>Today</span>
            <span>Log meal</span>
            <span>Entries</span>
            <span>Reports</span>
          </div>
          <div className="lp-device-body">
            <div className="lp-preview-hero">
              <CalorieRing consumed={day.calories} target={day.calorieGoal} />
              <div>
                <p className="lp-preview-remaining">{day.remaining} kcal remaining</p>
                <MacroBars
                  protein={day.protein}
                  carbs={day.carbs}
                  fat={day.fat}
                  proteinTarget={day.proteinGoal}
                  carbTarget={day.carbGoal}
                  fatTarget={day.fatGoal}
                />
                <p className="lp-water-line">
                  Water {day.waterGlasses} of {day.waterGoal} glasses
                </p>
              </div>
            </div>
            <h3>Meals</h3>
            <ul className="lp-preview-meals">
              {landingDemo.entries.map((entry) => (
                <li key={entry.name}>
                  <FoodThumb name={entry.name} />
                  <div>
                    <strong>{entry.meal}</strong>
                    <span>
                      {entry.name}, {entry.time}
                    </span>
                  </div>
                  <b>{entry.kcal} kcal</b>
                </li>
              ))}
              <li className="is-empty">
                <span>Snacks</span>
                <span>Add snack</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
