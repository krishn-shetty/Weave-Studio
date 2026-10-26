import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentConfig, Draft, Path, ValidationReport } from '../types/studio';
import { useStudio } from '../contexts/StudioContext';
import { useAuth } from '../contexts/AuthContext';
import { validateConfig } from '../utils/validate';
import { normalizeConfig } from '../utils/configFactory';
import { setAt } from '../utils/path';
import { api } from '../api/client';

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'conflict' | 'error';

/** How often the editor asks the server whether someone else saved a newer draft. */
const REMOTE_CHECK_MS = 15_000;

export function useDraftEditor(agentId: string) {
  const { getAgent, saveDraft } = useStudio();
  const { can } = useAuth();
  const agent = getAgent(agentId);
  const canEdit = can('edit');

  const [config, setConfig] = useState<AgentConfig | null>(agent?.draft.config ? normalizeConfig(agent.draft.config) : null);
  const [baseRevision, setBaseRevision] = useState(agent?.draft.revision ?? 0);
  const [savedAt, setSavedAt] = useState(agent?.draft.saved_at ?? '');
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [conflict, setConflict] = useState<Draft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // A newer draft someone else saved, found by checking the server (not by saving).
  const [remoteDraft, setRemoteDraft] = useState<Draft | null>(null);
  const [validation, setValidation] = useState<ValidationReport | null>(() => config ? validateConfig(config) : null);
  const [validating, setValidating] = useState(false);

  const configRef = useRef(config);
  configRef.current = config;
  const statusRef = useRef(status);
  statusRef.current = status;
  const baseRef = useRef(baseRevision);
  baseRef.current = baseRevision;

  // Load when the agent changes.
  useEffect(() => {
    const a = getAgent(agentId);
    if (!a) return;
    setConfig(normalizeConfig(a.draft.config));
    setBaseRevision(a.draft.revision);
    setSavedAt(a.draft.saved_at);
    setStatus('saved');
    setConflict(null);
    setSaveError(null);
    setRemoteDraft(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  // Pick up server-side draft changes (publish moves meta.version on, restore) when we have nothing pending.
  const serverRevision = agent?.draft.revision;
  useEffect(() => {
    if (!agent) return;
    if (statusRef.current === 'saved' && agent.draft.revision !== baseRef.current) {
      setConfig(normalizeConfig(agent.draft.config));
      setBaseRevision(agent.draft.revision);
      setSavedAt(agent.draft.saved_at);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverRevision]);

  // Debounced validation (~500 ms after typing stops).
  useEffect(() => {
    if (!config) return;
    setValidating(true);
    const t = window.setTimeout(() => {
      setValidation(validateConfig(config));
      setValidating(false);
    }, 500);
    return () => window.clearTimeout(t);
  }, [config]);

  // Resolves true when the server saved the draft. Edits made while the request was in flight stay unsaved.
  // Saves run one at a time, so each one sends the revision the previous one got back.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const saveNow = useCallback(
    async (overwrite: boolean): Promise<boolean> => {
      const current = configRef.current;
      if (!current) return false;
      if (!overwrite && statusRef.current === 'saved') return true;
      statusRef.current = 'saving';
      setStatus('saving');
      try {
        const res = await saveDraft(agentId, current, overwrite ? null : baseRef.current);
        if (res.ok) {
          baseRef.current = res.draft.revision;
          statusRef.current = configRef.current === current ? 'saved' : 'unsaved';
          setBaseRevision(res.draft.revision);
          setSavedAt(res.draft.saved_at);
          setConflict(null);
          setSaveError(null);
          setRemoteDraft(null);
          setStatus(statusRef.current);
          return true;
        }
        statusRef.current = 'conflict';
        setConflict(res.conflict);
        setStatus('conflict');
        return false;
      } catch (err: unknown) {
        statusRef.current = 'error';
        setSaveError(err instanceof Error ? err.message : 'The draft could not be saved.');
        setStatus('error');
        return false;
      }
    },
    [agentId, saveDraft]
  );
  const performSave = useCallback(
    (overwrite = false): Promise<boolean> => {
      const run = queueRef.current.then(() => saveNow(overwrite));
      queueRef.current = run.catch(() => undefined);
      return run;
    },
    [saveNow]
  );
  const performSaveRef = useRef(performSave);
  performSaveRef.current = performSave;

  // Autosave about a second after typing stops.
  useEffect(() => {
    if (status !== 'unsaved' || !canEdit) return;
    const t = window.setTimeout(() => void performSaveRef.current(), 1000);
    return () => window.clearTimeout(t);
  }, [config, status, canEdit]);

  // Has someone else saved a newer draft? Checked every 15 s while the tab is visible and on returning to it.
  useEffect(() => {
    let controller: AbortController | null = null;
    const check = () => {
      if (document.visibilityState !== 'visible' || statusRef.current === 'saving') return;
      controller?.abort();
      controller = new AbortController();
      api
        .getDraft(agentId, { signal: controller.signal })
        .then((latest) => {
          if (statusRef.current === 'saving' || latest.revision <= baseRef.current) return;
          setRemoteDraft({
            bot_id: agentId,
            revision: latest.revision,
            saved_at: latest.saved_at,
            saved_by: latest.saved_by,
            config: latest.config as AgentConfig,
          });
        })
        .catch(() => undefined); // the health indicator reports an unreachable API
    };
    const interval = window.setInterval(check, REMOTE_CHECK_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', check);
    };
  }, [agentId]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (statusRef.current !== 'saved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Flush on unmount so in-app navigation never loses edits.
  useEffect(
    () => () => {
      if (statusRef.current === 'unsaved' || statusRef.current === 'error') void performSaveRef.current();
    },
    []
  );

  const [history, setHistory] = useState<AgentConfig[]>([]);
  const [future, setFuture] = useState<AgentConfig[]>([]);

  const undo = useCallback(() => {
    if (!canEdit || history.length === 0 || !config) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [config, ...f]);
    setConfig(prev);
    setStatus('unsaved');
  }, [canEdit, history, config]);

  const redo = useCallback(() => {
    if (!canEdit || future.length === 0 || !config) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, config]);
    setConfig(next);
    setStatus('unsaved');
  }, [canEdit, future, config]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept inside raw textareas or inputs if standard typing
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT') {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const update = useCallback(
    (path: Path, value: unknown) => {
      if (!canEdit) return;
      setConfig((prev) => {
        if (!prev) return prev;
        setHistory((h) => [...h.slice(-25), prev]);
        setFuture([]);
        return setAt(prev, path, value);
      });
      setStatus((s) => (s === 'conflict' ? s : 'unsaved'));
    },
    [canEdit]
  );

  const replaceConfig = useCallback(
    (next: AgentConfig) => {
      if (!canEdit) return;
      setConfig((prev) => {
        if (prev) {
          setHistory((h) => [...h.slice(-25), prev]);
          setFuture([]);
        }
        return next;
      });
      setStatus((s) => s === 'conflict' ? s : 'unsaved');
    },
    [canEdit]
  );

  /** Saves pending edits now. Resolves true when the server has everything (nothing pending, or the save worked). */
  const flush = useCallback(async (): Promise<boolean> => {
    if (statusRef.current === 'saved') return true;
    if (statusRef.current === 'conflict') return false;
    return performSaveRef.current();
  }, []);

  const retrySave = useCallback(() => void performSaveRef.current(), []);

  /** Replace the editor contents with the newer draft found on the server. */
  const loadRemoteDraft = useCallback(() => {
    if (!remoteDraft) return;
    setConfig(normalizeConfig(remoteDraft.config));
    baseRef.current = remoteDraft.revision;
    statusRef.current = 'saved';
    setBaseRevision(remoteDraft.revision);
    setSavedAt(remoteDraft.saved_at);
    setRemoteDraft(null);
    setConflict(null);
    setSaveError(null);
    setStatus('saved');
  }, [remoteDraft]);

  /** Keep the editor contents and save them over the newer server draft. */
  const overwriteRemoteDraft = useCallback(() => void performSaveRef.current(true), []);

  const resolveConflict = useCallback(
    (choice: 'mine' | 'theirs') => {
      if (!conflict) return;
      if (choice === 'mine') {
        void performSaveRef.current(true);
        return;
      }
      setConfig(normalizeConfig(conflict.config));
      baseRef.current = conflict.revision;
      statusRef.current = 'saved';
      setBaseRevision(conflict.revision);
      setSavedAt(conflict.saved_at);
      setConflict(null);
      setRemoteDraft(null);
      setStatus('saved');
    },
    [conflict]
  );

  return {
    agent,
    config,
    validation,
    validating,
    status,
    savedAt,
    conflict,
    saveError,
    remoteDraft,
    canEdit,
    baseRevision,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    undo,
    redo,
    update,
    replaceConfig,
    flush,
    retrySave,
    loadRemoteDraft,
    overwriteRemoteDraft,
    resolveConflict
  };
}

export type DraftEditor = ReturnType<typeof useDraftEditor>;