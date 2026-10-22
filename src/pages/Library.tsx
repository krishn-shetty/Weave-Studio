import React, { useEffect, useState } from 'react';
import { KeyRoundIcon, RefreshCwIcon, Volume2Icon } from 'lucide-react';
import { Segmented } from '../components/ui/Segmented';
import { StatusChip } from '../components/ui/StatusChip';
import { Button } from '../components/ui/Button';
import { api } from '../api/client';
import type { Provider } from '../api/types';

type Tab = 'providers' | 'integrations' | 'numbers';

export function Library() {
  const [tab, setTab] = useState<Tab>('providers');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const res = await api.providers();
      if (res && Array.isArray(res.providers)) {
        setProviders(res.providers);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const ttsProviders = providers.filter((p) => p.stages.includes('tts'));

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Library</h1>
          <p className="mt-1 text-sm text-muted">Providers, runtime models and connections.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadProviders} disabled={loading}>
          <RefreshCwIcon className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          Refresh
        </Button>
      </div>

      <div className="mt-6">
        <Segmented
          label="Library section"
          options={[
            { value: 'providers', label: `Providers & Voices (${providers.length})` },
            { value: 'integrations', label: 'Secrets & Plugins' },
            { value: 'numbers', label: 'Phone numbers' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'providers' && (
        <div className="mt-6 space-y-6">
          <p className="text-sm text-ink-soft">
            Runtime providers reported by <code className="font-mono text-xs">GET /providers</code>. Voice and model choices in your agent configurations use these providers.
          </p>

          <div className="grid gap-4">
            {providers.map((p) => {
              const hasTts = p.stages.includes('tts');
              const hasKey = !!p.key_available;
              return (
                <div key={p.name} className="rounded-lg border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {hasTts && <Volume2Icon className="h-4 w-4 text-accent" />}
                      <h2 className="text-sm font-semibold capitalize text-ink">{p.name}</h2>
                      <span className="font-mono text-xs text-muted">({p.plugin || 'builtin'})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusChip tone={p.installed ? 'success' : 'neutral'}>
                        {p.installed ? 'Installed' : 'Not installed'}
                      </StatusChip>
                      {p.default_secret && (
                        <StatusChip tone={hasKey ? 'success' : 'warning'}>
                          {hasKey ? 'Key configured' : `Needs ${p.default_secret}`}
                        </StatusChip>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.stages.map((s) => (
                      <span
                        key={s}
                        className="rounded bg-subtle px-2 py-0.5 font-mono text-[11px] font-medium text-ink-soft uppercase"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'integrations' && (
        <div className="mt-6">
          <p className="text-sm text-ink-soft">
            Default environment secret names expected by the Agent Builder server. Secret values reside securely on the server; the browser never receives keys.
          </p>
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
            {providers
              .filter((p) => !!p.default_secret)
              .map((p) => (
                <li key={p.name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-mono text-sm capitalize text-ink">{p.name}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      <KeyRoundIcon className="h-3 w-3" aria-hidden />
                      <span className="font-mono">{p.default_secret}</span>
                    </p>
                  </div>
                  <StatusChip tone={p.key_available ? 'success' : 'warning'}>
                    {p.key_available ? 'Configured on server' : 'Missing on server'}
                  </StatusChip>
                </li>
              ))}
          </ul>
        </div>
      )}

      {tab === 'numbers' && (
        <div className="mt-6 rounded-xl border border-dashed border-line px-6 py-12 text-center">
          <StatusChip tone="neutral">Not available yet</StatusChip>
          <p className="mt-3 text-base font-medium text-ink">Telephony numbers, dispatch rules and SIP trunks</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            The Agent Builder server uses FreeSWITCH and LiveKit SIP trunks. Telephony number management is handled via the server CLI.
          </p>
        </div>
      )}
    </div>
  );
}