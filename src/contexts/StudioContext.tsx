import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type {
  ActivityAction,
  ActivityItem,
  Agent,
  AgentConfig,
  Deployment,
  Draft,
  EnvironmentName,
  Issue,
  JobNotification,
  Version,
  VersionBump } from
'../types/studio';
import { seedActivity, seedAgents } from '../data/seedAgents';
import { starters } from '../data/starters';
import { useAuth } from './AuthContext';
import { buildConfig } from '../utils/configFactory';
import { validateConfig } from '../utils/validate';
import { bumpVersion, fakeChecksum, randomHex } from '../utils/format';
import { currentDeployments } from '../utils/agentStatus';

export type TestBackend = 'simulated' | 'not_configured';

export type SaveResult = {ok: true;draft: Draft;} | {ok: false;conflict: Draft;};
export type PublishResult =
{ok: true;version: Version;warnings: Issue[];secrets_required: string[];} |
{ok: false;errors: Issue[];};

interface CreateInput {
  id: string;
  name: string;
  company: string;
  starterId: string;
  customConfig?: AgentConfig;
}

interface StudioValue {
  agents: Agent[];
  activity: ActivityItem[];
  testBackend: TestBackend;
  technicalNames: boolean;
  setTechnicalNames: (v: boolean) => void;
  activeEnvironment: EnvironmentName;
  setActiveEnvironment: (env: EnvironmentName) => void;
  pinnedAgentIds: string[];
  togglePinAgent: (id: string) => void;
  savedFilters: { id: string; name: string; filter: string }[];
  saveFilter: (name: string, filter: string) => void;
  deleteFilter: (id: string) => void;
  notifications: JobNotification[];
  unreadCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  addNotification: (n: Omit<JobNotification, 'id' | 'timestamp' | 'read'>) => void;
  logAudit: (action: ActivityAction, agentId: string, detail: string) => void;
  getAgent: (id: string) => Agent | undefined;
  createAgent: (input: CreateInput) => Agent;
  saveDraft: (agentId: string, config: AgentConfig, baseRevision: number | null) => SaveResult;
  importDraft: (agentId: string, config: AgentConfig) => SaveResult;
  publish: (agentId: string, bump: VersionBump) => PublishResult;
  deploy: (agentId: string, version: string, env: EnvironmentName, note: string) => Deployment;
  rollback: (agentId: string, env: EnvironmentName) => Deployment | null;
  restoreVersion: (agentId: string, version: string) => void;
}

const StudioContext = createContext<StudioValue | null>(null);

interface StudioProviderProps {
  simulateConflict: boolean;
  testBackend: TestBackend;
  children: React.ReactNode;
}

