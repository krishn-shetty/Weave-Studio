import React, { useState } from 'react';
import { CircleAlertIcon, CircleCheckIcon, KeyRoundIcon, LoaderCircleIcon, SparklesIcon, TriangleAlertIcon } from 'lucide-react';
import type { AgentConfig, Issue, Path, ValidationReport } from '../../types/studio';
import { describePath } from '../../utils/validate';
import { missingSecrets } from '../../utils/agentStatus';
import { cn } from '../../utils/styles';
import { AiAssistantModal, type AiAssistantContext } from '../ui/AiAssistantModal';

interface ValidationPanelProps {
  validation: ValidationReport;
  validating: boolean;
  config: AgentConfig;
  onGoTo: (path: Path) => void;
  onApplyFix?: (patchedConfig: AgentConfig) => void;
}

export function ValidationPanel({ validation, validating, config, onGoTo, onApplyFix }: ValidationPanelProps) {
  const [aiContext, setAiContext] = useState<AiAssistantContext | null>(null);
  const missing = missingSecrets(validation.secrets_required);
  const clean = validation.valid && validation.warnings.length === 0 && validation.unsupported.length === 0;

  return (
    <section aria-labelledby="checks-title" className="rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 id="checks-title" className="text-sm font-semibold text-ink">Checks</h2>
        <span className="flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
          {validating ?
          <>
              <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Checking…
            </> :

          'Up to date'
          }
        </span>
      </div>

      <div className={cn('space-y-5 px-4 py-4 transition-opacity duration-150', validating && 'opacity-60')}>
        {clean &&
        <div className="flex gap-2.5">
            <CircleCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            <p className="text-sm text-ink-soft">No problems. This draft can be tested and published.</p>
          </div>
        }

        {validation.errors.length > 0 &&
        <IssueGroup
          title={`${validation.errors.length} ${validation.errors.length === 1 ? 'error' : 'errors'}`}
          hint="Block testing and publishing. Saving still works."
          tone="danger"
          issues={validation.errors}
          config={config}
          onGoTo={onGoTo}
          onAskAi={(err) =>
            setAiContext({
              mode: 'fix_error',
              error: err,
              currentConfig: config,
              onApplyFix,
            })
          } />

        }

        {validation.warnings.length > 0 &&
        <IssueGroup
          title={`${validation.warnings.length} ${validation.warnings.length === 1 ? 'warning' : 'warnings'}`}
          hint="Never block. Worth a look."
          tone="warning"
          issues={validation.warnings}
          config={config}
          onGoTo={onGoTo}
          onAskAi={(warn) =>
            setAiContext({
              mode: 'fix_error',
              error: warn,
              currentConfig: config,
              onApplyFix,
            })
          } />

        }

        {validation.unsupported.length > 0 &&
        <div>
            <h3 className="text-[13px] font-semibold text-warning">Not available yet</h3>
            <ul className="mt-2 space-y-2">
              {validation.unsupported.map((u) =>
            <li key={u.where} className="rounded-md bg-warning-soft px-3 py-2 text-[13px] text-ink-soft">
                  This agent uses <span className="font-medium text-ink">{u.feature}</span>, which the runtime can’t run yet. It will be skipped on calls.
                  <span className="mt-0.5 block font-mono text-xs text-muted">{u.where}</span>
                </li>
            )}
            </ul>
          </div>
        }

        <div>
          <h3 className="text-[13px] font-semibold text-ink">Secrets the server needs</h3>
          <p className="mt-0.5 text-xs text-muted">Names only. Admins set values on the server; Studio never sees them.</p>
          <ul className="mt-2 space-y-1">
            {validation.secrets_required.map((s) =>
            <li key={s} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 font-mono text-ink-soft">
                  <KeyRoundIcon className="h-3 w-3 text-muted" aria-hidden />
                  {s}
                </span>
                {missing.includes(s) ? <span className="text-warning">Missing</span> : <span className="text-success">Found</span>}
              </li>
            )}
          </ul>
        </div>
      </div>

      <AiAssistantModal
        open={!!aiContext}
        onClose={() => setAiContext(null)}
        context={aiContext}
      />
    </section>);

}

interface IssueGroupProps {
  title: string;
  hint: string;
  tone: 'danger' | 'warning';
  issues: Issue[];
  config: AgentConfig;
  onGoTo: (path: Path) => void;
  onAskAi?: (issue: Issue) => void;
}

function IssueGroup({ title, hint, tone, issues, config, onGoTo, onAskAi }: IssueGroupProps) {
  const Icon = tone === 'danger' ? CircleAlertIcon : TriangleAlertIcon;
  return (
    <div>
      <h3 className={cn('text-[13px] font-semibold', tone === 'danger' ? 'text-danger' : 'text-warning')}>{title}</h3>
      <p className="text-xs text-muted">{hint}</p>
      <ul className="mt-2 space-y-1">
        {issues.map((issue, i) => {
          return (
            <li key={i} className="group relative rounded-md transition-colors hover:bg-subtle p-1.5">
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => issue.path && onGoTo(issue.path)}
                  className="flex flex-1 items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  aria-label={`Go to field: ${issue.message}`}
                >
                  <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', tone === 'danger' ? 'text-danger' : 'text-warning')} aria-hidden />
                  <span className="min-w-0">
                    {issue.path && <span className="block text-xs font-medium text-muted">{describePath(issue.path, config)}</span>}
                    <span className="block text-[13px] leading-snug text-ink">{issue.message}</span>
                  </span>
                </button>
                {onAskAi && (
                  <button
                    type="button"
                    onClick={() => onAskAi(issue)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent hover:bg-accent-soft/80 shrink-0"
                    title="Ask AI to propose a fix for this error"
                  >
                    <SparklesIcon className="h-2.5 w-2.5" />
                    Fix with AI
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>);

}