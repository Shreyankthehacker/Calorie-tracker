/**
 * Public about page: what CalorieTracker is, and every feature that shipped.
 */
import { Link } from 'react-router-dom';
import { LandingFooter } from './landing/LandingFooter';
import { LandingNav } from './landing/LandingNav';
import { aboutFeatureGroups } from './landing/about-features';

export function AboutPage() {
  return (
    <div className="page-landing page-about">
      <a className="lp-skip" href="#about-heading">
        Skip to content
      </a>
      <LandingNav />

      <main>
        <section className="lp-about-hero" aria-labelledby="about-heading">
          <div className="lp-wrap">
            <p className="lp-kicker">About us</p>
            <h1 id="about-heading">A tracker for meals you actually ate.</h1>
            <p className="lp-lede">
              CalorieTracker is a personal nutrition app: log breakfast through snacks, set a current goal, and read
              reports from those entries. The browser talks to a REST API. AI can propose numbers. You still review
              them before anything is saved.
            </p>
          </div>
        </section>

        {aboutFeatureGroups.map((group) => (
          <section key={group.title} className="lp-section lp-about-group" aria-labelledby={slug(group.title)}>
            <div className="lp-wrap">
              <p className="lp-kicker">{group.title}</p>
              <h2 id={slug(group.title)}>{group.intro}</h2>
              <ul className="lp-about-grid">
                {group.items.map((item) => (
                  <li key={item.title}>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}

        <section className="lp-finale" aria-labelledby="about-finale-heading">
          <div className="lp-wrap">
            <h2 id="about-finale-heading">Start with today&apos;s meals.</h2>
            <p>Create an account, set a goal if you want one, and log the next thing you eat.</p>
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

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
