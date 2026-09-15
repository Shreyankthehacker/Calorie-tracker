import { Link } from 'react-router-dom';
import { BrandWord } from '../../components/layout/BrandMark';

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-footer-grid">
        <div>
          <BrandWord />
          <p>A personal calorie tracker for meals you actually logged.</p>
        </div>
        <nav aria-label="Footer">
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          <Link to="/#features">Features</Link>
          <Link to="/tutorial">Tutorial</Link>
          <Link to="/login">Sign in</Link>
          <Link to="/register">Start tracking</Link>
        </nav>
        <p className="lp-copy">© {new Date().getFullYear()} CalorieTracker</p>
      </div>
    </footer>
  );
}
