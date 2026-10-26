import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightIcon,
  DownloadIcon,
  ExternalLinkIcon,
  ListIcon,
  MessageSquareIcon,
  PhoneCallIcon,
  PhoneIcon,
  RefreshCwIcon,
  TableIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import type { DraftEditor } from '../../hooks/useDraftEditor';
import type { EnvironmentName, HealthSnapshot } from '../../types/studio';
import { useAuth } from '../../contexts/AuthContext';
import { Segmented } from '../ui/Segmented';
import { StatusChip } from '../ui/StatusChip';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
} from '../ui/accordion';
import { CallsTable, channelName, outcomeMeta } from '../calls/CallsTable';
import { currentDeployments, environments, envLabel } from '../../utils/agentStatus';
import { formatDateTime, formatDuration, formatPercent, formatShortDate } from '../../utils/format';
import { api } from '../../api/client';
import { cn } from '../../utils/styles';
import type { CallRecord } from '../../types/studio';
import { callPath } from '../../utils/routes';

type Period = '7' | '14' | '30';

const metrics: { key: keyof HealthSnapshot; label: string; kind: 'count' | 'rate'; worseWhenUp: boolean }[] = [
  { key: 'calls', label: 'Calls', kind: 'count', worseWhenUp: false },
  { key: 'handover_rate', label: 'Handed to a person', kind: 'rate', worseWhenUp: true },
  { key: 'cutoff_rate', label: 'Cut off', kind: 'rate', worseWhenUp: true },
  { key: 'tool_failures', label: 'Tool failures', kind: 'count', worseWhenUp: true },
];

