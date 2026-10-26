import React, { useEffect, useRef, useState } from 'react';
import { CircleAlertIcon, CircleCheckIcon, CopyIcon, WandSparklesIcon } from 'lucide-react';
import { toast } from '../../ui/Toast';
import type { AgentConfig } from '../../../types/studio';
import type { DraftEditor } from '../../../hooks/useDraftEditor';
import { Button } from '../../ui/Button';
import { checkJson } from '../../../utils/jsonCheck';
import { cn } from '../../../utils/styles';

const LINE_HEIGHT = 20;
// Only whether the text is a JSON object is checked here. What a config must contain is the server's to say (POST /validate).
function notAnObject(value: unknown): string | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? null : 'The configuration must be a JSON object ({ … }).';
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
      const shapeProblem = notAnObject(result.value);
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