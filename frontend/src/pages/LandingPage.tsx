import { Link } from 'react-router-dom';
import { BrandMark, BrandWord } from '../components/layout/BrandMark';

const ledgerDate = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(new Date());

export function LandingPage() {
  return (
    <div className="page-landing">
      <header className="landing-nav">
        <Link to="/" className="landing-brand" aria-label="CalorieTracker home">
          <BrandMark />
          <BrandWord />
        </Link>
        <Link className="landing-nav-link" to="/login">
          Sign in
        </Link>
      </header>

      <main className="landing-hero">
        <div className="landing-copy">
          <p className="kicker">A personal ration ledger</p>
          <h1>Write down the meal. Then look at the day.</h1>
          <p className="landing-lede">
            CalorieTracker is a quiet book for what you ate — catalog, photo, barcode, or a dish you name
            yourself. Sage can propose a plate. Nothing is saved until you say so.
          </p>
          <div className="landing-actions">
            <Link className="button button-primary" to="/login">
              Sign in
            </Link>
            <Link className="button button-secondary" to="/get-started">
              Get started
            </Link>
          </div>
          <p className="landing-aside">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </div>

        <aside className="landing-ledger" aria-hidden="true">
          <div className="ledger-spine" />
          <div className="ledger-page">
            <p className="ledger-date">{ledgerDate}</p>
            <ol className="ledger-lines">
              <li>
                <span>Breakfast</span>
                <span className="ledger-blank" />
              </li>
              <li>
                <span>Lunch</span>
                <span>still empty</span>
              </li>
              <li>
                <span>Dinner</span>
                <span className="ledger-blank" />
              </li>
              <li className="is-accent">
                <span>The point</span>
                <span>fill the line, not the lecture</span>
              </li>
            </ol>
            <p className="ledger-foot">Stay signed in on this browser — other tabs keep the same session.</p>
          </div>
        </aside>
      </main>
    </div>
  );
}
