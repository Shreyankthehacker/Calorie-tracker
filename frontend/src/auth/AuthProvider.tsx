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
  const [bootstrapped, setBootstrapped] = useState(() => !tokenStorage.getAccessToken());

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getCurrentUser,
    enabled: Boolean(tokenStorage.getAccessToken()),
    retry: false,
  });

  useEffect(() => {
    if (!tokenStorage.getAccessToken()) {
      setBootstrapped(true);
      return;
    }
    if (!meQuery.isFetching) {
      setBootstrapped(true);
    }
  }, [meQuery.isFetching]);

  useEffect(() => {
    if (meQuery.isError && meQuery.error instanceof ApiError && meQuery.error.status === 401) {
      tokenStorage.clear();
    }
  }, [meQuery.isError, meQuery.error]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login({ email, password });
      queryClient.setQueryData(['auth', 'me'], result.user);
    },
    [queryClient],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const result = await authApi.register({ email, password, timezone });
      queryClient.setQueryData(['auth', 'me'], result.user);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    queryClient.clear();
  }, [queryClient]);

  const user = meQuery.data ?? null;
  const isLoading = !bootstrapped || (Boolean(tokenStorage.getAccessToken()) && meQuery.isPending);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
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
