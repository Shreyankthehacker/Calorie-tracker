import { Link } from 'react-router-dom';
import { BrandWord } from '../components/layout/BrandMark';
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
      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-grid">
          <div>
            <BrandWord />
            <p>A personal calorie tracker for meals you actually logged.</p>
          </div>
          <nav aria-label="Footer">
            <Link to="/">Home</Link>
            <Link to="/#how-it-works">How it works</Link>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Start tracking</Link>
          </nav>
          <p className="lp-copy">© {new Date().getFullYear()} CalorieTracker</p>
        </div>
      </footer>
    </div>
  );
}
