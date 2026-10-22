import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentConfig, Draft, Path, ValidationReport } from '../types/studio';
import { useStudio } from '../contexts/StudioContext';
import { useAuth } from '../contexts/AuthContext';
import { validateConfig } from '../utils/validate';
import { normalizeConfig } from '../utils/configFactory';
import { setAt } from '../utils/path';

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'conflict';

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

  const performSave = useCallback(
    (overwrite = false) => {
      const current = configRef.current;
      if (!current) return;
      const res = saveDraft(agentId, current, overwrite ? null : baseRef.current);
      if (res.ok) {
        baseRef.current = res.draft.revision;
        statusRef.current = configRef.current === current ? 'saved' : 'unsaved';
        setBaseRevision(res.draft.revision);
        setSavedAt(res.draft.saved_at);
        setConflict(null);
        setStatus(statusRef.current);
      } else {
        statusRef.current = 'conflict';
        setConflict(res.conflict);
        setStatus('conflict');
      }
    },
    [agentId, saveDraft]
  );
  const performSaveRef = useRef(performSave);
  performSaveRef.current = performSave;

  // Autosave.
  useEffect(() => {
    if (status !== 'unsaved' || !canEdit) return;
    const t = window.setTimeout(() => {
      setStatus('saving');
      window.setTimeout(() => performSaveRef.current(), 350);
    }, 900);
    return () => window.clearTimeout(t);
  }, [config, status, canEdit]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (statusRef.current === 'unsaved' || statusRef.current === 'saving' || statusRef.current === 'conflict') {
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
      if (statusRef.current === 'unsaved' || statusRef.current === 'saving') performSaveRef.current();
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
      setStatus((s) => s === 'conflict' ? s : 'unsaved');
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

  const flush = useCallback(() => {
    if (statusRef.current === 'unsaved' || statusRef.current === 'saving') performSaveRef.current();
  }, []);

  const resolveConflict = useCallback(
    (choice: 'mine' | 'theirs') => {
      if (!conflict) return;
      if (choice === 'mine') {
        performSaveRef.current(true);
        return;
      }
      setConfig(conflict.config);
      baseRef.current = conflict.revision;
      setBaseRevision(conflict.revision);
      setSavedAt(conflict.saved_at);
      setConflict(null);
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
    canEdit,
    baseRevision,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    undo,
    redo,
    update,
    replaceConfig,
    flush,
    resolveConflict
  };
}

export type DraftEditor = ReturnType<typeof useDraftEditor>;