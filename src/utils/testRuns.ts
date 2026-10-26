// Plain words for test scenarios and runs (GET /tests, GET /tests/runs). Pure.

import type { TestRun } from '../api/types';

/** "track_my_order" -> "Track my order". The id itself goes in a tooltip. */
export function readableId(id: string): string {
  const words = id.replace(/[_-]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : id;
}

const EXPECTATIONS: Record<string, string> = {
  tool_called: 'uses a tool',
  tool_not_called: 'does not use a tool',
  state_equals: 'remembers a value',
  said_matches: 'says something specific',
  judge: 'a reviewer model grades the reply',
};

/** One expectation kind in words; unknown kinds are shown as they are, made readable. */
export const expectationLabel = (kind: string): string => EXPECTATIONS[kind] ?? readableId(kind).toLowerCase();

/** "7 passed · 3 skipped" from a run's counts, leaving out zeros. */
export function runCounts(run: Pick<TestRun, 'counts'>): string {
  const { passed = 0, failed = 0, error = 0, skipped = 0 } = run.counts ?? {};
  const parts = [
    failed && `${failed} failed`,
    error && `${error} could not run`,
    passed && `${passed} passed`,
    skipped && `${skipped} skipped`,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'no scenarios ran';
}

/** The distinct reasons the server gave for skipped or failed scenarios in a run. */
export function runNotes(run: Pick<TestRun, 'scenarios'>): string[] {
  const notes = (run.scenarios ?? []).flatMap((s) => [...(s.notes ?? []), ...(s.error ? [s.error] : [])]);
  return Array.from(new Set(notes));
}
