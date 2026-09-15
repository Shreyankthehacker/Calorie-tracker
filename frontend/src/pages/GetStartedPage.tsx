import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark, BrandWord } from '../components/layout/BrandMark';
import { useAuth } from '../auth/AuthProvider';

type Sitting = {
  title: string;
  body: string;
  plate: 'empty' | 'receipt' | 'ring' | 'sage' | 'stack';
};

const sittings: Sitting[] = [
  {
    title: 'The table is set. The plate is empty.',
    body: 'You do not start with a diet. You start with a blank day. The first honest move is to write what you already ate — not what you meant to eat.',
    plate: 'empty',
  },
  {
    title: 'A meal is a line in the book.',
    body: 'Log from the shared catalog, a photo, a barcode, or a name you type yourself. Quantity first. Calories and macros follow. The receipt lands on the plate.',
    plate: 'receipt',
  },
  {
    title: 'Today is a ring, not a verdict.',
    body: 'Set one current goal — calories and macros for a day. Today draws a ring around the plate. Going over is visible. It is not a scolding.',
    plate: 'ring',
  },
  {
    title: 'Sage proposes. You confirm.',
    body: 'Ask Sage to estimate a homemade plate. A crimson card appears. Nothing is logged until you press Save meal. If you do not confirm, it never happened.',
    plate: 'sage',
  },
  {
    title: 'The week is a stack of receipts.',
    body: 'Entries is the log, newest first. Reports is the week against the same goal. That is the whole tool — a ledger you can actually finish using.',
    plate: 'stack',
  },
];

function Plate({ kind }: { kind: Sitting['plate'] }) {
  return (
    <div className={`tour-plate is-${kind}`}>
      <div className="plate-rim">
        <div className="plate-well">
          {kind === 'empty' ? <p className="plate-empty">waiting</p> : null}
          {kind === 'receipt' || kind === 'ring' || kind === 'sage' || kind === 'stack' ? (
            <article className="plate-slip">
              <p>Lunch</p>
              <strong>Chole bhature</strong>
              <span>1 plate, 620 kcal</span>
            </article>
          ) : null}
          {kind === 'stack' ? (
            <article className="plate-slip is-under">
              <p>Breakfast</p>
              <strong>2 eggs</strong>
              <span>144 kcal</span>
            </article>
          ) : null}
        </div>
      </div>
      {kind === 'ring' || kind === 'sage' || kind === 'stack' ? <div className="plate-ring" /> : null}
      {kind === 'sage' || kind === 'stack' ? (
        <aside className="plate-note">
          <p>Sage</p>
          <span>Save this meal?</span>
        </aside>
      ) : null}
    </div>
  );
}

export function GetStartedPage() {
  const { isAuthenticated } = useAuth();
  const [index, setIndex] = useState(0);
  const sitting = sittings[Math.min(index, sittings.length - 1)]!;
  const last = index === sittings.length - 1;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        setIndex((current) => Math.min(current + 1, sittings.length - 1));
      }
      if (event.key === 'ArrowLeft') {
        setIndex((current) => Math.max(current - 1, 0));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="page-tour">
      <header className="landing-nav">
        <Link to="/" className="landing-brand" aria-label="CalorieTracker home">
          <BrandMark />
          <BrandWord />
        </Link>
        <Link className="landing-nav-link" to={isAuthenticated ? '/dashboard' : '/login'}>
          {isAuthenticated ? 'Open Today' : 'Sign in'}
        </Link>
      </header>

      <div className="tour-progress" aria-hidden="true">
        <span style={{ width: `${((index + 1) / sittings.length) * 100}%` }} />
      </div>

      <main className="tour-stage">
        <Plate kind={sitting.plate} />
        <section className="tour-copy">
          <p className="kicker">
            Sitting {index + 1} of {sittings.length}
          </p>
          <h1>{sitting.title}</h1>
          <p>{sitting.body}</p>
          <div className="tour-actions">
            {index > 0 ? (
              <button type="button" className="button button-secondary" onClick={() => setIndex(index - 1)}>
                Back
              </button>
            ) : (
              <Link className="button button-secondary" to="/">
                Back to home
              </Link>
            )}
            {last ? (
              isAuthenticated ? (
                <Link className="button button-primary" to="/dashboard">
                  Open Today
                </Link>
              ) : (
                <>
                  <Link className="button button-primary" to="/register">
                    Create an account
                  </Link>
                  <Link className="button button-secondary" to="/login">
                    Sign in
                  </Link>
                </>
              )
            ) : (
              <button type="button" className="button button-primary" onClick={() => setIndex(index + 1)}>
                Continue
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
