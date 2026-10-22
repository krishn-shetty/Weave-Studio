import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, CheckCircle2Icon, CircleIcon, RocketIcon, SparklesIcon, XIcon } from 'lucide-react';
import { useStudio } from '../../contexts/StudioContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { cn } from '../../utils/styles';

interface FirstRunChecklistProps {
  onOpenCreate: () => void;
  onDismiss: () => void;
}

export function FirstRunChecklist({ onOpenCreate, onDismiss }: FirstRunChecklistProps) {
  const { agents } = useStudio();
  const { can } = useAuth();
  const navigate = useNavigate();

  // Evaluate progress
  const hasAgent = agents.length > 0;
  const focusAgent = agents[0];
  const hasTested = true; // In demo/seed or calls exist
  const hasPublished = agents.some((a) => a.versions.length > 0);
  const hasDeployed = agents.some((a) => a.deployments.some((d) => d.status === 'active'));

  const steps = [
    {
      id: 'create',
      title: '1. Create your agent',
      desc: 'Pick an enterprise starter or describe what you need in plain English.',
      completed: hasAgent,
      cta: 'Create agent',
      action: onOpenCreate,
    },
    {
      id: 'test',
      title: '2. Test live conversation',
      desc: 'Talk to your draft via web text chat or voice with live execution trace.',
      completed: hasTested,
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
                {step.completed ? (
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
