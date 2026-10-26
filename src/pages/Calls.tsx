import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FlaskConicalIcon,
  LayersIcon,
  ListIcon,
  MessageSquareIcon,
  PhoneCallIcon,
  PhoneIcon,
  RefreshCwIcon,
  SearchIcon,
  SparklesIcon,
  TableIcon,
} from 'lucide-react';
import { useStudio } from '../contexts/StudioContext';
import { CallsTable, channelName, outcomeMeta } from '../components/calls/CallsTable';
import { Button } from '../components/ui/Button';
import { StatusChip } from '../components/ui/StatusChip';
import { Tooltip } from '../components/ui/Tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
} from '../components/ui/accordion';
import { formatDateTime, formatDuration, formatShortDate } from '../utils/format';
import { cn, inputClass } from '../utils/styles';
import { api } from '../api/client';
import type { CallRecord } from '../types/studio';
import { callPath } from '../utils/routes';

export function Calls() {
  const { agents } = useStudio();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const agent = params.get('agent') ?? '';
  const channel = params.get('channel') ?? '';
  const outcome = params.get('outcome') ?? '';
  const env = params.get('env') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const pageSizeParam = Number(params.get('size') ?? '10') || 10;
  const [pageSize, setPageSize] = useState<number>(pageSizeParam);
  const [viewMode, setViewMode] = useState<'accordion' | 'table'>('accordion');

  const [realCalls, setRealCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setParam('size', String(newSize));
    setParam('page', '1');
  };

  const handlePageChange = (newPage: number) => {
    setParam('page', String(newPage));
  };

  const agentNames = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a.name])), [agents]);

  // Fetch real calls from the API
  const fetchCalls = async () => {
    setLoading(true);
    setError(null);
    try {
      const targets = agent ? [agent] : agents.length > 0 ? agents.map((a) => a.id) : ['voice-test'];
      const results = await Promise.allSettled(
        targets.map((botId) => api.listCalls(botId, { limit: 50 }))
      );

      const combined: CallRecord[] = [];
      results.forEach((res, i) => {
        if (res.status === 'fulfilled' && res.value && Array.isArray(res.value.calls)) {
          const botId = targets[i];
          res.value.calls.forEach((c: any) => {
            const isEnded = c.status === 'ended';
            const handoffs = c.handoffs || 0;
            const callOutcome = isEnded
              ? handoffs > 0
                ? 'handed_over'
                : 'resolved'
              : c.status === 'unfinished'
                ? 'cut_off'
                : 'abandoned';

            combined.push({
              id: c.id,
              agentId: c.bot || botId,
              channel: c.channel?.type === 'web_chat' ? 'web_chat' : c.channel?.type === 'sip_voice' ? 'phone' : 'web_voice',
              environment: c.ref === 'draft' ? 'test' : ((c.ref || 'development') as any),
              version: c.version || 'draft',
              started_at: c.started_at,
              duration_s: c.duration_s || 0,
              outcome: callOutcome,
              caller: c.caller || 'Anonymous visitor',
              summary: `Call in ${c.channel?.id || 'channel'} · ${c.duration_s || 0}s (${c.agent_turns || 0} turns)`,
              transcript: [],
              tool_calls: [],
              errors: [],
            });
          });
        }
      });

      combined.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
      setRealCalls(combined);
    } catch (err: any) {
      setError(err?.message || 'Could not load calls.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [agents, agent]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return realCalls
      .filter((c) => !needle || c.caller.toLowerCase().includes(needle) || c.summary.toLowerCase().includes(needle))
      .filter((c) => !agent || c.agentId === agent)
      .filter((c) => !channel || c.channel === channel)
      .filter((c) => !outcome || c.outcome === outcome)
      .filter((c) => !env || c.environment === env);
  }, [realCalls, q, agent, channel, outcome, env]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const startIndex = (safePage - 1) * pageSize;
  const visible = filtered.slice(startIndex, startIndex + pageSize);
  const selectCls = cn(inputClass, 'w-auto py-1.5');

  const handleReorder = (newItems: CallRecord[]) => {
    // Reorder visible page items within the full list
    const visibleIds = new Set(visible.map((v) => v.id));
    const remaining = realCalls.filter((c) => !visibleIds.has(c.id));
    // Splice newItems at startIndex
    const updated = [...realCalls];
    updated.splice(startIndex, visible.length, ...newItems);
    setRealCalls(updated);
  };

  const getChannelIcon = (ch: string) => {
    switch (ch) {
      case 'phone':
        return <PhoneIcon className="h-4 w-4 text-accent" />;
      case 'web_chat':
        return <MessageSquareIcon className="h-4 w-4 text-info" />;
      default:
        return <PhoneCallIcon className="h-4 w-4 text-success" />;
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Calls</h1>
          <p className="mt-1 text-sm text-muted">
            Live and recorded conversations from the Agent Builder API.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-line bg-surface p-0.5">
            <Tooltip content="Accordion list view with reordering & expandable insights" position="top">
              <button
                type="button"
                onClick={() => setViewMode('accordion')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  viewMode === 'accordion'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                )}
              >
                <ListIcon className="h-3.5 w-3.5" />
                <span>Accordions</span>
              </button>
            </Tooltip>
            <Tooltip content="Compact table grid view" position="top">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  viewMode === 'table'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                )}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
            </Tooltip>
          </div>

          <Button variant="secondary" size="sm" onClick={fetchCalls} disabled={loading}>
            <RefreshCwIcon className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            aria-label="Search calls"
            value={q}
            onChange={(e) => setParam('q', e.target.value)}
            placeholder="Search caller or summary"
            className={cn(inputClass, 'pl-9')}
          />
        </div>
        <select aria-label="Agent" className={selectCls} value={agent} onChange={(e) => setParam('agent', e.target.value)}>
          <option value="">All agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select aria-label="Channel" className={selectCls} value={channel} onChange={(e) => setParam('channel', e.target.value)}>
          <option value="">All channels</option>
          {Object.entries(channelName).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select aria-label="Outcome" className={selectCls} value={outcome} onChange={(e) => setParam('outcome', e.target.value)}>
          <option value="">All outcomes</option>
          {Object.entries(outcomeMeta).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
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
          All
        </button>
        <button
          type="button"
          onClick={() => {
            setParam('outcome', 'handed_over');
            setParam('channel', '');
          }}
          className={cn(
            'rounded-full px-2.5 py-0.5 font-medium transition-colors border',
            outcome === 'handed_over'
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-line bg-surface text-ink-soft hover:bg-subtle'
          )}
        >
          Handovers only
        </button>
        <button
          type="button"
          onClick={() => {
            setParam('channel', 'web_voice');
            setParam('outcome', '');
          }}
          className={cn(
            'rounded-full px-2.5 py-0.5 font-medium transition-colors border',
            channel === 'web_voice'
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-line bg-surface text-ink-soft hover:bg-subtle'
          )}
        >
          Web Voice Calls
        </button>
      </div>

      {loading && realCalls.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-line bg-surface p-12 text-center">
          <p className="text-sm font-medium text-ink">Loading calls from API…</p>
        </div>
      ) : error ? (
        <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-600">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-lg border border-line bg-surface p-12 text-center">
          <p className="text-sm font-medium text-ink">No calls recorded yet</p>
          <p className="mt-1 text-xs text-muted">Test conversations or live calls will appear here.</p>
        </div>
      ) : viewMode === 'table' ? (
        <>
          <div className="mt-4">
            <CallsTable calls={visible} agentNames={agentNames} />
          </div>

          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-xs text-muted">
              <span>
                Showing {startIndex + 1}–{Math.min(startIndex + pageSize, filtered.length)} of {filtered.length} calls
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safePage <= 1}
                  onClick={() => handlePageChange(safePage - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <span className="px-2 font-medium text-ink">
                  {safePage} / {pages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safePage >= pages}
                  onClick={() => handlePageChange(safePage + 1)}
                  aria-label="Next page"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Uniform Accordion Experience */
        <div className="mt-5">
          <Accordion
            items={visible}
            onReorder={handleReorder}
            enableReordering={true}
            enableDragAndDrop={true}
            pagination={{
              page: safePage,
              pageSize,
              totalItems: filtered.length,
              onPageChange: handlePageChange,
              onPageSizeChange: handlePageSizeChange,
              pageSizeOptions: [5, 10, 20, 50],
            }}
          >
            {visible.map((call, idx) => {
              const agentName = agentNames[call.agentId] ?? call.agentId;
              const outcomeInfo = outcomeMeta[call.outcome];
              const isFirst = idx === 0;
              const isLast = idx === visible.length - 1;

              return (
                <AccordionItem
                  key={call.id}
                  id={call.id}
                  index={idx}
                  isFirst={isFirst}
                  isLast={isLast}
                >
                  <AccordionHeader
                    id={call.id}
                    icon={getChannelIcon(call.channel)}
                    title={call.caller}
                    subtitle={
                      <span>
                        {agentName} · {formatShortDate(call.started_at)} · {formatDuration(call.duration_s)} ·{' '}
                        <span className="font-mono text-[11px]">{call.version}</span>
                      </span>
                    }
                    badge={
                      <div className="flex items-center gap-1.5">
                        <StatusChip tone={outcomeInfo.tone}>{outcomeInfo.label}</StatusChip>
                        <span className="text-[11px] rounded bg-subtle px-2 py-0.5 font-medium text-muted">
                          {channelName[call.channel]}
                        </span>
                      </div>
                    }
                    actions={
                      <Tooltip content="Open call detail view" position="top">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(callPath(call.agentId, call.id))}
                          className="h-8 px-2 text-xs"
                        >
                          <ExternalLinkIcon className="h-3.5 w-3.5 mr-1" />
                          <span className="hidden sm:inline">Details</span>
                        </Button>
                      </Tooltip>
                    }
                  />

                  <AccordionContent>
                    <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                          Call Summary
                        </h4>
                        <p className="mt-1.5 text-sm font-medium text-ink leading-relaxed">
                          {call.summary}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => navigate(callPath(call.agentId, call.id))}
                          >
                            <span>Open Transcript</span>
                            <ArrowRightIcon className="h-3.5 w-3.5 ml-1" />
                          </Button>
                          <a
                            href={api.downloadCallUrl(call.agentId, call.id)}
                            download={`${call.id}.ndjson`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-subtle transition-colors"
                            title="Download full NDJSON call log"
                          >
                            <DownloadIcon className="h-3.5 w-3.5 text-muted" />
                            <span>Download NDJSON</span>
                          </a>
                        </div>
                      </div>

                      <div className="rounded-lg border border-line bg-surface/70 p-4 text-xs space-y-2">
                        <h4 className="font-semibold text-ink">Metadata</h4>
                        <div className="flex justify-between py-1 border-b border-line/50">
                          <span className="text-muted">Room / ID:</span>
                          <span className="font-mono text-ink text-[11px] truncate max-w-[150px]">
                            {call.id}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-line/50">
                          <span className="text-muted">Timestamp:</span>
                          <span className="text-ink">{formatDateTime(call.started_at)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-line/50">
                          <span className="text-muted">Duration:</span>
                          <span className="text-ink font-medium">{formatDuration(call.duration_s)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-muted">Environment:</span>
                          <span className="text-ink capitalize font-medium">{call.environment}</span>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}
    </div>
  );
}