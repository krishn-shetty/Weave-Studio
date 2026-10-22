import React, { useEffect, useRef, useState } from 'react';
import { CircleAlertIcon, CircleCheckIcon, CopyIcon, WandSparklesIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { AgentConfig } from '../../../types/studio';
import type { DraftEditor } from '../../../hooks/useDraftEditor';
import { Button } from '../../ui/Button';
import { checkJson } from '../../../utils/jsonCheck';
import { cn } from '../../../utils/styles';

const LINE_HEIGHT = 20;
const REQUIRED_SECTIONS = ['meta', 'persona', 'defaults', 'channels', 'agents', 'tools', 'post_call', 'observability', 'runtime'];

function missingSections(obj: Record<string, unknown>): string | null {
  const missing = REQUIRED_SECTIONS.filter((k) => typeof obj[k] !== 'object' || obj[k] === null);
  if (missing.length) return `Missing section${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Every agent needs these.`;
  const defaults = obj.defaults as Record<string, unknown>;
  const agents = obj.agents as Record<string, unknown>;
  if (typeof defaults.models !== 'object' || defaults.models === null) return 'defaults.models is missing.';
  const models = defaults.models as Record<string, unknown>;
  const missingModel = ['llm', 'stt', 'tts'].find((k) => typeof models[k] !== 'object' || models[k] === null);
  if (missingModel) return `defaults.models.${missingModel} is missing.`;
  if (typeof defaults.conversation !== 'object' || defaults.conversation === null) return 'defaults.conversation is missing.';
  if (!Array.isArray(agents.items)) return 'agents.items must be a list.';
  if (!Array.isArray(obj.channels) || !Array.isArray(obj.tools)) return 'channels and tools must be lists.';
  return null;
}

export function JsonView({ editor }: {editor: DraftEditor;}) {
  const { config, replaceConfig, canEdit } = editor;
  const serialized = config ? JSON.stringify(config, null, 2) : '';
  const [text, setText] = useState(serialized);
  const [problem, setProblem] = useState<{message: string;line: number | null;} | null>(null);
  const lastApplied = useRef(serialized);

  // Take outside changes (other views, conflict resolution) when the text isn't mid-edit.
  useEffect(() => {
    if (serialized !== lastApplied.current) {
      lastApplied.current = serialized;
      setText(serialized);
      setProblem(null);
    }
  }, [serialized]);

  useEffect(() => {
    if (text === lastApplied.current) return;
    const t = window.setTimeout(() => {
      const result = checkJson(text);
      if (!result.ok) {
        setProblem({ message: result.message, line: result.line });
        return;
      }
      const shapeProblem = missingSections(result.value as Record<string, unknown>);
      if (shapeProblem) {
        setProblem({ message: shapeProblem, line: null });
        return;
      }
      setProblem(null);
      const next = result.value as AgentConfig;
      lastApplied.current = JSON.stringify(next, null, 2);
      replaceConfig(next);
    }, 400);
    return () => window.clearTimeout(t);
  }, [text, replaceConfig]);

  const lines = text.split('\n').length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart, selectionEnd } = el;
    const next = `${text.slice(0, selectionStart)}  ${text.slice(selectionEnd)}`;
    setText(next);
    window.requestAnimationFrame(() => el.setSelectionRange(selectionStart + 2, selectionStart + 2));
  };

  const format = () => {
    const result = checkJson(text);
    if (result.ok) setText(JSON.stringify(result.value, null, 2));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div aria-live="polite" className="text-[13px]">
          {problem ?
          <span className="flex items-center gap-1.5 text-danger">
              <CircleAlertIcon className="h-4 w-4" aria-hidden />
              Not applied{problem.line ? ` — line ${problem.line}` : ''}: {problem.message}
            </span> :

          <span className="flex items-center gap-1.5 text-muted">
              <CircleCheckIcon className="h-4 w-4 text-success" aria-hidden />
              Valid JSON. Edits apply to the draft as you type.
            </span>
          }
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={format} disabled={!canEdit}>
            <WandSparklesIcon className="h-3.5 w-3.5" aria-hidden />
            Format
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void navigator.clipboard?.writeText(text);
              toast('Configuration copied');
            }}>
            
            <CopyIcon className="h-3.5 w-3.5" aria-hidden />
            Copy
          </Button>
        </div>
      </div>
      {problem &&
      <p className="mt-2 rounded-md bg-danger-soft px-3 py-2 text-[13px] text-ink-soft">
          Your draft keeps the last valid version until this is fixed. Nothing is lost.
        </p>
      }
      <div className={cn('mt-3 max-h-[70vh] overflow-auto rounded-lg border bg-surface', problem ? 'border-danger/50' : 'border-line')}>
        <div className="flex min-w-max font-mono text-[13px]" style={{ lineHeight: `${LINE_HEIGHT}px` }}>
          <pre aria-hidden className="sticky left-0 select-none border-r border-line bg-canvas px-3 py-3 text-right text-muted">
            {Array.from({ length: lines }, (_, i) =>
            <div key={i} className={cn(problem?.line === i + 1 && 'bg-danger-soft text-danger')}>
                {i + 1}
              </div>
            )}
          </pre>
          <textarea
            aria-label="Agent configuration JSON"
            value={text}
            readOnly={!canEdit}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            wrap="off"
            className="min-w-[640px] flex-1 resize-none overflow-hidden whitespace-pre bg-transparent px-4 py-3 text-ink focus:outline-none"
            style={{ height: lines * LINE_HEIGHT + 24, lineHeight: `${LINE_HEIGHT}px` }} />
          
        </div>
      </div>
    </div>);

}