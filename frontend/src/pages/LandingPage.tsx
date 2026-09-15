import { useRef, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { landingMedia } from '../lib/landing-media';
import { FoodThumb } from '../components/meals/FoodThumb';
import { LandingFooter } from './landing/LandingFooter';
import { LandingLive } from './landing/LandingLive';
import { LandingNav } from './landing/LandingNav';
import { LandingPhoto } from './landing/LandingPhoto';
import { LandingPreview } from './landing/LandingPreview';
import { LandingWeekChart } from './landing/LandingWeekChart';

const howSteps = [
  {
    n: '01',
    title: 'Log your meal',
    body: 'Choose from the catalog, scan a barcode, upload a photo, or name a homemade dish. Quantity first. Nutrition follows.',
  },
  {
    n: '02',
    title: 'Understand your nutrition',
    body: 'Calories, protein, carbs, and fat are saved on the entry. Today and Reports read those numbers — they do not invent a second ledger.',
  },
  {
    n: '03',
    title: 'Build better habits',
    body: 'A current goal turns the day into remaining calories and macro progress. The week is a chart of meals you actually logged.',
  },
];

const features = [
  {
    label: 'Logging',
    title: 'Four ways in. One food entry.',
    body: 'Catalog foods scale with quantity. Custom meals take the numbers you enter. Photos go through review before anything is saved. Barcodes look up a product and still wait for you to confirm.',
    visual: 'log' as const,
    align: 'photo-right' as const,
  },
  {
    label: 'Today',
    title: 'A ring for the day, not a lecture.',
    body: 'Logged calories sit against the goal you set. Macros fill as meals land. Remaining energy is subtraction, not a score.',
    visual: 'today' as const,
    align: 'photo-left' as const,
  },
  {
    label: 'Reports',
    title: 'The week, from entries you saved.',
    body: 'Calorie and macro charts aggregate at request time from consumedAt, in your timezone. There is no hidden daily cache.',
    visual: 'week' as const,
    align: 'photo-right' as const,
  },
  {
    label: 'Sage',
    title: 'It can propose. You still press Save.',
    body: 'Ask Sage to estimate a plate. A confirmation card appears. Nothing is written to your log until you confirm. That rule is the product, not a disclaimer.',
    visual: 'sage' as const,
    align: 'photo-left' as const,
  },
];

export function LandingPage() {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);

  function onHeroMove(event: MouseEvent<HTMLDivElement>) {
    if (reduce) {
      return;
    }
    const node = heroRef.current;
    if (!node) {
      return;
    }
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    node.style.setProperty('--mx', String(x));
    node.style.setProperty('--my', String(y));
  }

  function onHeroLeave() {
    heroRef.current?.style.setProperty('--mx', '0');
    heroRef.current?.style.setProperty('--my', '0');
  }

  return (
    <div className="page-landing">
      <a className="lp-skip" href="#hero-heading">
        Skip to content
      </a>
      <LandingNav />

      <main>
        <section className="lp-hero" aria-labelledby="hero-heading">
          <div className="lp-wrap lp-hero-grid">
            <div className="lp-hero-copy">
              <h1 id="hero-heading">
                <span>Know what you&apos;re eating.</span>
                <span>Make every meal count.</span>
              </h1>
              <p className="lp-lede">
                Track meals, understand your nutrition, and build better eating habits without turning food into a
                spreadsheet.
              </p>
              <div className="lp-actions">
                <Link className="button button-primary" to="/register">
                  Start tracking
                </Link>
                <Link className="button button-secondary" to="/tutorial">
                  Open tutorial
                </Link>
              </div>
            </div>
            <div
              className="lp-hero-photo"
              ref={heroRef}
              onMouseMove={onHeroMove}
              onMouseLeave={onHeroLeave}
            >
              <LandingPhoto
                src={landingMedia.hero.src}
                srcSet={landingMedia.hero.srcSet}
                fallback={landingMedia.hero.fallback}
                alt={landingMedia.hero.alt}
                width={landingMedia.hero.width}
                height={landingMedia.hero.height}
                priority
                sizes="(max-width: 860px) 100vw, 42vw"
              />
            </div>
          </div>
        </section>

        <LandingLive />
        <LandingPreview />

        <section className="lp-maroon" aria-labelledby="about-strip-heading">
          <div className="lp-wrap">
            <p className="lp-kicker">About</p>
            <h2 id="about-strip-heading">Built around the meals you log.</h2>
            <p>
              Goals, entries, reports, photo extraction, Sage, barcodes, and PDF import sit behind the same APIs. The
              assistant can propose. You still review before anything is saved.
            </p>
            <Link className="lp-maroon-link" to="/about">
              Read about the product
            </Link>
          </div>
        </section>

        <section className="lp-section is-maroon" id="how-it-works" aria-labelledby="how-heading">
          <div className="lp-wrap">
            <p className="lp-kicker">How it works</p>
            <h2 id="how-heading">From meal to insight in seconds.</h2>
            <ol className="lp-how">
              {howSteps.map((step) => (
                <li key={step.n}>
                  <span>{step.n}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
            <p className="lp-tutorial-link">
              <Link to="/tutorial">Walk through the screens</Link>
            </p>
          </div>
        </section>

        <section className="lp-section" id="features" aria-labelledby="features-heading">
          <div className="lp-wrap">
            <p className="lp-kicker">In the product</p>
            <h2 id="features-heading">Logging, today, and the week.</h2>
            {features.map((feature) => (
              <article key={feature.title} className={`lp-feature is-${feature.align}`}>
                <div className="lp-feature-copy">
                  <p className="lp-kicker">{feature.label}</p>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </div>
                <div className={`lp-feature-visual is-${feature.visual}`}>
                  {feature.visual === 'log' ? (
                    <ul className="lp-feature-log">
                      {['Oats', 'Chicken breast', 'Salmon', 'Eggs'].map((name) => (
                        <li key={name}>
                          <FoodThumb name={name} />
                          <span>{name}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {feature.visual === 'today' ? (
                    <div className="lp-feature-today">
                      <strong>1,840</strong>
                      <span>kcal of 2,200</span>
                      <i style={{ width: '84%' }} />
                    </div>
                  ) : null}
                  {feature.visual === 'week' ? (
                    <div className="lp-feature-week">
                      <p>Calories this week</p>
                      <LandingWeekChart height={200} />
                    </div>
                  ) : null}
                  {feature.visual === 'sage' ? (
                    <div className="lp-feature-sage">
                      <p>Not saved yet</p>
                      <strong>Chole bhature</strong>
                      <span>Save meal</span>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-finale" aria-labelledby="finale-heading">
          <div className="lp-wrap">
            <h2 id="finale-heading">Start understanding your food.</h2>
            <p>Track your meals. See your nutrition. Make better decisions.</p>
            <Link className="button button-primary" to="/register">
              Start tracking
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
