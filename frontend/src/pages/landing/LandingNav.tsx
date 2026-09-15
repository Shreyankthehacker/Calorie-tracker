import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BrandMark, BrandWord } from '../../components/layout/BrandMark';

function NavIcon({ path }: { path: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d={path} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const links: { to: string; label: string; icon: ReactNode }[] = [
  {
    to: '/about',
    label: 'About',
    icon: <NavIcon path="M8 14.2A6.2 6.2 0 1 0 8 1.8a6.2 6.2 0 0 0 0 12.4ZM8 7.2V11M8 5.2v.2" />,
  },
  {
    to: '/#features',
    label: 'Features',
    icon: <NavIcon path="M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z" />,
  },
  {
    to: '/tutorial',
    label: 'Tutorial',
    icon: <NavIcon path="M3 3.5h10v9H3zM6.5 6.5 10 8 6.5 9.5z" />,
  },
  {
    to: '/login',
    label: 'Sign in',
    icon: <NavIcon path="M8 8.2A2.4 2.4 0 1 0 8 3.4a2.4 2.4 0 0 0 0 4.8ZM3.2 13.2c.9-2 2.7-3.1 4.8-3.1s3.9 1.1 4.8 3.1" />,
  },
];

export function LandingNav() {
  const { pathname } = useLocation();
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
    <header className={`lp-nav${stuck ? ' is-stuck' : ''}${open ? ' is-open' : ''}`}>
      <div className="lp-nav-inner">
        <Link to="/" className="lp-brand" aria-label="CalorieTracker home">
          <BrandMark size={32} />
          <BrandWord />
        </Link>

        <nav className="lp-nav-links" aria-label="Landing">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={pathname === link.to ? 'is-active' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="lp-nav-end">
          <nav className="lp-nav-icons" aria-label="Landing shortcuts">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                aria-label={link.label}
                title={link.label}
                className={pathname === link.to ? 'is-active' : undefined}
              >
                {link.icon}
              </Link>
            ))}
          </nav>
          <Link className="button button-primary lp-cta" to="/register">
            Start tracking
          </Link>
          <button
            type="button"
            className="lp-menu"
            aria-label={open ? 'Hide menu' : 'Show menu'}
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
            <Link key={link.to} to={link.to} onClick={() => setOpen(false)}>
              {link.icon}
              {link.label}
            </Link>
          ))}
          <Link className="button button-primary lp-mobile-cta" to="/register" onClick={() => setOpen(false)}>
            Start tracking
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
