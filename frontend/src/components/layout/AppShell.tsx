import { useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/goals', label: 'Goals' },
  { to: '/meals', label: 'Meals' },
  { to: '/reports', label: 'Reports' },
  { to: '/scan', label: 'Scan' },
  { to: '/chat', label: 'Chat' },
  { to: '/import', label: 'Import' },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">CT</span>
          <div>
            <p className="brand-name">Calorie Tracker</p>
            <p className="brand-sub">Personal nutrition</p>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="shell-main">
        <header className="topbar">
          <button
            type="button"
            className="icon-button mobile-only"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            Menu
          </button>
          <div className="topbar-user">
            <p className="topbar-email">{user?.email}</p>
            <button
              type="button"
              className="button button-ghost"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
            >
              {loggingOut ? 'Signing out…' : 'Log out'}
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="auth-layout">
      <div className="auth-panel">
        <p className="brand-name">Calorie Tracker</p>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
        {footer}
      </div>
    </div>
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

export function ProgressBar({
  label,
  current,
  target,
  unit,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div className="progress-row">
      <div className="progress-meta">
        <span>{label}</span>
        <span>
          {current} / {target} {unit}
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} progress`}
      >
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
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
