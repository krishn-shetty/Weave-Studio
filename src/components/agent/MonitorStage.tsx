import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TriangleAlertIcon } from 'lucide-react';
import type { DraftEditor } from '../../hooks/useDraftEditor';
import type { EnvironmentName, HealthSnapshot } from '../../types/studio';
import { healthMetrics } from '../../data/healthMetrics';
import { calls } from '../../data/calls';
import { useAuth } from '../../contexts/AuthContext';
import { Segmented } from '../ui/Segmented';
import { StatusChip } from '../ui/StatusChip';
import { Button } from '../ui/Button';
import { CallsTable } from '../calls/CallsTable';
import { currentDeployments, environments, envLabel } from '../../utils/agentStatus';
import { formatPercent } from '../../utils/format';
import { cn } from '../../utils/styles';

type Period = '7' | '14' | '30';

const metrics: {key: keyof HealthSnapshot;label: string;kind: 'count' | 'rate';worseWhenUp: boolean;}[] = [
{ key: 'calls', label: 'Calls', kind: 'count', worseWhenUp: false },
{ key: 'handover_rate', label: 'Handed to a person', kind: 'rate', worseWhenUp: true },
{ key: 'cutoff_rate', label: 'Cut off', kind: 'rate', worseWhenUp: true },
{ key: 'tool_failures', label: 'Tool failures', kind: 'count', worseWhenUp: true }];


export function MonitorStage({ editor }: {editor: DraftEditor;}) {
  const agent = editor.agent!;
  const navigate = useNavigate();
  const { can } = useAuth();
  const live = currentDeployments(agent);
  const liveEnvs = environments.filter((e) => live[e]);
  const [env, setEnv] = useState<EnvironmentName>(live.production ? 'production' : liveEnvs[0] ?? 'production');
  const [period, setPeriod] = useState<Period>('7');
  const metric = healthMetrics.find((h) => h.agentId === agent.id && h.environment === env && String(h.period) === period);
  const agentCalls = calls.filter((c) => c.agentId === agent.id);

  const handoverDelta = metric ? metric.current.handover_rate - metric.previous.handover_rate : 0;
  const worse = !!metric && metric.current_version !== metric.previous_version && handoverDelta >= 0.05 && metric.current.calls >= 100;
  const lowSample = !!metric && (metric.current.calls < 100 || metric.previous.calls < 100);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {liveEnvs.length > 1 &&
          <Segmented label="Environment" options={liveEnvs.map((e) => ({ value: e, label: envLabel(e) }))} value={env} onChange={setEnv} />
          }
          <Segmented
            label="Period"
            options={[
            { value: '7', label: 'Last 7 days' },
            { value: '14', label: '14 days' },
            { value: '30', label: '30 days' }]
            }
            value={period}
            onChange={setPeriod} />
          
        </div>
        <StatusChip tone="warning" title="The Agent Builder API has no call-records or metrics endpoint yet. These numbers are sample data.">
          Demo data
        </StatusChip>
      </div>

      {!metric ?
      <div className="mt-6 rounded-xl border border-line bg-surface px-6 py-14 text-center">
          <p className="text-base font-medium text-ink">No call data yet</p>
          <p className="mt-1 text-sm text-muted">Health appears here once a version is live and taking calls.</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate(`/agents/${agent.id}/release`)}>Go to Release</Button>
        </div> :

      <section aria-labelledby="health-title" className="mt-6 rounded-xl border border-line bg-surface">
          <div className="border-b border-line px-6 py-5">
            <h2 id="health-title" className="sr-only">Health</h2>
            {worse ?
          <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-3">
                  <TriangleAlertIcon className="mt-1 h-5 w-5 shrink-0 text-warning" aria-hidden />
                  <div>
                    <p className="text-lg font-semibold text-ink">
                      More callers are asking for a person since {metric.current_version}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      Handover rate is {formatPercent(metric.current.handover_rate)}, up from {formatPercent(metric.previous.handover_rate)} on {metric.previous_version}. Based on {metric.current.calls.toLocaleString()} calls vs {metric.previous.calls.toLocaleString()}.
                    </p>
                  </div>
                </div>
                <Button variant="secondary" disabled={!can(env === 'production' ? 'deploy_production' : 'deploy')} onClick={() => navigate(`/agents/${agent.id}/release?rollback=${env}`)}>
                  Roll back to {metric.previous_version}
                </Button>
              </div> :

          <p className="text-lg font-semibold text-ink">
                {lowSample ? 'Not enough calls to compare reliably yet' : 'Steady compared with the previous period'}
              </p>
          }
          </div>
          <dl className="grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
            {metrics.map((m) => {
            const cur = metric.current[m.key];
            const prev = metric.previous[m.key];
            const delta = cur - prev;
            const bad = m.worseWhenUp ? delta > 0 : false;
            const fmt = (n: number) => m.kind === 'rate' ? formatPercent(n, 1) : n.toLocaleString();
            return (
              <div key={m.key} className="px-6 py-5">
                  <dt className="text-[13px] text-muted">{m.label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">{fmt(cur)}</dd>
                  <dd className={cn('mt-0.5 text-xs tabular-nums', prev === 0 ? 'text-muted' : bad ? 'text-danger' : 'text-muted')}>
                    {prev === 0 ? 'No earlier data' : `${delta >= 0 ? '+' : ''}${m.kind === 'rate' ? `${(delta * 100).toFixed(1)} pts` : delta.toLocaleString()} vs previous ${period} days`}
                  </dd>
                </div>);

          })}
          </dl>
        </section>
      }

      <section aria-labelledby="recent-calls" className="mt-10">
        <h2 id="recent-calls" className="text-sm font-semibold text-ink">Recent calls</h2>
        <div className="mt-3">
          {agentCalls.length ? <CallsTable calls={agentCalls} /> : <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-[13px] text-muted">No calls for this agent yet.</p>}
        </div>
      </section>
    </div>);

}