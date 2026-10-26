import { useCallback, useEffect, useState } from 'react';
import { PhoneCallIcon, PlusIcon, RefreshCwIcon, TriangleAlertIcon } from 'lucide-react';
import { toast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { StatusChip } from '../ui/StatusChip';
import { api } from '../../api/client';
import type { NumberCheck, NumberSettings, PhoneNumber } from '../../api/types';
import { useStudio } from '../../contexts/StudioContext';
import { envLabel } from '../../utils/agentStatus';
import type { EnvironmentName } from '../../types/studio';
import { cn, inputClass } from '../../utils/styles';

const problemText = (p: PhoneNumber['problems'][number]) => (typeof p === 'string' ? p : p.fix ? `${p.problem} ${p.fix}` : p.problem);

/** The phone numbers the phone system knows (GET /numbers), and adding or removing one for an agent. */
export function NumbersPanel() {
  const { agents } = useStudio();
  const [numbers, setNumbers] = useState<PhoneNumber[] | null>(null);
  const [settings, setSettings] = useState<NumberSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<PhoneNumber | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, s] = await Promise.all([api.listNumbers(), api.numberSettings()]);
      setNumbers(list.numbers);
      setSettings(s);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load the phone numbers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async () => {
    if (!removing?.bot) return;
    setBusy(true);
    try {
      await api.releaseNumber(removing.bot, removing.number);
      toast.success(`${removing.number} removed`, { description: 'Calls to it no longer reach the agent.' });
      setRemoving(null);
      await load();
    } catch (err: unknown) {
      toast.error(`Could not remove ${removing.number}`, { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const agentName = (id: string | null) => agents.find((a) => a.id === id)?.name ?? id ?? '';

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border border-line bg-surface p-5 shadow-panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Phone numbers</h2>
            <p className="mt-0.5 text-xs text-muted">
              Numbers the phone system knows (<code className="font-mono">GET /numbers</code>). A call to a number is answered by whatever
              version of its agent is deployed to the number’s environment.
            </p>
            {settings && !settings.livekit_configured && (
              <p className="mt-2 text-xs text-warning">The server says the phone system is not configured, so numbers can’t be added.</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCwIcon className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden />
              Refresh
            </Button>
            <Button variant="primary" size="sm" onClick={() => setAdding(true)} disabled={!settings?.livekit_configured || agents.length === 0}>
              <PlusIcon className="h-4 w-4" aria-hidden />
              Add a number
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm">
          <p className="text-danger">Could not load the phone numbers: {error}</p>
          <Button size="sm" variant="secondary" onClick={() => void load()}>Try again</Button>
        </div>
      ) : !numbers ? (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface" aria-busy="true" aria-label="Loading phone numbers">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-4 py-4">
              <div className="h-4 w-32 animate-pulse rounded bg-subtle" />
              <div className="h-4 w-48 animate-pulse rounded bg-subtle" />
            </li>
          ))}
        </ul>
      ) : numbers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-8 text-center">
          <PhoneCallIcon className="mx-auto h-6 w-6 text-muted" aria-hidden />
          <p className="mt-2 text-sm font-medium text-ink">No phone numbers yet</p>
          <p className="mt-1 text-xs text-muted">Add one to let callers reach an agent by phone.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {numbers.map((n) => (
            <li key={n.number} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-medium text-ink">{n.number}</span>
                  {n.managed && n.bot ? (
                    <StatusChip tone="accent">
                      {agentName(n.bot)} · {envLabel(n.environment as EnvironmentName)}
                    </StatusChip>
                  ) : (
                    <StatusChip title={n.rule ? `Dispatch rule: ${n.rule.name} (${n.rule.id})` : undefined}>Set up outside Studio</StatusChip>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted">
                  {n.trunk && <span title={n.trunk.id}>Line: {n.trunk.name}</span>}
                  {n.trunk && ' · '}
                  {n.options.record_audio ? 'Audio recorded' : 'Not recorded'}
                  {n.options.krisp ? ' · Noise filtering on' : ''}
                  {n.options.allowed_addresses.length > 0 ? ` · Only from ${n.options.allowed_addresses.join(', ')}` : ''}
                  {n.options.max_call_duration_s ? ` · Calls end after ${Math.round(n.options.max_call_duration_s / 60)} min` : ''}
                </p>
                {!n.managed && n.rule && (
                  <p className="mt-0.5 text-xs text-muted" title={n.rule.id}>
                    Routed by “{n.rule.name}” to {n.rule.agents.map((a) => a[0]).join(', ') || 'no agent'}
                  </p>
                )}
                {n.problems.map((p, i) => (
                  <p key={i} className="mt-1 flex items-start gap-1.5 text-xs text-warning">
                    <TriangleAlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    {problemText(p)}
                  </p>
                ))}
              </div>
              {n.managed && n.bot && (
                <Button size="sm" variant="ghost" onClick={() => setRemoving(n)}>
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {settings && (
        <AddNumberDialog
          open={adding}
          onClose={() => setAdding(false)}
          settings={settings}
          onAdded={async () => {
            setAdding(false);
            await load();
          }}
        />
      )}

      <Dialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={removing ? `Remove ${removing.number}?` : 'Remove number'}
        description={removing ? `Calls to ${removing.number} will no longer reach ${agentName(removing.bot)}.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)} disabled={busy}>Cancel</Button>
            <Button variant="danger" onClick={() => void remove()} disabled={busy}>{busy ? 'Removing…' : 'Remove'}</Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">The number itself stays with the phone line; only its routing to this agent is removed.</p>
      </Dialog>
    </div>
  );
}

interface AddNumberDialogProps {
  open: boolean;
  onClose: () => void;
  settings: NumberSettings;
  onAdded: () => Promise<void>;
}

function AddNumberDialog({ open, onClose, settings, onAdded }: AddNumberDialogProps) {
  const { agents } = useStudio();
  const [number, setNumber] = useState('');
  const [botId, setBotId] = useState('');
  const [env, setEnv] = useState('');
  const [record, setRecord] = useState(settings.defaults.record_audio);
  const [check, setCheck] = useState<NumberCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNumber('');
    setBotId(agents[0]?.id ?? '');
    setEnv(settings.environments[0] ?? 'development');
    setRecord(settings.defaults.record_audio);
    setCheck(null);
    setSaveError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Ask the server whether the number is valid and free, shortly after typing stops.
  useEffect(() => {
    const value = number.trim();
    setCheck(null);
    if (!value) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setChecking(true);
      api
        .checkNumber(value, { signal: controller.signal })
        .then(setCheck)
        .catch(() => undefined)
        .finally(() => {
          if (!controller.signal.aborted) setChecking(false);
        });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [number]);

  const free = check?.status === 'free';
  const save = async () => {
    if (!free || !botId || !env) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.createNumber(botId, { number: number.trim(), environment: env, record_audio: record });
      toast.success(`${number.trim()} now reaches ${agents.find((a) => a.id === botId)?.name ?? botId}`, { description: `${envLabel(env as EnvironmentName)} answers it.` });
      await onAdded();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'The server did not add the number.');
    } finally {
      setSaving(false);
    }
  };

  const checkLine = !number.trim() ? null : checking || !check ? 'Checking…' : check.status === 'free' ? 'Free to use.' : check.status === 'invalid' ? check.reason ?? 'Not a valid number.' : check.status === 'taken_external' ? `Already used outside Studio${check.owner?.trunk ? ` (line ${check.owner.trunk})` : ''}.` : `Already in use${check.owner?.bot ? ` by ${check.owner.bot}` : ''}.`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a phone number"
      description="Route a number the phone system sends to one of your agents."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()} disabled={!free || !botId || saving}>
            {saving ? 'Adding…' : 'Add number'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="block text-xs font-medium text-ink-soft">Number</span>
          <input
            type="tel"
            inputMode="tel"
            className={cn(inputClass, 'mt-1 font-mono')}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="90005"
            aria-describedby="number-check"
            title={`Must match ${settings.number_pattern}`}
          />
          {checkLine && (
            <span id="number-check" aria-live="polite" className={cn('mt-1 block text-xs', free ? 'text-success' : checking || !check ? 'text-muted' : 'text-warning')}>
              {checkLine}
            </span>
          )}
          {check?.warnings.map((w) => <span key={w} className="mt-1 block text-xs text-warning">{w}</span>)}
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-ink-soft">Agent</span>
          <select className={cn(inputClass, 'mt-1')} value={botId} onChange={(e) => setBotId(e.target.value)}>
            {agents.map((a) => (
              <option key={a.id} value={a.id} title={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-ink-soft">Environment that answers it</span>
          <select className={cn(inputClass, 'mt-1')} value={env} onChange={(e) => setEnv(e.target.value)}>
            {settings.environments.map((e) => (
              <option key={e} value={e}>{envLabel(e as EnvironmentName)}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={record} onChange={(e) => setRecord(e.target.checked)} className="rounded border-line text-accent focus:ring-accent" />
          Record call audio{settings.recording ? ` (${settings.recording.format})` : ''}
        </label>
        {saveError && <p role="alert" className="text-sm text-danger">Not added: {saveError}</p>}
      </div>
    </Dialog>
  );
}
