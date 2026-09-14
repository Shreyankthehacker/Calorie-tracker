import { useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { LogFoodProvider } from '../meals/LogFoodProvider';
import { BrandMark, BrandWord } from './BrandMark';
import { bonusNav, crumbs, toolsNav, trackNav, type NavItem } from './nav-config';
import { SiteFooter } from './SiteFooter';

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
  const crumb = crumbs[location.pathname] ?? 'Today';
  const displayName = user?.email?.split('@')[0] ?? 'You';

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <BrandMark />
          <BrandWord />
        </div>
        <SidebarNav label="Track" items={trackNav} />
        <SidebarNav label="Bonus" items={bonusNav} />
        <SidebarNav label="Tools" items={toolsNav} />
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
            <button type="button" className="signout" onClick={() => void handleLogout()} disabled={loggingOut}>
              {loggingOut ? 'Signing out…' : 'Sign out'}
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
            <button type="button" className="header-icon-btn" title="Notifications">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4 6.5a4 4 0 0 1 8 0c0 3 1.2 3.8 1.2 4.3H2.8C2.8 10.3 4 9.5 4 6.5Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                <path d="M6.3 13a1.8 1.8 0 0 0 3.4 0" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              <span className="badge">2</span>
            </button>
            <button type="button" className="header-icon-btn" title="Settings">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.3" />
                <path
                  d="M8 2.5v1.4M8 12.1v1.4M13.5 8h-1.4M3.9 8H2.5M11.7 4.3l-1 1M5.3 10.7l-1 1M11.7 11.7l-1-1M5.3 5.3l-1-1"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <div className="header-powered">
              Powered by <b>Typeface</b>
            </div>
          </div>
        </div>
        <Outlet />
        <SiteFooter />
      </main>
    </div>
  );
}

function SidebarNav({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <>
      <div className="nav-label">{label}</div>
      <nav aria-label={label}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            {...(item.end ? { end: true } : {})}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            {item.icon}
            {item.label}
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
