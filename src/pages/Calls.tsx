import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from 'lucide-react';
import { calls } from '../data/calls';
import { useStudio } from '../contexts/StudioContext';
import { CallsTable, channelName, outcomeMeta } from '../components/calls/CallsTable';
import { StatusChip } from '../components/ui/StatusChip';
import { Button } from '../components/ui/Button';
import { cn, inputClass } from '../utils/styles';

const PAGE_SIZE = 8;

export function Calls() {
  const { agents } = useStudio();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const agent = params.get('agent') ?? '';
  const channel = params.get('channel') ?? '';
  const outcome = params.get('outcome') ?? '';
  const env = params.get('env') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);else
    next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const agentNames = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a.name])), [agents]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return calls.
    filter((c) => !needle || c.caller.toLowerCase().includes(needle) || c.summary.toLowerCase().includes(needle)).
    filter((c) => !agent || c.agentId === agent).
    filter((c) => !channel || c.channel === channel).
    filter((c) => !outcome || c.outcome === outcome).
    filter((c) => !env || c.environment === env).
    sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }, [q, agent, channel, outcome, env]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selectCls = cn(inputClass, 'w-auto py-1.5');

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Calls</h1>
          <p className="mt-1 text-sm text-muted">Real calls and test conversations across all agents.</p>
        </div>
        <StatusChip tone="warning" title="The Agent Builder API has no endpoint to list call records yet. This is sample data.">
          Demo data — call records endpoint not available yet
        </StatusChip>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input type="search" aria-label="Search calls" value={q} onChange={(e) => setParam('q', e.target.value)} placeholder="Search caller or summary" className={cn(inputClass, 'pl-9')} />
        </div>
        <select aria-label="Agent" className={selectCls} value={agent} onChange={(e) => setParam('agent', e.target.value)}>
          <option value="">All agents</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select aria-label="Channel" className={selectCls} value={channel} onChange={(e) => setParam('channel', e.target.value)}>
          <option value="">All channels</option>
          {Object.entries(channelName).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select aria-label="Outcome" className={selectCls} value={outcome} onChange={(e) => setParam('outcome', e.target.value)}>
          <option value="">All outcomes</option>
          {Object.entries(outcomeMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select aria-label="Environment" className={selectCls} value={env} onChange={(e) => setParam('env', e.target.value)}>
          <option value="">All environments</option>
          <option value="production">Production</option>
          <option value="staging">Staging</option>
          <option value="development">Development</option>
          <option value="test">Test conversations</option>
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted font-medium mr-1">Saved filters:</span>
        <button
          type="button"
          onClick={() => {
            setParam('outcome', '');
            setParam('channel', '');
          }}
          className={cn(
            'rounded-full px-2.5 py-0.5 font-medium transition-colors border',
            !outcome && !channel
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-line bg-surface text-ink-soft hover:bg-subtle'
          )}
        >
          All Calls
        </button>
        <button
          type="button"
          onClick={() => setParam('outcome', 'handed_over')}
          className={cn(
            'rounded-full px-2.5 py-0.5 font-medium transition-colors border',
            outcome === 'handed_over'
              ? 'border-warning bg-warning-soft text-warning'
              : 'border-line bg-surface text-ink-soft hover:bg-subtle'
          )}
        >
          Handovers only
        </button>
        <button
          type="button"
          onClick={() => setParam('outcome', 'cut_off')}
          className={cn(
            'rounded-full px-2.5 py-0.5 font-medium transition-colors border',
            outcome === 'cut_off'
              ? 'border-danger bg-danger-soft text-danger'
              : 'border-line bg-surface text-ink-soft hover:bg-subtle'
          )}
        >
          Cut off / Unfinished
        </button>
        <button
          type="button"
          onClick={() => setParam('channel', 'web_voice')}
          className={cn(
            'rounded-full px-2.5 py-0.5 font-medium transition-colors border',
            channel === 'web_voice'
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-line bg-surface text-ink-soft hover:bg-subtle'
          )}
        >
          Web voice
        </button>
        <button
          type="button"
          onClick={() => setParam('outcome', 'resolved')}
          className={cn(
            'rounded-full px-2.5 py-0.5 font-medium transition-colors border',
            outcome === 'resolved'
              ? 'border-success bg-success-soft text-success'
              : 'border-line bg-surface text-ink-soft hover:bg-subtle'
          )}
        >
          Resolved
        </button>
      </div>

      <div className="mt-4">
        {visible.length ?
        <CallsTable calls={visible} agentNames={agentNames} /> :

        <div className="rounded-lg border border-line bg-surface px-6 py-12 text-center">
            <p className="text-sm font-medium text-ink">No calls match these filters</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => setParams({}, { replace: true })}>Clear filters</Button>
          </div>
        }
      </div>

      {filtered.length > 0 &&
      <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-[13px] text-muted">
          <span>
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={safePage <= 1} onClick={() => setParam('page', String(safePage - 1))} aria-label="Previous page">
              <ChevronLeftIcon className="h-4 w-4" aria-hidden />
            </Button>
            <Button size="sm" variant="secondary" disabled={safePage >= pages} onClick={() => setParam('page', String(safePage + 1))} aria-label="Next page">
              <ChevronRightIcon className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </nav>
      }
    </div>);

}