import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';
import { AuthProvider } from '../auth/AuthProvider';
import { ToastProvider } from '../components/ui/ToastProvider';
import { LogFoodProvider } from '../components/meals/LogFoodProvider';

export function renderWithProviders(
  ui: ReactElement,
  options?: { route?: string; withAuth?: boolean },
) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const route = options?.route ?? '/';
  const withAuth = options?.withAuth ?? true;

  function Wrapper({ children }: { children: ReactNode }) {
    const tree = withAuth ? <AuthProvider>{children}</AuthProvider> : children;
    return (
      <QueryClientProvider client={client}>
        <ToastProvider>
          <MemoryRouter initialEntries={[route]}>
            <LogFoodProvider>{tree}</LogFoodProvider>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}
