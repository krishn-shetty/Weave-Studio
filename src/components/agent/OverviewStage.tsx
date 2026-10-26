import React from 'react';
import type { DraftEditor } from '../../hooks/useDraftEditor';
import type { AgentReadiness } from '../../hooks/useReadiness';
import { ProgressRing, ReadinessChecklist, ShipStrip } from './Readiness';

interface OverviewStageProps {
  editor: DraftEditor;
  state: AgentReadiness;
  onPublish: () => void;
}

/** The agent's first page: how far it is from live, every step, and where each one is done. */
export function OverviewStage({ editor, state, onPublish }: OverviewStageProps) {
  const agent = editor.agent;
  if (!agent) return null;
  const { readiness, ship } = state;
  const checking = editor.validationView.status !== 'checked' || state.facts?.loading || !state.facts;
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-6 lg:px-10">
      <section aria-labelledby="ready-title" className="flex flex-wrap items-center gap-5">
        <ProgressRing done={readiness.done} total={readiness.total} size={64} label={`${readiness.done} of ${readiness.total} steps done`} />
        <div className="min-w-0 flex-1">
          <h2 id="ready-title" className="text-lg font-semibold tracking-tight text-ink">Getting it ready</h2>
          <p className="mt-0.5 text-sm text-muted">
            {readiness.done} of {readiness.total} steps done.{' '}
            {readiness.next ? <>Next: <span className="font-medium text-ink">{readiness.next.label}</span>.</> : 'Everything is done.'}
            {checking && <span className="ml-1 text-xs">Still reading the checks and tests from the server…</span>}
          </p>
        </div>
      </section>

      <div className="mt-6">
        <ReadinessChecklist agentId={agent.id} readiness={readiness} />
      </div>

      <div className="mt-8">
        <ShipStrip agentId={agent.id} ship={ship} onSave={() => void editor.save()} onPublish={onPublish} />
      </div>
    </div>);

}
