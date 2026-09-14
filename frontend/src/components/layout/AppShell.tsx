import { useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Camera,
  FileUp,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Target,
  TrendingUp,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { LogFoodProvider, useLogFood } from '../meals/LogFoodProvider';
import { FloatingFoods } from '../../lib/food-art';

const primaryNav: Array<{ to: string; label: string; icon: LucideIcon }> = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/meals', label: 'Food', icon: UtensilsCrossed },
  { to: '/reports', label: 'Progress', icon: TrendingUp },
  { to: '/goals', label: 'Goals', icon: Target },
];

const extraNav: Array<{ to: string; label: string; icon: LucideIcon }> = [
  { to: '/scan', label: 'Scan', icon: Camera },
  { to: '/chat', label: 'Chat', icon: MessageCircle },
  { to: '/import', label: 'Import', icon: FileUp },
];

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
  const { openLogFood } = useLogFood();
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
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon size={18} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <nav className="sidebar-nav sidebar-nav-extra" aria-label="More">
          {extraNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon size={18} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <p className="topbar-email">{user?.email}</p>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
          >
            <LogOut size={16} aria-hidden="true" />
            {loggingOut ? 'Signing out…' : 'Log out'}
          </button>
        </div>
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
            <Menu size={18} />
          </button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Mobile">
        <NavLink to="/dashboard" className={({ isActive }) => `bottom-nav-link ${isActive ? 'is-active' : ''}`}>
          <LayoutDashboard size={20} />
          Home
        </NavLink>
        <button type="button" className="bottom-nav-log" onClick={openLogFood}>
          <Plus size={22} />
          Log
        </button>
        <NavLink to="/reports" className={({ isActive }) => `bottom-nav-link ${isActive ? 'is-active' : ''}`}>
          <TrendingUp size={20} />
          Progress
        </NavLink>
        <NavLink to="/goals" className={({ isActive }) => `bottom-nav-link ${isActive ? 'is-active' : ''}`}>
          <Target size={20} />
          Goals
        </NavLink>
      </nav>
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
      <div className="auth-atmosphere" aria-hidden="true">
        <span className="auth-blob auth-blob-1" />
        <span className="auth-blob auth-blob-2" />
        {FloatingFoods.map((Art, index) => (
          <span className={`auth-float auth-float-${index + 1}`} key={index}>
            <Art />
          </span>
        ))}
      </div>
      <div className="auth-main">
        <div className="auth-panel">
          <span className="brand-mark">CT</span>
          <p className="brand-name">Calorie Tracker</p>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
          {footer}
        </div>
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
        <strong>
          {current} / {target} {unit}
        </strong>
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
