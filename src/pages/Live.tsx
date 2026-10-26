import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RadioIcon, RefreshCwIcon } from 'lucide-react';
import { useStudio } from '../contexts/StudioContext';
import { Button } from '../components/ui/Button';
import { StatusChip } from '../components/ui/StatusChip';
import { channelName } from '../components/calls/CallsTable';
import { api } from '../api/client';
import type { CallRecord } from '../types/studio';
import { toCallRecord } from '../utils/callRecords';
import { callPath } from '../utils/routes';
import { envLabel } from '../utils/agentStatus';
import { formatDuration, timeAgo } from '../utils/format';
import { cn } from '../utils/styles';

const REFRESH_MS = 15_000;

/** Calls in progress right now, for every agent: GET /bots/{id}/calls?status=in_progress. */
export function Live() {
  const { agents } = useStudio();
  const [calls, setCalls] = useState<CallRecord[] | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const agentIds = agents.map((a) => a.id).join('|');

  const load = useCallback(async () => {
    const ids = agentIds ? agentIds.split('|') : [];
    setLoading(true);
    const results = await Promise.allSettled(ids.map((id) => api.listCalls(id, { status: 'in_progress', limit: 50 })));
    const found: CallRecord[] = [];
    results.forEach((res, i) => {
      if (res.status === 'fulfilled') res.value.calls.forEach((c) => found.push(toCallRecord(c, ids[i])));
    });
    found.sort((a, b) => b.started_at.localeCompare(a.started_at));
    setCalls(found);
    setFailed(results.flatMap((res, i) => (res.status === 'rejected' ? [ids[i]] : [])));
    setCheckedAt(Date.now());
    setLoading(false);
  }, [agentIds]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const nameOf = (id: string) => agents.find((a) => a.id === id)?.name ?? id;
  const where = (c: CallRecord) => (c.environment === 'test' ? 'Test conversation' : c.environment === 'other' ? `On ${c.ref}` : envLabel(c.environment));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Live</h1>
          <p className="mt-1 text-sm text-muted">
            Calls in progress right now, across all agents. Checked every {REFRESH_MS / 1000} seconds while this page is open
            {checkedAt ? `; last checked ${new Date(checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCwIcon className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden />
          Refresh
        </Button>
      </div>

      {failed.length > 0 && (
        <p role="alert" className="mt-6 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-ink-soft">
          Could not check {failed.map(nameOf).join(', ')}, so calls on {failed.length === 1 ? 'that agent' : 'those agents'} may be missing.
        </p>
      )}

      <section aria-labelledby="live-calls" aria-live="polite" className="mt-6">
        <h2 id="live-calls" className="sr-only">Calls in progress</h2>
        {!calls ? (
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface" aria-busy="true" aria-label="Loading">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-4">
                <div className="h-4 w-40 animate-pulse rounded bg-subtle" />
                <div className="h-4 w-24 animate-pulse rounded bg-subtle" />
              </li>
            ))}
          </ul>
        ) : calls.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-12 text-center">
            <RadioIcon className="mx-auto h-6 w-6 text-muted" aria-hidden />
            <p className="mt-2 text-sm font-medium text-ink">No calls in progress</p>
            <p className="mt-1 text-xs text-muted">
              {agents.length === 0 ? 'There are no agents yet.' : `Checked ${agents.length} ${agents.length === 1 ? 'agent' : 'agents'}.`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {calls.map((c) => (
              <li key={c.id}>
                <Link
                  to={callPath(c.agentId, c.id)}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-success" aria-hidden />
                      <span className="text-sm font-medium text-ink">{c.caller}</span>
                      <StatusChip>{channelName[c.channel]}</StatusChip>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      <span title={c.agentId}>{nameOf(c.agentId)}</span> · {where(c)} · version {c.version}
                    </p>
                  </div>
                  <span className="text-xs text-muted" title={c.started_at}>
                    Started {timeAgo(c.started_at)}
                    {c.duration_s > 0 ? ` · ${formatDuration(c.duration_s)} recorded so far` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
