// The pages of an agent, and which page a place in the config is edited on. Pure: no React, no DOM.
import type { Path, StageId } from '../types/studio';

/** The parts of Build, each a page with plain controls and, below them, every setting of that part. */
export type BuildSection = 'agent' | 'channels' | 'tools' | 'knowledge' | 'guardrails' | 'aftercall';

export const BUILD_SECTIONS: { id: BuildSection; label: string; description: string }[] = [
  { id: 'agent', label: 'Agent', description: 'What it does, how it sounds, its language and AI model.' },
  { id: 'channels', label: 'Channels', description: 'Where people reach it, and what it says first.' },
  { id: 'tools', label: 'Tools', description: 'What it can do during a conversation.' },
  { id: 'knowledge', label: 'Knowledge', description: 'Documents and web pages it answers from.' },
  { id: 'guardrails', label: 'Guardrails', description: 'What it talks about, when it hands over, and its limits.' },
  { id: 'aftercall', label: 'After the call', description: 'Summaries, questions answered, recordings and what is hidden.' },
];

export const STAGES: { id: StageId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'build', label: 'Build' },
  { id: 'test', label: 'Test' },
  { id: 'release', label: 'Release' },
  { id: 'monitor', label: 'Monitor' },
];

/** Where something is done: a stage, and for Build one of its sections; `focus` names the control to open there. */
export interface PageTarget {
  stage: StageId;
  section?: BuildSection;
  focus?: string;
}

/** The address of a target, under the agent's own address. */
export function targetPath(agentId: string, target: PageTarget): string {
  const base = `/agents/${encodeURIComponent(agentId)}/${target.stage}`;
  const withSection = target.stage === 'build' && target.section ? `${base}/${target.section}` : base;
  return target.focus ? `${withSection}?focus=${encodeURIComponent(target.focus)}` : withSection;
}

/** The Build section that edits a place in the config (for a problem the server found there). */
export function sectionOfPath(path: Path | null | undefined): BuildSection | null {
  const top = path?.[0];
  if (top === undefined) return null;
  switch (top) {
    case 'channels':
    case 'telephony':
      return 'channels';
    case 'tools':
    case 'connections':
    case 'tasks':
    case 'forms':
    case 'notifications':
      return 'tools';
    case 'knowledge':
      return 'knowledge';
    case 'guardrails':
      return 'guardrails';
    case 'post_call':
    case 'observability':
      return 'aftercall';
    default:
      return 'agent';
  }
}

/** Server problems per Build section, for the numbers on the section menu. Problems with no place count nowhere. */
export function problemsBySection(errors: { path: Path | null }[]): Partial<Record<BuildSection, number>> {
  const out: Partial<Record<BuildSection, number>> = {};
  errors.forEach((e) => {
    const s = e.path && e.path[0] !== 'tests' ? sectionOfPath(e.path) : null;
    if (s) out[s] = (out[s] ?? 0) + 1;
  });
  return out;
}
