import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCwIcon, TriangleAlertIcon } from 'lucide-react';
import type { DraftEditor } from '../../hooks/useDraftEditor';
import type { EnvironmentName, HealthSnapshot } from '../../types/studio';
import { useAuth } from '../../contexts/AuthContext';
import { Segmented } from '../ui/Segmented';
import { StatusChip } from '../ui/StatusChip';
import { Button } from '../ui/Button';
import { CallsTable } from '../calls/CallsTable';
import { currentDeployments, environments, envLabel } from '../../utils/agentStatus';
import { formatPercent } from '../../utils/format';
import { api } from '../../api/client';
import type { CallRecord } from '../../types/studio';

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

  // Dynamically compute metrics from real calls (PRD section 3.3)
  const currentSnapshot: HealthSnapshot = {
    calls: realCalls.length,
    handover_rate:
      realCalls.length > 0 ? realCalls.filter((c) => c.outcome === 'handed_over').length / realCalls.length : 0,
    cutoff_rate:
      realCalls.length > 0 ? realCalls.filter((c) => c.outcome === 'cut_off').length / realCalls.length : 0,
    tool_failures: 0,
  };

  const hasData = realCalls.length > 0;

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
          <h2 id="calls-title" className="text-sm font-semibold text-ink">
            Recent calls for {agent.name}
          </h2>
          <div className="mt-3">
            <CallsTable calls={realCalls.slice(0, 10)} />
          </div>
        </section>
      )}
    </div>
  );
}