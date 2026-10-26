import { useEffect, useSyncExternalStore } from 'react';
import type { Agent, ValidationReport } from '../types/studio';
import type { DraftEditor } from './useDraftEditor';
import { readinessSteps, type Readiness } from '../models/readiness';
import { shipSteps, type ShipFlow } from '../models/shipFlow';
import { factsVersion, getFacts, loadFacts, subscribeFacts, type AgentFacts } from '../utils/agentFacts';
import { currentDeployments, draftChangeCount, latestVersion } from '../utils/agentStatus';
import { useDraftValidations } from './useServerValidation';

export interface AgentReadiness {
  readiness: Readiness;
  ship: ShipFlow;
  facts: AgentFacts | undefined;
}

interface Live {
  /** The editor's contents and state (the agent's own pages); left out, the saved draft is read. */
  editor?: Pick<DraftEditor, 'config' | 'dirty' | 'parseError'> | null;
  report: ValidationReport | null;
}

/** Readiness and ship flow for one agent, from what is known now. Pure apart from reading the facts store. */
export function readinessOf(agent: Agent, { editor, report }: Live): AgentReadiness {
  const facts = getFacts(agent.id);
  const latest = latestVersion(agent);
  const deployed = Object.fromEntries(Object.entries(currentDeployments(agent)).map(([env, d]) => [env, d?.version ?? '']));
  // Not known (not read yet, or the request failed): undefined, so nothing is claimed about the tests.
  const latestRun = facts && facts.scenarioCount !== null ? facts.latestRun : undefined;
  const scenarioCount = facts?.scenarioCount ?? 0;
  const readiness = readinessSteps({
    config: editor?.config ?? agent.draft.config,
    loadError: agent.loadError,
    report,
    scenarioCount,
    latestRun,
    knowledge: facts?.knowledge ?? null,
    latestVersion: latest?.version ?? null,
    deployed,
    gate: null,
  });
  const ship = shipSteps({
    dirty: editor?.dirty ?? false,
    parseError: editor?.parseError ?? null,
    report,
    scenarioCount,
    latestRun,
    published: latest ? { version: latest.version, changes: draftChangeCount(agent) } : null,
    deployed,
    gate: null,
  });
  return { readiness, ship, facts };
}

/** Readiness for the agent being edited: the editor's contents and the server's checks on them. */
export function useReadiness(editor: DraftEditor): AgentReadiness | null {
  useSyncExternalStore(subscribeFacts, factsVersion, factsVersion);
  const id = editor.agent?.id;
  useEffect(() => {
    if (id) void loadFacts(id);
  }, [id]);
  if (!editor.agent) return null;
  return readinessOf(editor.agent, { editor, report: editor.validationView.report });
}

/** Readiness for each agent in a list, from its saved draft. */
export function useAgentsReadiness(agents: Agent[]): Record<string, AgentReadiness> {
  useSyncExternalStore(subscribeFacts, factsVersion, factsVersion);
  const validations = useDraftValidations(agents);
  const ids = agents.map((a) => a.id).join('|');
  useEffect(() => {
    ids.split('|').filter(Boolean).forEach((id) => void loadFacts(id));
  }, [ids]);
  const out: Record<string, AgentReadiness> = {};
  agents.forEach((a) => {
    out[a.id] = readinessOf(a, { report: validations[a.id]?.report ?? null });
  });
  return out;
}
