import React from 'react';
import { BracesIcon } from 'lucide-react';
import type { AgentConfig, Path } from '../../../types/studio';
import { StatusChip } from '../../ui/StatusChip';
import { Button } from '../../ui/Button';
import { fieldId } from '../../../utils/path';
import { inputClass } from '../../../utils/styles';
import { toolLabel } from './toolTypes';

interface ToolsEditorProps {
  readonly config: AgentConfig;
  readonly disabled: boolean;
  readonly update: (path: Path, value: unknown) => void;
  readonly onOpenJson: () => void;
}

export function ToolsEditor({ config, disabled, update, onOpenJson }: ToolsEditorProps) {
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {(config.tools ?? []).map((tool, i) =>
        <li key={`${tool.id}-${i}`} id={fieldId(['tools', i])} className="scroll-mt-28 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <code className="font-mono text-[13px] font-medium text-ink">{tool.id}</code>
              <StatusChip>{toolLabel(tool)}</StatusChip>
              {tool.type === 'mcp' && <StatusChip tone="warning">Not available yet</StatusChip>}
              {tool.connection &&
            <span className="text-xs text-muted">
                  via <code className="font-mono">{tool.connection}</code>
                  {typeof config.connections?.[tool.connection]?.base_url === 'string' && <> · {config.connections[tool.connection].base_url}</>}
                </span>
            }
            </div>
            <label htmlFor={`${fieldId(['tools', i, 'description'])}-input`} className="sr-only">Description of {tool.id}</label>
            <input
            id={`${fieldId(['tools', i, 'description'])}-input`}
            className={`${inputClass} mt-2`}
            value={tool.description ?? ''}
            disabled={disabled}
            onChange={(e) => update(['tools', i, 'description'], e.target.value)} />
          
          </li>
        )}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-subtle px-4 py-3 text-[13px] text-ink-soft">
        To add a tool or change its type and parameters, use the JSON view.
        <Button size="sm" variant="secondary" onClick={onOpenJson}>
          <BracesIcon className="h-3.5 w-3.5" aria-hidden />
          Open JSON
        </Button>
      </div>
    </div>);

}
