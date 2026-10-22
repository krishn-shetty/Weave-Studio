import React from 'react';
import type { Change } from '../../utils/diff';
import { formatValue, groupChanges } from '../../utils/diff';
import { StatusChip } from '../ui/StatusChip';

interface ChangeListProps {
  changes: Change[];
  emptyText?: string;
}

const opTone = { add: 'success', remove: 'danger', change: 'info' } as const;
const opLabel = { add: 'Added', remove: 'Removed', change: 'Changed' } as const;

export function ChangeList({ changes, emptyText = 'No differences.' }: ChangeListProps) {
  if (changes.length === 0) return <p className="py-6 text-center text-sm text-muted">{emptyText}</p>;
  const groups = groupChanges(changes);
  return (
    <div className="space-y-6">
      {groups.map((g) =>
      <section key={g.section} aria-label={g.label}>
          <h3 className="flex items-baseline gap-2 text-sm font-semibold text-ink">
            {g.label}
            <span className="text-xs font-normal text-muted">{g.changes.length} {g.changes.length === 1 ? 'change' : 'changes'}</span>
          </h3>
          <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
            {g.changes.map((c) =>
          <li key={c.path.join('.')} className="px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip tone={opTone[c.op]}>{opLabel[c.op]}</StatusChip>
                  <code className="break-all font-mono text-xs text-ink-soft">{c.path.join('.')}</code>
                </div>
                <div className="mt-2 grid gap-1.5 text-[13px] sm:grid-cols-2">
                  {c.op !== 'add' &&
              <p className="whitespace-pre-wrap break-words rounded bg-danger-soft/70 px-2 py-1 text-ink-soft">
                      <span className="sr-only">Before: </span>
                      {formatValue(c.before)}
                    </p>
              }
                  {c.op !== 'remove' &&
              <p className="whitespace-pre-wrap break-words rounded bg-success-soft/80 px-2 py-1 text-ink">
                      <span className="sr-only">After: </span>
                      {formatValue(c.after)}
                    </p>
              }
                </div>
              </li>
          )}
          </ul>
        </section>
      )}
    </div>);

}