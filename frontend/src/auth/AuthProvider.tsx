/**
 * Session state. Tokens live in localStorage; the access JWT is sent as Bearer.
 * Identity always comes from GET /auth/me, never from a userId field in the UI.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import { ApiError, type PublicUser } from '../api/types';
import { tokenStorage } from '../api/tokenStorage';

type AuthContextValue = {
  user: PublicUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [sessionVersion, setSessionVersion] = useState(0);
  const hasSession = tokenStorage.hasSession();
  const [bootstrapped, setBootstrapped] = useState(() => !hasSession);

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getCurrentUser,
    enabled: hasSession,
    retry: false,
  });

  useEffect(() => {
    if (!tokenStorage.hasSession()) {
      setBootstrapped(true);
      return;
    }
    if (!meQuery.isFetching) {
      setBootstrapped(true);
    }
  }, [meQuery.isFetching, sessionVersion]);

  useEffect(() => {
    if (meQuery.isError && meQuery.error instanceof ApiError && meQuery.error.status === 401) {
      tokenStorage.clear();
      queryClient.removeQueries({ queryKey: ['auth', 'me'] });
      setSessionVersion((value) => value + 1);
    }
  }, [meQuery.isError, meQuery.error, queryClient]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (!tokenStorage.isAuthKey(event.key)) {
        return;
      }
      if (!tokenStorage.hasSession()) {
        queryClient.removeQueries({ queryKey: ['auth', 'me'] });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      }
      setSessionVersion((value) => value + 1);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [queryClient]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login({ email, password });
      queryClient.setQueryData(['auth', 'me'], result.user);
      setSessionVersion((value) => value + 1);
    },
    [queryClient],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const result = await authApi.register({ email, password, timezone });
      queryClient.setQueryData(['auth', 'me'], result.user);
      setSessionVersion((value) => value + 1);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    queryClient.clear();
    navigate('/', { replace: true });
    setSessionVersion((value) => value + 1);
  }, [navigate, queryClient]);

  const user = hasSession ? (meQuery.data ?? null) : null;
  const isLoading = !bootstrapped || (hasSession && meQuery.isPending);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user) && hasSession,
      login,
      register,
      logout,
    }),
    [user, isLoading, hasSession, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
