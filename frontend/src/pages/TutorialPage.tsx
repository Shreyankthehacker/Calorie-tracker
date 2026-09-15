import { Link } from 'react-router-dom';
import { LandingFooter } from './landing/LandingFooter';
import { LandingNav } from './landing/LandingNav';
import { LandingTutorial } from './landing/LandingTutorial';

export function TutorialPage() {
  return (
    <div className="page-landing page-tutorial">
      <a className="lp-skip" href="#tutorial-heading">
        Skip to content
      </a>
      <LandingNav />
      <main>
        <LandingTutorial asPage />
        <section className="lp-finale" aria-labelledby="tutorial-finale-heading">
          <div className="lp-wrap">
            <h2 id="tutorial-finale-heading">Ready when you are.</h2>
            <p>Create an account and log the next meal you actually eat.</p>
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
