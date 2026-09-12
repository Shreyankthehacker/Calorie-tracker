import { useQuery } from '@tanstack/react-query';
import { fetchHealth, type HealthResponse } from './api/health';

export function App() {
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    retry: 1,
  });

  return (
    <main className="shell">
      <p className="brand">Calorie Tracker</p>
      <h1>Personal nutrition tracking</h1>
      <p className="lede">Phase 0 shell — verifying frontend to backend connectivity.</p>

      <section className="status" aria-live="polite">
        <h2>Backend health</h2>
        {healthQuery.isPending && <p>Checking API…</p>}
        {healthQuery.isError && (
          <p className="error">
            Could not reach the API. Is the backend running on{' '}
            {import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'}?
          </p>
        )}
        {healthQuery.data && <HealthDetails data={healthQuery.data} />}
      </section>
    </main>
  );
}

function HealthDetails({ data }: { data: HealthResponse }) {
  return (
    <dl>
      <div>
        <dt>Status</dt>
        <dd>{data.status}</dd>
      </div>
      <div>
        <dt>Database</dt>
        <dd>{data.database}</dd>
      </div>
      <div>
        <dt>Timestamp</dt>
        <dd>{data.timestamp}</dd>
      </div>
    </dl>
  );
}