export function StudioProvider({ simulateConflict, testBackend, children }: StudioProviderProps) {
  const { user } = useAuth();
  const who = user?.name ?? 'Unknown';
  const [agents, setAgents] = useState<Agent[]>(seedAgents);
  const [activity, setActivity] = useState<ActivityItem[]>(seedActivity);
  const [technicalNames, setTechnicalNames] = useState(false);
  const [activeEnvironment, setActiveEnvironment] = useState<EnvironmentName>('development');
  
  const [pinnedAgentIds, setPinnedAgentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('weave_pinned_agents');
      return saved ? JSON.parse(saved) : ['customer-care'];
    } catch {
      return ['customer-care'];
    }
  });

  const togglePinAgent = useCallback((id: string) => {
    setPinnedAgentIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem('weave_pinned_agents', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const [savedFilters, setSavedFilters] = useState<{ id: string; name: string; filter: string }[]>([
    { id: 'f1', name: 'Handovers only', filter: 'outcome:handed_over' },
    { id: 'f2', name: 'Cut off / Unfinished', filter: 'outcome:cut_off' },
    { id: 'f3', name: 'Web Voice Calls', filter: 'channel:web_voice' },
  ]);

  const saveFilter = useCallback((name: string, filter: string) => {
    setSavedFilters((prev) => [...prev, { id: `sf_${randomHex(4)}`, name, filter }]);
  }, []);

  const deleteFilter = useCallback((id: string) => {
    setSavedFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const [notifications, setNotifications] = useState<JobNotification[]>([
    {
      id: 'notif_1',
      title: 'Deployment Active · Staging',
      description: 'v1.0.2 for Customer Care Assistant deployed successfully.',
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      type: 'deploy',
      status: 'success',
      read: false,
      link: '/agents/customer-care/release',
    },
    {
      id: 'notif_2',
      title: 'Knowledge Index Built',
      description: 'Vector store for customer-care-kb built (3 passages, 1536-dim).',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      type: 'knowledge',
      status: 'success',
      read: false,
      link: '/knowledge',
    },
    {
      id: 'notif_3',
      title: 'Automated Scenarios Passed',
      description: '3 of 3 scenarios passed for Front Desk Concierge.',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      type: 'test',
      status: 'success',
      read: true,
      link: '/agents/front-desk/test',
    },
  ]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const addNotification = useCallback((n: Omit<JobNotification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications((prev) => [
      {
        ...n,
        id: `notif_${randomHex(6)}`,
        timestamp: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
  }, []);

  const agentsRef = useRef(agents);
  const conflictedRef = useRef(new Set<string>());

  const commit = useCallback((next: Agent[]) => {
    agentsRef.current = next;
    setAgents(next);
  }, []);

  const updateAgent = useCallback(
    (id: string, fn: (a: Agent) => Agent) => commit(agentsRef.current.map((a) => a.id === id ? fn(a) : a)),
    [commit]
  );

  const log = useCallback(
    (action: ActivityAction, agentId: string, detail: string) => {
      setActivity((prev) => {
        const item: ActivityItem = { id: `act_${randomHex(6)}`, at: new Date().toISOString(), who, action, agentId, detail };
        const top = prev[0];
        const mergeable =
        action === 'saved' && top && top.action === 'saved' && top.agentId === agentId && top.who === who &&
        Date.now() - new Date(top.at).getTime() < 10 * 60000;
        return mergeable ? [item, ...prev.slice(1)] : [item, ...prev];
      });
    },
    [who]
  );

  const logAudit = useCallback(
    (action: ActivityAction, agentId: string, detail: string) => {
      log(action, agentId, detail);
    },
    [log]
  );

  const getAgent = useCallback((id: string) => agents.find((a) => a.id === id), [agents]);

  const createAgent = useCallback(
    ({ id, name, company, starterId, customConfig }: CreateInput) => {
      const starter = starters.find((s) => s.id === starterId) ?? starters[0];
      const config = customConfig ?? buildConfig({ id, name, company, starter });
      const agent: Agent = {
        id,
        name,
        starter: starter.id,
        draft: { bot_id: id, revision: 1, saved_at: new Date().toISOString(), saved_by: who, config },
        versions: [],
        deployments: []
      };
      commit([agent, ...agentsRef.current]);
      log('created', id, customConfig ? 'Created with Describe it (AI proposal applied)' : `Created from the ${starter.name} starter`);
      return agent;
    },
    [commit, log, who]
  );

  const saveDraft = useCallback(
    (agentId: string, config: AgentConfig, baseRevision: number | null): SaveResult => {
      const agent = agentsRef.current.find((a) => a.id === agentId);
      if (!agent) throw new Error(`Unknown agent ${agentId}`);
      const now = new Date().toISOString();

      if (simulateConflict && baseRevision !== null && !conflictedRef.current.has(agentId)) {
        conflictedRef.current.add(agentId);
        const theirConfig = structuredClone(agent.draft.config);
        theirConfig.persona.rules = `${theirConfig.persona.rules} Always confirm the caller’s postcode before discussing their account.`.trim();
        theirConfig.defaults.conversation.inactivity_timeout_s = 30;
        const theirs: Draft = { ...agent.draft, revision: agent.draft.revision + 1, saved_at: now, saved_by: 'Priya Nair', config: theirConfig };
        updateAgent(agentId, (a) => ({ ...a, draft: theirs }));
        return { ok: false, conflict: theirs };
      }
      if (baseRevision !== null && baseRevision !== agent.draft.revision) return { ok: false, conflict: agent.draft };

      const draft: Draft = { bot_id: agentId, revision: agent.draft.revision + 1, saved_at: now, saved_by: who, config };
      updateAgent(agentId, (a) => ({ ...a, name: config.meta?.name?.trim() || a.name, draft }));
      log('saved', agentId, `Saved draft revision ${draft.revision}`);
      return { ok: true, draft };
    },
    [simulateConflict, updateAgent, log, who]
  );

  const importDraft = useCallback(
    (agentId: string, config: AgentConfig): SaveResult => {
      const agent = agentsRef.current.find((a) => a.id === agentId);
      if (!agent) throw new Error(`Unknown agent ${agentId}`);
      const now = new Date().toISOString();
      const draft: Draft = { bot_id: agentId, revision: agent.draft.revision + 1, saved_at: now, saved_by: who, config };
      updateAgent(agentId, (a) => ({ ...a, name: config.meta?.name?.trim() || a.name, draft }));
      log('imported', agentId, `Imported JSON configuration replacing draft rev ${draft.revision}`);
      return { ok: true, draft };
    },
    [updateAgent, log, who]
  );

  const publish = useCallback(
    (agentId: string, bump: VersionBump): PublishResult => {
      const agent = agentsRef.current.find((a) => a.id === agentId);
      if (!agent) throw new Error(`Unknown agent ${agentId}`);
      const report = validateConfig(agent.draft.config);
      if (!report.valid) return { ok: false, errors: report.errors };
      const versionNumber = bumpVersion(agent.versions[0]?.version, bump);
      const config = { ...agent.draft.config, meta: { ...agent.draft.config.meta, version: versionNumber } };
      const version: Version = { version: versionNumber, published_at: new Date().toISOString(), published_by: who, checksum: fakeChecksum(config), config };
      const nextDraftConfig = { ...agent.draft.config, meta: { ...agent.draft.config.meta, version: bumpVersion(versionNumber, 'patch') } };
      updateAgent(agentId, (a) => ({
        ...a,
        versions: [version, ...a.versions],
        draft: { ...a.draft, revision: a.draft.revision + 1, saved_at: version.published_at, saved_by: who, config: nextDraftConfig }
      }));
      log('published', agentId, `Published ${versionNumber}`);
      addNotification({
        title: `Version ${versionNumber} Published`,
        description: `Frozen version ${versionNumber} for ${agent.name} is ready to deploy.`,
        type: 'deploy',
        status: 'success',
        link: `/agents/${agentId}/release`,
      });
      return { ok: true, version, warnings: report.warnings, secrets_required: report.secrets_required };
    },
    [updateAgent, log, who, addNotification]
  );

  const startDeployment = useCallback(
    (agentId: string, version: string, env: EnvironmentName, note: string, action: ActivityAction): Deployment => {
      const agent = agentsRef.current.find((a) => a.id === agentId);
      if (!agent) throw new Error(`Unknown agent ${agentId}`);
      const current = currentDeployments(agent)[env];
      const dep: Deployment = {
        id: `dep_${randomHex(4)}`,
        status: 'pending',
        environment: env,
        version,
        previous_version: current?.version ?? null,
        deployed_at: new Date().toISOString(),
        deployed_by: who,
        note
      };
      updateAgent(agentId, (a) => ({ ...a, deployments: [dep, ...a.deployments] }));
      window.setTimeout(() => {
        updateAgent(agentId, (a) => ({ ...a, deployments: a.deployments.map((d) => d.id === dep.id ? { ...d, status: 'active' } : d) }));
        addNotification({
          title: `Deployment Active · ${env.charAt(0).toUpperCase() + env.slice(1)}`,
          description: `${version} for ${agent.name} is now live and serving callers.`,
          type: 'deploy',
          status: 'success',
          link: `/agents/${agentId}/release`,
        });
      }, 1600);
      const envName = env.charAt(0).toUpperCase() + env.slice(1);
      log(action, agentId, action === 'rolled_back' ? `Rolled ${envName} back to ${version}` : `Deployed ${version} to ${envName}`);
      return dep;
    },
    [updateAgent, log, who, addNotification]
  );

  const deploy = useCallback(
    (agentId: string, version: string, env: EnvironmentName, note: string) => startDeployment(agentId, version, env, note, 'deployed'),
    [startDeployment]
  );

  const rollback = useCallback(
    (agentId: string, env: EnvironmentName) => {
      const agent = agentsRef.current.find((a) => a.id === agentId);
      const current = agent ? currentDeployments(agent)[env] : undefined;
      if (!current?.previous_version) return null;
      return startDeployment(agentId, current.previous_version, env, `Rollback from ${current.version}`, 'rolled_back');
    },
    [startDeployment]
  );

  const restoreVersion = useCallback(
    (agentId: string, version: string) => {
      const agent = agentsRef.current.find((a) => a.id === agentId);
      const v = agent?.versions.find((x) => x.version === version);
      if (!agent || !v) return;
      const config = { ...structuredClone(v.config), meta: { ...v.config.meta, version: agent.draft.config.meta.version } };
      updateAgent(agentId, (a) => ({
        ...a,
        draft: { ...a.draft, revision: a.draft.revision + 1, saved_at: new Date().toISOString(), saved_by: who, config }
      }));
      log('restored', agentId, `Restored ${version} as the draft`);
    },
    [updateAgent, log, who]
  );

  const value = useMemo(
    () => ({
      agents,
      activity,
      testBackend,
      technicalNames,
      setTechnicalNames,
      activeEnvironment,
      setActiveEnvironment,
      pinnedAgentIds,
      togglePinAgent,
      savedFilters,
      saveFilter,
      deleteFilter,
      notifications,
      unreadCount,
      markNotificationRead,
      markAllNotificationsRead,
      clearNotifications,
      addNotification,
      logAudit,
      getAgent,
      createAgent,
      saveDraft,
      importDraft,
      publish,
      deploy,
      rollback,
      restoreVersion
    }),
    [
      agents,
      activity,
      testBackend,
      technicalNames,
      activeEnvironment,
      setActiveEnvironment,
      pinnedAgentIds,
      togglePinAgent,
      savedFilters,
      saveFilter,
      deleteFilter,
      notifications,
      unreadCount,
      markNotificationRead,
      markAllNotificationsRead,
      clearNotifications,
      addNotification,
      logAudit,
      getAgent,
      createAgent,
      saveDraft,
      importDraft,
      publish,
      deploy,
      rollback,
      restoreVersion,
    ]
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used inside StudioProvider');
  return ctx;
}