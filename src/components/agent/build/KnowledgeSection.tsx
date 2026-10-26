import React, { useEffect, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenIcon } from 'lucide-react';
import type { DraftEditor } from '../../../hooks/useDraftEditor';
import { readingOf, type KnowledgeReading } from '../../../models/readiness';
import { factsVersion, getFacts, loadFacts, subscribeFacts } from '../../../utils/agentFacts';
import { StatusChip } from '../../ui/StatusChip';

const READING: Record<KnowledgeReading, { text: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'info' }> = {
  ready: { text: 'Read, ready to answer from', tone: 'success' },
  reading: { text: 'Being read', tone: 'info' },
  unread: { text: 'Not read yet', tone: 'warning' },
  changed: { text: 'Changed since it was read', tone: 'warning' },
  failed: { text: 'Reading failed', tone: 'danger' },
  unknown: { text: 'Not known', tone: 'neutral' },
};

/** The agent's knowledge bases as the draft lists them, with how far the server has read each one (GET /knowledge). */
export function KnowledgeSection({ editor }: { editor: DraftEditor }) {
  useSyncExternalStore(subscribeFacts, factsVersion, factsVersion);
  const agentId = editor.agent?.id ?? '';
  useEffect(() => {
    if (agentId) void loadFacts(agentId);
  }, [agentId]);
  const facts = getFacts(agentId);
  const bases = (editor.config?.knowledge ?? []) as Array<{ id?: string; type?: string; mode?: string; sources?: unknown[] }>;

  return (
    <div className="space-y-4">
      {bases.length === 0 ?
      <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center">
          <BookOpenIcon className="mx-auto h-6 w-6 text-muted" aria-hidden />
          <p className="mt-2 text-sm font-medium text-ink">No knowledge yet</p>
          <p className="mt-1 text-[13px] text-muted">Add documents or web pages so it can answer from them.</p>
        </div> :

      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {bases.map((b, i) => {
          const state = b.type !== 'vector_store' ? null : facts?.knowledge ? readingOf(facts.knowledge.find((s) => s.id === b.id)) : facts?.loading || !facts ? null : 'unknown';
          return (
            <li key={b.id ?? i} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{b.id}</p>
                  <p className="text-xs text-muted">
                    {b.type === 'vector_store' ? `Your documents and web pages · ${(b.sources ?? []).length} ${(b.sources ?? []).length === 1 ? 'source' : 'sources'}` : 'A search service you already run'}
                    {b.mode ? ` · ${b.mode === 'inject' ? 'looked up before every reply' : 'looked up when needed'}` : ''}
                  </p>
                </div>
                {state ?
              <StatusChip tone={READING[state].tone} dot>{READING[state].text}</StatusChip> :
              b.type === 'vector_store' ? <span className="h-5 w-28 animate-pulse rounded bg-subtle" aria-label="Checking" /> : null}
              </li>);

        })}
        </ul>
      }
      <p className="text-[13px] text-muted">
        Upload files, read them and try a search on the{' '}
        <Link to={`/knowledge?agent=${encodeURIComponent(agentId)}`} className="font-medium text-accent hover:underline">Knowledge page</Link>.
      </p>
    </div>);

}
