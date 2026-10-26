import { Link } from 'react-router-dom';
import { BarChart3Icon } from 'lucide-react';

/**
 * Workspace analytics are not built yet (Phase 2.4: monitoring from call records). Until then this page says so instead
 * of showing numbers. The per-agent Monitor tab and the Calls list show real call records today.
 */
export function Analytics() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 lg:px-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Analytics</h1>
      <div className="mt-6 rounded-xl border border-dashed border-line p-10 text-center">
        <BarChart3Icon className="mx-auto h-7 w-7 text-muted" aria-hidden />
        <p className="mt-3 text-sm font-medium text-ink">Workspace analytics are not available yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          Calls per day, hand-over and cut-off rates and time to answer across all agents will be worked out from call records.
          Until then, each agent’s Monitor tab and the Calls list show the real calls.
        </p>
        <Link
          to="/calls"
          className="mt-4 inline-block rounded text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          Open Calls
        </Link>
      </div>
    </div>
  );
}
