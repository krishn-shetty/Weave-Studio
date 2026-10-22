import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  VersionBump,
} from '../types/studio';
import { starters } from '../data/starters';
import { useAuth } from './AuthContext';
import { buildConfig, normalizeConfig } from '../utils/configFactory';
import { validateConfig } from '../utils/validate';
import { bumpVersion, randomHex } from '../utils/format';
import { currentDeployments } from '../utils/agentStatus';
import { api, ApiError } from '../api/client';
import type { BotSummary } from '../api/types';

export type TestBackend = 'simulated' | 'not_configured' | 'real';

export type SaveResult =
  | { ok: true; draft: Draft }
  | { ok: false; conflict: Draft };

export type PublishResult =
  | { ok: true; version: Version; warnings: Issue[]; secrets_required: string[] }
  | { ok: false; errors: Issue[] };

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
  loading: boolean;
  error: string | null;
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
  createAgent: (input: CreateInput) => Promise<Agent> | Agent;
  saveDraft: (agentId: string, config: AgentConfig, baseRevision: number | null) => SaveResult;
  saveDraftAsync: (agentId: string, config: AgentConfig, baseRevision: number | null) => Promise<SaveResult>;
  importDraft: (agentId: string, config: AgentConfig) => SaveResult;
  publish: (agentId: string, bump: VersionBump) => PublishResult;
  deploy: (agentId: string, version: string, env: EnvironmentName, note: string) => Deployment;
  rollback: (agentId: string, env: EnvironmentName) => Deployment | null;
  restoreVersion: (agentId: string, version: string) => void;
  refreshAgents: () => Promise<void>;
  refreshAgent: (id: string) => Promise<Agent | undefined>;
}

const StudioContext = createContext<StudioValue | null>(null);

interface StudioProviderProps {
  simulateConflict?: boolean;
  testBackend?: TestBackend;
  children: React.ReactNode;
}

