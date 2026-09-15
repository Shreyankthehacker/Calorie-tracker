import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark, BrandWord } from '../../components/layout/BrandMark';

const links = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#tutorial', label: 'Tutorial' },
];

export function LandingNav() {
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setStuck(window.scrollY > 16);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    function onResize() {
      if (window.matchMedia('(min-width: 981px)').matches) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <header className={`lp-nav${stuck ? ' is-stuck' : ''}`}>
      <div className="lp-nav-inner">
        <Link to="/" className="lp-brand" aria-label="CalorieTracker home">
          <BrandMark size={32} />
          <BrandWord />
        </Link>

        <nav className="lp-nav-links" aria-label="Landing">
          {links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          <Link to="/login">Sign in</Link>
        </nav>

        <div className="lp-nav-end">
          <Link className="button button-primary lp-cta" to="/register">
            Start tracking
          </Link>
          <button
            type="button"
            className="lp-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="lp-mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="lp-menu-bars" data-open={open} />
          </button>
        </div>
      </div>

      {open ? (
        <nav id="lp-mobile-nav" className="lp-mobile" aria-label="Landing mobile">
          {links.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <Link to="/login" onClick={() => setOpen(false)}>
            Sign in
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
