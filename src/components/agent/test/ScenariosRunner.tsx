import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '../../ui/Toast';
import { FlaskConicalIcon, LoaderCircleIcon, PlayIcon, RefreshCwIcon, TriangleAlertIcon } from 'lucide-react';
import { Button } from '../../ui/Button';
import { StatusChip } from '../../ui/StatusChip';
import { Tooltip } from '../../ui/Tooltip';
import { Accordion, AccordionContent, AccordionHeader, AccordionItem } from '../../ui/accordion';
import { cn } from '../../../utils/styles';
import { api } from '../../../api/client';
import type { Scenario, TestRun } from '../../../api/types';
import { expectationLabel, readableId, runCounts, runNotes } from '../../../utils/testRuns';
import { formatDateTime } from '../../../utils/format';

interface ScenariosRunnerProps {
  agentId: string;
}

const POLL_MS = 1500;

/** The draft's test scenarios (GET /tests), run on the server (POST /tests/run) with the results it reports. */
export function ScenariosRunner({ agentId }: ScenariosRunnerProps) {
  const [scenarios, setScenarios] = useState<Scenario[] | null>(null);
  const [latestRun, setLatestRun] = useState<TestRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // What is running: one scenario id, or 'all'.
  const [running, setRunning] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const pollRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tests, runs] = await Promise.all([api.listTests(agentId), api.listTestRuns(agentId, 1)]);
      setScenarios(tests.scenarios);
      // The list leaves out per-scenario notes; the newest run is fetched whole for them.
      setLatestRun(runs[0] ? await api.getTestRun(agentId, runs[0].run_id) : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load the test scenarios.');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void load();
    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
    };
  }, [load]);

  const run = async (scenarioId: string | null) => {
    setRunning(scenarioId ?? 'all');
    try {
      const started = await api.runTests(agentId, scenarioId ? { scenarios: [scenarioId] } : {});
      pollRef.current = window.setInterval(async () => {
        try {
          const result = await api.getTestRun(agentId, started.run_id);
          if (result.status === 'running') return;
          if (pollRef.current !== null) window.clearInterval(pollRef.current);
          pollRef.current = null;
          setRunning(null);
          setLatestRun(result);
          void load();
          const summary = runCounts(result);
          if (result.status === 'passed') toast.success(`Tests finished: ${summary}`);
          else toast.error(`Tests ${result.status}: ${summary}`, { description: result.error ?? undefined });
        } catch (err: unknown) {
          if (pollRef.current !== null) window.clearInterval(pollRef.current);
          pollRef.current = null;
          setRunning(null);
          toast.error('Lost track of the test run', { description: err instanceof Error ? err.message : undefined });
        }
      }, POLL_MS);
    } catch (err: unknown) {
      setRunning(null);
      toast.error('The server did not start the tests', { description: err instanceof Error ? err.message : undefined });
    }
  };

  const list = scenarios ?? [];
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = list.slice((safePage - 1) * pageSize, safePage * pageSize);
  const notes = latestRun ? runNotes(latestRun) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Test scenarios</h2>
          <p className="text-xs text-muted">Scripted conversations in this draft, run on the server against the saved draft.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCwIcon className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => void run(null)} disabled={!!running || list.length === 0}>
            {running === 'all' ? (
              <>
                <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden />
                Running…
              </>
            ) : (
              <>
                <PlayIcon className="h-3.5 w-3.5" aria-hidden />
                Run all ({list.length})
              </>
            )}
          </Button>
        </div>
      </div>

      {latestRun && (
        <section aria-labelledby="latest-run" className="rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="latest-run" className="text-sm font-medium text-ink">Latest run</h3>
            <StatusChip tone={latestRun.status === 'passed' ? 'success' : latestRun.status === 'running' ? 'info' : 'danger'} dot>
              {latestRun.status}
            </StatusChip>
            <span className="text-xs text-muted" title={latestRun.run_id}>
              {runCounts(latestRun)} · {formatDateTime(latestRun.started_at)}
              {latestRun.ref ? ` · on ${latestRun.ref === 'draft' ? 'the draft' : latestRun.ref}` : ''}
            </span>
          </div>
          {notes.length > 0 && (
            <ul className="mt-2 space-y-1">
              {notes.map((n) => (
                <li key={n} className="flex items-start gap-1.5 text-xs text-ink-soft">
                  <TriangleAlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                  {n}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {error ? (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm">
          <p className="text-danger">Could not load the test scenarios: {error}</p>
          <Button size="sm" variant="secondary" onClick={() => void load()}>Try again</Button>
        </div>
      ) : !scenarios ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading test scenarios">
          {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl border border-line bg-subtle/50" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-12 text-center">
          <FlaskConicalIcon className="mx-auto h-8 w-8 text-muted" aria-hidden />
          <h3 className="mt-3 text-sm font-semibold text-ink">This draft has no test scenarios</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
            Scenarios are part of the agent’s configuration. Add them under <code className="font-mono">tests</code> in the JSON view; an
            editor for them comes later.
          </p>
        </div>
      ) : (
        <Accordion
          items={visible}
          defaultExpandedIds={[]}
          pagination={{
            page: safePage,
            pageSize,
            totalItems: list.length,
            onPageChange: setPage,
            onPageSizeChange: (s) => {
              setPageSize(s);
              setPage(1);
            },
            pageSizeOptions: [5, 10, 25],
          }}
        >
          {visible.map((sc, idx) => {
            const isRunning = running === sc.id;
            const status = sc.last_result?.status;
            return (
              <AccordionItem key={sc.id} id={sc.id} index={idx} isFirst={idx === 0} isLast={idx === visible.length - 1}>
                <AccordionHeader
                  id={sc.id}
                  icon={<FlaskConicalIcon className="h-4 w-4 text-accent" aria-hidden />}
                  title={<span title={sc.id}>{readableId(sc.id)}</span>}
                  subtitle={
                    sc.description ||
                    `${sc.turns} caller ${sc.turns === 1 ? 'turn' : 'turns'} · ${sc.expectations.length} ${sc.expectations.length === 1 ? 'check' : 'checks'} · ${sc.mode === 'live' ? 'needs a live model' : 'scripted'}`
                  }
                  badge={
                    isRunning ? (
                      <StatusChip tone="info">Running…</StatusChip>
                    ) : status === 'passed' ? (
                      <StatusChip tone="success" dot>Passed</StatusChip>
                    ) : status ? (
                      <StatusChip tone={status === 'skipped' ? 'neutral' : 'danger'} dot>{readableId(status)}</StatusChip>
                    ) : (
                      <StatusChip>Not run yet</StatusChip>
                    )
                  }
                  actions={
                    <Tooltip content="Run this scenario on the server" position="top">
                      <Button variant="secondary" size="sm" onClick={() => void run(sc.id)} disabled={!!running} className="h-8 px-2.5 text-xs">
                        {isRunning ? <LoaderCircleIcon className="mr-1 h-3 w-3 animate-spin" aria-hidden /> : <PlayIcon className="mr-1 h-3 w-3" aria-hidden />}
                        Run
                      </Button>
                    </Tooltip>
                  }
                />
                <AccordionContent>
                  <dl className="grid gap-3 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-muted">Checks</dt>
                      <dd className="mt-1 flex flex-wrap gap-1.5">
                        {sc.expectations.length === 0 ? (
                          <span className="text-ink-soft">None</span>
                        ) : (
                          sc.expectations.map((e, i) => (
                            <span key={`${e}-${i}`} title={e} className="rounded bg-subtle px-2 py-0.5 text-ink-soft">
                              {expectationLabel(e)}
                            </span>
                          ))
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted">Runs on</dt>
                      <dd className="mt-1 text-ink-soft">
                        <span className="font-mono">{sc.channel}</span>
                        {sc.mocks > 0 ? ` · ${sc.mocks} pretend ${sc.mocks === 1 ? 'reply' : 'replies'} from other systems` : ''}
                      </dd>
                    </div>
                  </dl>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
