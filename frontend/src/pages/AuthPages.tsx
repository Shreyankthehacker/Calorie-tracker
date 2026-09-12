import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { Alert, AuthLayout, FormField, useFormSubmit } from '../components/layout/AppShell';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { submitting, error, handleSubmit, setError } = useFormSubmit(async () => {
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      throw new Error('Email and password are required.');
    }
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      throw err;
    }
  });

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to track meals, goals, and nutrition progress."
      footer={
        <p className="auth-footer">
          New here? <Link to="/register">Create an account</Link>
        </p>
      }
    >
      <form className="stack-form" onSubmit={handleSubmit} noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <FormField label="Email" htmlFor="login-email">
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Password" htmlFor="login-password">
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormField>
        <button className="button button-primary" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { submitting, error, handleSubmit, setError } = useFormSubmit(async () => {
    if (!email.trim() || password.length < 8) {
      setError('Use a valid email and a password of at least 8 characters.');
      throw new Error('Use a valid email and a password of at least 8 characters.');
    }
    try {
      await register(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      throw err;
    }
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set nutrition goals and track intake in one place."
      footer={
        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      }
    >
      <form className="stack-form" onSubmit={handleSubmit} noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <FormField label="Email" htmlFor="register-email">
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormField>
        <FormField
          label="Password"
          htmlFor="register-password"
          hint="At least 8 characters"
        >
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </FormField>
        <button className="button button-primary" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
