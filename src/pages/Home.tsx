import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, CheckIcon, HistoryIcon, PlusIcon } from 'lucide-react';
import { useStudio } from '../contexts/StudioContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { StatusChip } from '../components/ui/StatusChip';
import { CreateAgentDialog } from '../components/agents/CreateAgentDialog';
import { AuditTrailDialog } from '../components/ui/AuditTrailDialog';
import { FirstRunChecklist } from '../components/home/FirstRunChecklist';
import { currentDeployments, environments, envLabel, nextStep, pendingDeployment } from '../utils/agentStatus';
import { timeAgo } from '../utils/format';
import { cn } from '../utils/styles';
import type { StageId } from '../types/studio';

const stages: {id: StageId;label: string;}[] = [
{ id: 'build', label: 'Build' },
{ id: 'test', label: 'Test' },
{ id: 'release', label: 'Release' },
{ id: 'monitor', label: 'Monitor' }];


const actionVerb = { created: 'created', saved: 'saved', published: 'published', deployed: 'deployed', rolled_back: 'rolled back', restored: 'restored', exported: 'exported', imported: 'imported' } as const;

export function Home() {
  const { agents, activity } = useStudio();
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [showChecklist, setShowChecklist] = useState(() => {
    return localStorage.getItem('weave_first_run_dismissed') !== 'true';
  });

  const handleDismissChecklist = () => {
    setShowChecklist(false);
    localStorage.setItem('weave_first_run_dismissed', 'true');
  };

  const handleReopenChecklist = () => {
    setShowChecklist(true);
    localStorage.removeItem('weave_first_run_dismissed');
  };

  const focus = useMemo(
    () => [...agents].sort((a, b) => new Date(b.draft.saved_at).getTime() - new Date(a.draft.saved_at).getTime())[0],
    [agents]
  );
  const step = focus ? nextStep(focus) : null;
  const stageIndex = step ? stages.findIndex((s) => s.id === step.stage) : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {greeting}, {user?.name.split(' ')[0]}
          </h1>
          {!showChecklist && (
            <button
              type="button"
              onClick={handleReopenChecklist}
              className="mt-1 text-xs text-accent hover:underline flex items-center gap-1 font-medium"
            >
              Show first-run checklist
            </button>
          )}
        </div>
        {can('edit') &&
        <Button variant="secondary" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" aria-hidden />
            Create agent
          </Button>
        }
      </div>

      {showChecklist && (
        <div className="mt-6">
          <FirstRunChecklist
            onOpenCreate={() => setCreateOpen(true)}
            onDismiss={handleDismissChecklist}
          />
        </div>
      )}

      {step && focus ?
      <section aria-labelledby="next-step" className="mt-6 rounded-xl border border-line bg-surface p-6 shadow-panel lg:p-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-muted">
            <span>Next step</span>
            <span aria-hidden>·</span>
            <Link to={`/agents/${focus.id}`} className="font-medium text-ink hover:underline">
              {focus.name}
            </Link>
            <span className="font-mono text-xs">{focus.id}</span>
          </div>
          <div className="mt-3 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 id="next-step" className="text-xl font-semibold tracking-tight text-ink">
                {step.title}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">{step.body}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant={step.tone === 'danger' ? 'danger' : 'primary'} onClick={() => navigate(`/agents/${focus.id}/${step.stage}`)}>
                  {step.cta}
                  <ArrowRightIcon className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
            <ol className="flex items-center gap-1.5" aria-label="Where this agent is in the journey">
              {stages.map((s, i) =>
            <li key={s.id} className="flex items-center gap-1.5">
                  <span
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                  i < stageIndex && 'bg-success-soft text-success',
                  i === stageIndex && 'bg-ink text-white',
                  i > stageIndex && 'bg-subtle text-muted'
                )}
                aria-current={i === stageIndex ? 'step' : undefined}>
                
                    {i < stageIndex && <CheckIcon className="h-3 w-3" aria-hidden />}
                    {s.label}
                  </span>
                  {i < stages.length - 1 && <span className="h-px w-3 bg-line-strong" aria-hidden />}
                </li>
            )}
            </ol>
          </div>
        </section> :

      <section className="mt-6 rounded-xl border border-line bg-surface p-8 shadow-panel">
          <h2 className="text-xl font-semibold text-ink">Create your first agent</h2>
          <p className="mt-2 max-w-lg text-sm text-ink-soft">Pick a starter, change the company name and greeting, and you can be talking to it in a few minutes.</p>
          {can('edit') &&
        <Button variant="primary" className="mt-5" onClick={() => setCreateOpen(true)}>
              Choose a starter
            </Button>
        }
        </section>
      }

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="whats-live">
          <div className="flex items-baseline justify-between">
            <h2 id="whats-live" className="text-sm font-semibold text-ink">
              What’s live
            </h2>
            <Link to="/agents" className="text-[13px] font-medium text-accent hover:underline">
              All agents
            </Link>
          </div>
          <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th scope="col" className="px-4 py-2.5 font-medium">Agent</th>
                  {environments.map((e) =>
                  <th key={e} scope="col" className="px-4 py-2.5 font-medium">{envLabel(e)}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => {
                  const current = currentDeployments(a);
                  return (
                    <tr key={a.id} className="border-b border-line last:border-0">
                      <th scope="row" className="px-4 py-3 text-left font-medium">
                        <Link to={`/agents/${a.id}/release`} className="text-ink hover:underline">{a.name}</Link>
                      </th>
                      {environments.map((e) => {
                        const pending = pendingDeployment(a, e);
                        return (
                          <td key={e} className="px-4 py-3">
                            {pending ?
                            <StatusChip tone="info" dot>Deploying {pending.version}</StatusChip> :
                            current[e] ?
                            <span className="font-mono text-[13px] text-ink">{current[e]?.version}</span> :

                            <span className="text-muted" aria-label="Not deployed">—</span>
                            }
                          </td>);

                      })}
                    </tr>);

                })}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="activity">
          <div className="flex items-center justify-between gap-2">
            <h2 id="activity" className="text-sm font-semibold text-ink">Recent activity</h2>
            <button
              type="button"
              onClick={() => setAuditOpen(true)}
              className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
            >
              <HistoryIcon className="h-3.5 w-3.5" />
              Audit log
            </button>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {activity.slice(0, 7).map((item) => {
              const agent = agents.find((a) => a.id === item.agentId);
              return (
                <li key={item.id} className="py-2.5 text-[13px]">
                  <p className="text-ink">
                    <span className="font-medium">{item.who}</span> {actionVerb[item.action]}{' '}
                    <Link to={`/agents/${item.agentId}`} className="font-medium hover:underline">{agent?.name ?? item.agentId}</Link>
                  </p>
                  <p className="mt-0.5 text-muted">
                    {item.detail} · {timeAgo(item.at)}
                  </p>
                </li>);

            })}
          </ul>
        </section>
      </div>
      <CreateAgentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <AuditTrailDialog open={auditOpen} onClose={() => setAuditOpen(false)} />
    </div>);

}