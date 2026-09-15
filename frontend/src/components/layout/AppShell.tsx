import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { LogFoodProvider } from '../meals/LogFoodProvider';
import { BrandMark, BrandWord } from './BrandMark';
import { bonusNav, crumbs, toolsNav, trackNav, type NavItem } from './nav-config';
import { SiteFooter } from './SiteFooter';
import { SageDock } from '../chat/SageDock';

export function AppShell() {
  return (
    <LogFoodProvider>
      <AppShellInner />
    </LogFoodProvider>
  );
}

function AppShellInner() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const crumb = crumbs[location.pathname] ?? 'Today';
  const displayName = user?.email?.split('@')[0] ?? 'You';

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setNavOpen(false);
      }
    }
    function onResize() {
      if (window.matchMedia('(min-width: 861px)').matches) {
        setNavOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (!navOpen) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [navOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className={`app${navOpen ? ' nav-open' : ''}`}>
      {navOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      <aside className={`sidebar${navOpen ? ' is-open' : ''}`} aria-label="App">
        <div className="sidebar-head">
          <div className="brand">
            <BrandMark />
            <BrandWord />
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={navOpen ? 'Hide navigation' : 'Show navigation'}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            <span className="sidebar-toggle-bars" data-open={navOpen} />
          </button>
        </div>
        <div className="sidebar-navs">
          <SidebarNav label="Track" items={trackNav} onNavigate={() => setNavOpen(false)} />
          <SidebarNav label="Tools" items={bonusNav} onNavigate={() => setNavOpen(false)} />
          <SidebarNav label="Additionals" items={toolsNav} onNavigate={() => setNavOpen(false)} />
        </div>
        <div className="sidebar-foot">
          <div className="sage-pill">
            <span className="dot" /> Sage assistant active
          </div>
          <div className="user-row">
            <img src={`https://picsum.photos/seed/${encodeURIComponent(displayName)}/64/64`} alt="" />
            <div>
              <div className="name">{displayName}</div>
              <div className="tier">Free tier</div>
            </div>
            <button
              type="button"
              className="signout"
              aria-label={loggingOut ? 'Signing out…' : 'Sign out'}
              onClick={() => void handleLogout()}
              disabled={loggingOut}
            >
              <svg className="signout-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M6.5 3H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.5M10 11.5 13 8l-3-3.5M13 8H6"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="signout-text">{loggingOut ? 'Signing out…' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      </aside>
      <main>
        <div className="site-header">
          <div className="crumb">
            Ration ledger &nbsp;/&nbsp; <b>{crumb}</b>
          </div>
          <div className="header-search">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="4.5" stroke="#7A756E" strokeWidth="1.3" />
              <path d="M9.5 9.5 13 13" stroke="#7A756E" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input type="text" placeholder="Search foods, entries, or ask Sage…" />
          </div>
          <div className="header-actions">
            <div className="header-powered">
              Powered by <b>Typeface</b>
            </div>
          </div>
        </div>
        <Outlet />
        <SiteFooter />
      </main>
      <SageDock />
    </div>
  );
}

function SidebarNav({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="nav-label">{label}</div>
      <nav aria-label={label}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            aria-label={item.label}
            onClick={onNavigate}
            {...(item.end ? { end: true } : {})}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            {item.icon}
            <span className="nav-text">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="field" htmlFor={htmlFor}>
      <span className="field-label">{label}</span>
      {children}
      {hint && !error ? <span className="field-hint">{hint}</span> : null}
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function Alert({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'error' | 'success';
  children: ReactNode;
}) {
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function SkeletonBlock({ label }: { label: string }) {
  return (
    <div className="skeleton-stack" aria-busy="true">
      <p className="sr-only">{label}</p>
      <div className="skeleton skeleton-lg" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}

export function useFormSubmit(
  onSubmit: () => Promise<void>,
): {
  submitting: boolean;
  error: string | null;
  handleSubmit: (event: FormEvent) => void;
  setError: (value: string | null) => void;
} {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    void onSubmit()
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      })
      .finally(() => setSubmitting(false));
  }

  return { submitting, error, handleSubmit, setError };
}