export function StudioProvider({
  testBackend = 'real',
  children,
}: StudioProviderProps) {
  const { user } = useAuth();
  const who = user?.name ?? 'Unknown';

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [technicalNames, setTechnicalNames] = useState(false);
  const [activeEnvironment, setActiveEnvironment] = useState<EnvironmentName>('development');

  const [pinnedAgentIds, setPinnedAgentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('weave_pinned_agents');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
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

  const [notifications, setNotifications] = useState<JobNotification[]>([]);
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

  const agentsRef = useRef<Agent[]>(agents);
  agentsRef.current = agents;

  const commit = useCallback((next: Agent[]) => {
    agentsRef.current = next;
    setAgents(next);
  }, []);

  const updateAgent = useCallback(
    (id: string, fn: (a: Agent) => Agent) => commit(agentsRef.current.map((a) => (a.id === id ? fn(a) : a))),
    [commit]
  );

  const log = useCallback(
    (action: ActivityAction, agentId: string, detail: string) => {
      setActivity((prev) => {
        const item: ActivityItem = { id: `act_${randomHex(6)}`, at: new Date().toISOString(), who, action, agentId, detail };
        const top = prev[0];
        const mergeable =
          action === 'saved' &&
          top &&
          top.action === 'saved' &&
          top.agentId === agentId &&
          top.who === who &&
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

  // Helper to load full bot details from server
  const fetchFullBot = useCallback(async (summary: BotSummary): Promise<Agent> => {
    try {
      const [draftRes, versionsRes, deploymentsRes] = await Promise.allSettled([
        api.getDraft(summary.id),
        api.listVersions(summary.id),
        api.listDeployments(summary.id),
      ]);

      let draft: Draft;
      if (draftRes.status === 'fulfilled') {
        draft = {
          bot_id: summary.id,
          revision: draftRes.value.revision,
          saved_at: draftRes.value.saved_at,
          saved_by: draftRes.value.saved_by || 'Unknown',
          config: normalizeConfig(draftRes.value.config as AgentConfig),
        };
      } else {
        draft = {
          bot_id: summary.id,
          revision: summary.draft_revision || 1,
          saved_at: summary.draft_saved_at || new Date().toISOString(),
          saved_by: 'Server',
          config: buildConfig({
            id: summary.id,
            name: summary.name,
            company: 'Organization',
            starter: starters[0],
          }),
        };
      }

      const versions: Version[] =
        versionsRes.status === 'fulfilled' && Array.isArray(versionsRes.value)
          ? versionsRes.value.map((v: any) => ({
              version: v.version,
              published_at: v.published_at,
              published_by: v.published_by || 'Server',
              checksum: v.checksum || '',
              config: normalizeConfig(v.config || draft.config),
            }))
          : [];

      const deployments: Deployment[] =
        deploymentsRes.status === 'fulfilled' && Array.isArray(deploymentsRes.value?.history)
          ? deploymentsRes.value.history.map((d: any) => ({
              id: d.id,
              status: d.status as any,
              environment: d.environment as EnvironmentName,
              version: d.version,
              previous_version: d.previous_version ?? null,
              deployed_at: d.deployed_at,
              deployed_by: d.deployed_by || 'Server',
              note: d.note || '',
            }))
          : [];

      return {
        id: summary.id,
        name: summary.name,
        starter: 'custom',
        draft,
        versions,
        deployments,
      };
    } catch {
      // Fallback
      return {
        id: summary.id,
        name: summary.name,
        starter: 'custom',
        draft: {
          bot_id: summary.id,
          revision: summary.draft_revision || 1,
          saved_at: summary.draft_saved_at || new Date().toISOString(),
          saved_by: 'Server',
          config: {} as any,
        },
        versions: [],
        deployments: [],
      };
    }
  }, []);

  // Refresh entire agent list from the real API
  const refreshAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summaries = await api.listBots();
      const fullBots = await Promise.all(summaries.map(fetchFullBot));
      commit(fullBots);

      // Build real activity and notifications from the fetched bots
      const activities: ActivityItem[] = [];
      const notifs: JobNotification[] = [];

      fullBots.forEach((bot) => {
        if (bot.draft.saved_at) {
          activities.push({
            id: `act_${bot.id}_saved`,
            at: bot.draft.saved_at,
            who: bot.draft.saved_by || 'Server',
            action: 'saved',
            agentId: bot.id,
            detail: `Saved draft rev ${bot.draft.revision}`,
          });
        }
        bot.versions.forEach((v) => {
          activities.push({
            id: `act_${bot.id}_v_${v.version}`,
            at: v.published_at,
            who: v.published_by,
            action: 'published',
            agentId: bot.id,
            detail: `Published version ${v.version}`,
          });
        });
        bot.deployments.forEach((d) => {
          activities.push({
            id: `act_${bot.id}_d_${d.id}`,
            at: d.deployed_at,
            who: d.deployed_by,
            action: 'deployed',
            agentId: bot.id,
            detail: `Deployed ${d.version} to ${d.environment}`,
          });
          notifs.push({
            id: `notif_${d.id}`,
            title: `Deployment ${d.status === 'active' ? 'Active' : d.status} · ${d.environment}`,
            description: `${d.version} for ${bot.name} (${d.deployed_by}).`,
            timestamp: d.deployed_at,
            type: 'deploy',
            status: d.status === 'active' ? 'success' : d.status === 'failed' ? 'failed' : 'running',
            read: true,
            link: `/agents/${bot.id}/release`,
          });
        });
      });

      activities.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setActivity(activities);
      setNotifications(notifs);
    } catch (err: any) {
      setError(err?.message || 'Could not load agents from server.');
    } finally {
      setLoading(false);
    }
  }, [commit, fetchFullBot]);

  // Initial load
  useEffect(() => {
    refreshAgents();
  }, [refreshAgents]);

  const refreshAgent = useCallback(
    async (id: string): Promise<Agent | undefined> => {
      try {
        const summary = await api.getBot(id);
        const full = await fetchFullBot(summary);
        updateAgent(id, () => full);
        return full;
      } catch {
        return agentsRef.current.find((a) => a.id === id);
      }
    },
    [fetchFullBot, updateAgent]
  );

  const getAgent = useCallback((id: string) => agents.find((a) => a.id === id), [agents]);

  const createAgent = useCallback(
    async ({ id, name, company, starterId, customConfig }: CreateInput): Promise<Agent> => {
      const starter = starters.find((s) => s.id === starterId) ?? starters[0];
      const initialConfig = customConfig ?? buildConfig({ id, name, company, starter });

      // Call real backend API to create bot
      await api.createBot({ id, name });

      // Save initial config as draft
      const saveRes = await api.saveDraft(id, initialConfig, null);

      const agent: Agent = {
        id,
        name,
        starter: starter.id,
        draft: {
          bot_id: id,
          revision: saveRes.draft.revision || 1,
          saved_at: saveRes.draft.saved_at || new Date().toISOString(),
          saved_by: who,
          config: initialConfig,
        },
        versions: [],
        deployments: [],
      };

      commit([agent, ...agentsRef.current]);
      log('created', id, customConfig ? 'Created with AI proposal' : `Created from ${starter.name} starter`);
      return agent;
    },
    [commit, log, who]
  );

  const saveDraftAsync = useCallback(
    async (agentId: string, config: AgentConfig, baseRevision: number | null): Promise<SaveResult> => {
      const agent = agentsRef.current.find((a) => a.id === agentId);
      if (!agent) throw new Error(`Unknown agent ${agentId}`);

      try {
        const res = await api.saveDraft(agentId, config, baseRevision);
        const draft: Draft = {
          bot_id: agentId,
          revision: res.draft.revision,
          saved_at: res.draft.saved_at,
          saved_by: res.draft.saved_by || who,
          config: (res.draft.config as AgentConfig) || config,
        };

        updateAgent(agentId, (a) => ({
          ...a,
          name: config.meta?.name?.trim() || a.name,
          draft,
        }));
        log('saved', agentId, `Saved draft revision ${draft.revision}`);
        return { ok: true, draft };
      } catch (err: any) {
        if (err instanceof ApiError && err.kind === 'conflict') {
          // Fetch real current draft from server to provide conflict resolution
          const currentOnServer = await api.getDraft(agentId);
          const serverDraft: Draft = {
            bot_id: agentId,
            revision: currentOnServer.revision,
            saved_at: currentOnServer.saved_at,
            saved_by: currentOnServer.saved_by,
            config: currentOnServer.config as AgentConfig,
          };
          updateAgent(agentId, (a) => ({ ...a, draft: serverDraft }));
          return { ok: false, conflict: serverDraft };
        }
        throw err;
      }
    },
    [updateAgent, log, who]
  );

  const saveDraft = useCallback(
    (agentId: string, config: AgentConfig, baseRevision: number | null): SaveResult => {
      const agent = agentsRef.current.find((a) => a.id === agentId);
      if (!agent) throw new Error(`Unknown agent ${agentId}`);

      const now = new Date().toISOString();
      const optimisticDraft: Draft = {
        bot_id: agentId,
        revision: (baseRevision || agent.draft.revision) + 1,
        saved_at: now,
        saved_by: who,
        config,
      };

      // Apply optimistic update immediately
      updateAgent(agentId, (a) => ({
        ...a,
        name: config.meta?.name?.trim() || a.name,
        draft: optimisticDraft,
      }));

      // Send to server in background
      api.saveDraft(agentId, config, baseRevision)
        .then((res) => {
          updateAgent(agentId, (a) => ({
            ...a,
            draft: {
              bot_id: agentId,
              revision: res.draft.revision,
              saved_at: res.draft.saved_at,
              saved_by: res.draft.saved_by || who,
              config: (res.draft.config as AgentConfig) || config,
            },
          }));
          log('saved', agentId, `Saved draft revision ${res.draft.revision}`);
        })
        .catch((err) => {
          if (err instanceof ApiError && err.kind === 'conflict') {
            api.getDraft(agentId).then((latest) => {
              updateAgent(agentId, (a) => ({
                ...a,
                draft: {
                  bot_id: agentId,
                  revision: latest.revision,
                  saved_at: latest.saved_at,
                  saved_by: latest.saved_by,
                  config: latest.config as AgentConfig,
                },
              }));
            });
          }
        });

      return { ok: true, draft: optimisticDraft };
    },
    [updateAgent, log, who]
  );

  const importDraft = useCallback(
    (agentId: string, config: AgentConfig): SaveResult => {
      return saveDraft(agentId, config, null);
    },
    [saveDraft]
  );

  const publish = useCallback(
    (agentId: string, bump: VersionBump): PublishResult => {
      const agent = agentsRef.current.find((a) => a.id === agentId);
      if (!agent) throw new Error(`Unknown agent ${agentId}`);

      const report = validateConfig(agent.draft.config);
      if (!report.valid) return { ok: false, errors: report.errors };

      const versionNumber = bumpVersion(agent.versions[0]?.version, bump);
      const config = { ...agent.draft.config, meta: { ...agent.draft.config.meta, version: versionNumber } };
      const version: Version = {
        version: versionNumber,
        published_at: new Date().toISOString(),
        published_by: who,
        checksum: `sha256_${randomHex(16)}`,
        config,
      };

      // Optimistic update
      updateAgent(agentId, (a) => ({
        ...a,
        versions: [version, ...a.versions],
      }));

      // Call real server publish endpoint
      api.publish(agentId, bump)
        .then((res) => {
          updateAgent(agentId, (a) => ({
            ...a,
            versions: [
              {
                version: res.version,
                published_at: res.published_at,
                published_by: res.published_by || who,
                checksum: res.checksum,
                config,
              },
              ...a.versions.filter((v) => v.version !== versionNumber),
            ],
          }));
          log('published', agentId, `Published ${res.version}`);
          addNotification({
            title: `Version ${res.version} Published`,
            description: `Version ${res.version} for ${agent.name} is ready to deploy.`,
            type: 'deploy',
            status: 'success',
            link: `/agents/${agentId}/release`,
          });
        })
        .catch(() => {
          // If server rejects, refresh agent
          refreshAgent(agentId);
        });

      return { ok: true, version, warnings: report.warnings, secrets_required: report.secrets_required };
    },
    [updateAgent, log, who, addNotification, refreshAgent]
  );

  const deploy = useCallback(
    (agentId: string, version: string, env: EnvironmentName, note: string): Deployment => {
      const agent = agentsRef.current.find((a) => a.id === agentId);
      if (!agent) throw new Error(`Unknown agent ${agentId}`);
      const current = currentDeployments(agent)[env];

      const dep: Deployment = {
        id: `dep_${randomHex(6)}`,
        status: 'pending',
        environment: env,
        version,
        previous_version: current?.version ?? null,
        deployed_at: new Date().toISOString(),
        deployed_by: who,
        note,
      };

      // Optimistic update
      updateAgent(agentId, (a) => ({ ...a, deployments: [dep, ...a.deployments] }));

      // Send to real API
      api.deploy(agentId, { version, environment: env, note })
        .then((res) => {
          const realDep = res.deployment;
          updateAgent(agentId, (a) => ({
            ...a,
            deployments: [
              {
                id: realDep.id,
                status: realDep.status as any,
                environment: realDep.environment as EnvironmentName,
                version: realDep.version,
                previous_version: realDep.previous_version,
                deployed_at: realDep.deployed_at,
                deployed_by: realDep.deployed_by || who,
                note: realDep.note || note,
              },
              ...a.deployments.filter((d) => d.id !== dep.id),
            ],
          }));

          addNotification({
            title: `Deployment Active · ${env.charAt(0).toUpperCase() + env.slice(1)}`,
            description: `${version} for ${agent.name} is now live.`,
            type: 'deploy',
            status: 'success',
            link: `/agents/${agentId}/release`,
          });
          log('deployed', agentId, `Deployed ${version} to ${env}`);
        })
        .catch(() => {
          updateAgent(agentId, (a) => ({
            ...a,
            deployments: a.deployments.map((d) => (d.id === dep.id ? { ...d, status: 'failed' } : d)),
          }));
        });

      return dep;
    },
    [updateAgent, log, who, addNotification]
  );

  const rollback = useCallback(
    (agentId: string, env: EnvironmentName): Deployment | null => {
      const agent = agentsRef.current.find((a) => a.id === agentId);
      const current = agent ? currentDeployments(agent)[env] : undefined;
      if (!current?.previous_version) return null;
      return deploy(agentId, current.previous_version, env, `Rollback from ${current.version}`);
    },
    [deploy]
  );

  const restoreVersion = useCallback(
    async (agentId: string, version: string) => {
      const agent = agentsRef.current.find((a) => a.id === agentId);
      if (!agent) return;

      try {
        const v = await api.getVersion(agentId, version);
        const config = (v.config as AgentConfig) || agent.versions.find((x) => x.version === version)?.config;
        if (!config) return;

        await api.saveDraft(agentId, config, null);
        await refreshAgent(agentId);
        log('restored', agentId, `Restored ${version} as the draft`);
      } catch (err: any) {
        log('restored', agentId, `Failed to restore ${version}: ${err?.message}`);
      }
    },
    [refreshAgent, log]
  );

  const value = useMemo(
    () => ({
      agents,
      activity,
      loading,
      error,
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
      saveDraftAsync,
      importDraft,
      publish,
      deploy,
      rollback,
      restoreVersion,
      refreshAgents,
      refreshAgent,
    }),
    [
      agents,
      activity,
      loading,
      error,
      testBackend,
      technicalNames,
      activeEnvironment,
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
      saveDraftAsync,
      importDraft,
      publish,
      deploy,
      rollback,
      restoreVersion,
      refreshAgents,
      refreshAgent,
    ]
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used inside StudioProvider');
  return ctx;
}