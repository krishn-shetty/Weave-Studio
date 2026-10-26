import React from 'react';
import type { DraftEditor } from '../../../hooks/useDraftEditor';
import { Button } from '../../ui/Button';

const count = (v: unknown) => (Array.isArray(v) ? v.length : 0);

/** What the draft's guardrails section holds, in words, with the JSON view to change it. */
export function GuardrailsSection({ editor, onOpenJson }: { editor: DraftEditor; onOpenJson: () => void }) {
  const g = (editor.config?.guardrails ?? {}) as Record<string, unknown>;
  const topics = (g.topics ?? {}) as Record<string, unknown>;
  const limits = (g.limits ?? {}) as Record<string, unknown>;
  const rows = [
    ['Topics it talks about', count(topics.allowed)],
    ['Topics it must not talk about', count(topics.blocked)],
    ['Hand-over and ending rules', count(g.escalation)],
    ['Checks on what the caller says', count(g.input)],
    ['Checks on what it says', count(g.output)],
    ['Limits set', Object.keys(limits).filter((k) => k !== 'say').length],
  ] as const;
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {rows.map(([label, n]) =>
        <li key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-ink-soft">{label}</span>
            <span className={n ? 'font-medium text-ink' : 'text-muted'}>{n || 'None: the server’s default'}</span>
          </li>
        )}
      </ul>
      <Button size="sm" variant="secondary" onClick={onOpenJson}>Edit in the JSON view</Button>
    </div>);

}
