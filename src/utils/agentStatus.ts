import type { Agent, Deployment, EnvironmentName, StageId, Version } from '../types/studio';
import { diffConfigs, meaningfulChanges } from './diff';
import { validateConfig } from './validate';
import { serverSecrets } from '../data/providers';

export const environments: EnvironmentName[] = ['development', 'staging', 'production'];

export const envLabel = (env: EnvironmentName): string => env.charAt(0).toUpperCase() + env.slice(1);
export const envShort = (env: EnvironmentName): string => env === 'development' ? 'Dev' : env === 'staging' ? 'Staging' : 'Prod';

export function currentDeployments(agent: Agent): Partial<Record<EnvironmentName, Deployment>> {
  const out: Partial<Record<EnvironmentName, Deployment>> = {};
  agent.deployments.forEach((d) => {
    if (d.status === 'active' && !out[d.environment]) out[d.environment] = d;
  });
  return out;
}

export const pendingDeployment = (agent: Agent, env: EnvironmentName): Deployment | undefined =>
agent.deployments.find((d) => d.environment === env && d.status === 'pending');

export const liveEnvironments = (agent: Agent): EnvironmentName[] => {
  const current = currentDeployments(agent);
  return environments.filter((e) => current[e]);
};

export const latestVersion = (agent: Agent): Version | undefined => agent.versions[0];

/** Changes in the draft since the newest version; null when that version's config has not been loaded (or the draft). */
export function draftChangeCount(agent: Agent): number | null {
  const latest = latestVersion(agent);
  if (!latest) return 0;
  if (!latest.config || agent.loadError) return null;
  return meaningfulChanges(diffConfigs(latest.config, agent.draft.config)).length;
}

export const missingSecrets = (required: string[]): string[] => required.filter((s) => !serverSecrets.includes(s));

export interface NextStep {
  title: string;
  body: string;
  cta: string;
  stage: StageId;
  tone: 'accent' | 'danger';
}

export function nextStep(agent: Agent): NextStep {
  if (agent.loadError) {
    return {
      title: `Could not load ${agent.name}`,
      body: `The draft could not be read from the server: ${agent.loadError}`,
      cta: 'Open agent',
      stage: 'build',
      tone: 'danger'
    };
  }
  const report = validateConfig(agent.draft.config);
  const latest = latestVersion(agent);
  const live = currentDeployments(agent);
  if (!report.valid) {
    return {
      title: `Fix ${report.errors.length} ${report.errors.length === 1 ? 'problem' : 'problems'} in ${agent.name}`,
      body: 'The draft is saved, but it can’t be tested or published until these are fixed. Each one links straight to the setting.',
      cta: 'Review problems',
      stage: 'build',
      tone: 'danger'
    };
  }
  if (!latest) {
    return {
      title: `Test ${agent.name}, then publish its first version`,
      body: 'Have a quick conversation with the draft to check the greeting and answers, then freeze it as version 0.1.0.',
      cta: 'Test it',
      stage: 'test',
      tone: 'accent'
    };
  }
  const changes = draftChangeCount(agent);
  if (changes !== null && changes > 0) {
    return {
      title: `${changes} unpublished ${changes === 1 ? 'change' : 'changes'} in ${agent.name}`,
      body: `Your draft has moved on since ${latest.version}. Test the changes, then publish them as a new version.`,
      cta: 'Test changes',
      stage: 'test',
      tone: 'accent'
    };
  }
  if (!live.development) {
    return {
      title: `Deploy ${latest.version} to Development`,
      body: 'The version is frozen but not serving anywhere yet. Development is the safe first stop.',
      cta: 'Go to Release',
      stage: 'release',
      tone: 'accent'
    };
  }
  if (!live.production) {
    return {
      title: `Promote ${agent.name} towards Production`,
      body: 'It’s live in Development. When you are confident, move it through Staging to Production.',
      cta: 'Go to Release',
      stage: 'release',
      tone: 'accent'
    };
  }
  return {
    title: `${agent.name} is live — keep an eye on it`,
    body: 'Check handover and cut-off rates since the last release, and turn bad calls into fixes.',
    cta: 'Open Monitoring',
    stage: 'monitor',
    tone: 'accent'
  };
}