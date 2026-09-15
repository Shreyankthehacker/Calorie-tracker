import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BrandMark, BrandWord } from '../components/layout/BrandMark';
import { useAuth } from '../auth/AuthProvider';
import { Alert } from '../components/ui/Alert';
import { useFormSubmit } from '../hooks/useFormSubmit';

function AuthSplit({
  kicker,
  title,
  subtitle,
  children,
  footer,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="split">
      <div className="brand-panel">
        <div className="bgimg">
          <img
            src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80&auto=format&fit=crop"
            onError={(event) => {
              event.currentTarget.src = 'https://picsum.photos/seed/loginhero/1200/900';
            }}
            alt=""
          />
        </div>
        <div className="brand">
          <BrandMark />
          <BrandWord />
        </div>
        <div className="pitch">
          <div className="eyebrow">Welcome back</div>
          <h1>Your ledger, your pace.</h1>
          <p>
            Log meals in seconds, scan barcodes for instant macros, track family nutrition together, and let Sage
            give you grounded, specific guidance — never a generic limit unless you set one.
          </p>
        </div>
        <div className="stat-row">
          <div className="stat">
            <div className="n">2,400+</div>
            <div className="l">ingredients indexed</div>
          </div>
          <div className="stat">
            <div className="n">400K+</div>
            <div className="l">barcodes recognized</div>
          </div>
          <div className="stat">
            <div className="n">12-day</div>
            <div className="l">average active streak</div>
          </div>
        </div>
      </div>
      <div className="form-panel">
        <div className="form-wrap">
          <div className="kicker">{kicker}</div>
          <h2>{title}</h2>
          <p className="sub">{subtitle}</p>
          {children}
          {footer}
          <div className="powered-note">
            <b>CalorieTracker</b> powered by Typeface
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { submitting, error, handleSubmit } = useFormSubmit(async () => {
    if (!email.trim() || !password) {
      throw new Error('Email and password are required.');
    }
    await login(email.trim(), password);
    navigate(from, { replace: true });
  });

  return (
    <AuthSplit
      kicker="Sign in"
      title="Welcome back"
      subtitle="Enter your details to get back to your ledger."
      footer={
        <div className="switch-line">
          New to CalorieTracker? <Link to="/register">Create an account</Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <div className="field">
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="auth-persist">
        Stay signed in on this browser for 30 days. Open another tab and you will still be in.
      </p>
    </AuthSplit>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { submitting, error, handleSubmit } = useFormSubmit(async () => {
    if (!email.trim() || password.length < 8) {
      throw new Error('Use a valid email and a password of at least 8 characters.');
    }
    await register(email.trim(), password);
    navigate('/dashboard', { replace: true });
  });

  return (
    <AuthSplit
      kicker="Create account"
      title="Create your account"
      subtitle="Set nutrition goals and track intake in one place."
      footer={
        <div className="switch-line">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <div className="field">
          <label htmlFor="register-email">Email address</label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </div>
        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthSplit>
  );
}

