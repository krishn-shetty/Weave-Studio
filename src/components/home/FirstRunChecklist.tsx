import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, CheckCircle2Icon, CircleIcon, RocketIcon, SparklesIcon, XIcon } from 'lucide-react';
import { useStudio } from '../../contexts/StudioContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/client';
import { Button } from '../ui/Button';
import { cn } from '../../utils/styles';

interface FirstRunChecklistProps {
  onOpenCreate: () => void;
  onDismiss: () => void;
}

type Tested = 'checking' | 'yes' | 'no' | 'unknown';

/** Has any agent been tried: a test run, or a test conversation (a call on the draft)? Read from the API. */
function useHasBeenTested(agentIds: string[]): Tested {
  const [tested, setTested] = useState<Tested>('checking');
  const key = agentIds.join('|');

  useEffect(() => {
    const ids = key ? key.split('|') : [];
    if (ids.length === 0) {
      setTested('no');
      return;
    }
    const controller = new AbortController();
    const opts = { signal: controller.signal };
    setTested('checking');
    const checks = ids.map(async (id) => {
      const [runs, calls] = await Promise.all([api.listTestRuns(id, 1, opts), api.listCalls(id, { limit: 20 }, opts)]);
      return runs.length > 0 || calls.calls.some((call) => call.ref === 'draft');
    });
    Promise.allSettled(checks).then((results) => {
      if (controller.signal.aborted) return;
      if (results.some((r) => r.status === 'fulfilled' && r.value)) setTested('yes');
      else if (results.some((r) => r.status === 'rejected')) setTested('unknown');
      else setTested('no');
    });
    return () => controller.abort();
  }, [key]);

  return tested;
}

export function FirstRunChecklist({ onOpenCreate, onDismiss }: FirstRunChecklistProps) {
  const { agents } = useStudio();
  const { can } = useAuth();
  const navigate = useNavigate();

  // Evaluate progress
  const hasAgent = agents.length > 0;
  const focusAgent = agents[0];
  const tested = useHasBeenTested(agents.map((a) => a.id));
  const hasPublished = agents.some((a) => a.versions.length > 0);
  const hasDeployed = agents.some((a) => a.deployments.some((d) => d.status === 'active'));

  const steps = [
    {
      id: 'create',
      title: '1. Create your agent',
      desc: 'Pick a starter and give it a name.',
      completed: hasAgent,
      cta: 'Create agent',
      action: onOpenCreate,
    },
    {
      id: 'test',
      title: '2. Test live conversation',
      desc:
        tested === 'unknown'
          ? 'Could not check for test conversations or test runs just now.'
          : 'Talk to your draft via web text chat or voice with live execution trace.',
      completed: tested === 'yes',
      cta: 'Open Test console',
      action: () => focusAgent && navigate(`/agents/${focusAgent.id}/test`),
    },
    {
      id: 'publish',
      title: '3. Freeze a version (Publish)',
      desc: 'Lock a clean semantic version with preflight checks and immutable checksum.',
      completed: hasPublished,
      cta: 'Publish version',
      action: () => focusAgent && navigate(`/agents/${focusAgent.id}/release`),
    },
    {
      id: 'deploy',
      title: '4. Deploy to an environment',
      desc: 'Switch development, staging, or production traffic with instant rollback protection.',
      completed: hasDeployed,
      cta: 'Deploy to Staging',
      action: () => focusAgent && navigate(`/agents/${focusAgent.id}/release`),
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const percent = Math.round((completedCount / steps.length) * 100);

  return (
    <section
      aria-labelledby="first-run-heading"
      className="relative rounded-xl border border-accent/30 bg-gradient-to-r from-accent-soft/40 via-surface to-surface p-6 shadow-sm mb-6"
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-4 right-4 p-1 text-muted hover:text-ink rounded-lg transition-colors"
        title="Hide checklist"
        aria-label="Hide onboarding checklist"
      >
        <XIcon className="h-4 w-4" />
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white text-[11px] font-bold">
              <SparklesIcon className="h-3 w-3" />
            </span>
            <h2 id="first-run-heading" className="text-base font-semibold text-ink">
              Getting Started Checklist
            </h2>
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            Follow this 5-minute journey to create, test, and release your first production-ready AI agent.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-semibold text-ink">
              {completedCount} of {steps.length} completed
            </span>
            <div className="mt-1 h-2 w-32 rounded-full bg-line overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className={cn(
              'flex flex-col justify-between rounded-lg border p-3.5 transition-colors',
              step.completed
                ? 'border-success/30 bg-success-soft/30'
                : 'border-line bg-surface hover:border-line-strong'
            )}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">{step.title}</span>
                {step.id === 'test' && tested === 'checking' ? (
                  <span className="h-4 w-4 animate-pulse rounded-full bg-subtle" aria-label="Checking" />
                ) : step.completed ? (
                  <CheckCircle2Icon className="h-4 w-4 text-success" />
                ) : (
                  <CircleIcon className="h-4 w-4 text-muted" />
                )}
              </div>
              <p className="mt-1 text-[11px] text-ink-soft leading-relaxed">{step.desc}</p>
            </div>

            <div className="mt-3 pt-2 border-t border-line/60">
              <button
                type="button"
                onClick={step.action}
                disabled={!can('edit')}
                className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
              >
                {step.cta}
                <ArrowRightIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
