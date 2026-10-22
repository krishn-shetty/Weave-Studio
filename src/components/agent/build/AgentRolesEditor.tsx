import React from 'react';
import { XIcon } from 'lucide-react';
import type { AgentConfig, Issue, Path } from '../../../types/studio';
import { StatusChip } from '../../ui/StatusChip';
import { fieldId } from '../../../utils/path';
import { issuesAt } from '../../../utils/validate';
import { cn, inputClass } from '../../../utils/styles';

interface AgentRolesEditorProps {
  config: AgentConfig;
  errors: Issue[];
  warnings: Issue[];
  disabled: boolean;
  technical: boolean;
  update: (path: Path, value: unknown) => void;
}

export function AgentRolesEditor({ config, errors, warnings, disabled, technical, update }: AgentRolesEditorProps) {
  const toolIds = (config.tools ?? []).map((t) => t.id);
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">Roles are the people-like parts of your agent. Only one talks at a time; the first answers every call.</p>
      {(config.agents?.items ?? []).map((role, i) => {
        const base: Path = ['agents', 'items', i];
        const toolsPath: Path = [...base, 'tools'];
        const toolErrors = issuesAt(errors, toolsPath);
        const instrWarning = issuesAt(warnings, [...base, 'instructions'])[0]?.message;
        const undeclared = (role.tools ?? []).filter((t) => !toolIds.includes(t));
        return (
          <article key={`${role.id}-${i}`} className="rounded-lg border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-ink">{technical ? <code className="font-mono">agents.items[{i}]</code> : role.name}</h4>
              <code className="font-mono text-xs text-muted">{role.id}</code>
              {config.agents.entry === role.id && <StatusChip tone="accent">Answers first</StatusChip>}
            </div>
            <div className="mt-3 grid gap-4">
              <div id={fieldId([...base, 'name'])}>
                <label htmlFor={`${fieldId([...base, 'name'])}-input`} className="text-[13px] font-medium text-ink-soft">Role name</label>
                <input id={`${fieldId([...base, 'name'])}-input`} className={cn(inputClass, 'mt-1.5')} value={role.name} disabled={disabled} onChange={(e) => update([...base, 'name'], e.target.value)} />
              </div>
              <div id={fieldId([...base, 'instructions'])} className="scroll-mt-28 rounded-md transition-[box-shadow] duration-200">
                <label htmlFor={`${fieldId([...base, 'instructions'])}-input`} className="text-[13px] font-medium text-ink-soft">Instructions</label>
                <textarea
                  id={`${fieldId([...base, 'instructions'])}-input`}
                  rows={4}
                  className={cn(inputClass, 'mt-1.5 resize-y leading-relaxed')}
                  value={role.instructions}
                  disabled={disabled}
                  onChange={(e) => update([...base, 'instructions'], e.target.value)} />
                
                {instrWarning && <p className="mt-1.5 text-[13px] text-warning">{instrWarning}</p>}
              </div>
              <div id={fieldId(toolsPath)} className="scroll-mt-28 rounded-md transition-[box-shadow] duration-200">
                <p className="text-[13px] font-medium text-ink-soft">Tools this role can use</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {toolIds.map((t) => {
                    const on = role.tools.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={on}
                        disabled={disabled}
                        onClick={() => update(toolsPath, on ? role.tools.filter((x) => x !== t) : [...role.tools, t])}
                        className={cn(
                          'rounded-md border px-2 py-1 font-mono text-xs transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-60',
                          on ? 'border-accent/40 bg-accent-soft text-accent' : 'border-line text-muted hover:border-line-strong hover:text-ink'
                        )}>
                        
                        {t}
                      </button>);

                  })}
                  {undeclared.map((t) =>
                  <span key={t} className="inline-flex items-center gap-1 rounded-md border border-danger/30 bg-danger-soft px-2 py-1 font-mono text-xs text-danger">
                      {t}
                      <button
                      type="button"
                      disabled={disabled}
                      aria-label={`Remove ${t}`}
                      onClick={() => update(toolsPath, role.tools.filter((x) => x !== t))}
                      className="rounded p-0.5 hover:bg-danger/10">
                      
                        <XIcon className="h-3 w-3" aria-hidden />
                      </button>
                    </span>
                  )}
                </div>
                {toolErrors.map((e, k) =>
                <p key={k} className="mt-1.5 text-[13px] text-danger" role="alert">{e.message}</p>
                )}
              </div>
            </div>
          </article>);

      })}
    </div>);

}