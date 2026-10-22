import React, { useState } from 'react';
import { ChevronDownIcon, FlameIcon, LayersIcon, ShieldAlertIcon } from 'lucide-react';
import { useStudio } from '../../contexts/StudioContext';
import { envLabel, environments } from '../../utils/agentStatus';
import { cn } from '../../utils/styles';
import type { EnvironmentName } from '../../types/studio';

export function EnvironmentBadge() {
  const { activeEnvironment, setActiveEnvironment } = useStudio();
  const [open, setOpen] = useState(false);

  const getEnvStyle = (env: EnvironmentName) => {
    switch (env) {
      case 'production':
        return 'border-danger/40 bg-danger-soft text-danger hover:bg-danger-soft/80';
      case 'staging':
        return 'border-info/40 bg-info-soft text-info hover:bg-info-soft/80';
      case 'development':
      default:
        return 'border-line bg-subtle text-ink-soft hover:bg-subtle/80';
    }
  };

  const getDotStyle = (env: EnvironmentName) => {
    switch (env) {
      case 'production':
        return 'bg-danger';
      case 'staging':
        return 'bg-info';
      case 'development':
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
          getEnvStyle(activeEnvironment)
        )}
        title="Active working environment (click to switch)"
      >
        {activeEnvironment === 'production' ? (
          <FlameIcon className="h-3.5 w-3.5 text-danger shrink-0" aria-hidden />
        ) : (
          <span className={cn('h-2 w-2 rounded-full', getDotStyle(activeEnvironment))} aria-hidden />
        )}
        <span>{envLabel(activeEnvironment)}</span>
        <ChevronDownIcon className="h-3 w-3 opacity-60" aria-hidden />
      </button>

      {open && (
        <div className="absolute left-0 sm:right-0 sm:left-auto top-9 z-50 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="px-2.5 py-1 text-[11px] font-medium text-muted uppercase tracking-wider">
            Switch Environment Context
          </div>
          {environments.map((env) => {
            const isCurrent = env === activeEnvironment;
            return (
              <button
                key={env}
                type="button"
                onClick={() => {
                  setActiveEnvironment(env);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors',
                  isCurrent ? 'bg-subtle font-semibold text-ink' : 'text-ink-soft hover:bg-subtle hover:text-ink'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', getDotStyle(env))} />
                  <span>{envLabel(env)}</span>
                </div>
                {env === 'production' && (
                  <span className="rounded bg-danger-soft px-1.5 py-0.2 text-[10px] font-semibold text-danger">
                    Live
                  </span>
                )}
              </button>
            );
          })}
          {activeEnvironment === 'production' && (
            <div className="mt-1 rounded-lg border border-danger/20 bg-danger-soft/40 p-2 text-[11px] text-danger flex items-start gap-1.5">
              <ShieldAlertIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Production changes alter caller audio & prompt behavior immediately.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