export function MonitorStage({ editor }: { editor: DraftEditor }) {
  const agent = editor.agent!;
  const navigate = useNavigate();
  const { can } = useAuth();
  const live = currentDeployments(agent);
  const liveEnvs = environments.filter((e) => live[e]);
  const [env, setEnv] = useState<EnvironmentName>(live.production ? 'production' : liveEnvs[0] ?? 'production');
  const [period, setPeriod] = useState<Period>('7');

  const [realCalls, setRealCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [callsViewMode, setCallsViewMode] = useState<'accordion' | 'table'>('accordion');

  // Pagination for monitor calls
  const [callPage, setCallPage] = useState(1);
  const [callPageSize, setCallPageSize] = useState(5);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const res = await api.listCalls(agent.id, { limit: 50 });
      if (res && Array.isArray(res.calls)) {
        const mapped: CallRecord[] = res.calls.map((c: any) => {
          const isEnded = c.status === 'ended';
          const handoffs = c.handoffs || 0;
          const callOutcome = isEnded
            ? handoffs > 0
              ? 'handed_over'
              : 'resolved'
            : c.status === 'unfinished'
            ? 'cut_off'
            : 'abandoned';

          return {
            id: c.id,
            agentId: c.bot || agent.id,
            channel: c.channel?.type === 'web_chat' ? 'web_chat' : c.channel?.type === 'sip_voice' ? 'phone' : 'web_voice',
            environment: c.ref === 'draft' ? 'test' : ((c.ref || 'development') as any),
            version: c.version || 'draft',
            started_at: c.started_at,
            duration_s: c.duration_s || 0,
            outcome: callOutcome,
            caller: c.caller || 'Visitor',
            summary: `Call in ${c.channel?.id || 'channel'} · ${c.duration_s || 0}s (${c.agent_turns || 0} turns)`,
            transcript: [],
            tool_calls: [],
            errors: [],
          };
        });
        setRealCalls(mapped);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [agent.id]);

  const currentSnapshot: HealthSnapshot = {
    calls: realCalls.length,
    handover_rate:
      realCalls.length > 0 ? realCalls.filter((c) => c.outcome === 'handed_over').length / realCalls.length : 0,
    cutoff_rate:
      realCalls.length > 0 ? realCalls.filter((c) => c.outcome === 'cut_off').length / realCalls.length : 0,
    tool_failures: 0,
  };

  const hasData = realCalls.length > 0;

  const totalCallPages = Math.max(1, Math.ceil(realCalls.length / callPageSize));
  const safeCallPage = Math.min(callPage, totalCallPages);
  const callStartIndex = (safeCallPage - 1) * callPageSize;
  const visibleCalls = realCalls.slice(callStartIndex, callStartIndex + callPageSize);

  const handleReorderCalls = (newVisible: typeof visibleCalls) => {
    const next = [...realCalls];
    next.splice(callStartIndex, visibleCalls.length, ...newVisible);
    setRealCalls(next);
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
    <div className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {liveEnvs.length > 1 && (
            <Segmented
              label="Environment"
              options={liveEnvs.map((e) => ({ value: e, label: envLabel(e) }))}
              value={env}
              onChange={setEnv}
            />
          )}
          <Segmented
            label="Period"
            options={[
              { value: '7', label: 'Last 7 days' },
              { value: '14', label: '14 days' },
              { value: '30', label: '30 days' },
            ]}
            value={period}
            onChange={setPeriod}
          />
        </div>
        <StatusChip tone="info">
          Computed from the latest {realCalls.length} calls
        </StatusChip>
      </div>

      {!hasData && !loading ? (
        <div className="mt-6 rounded-xl border border-line bg-surface px-6 py-14 text-center">
          <p className="text-base font-medium text-ink">No calls recorded yet for {agent.name}</p>
          <p className="mt-1 text-sm text-muted">Test conversations or live calls will produce health metrics here.</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate(`/agents/${agent.id}/test`)}>
            Test this agent
          </Button>
        </div>
      ) : (
        <section aria-labelledby="health-title" className="mt-6 rounded-xl border border-line bg-surface">
          <div className="border-b border-line px-6 py-5">
            <h2 id="health-title" className="sr-only">
              Health
            </h2>
            <p className="text-lg font-semibold text-ink">
              {realCalls.length < 10
                ? `Sample size: ${realCalls.length} calls (evaluating performance)`
                : `Healthy performance across ${realCalls.length} recorded calls`}
            </p>
          </div>
          <dl className="grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
            {metrics.map((m) => {
              const cur = currentSnapshot[m.key];
              return (
                <div key={m.key} className="px-6 py-5">
                  <dt className="text-xs font-medium text-muted">{m.label}</dt>
                  <dd className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tracking-tight text-ink">
                      {m.kind === 'rate' ? formatPercent(cur) : cur.toLocaleString()}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}

      {realCalls.length > 0 && (
        <section aria-labelledby="calls-title" className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 id="calls-title" className="text-sm font-semibold text-ink">
              Recent calls for {agent.name}
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-line bg-surface p-0.5">
                <Tooltip content="Accordion list view with reordering & expandable call logs" position="top">
                  <button
                    type="button"
                    onClick={() => setCallsViewMode('accordion')}
                    className={cn(
                      'p-1 rounded text-xs transition-colors',
                      callsViewMode === 'accordion' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-ink'
                    )}
                    aria-label="Accordion view"
                  >
                    <ListIcon className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
                <Tooltip content="Table view" position="top">
                  <button
                    type="button"
                    onClick={() => setCallsViewMode('table')}
                    className={cn(
                      'p-1 rounded text-xs transition-colors',
                      callsViewMode === 'table' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-ink'
                    )}
                    aria-label="Table view"
                  >
                    <TableIcon className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          {callsViewMode === 'table' ? (
            <div className="mt-3">
              <CallsTable calls={realCalls.slice(0, 10)} />
            </div>
          ) : (
            <div className="mt-3">
              <Accordion
                items={visibleCalls}
                onReorder={handleReorderCalls}
                enableReordering={true}
                enableDragAndDrop={true}
                pagination={{
                  page: safeCallPage,
                  pageSize: callPageSize,
                  totalItems: realCalls.length,
                  onPageChange: (p) => setCallPage(p),
                  onPageSizeChange: (s) => {
                    setCallPageSize(s);
                    setCallPage(1);
                  },
                  pageSizeOptions: [5, 10, 20],
                }}
              >
                {visibleCalls.map((call, idx) => {
                  const outcomeInfo = outcomeMeta[call.outcome];
                  const isFirst = idx === 0;
                  const isLast = idx === visibleCalls.length - 1;

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
                            {formatShortDate(call.started_at)} · {formatDuration(call.duration_s)} ·{' '}
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
                          <Tooltip content="Inspect call transcript" position="top">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(callPath(call.agentId, call.id))}
                              className="h-8 px-2 text-xs"
                            >
                              <ExternalLinkIcon className="h-3.5 w-3.5 mr-1" />
                              <span>Details</span>
                            </Button>
                          </Tooltip>
                        }
                      />

                      <AccordionContent>
                        <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                              Summary
                            </h4>
                            <p className="mt-1.5 text-sm font-medium text-ink leading-relaxed">
                              {call.summary}
                            </p>
                            <div className="mt-4 flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => navigate(callPath(call.agentId, call.id))}
                              >
                                <span>Open Full Transcript</span>
                                <ArrowRightIcon className="h-3.5 w-3.5 ml-1" />
                              </Button>
                              <a
                                href={api.downloadCallUrl(call.agentId, call.id)}
                                download={`${call.id}.ndjson`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-subtle transition-colors"
                              >
                                <DownloadIcon className="h-3.5 w-3.5 text-muted" />
                                <span>Download Log</span>
                              </a>
                            </div>
                          </div>

                          <div className="rounded-lg border border-line bg-surface p-3 text-xs space-y-1.5">
                            <h4 className="font-semibold text-ink">Metadata</h4>
                            <div className="flex justify-between py-1 border-b border-line/50">
                              <span className="text-muted">ID:</span>
                              <span className="font-mono text-ink text-[11px]">{call.id.slice(0, 16)}…</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-line/50">
                              <span className="text-muted">Started:</span>
                              <span className="text-ink">{formatDateTime(call.started_at)}</span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-muted">Environment:</span>
                              <span className="text-ink capitalize">{call.environment}</span>
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
        </section>
      )}
    </div>
  );
}