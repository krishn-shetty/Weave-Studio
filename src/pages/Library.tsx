import React, { useState } from 'react';
import { KeyRoundIcon } from 'lucide-react';
import { connectionSecrets, serverSecrets, ttsProviders } from '../data/providers';
import { Segmented } from '../components/ui/Segmented';
import { StatusChip } from '../components/ui/StatusChip';

type Tab = 'voices' | 'integrations' | 'numbers';

export function Library() {
  const [tab, setTab] = useState<Tab>('voices');
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 lg:px-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Library</h1>
      <p className="mt-1 text-sm text-muted">Things your agents share.</p>
      <div className="mt-6">
        <Segmented
          label="Library section"
          options={[
          { value: 'voices', label: 'Voices' },
          { value: 'integrations', label: 'Integrations' },
          { value: 'numbers', label: 'Phone numbers' }]
          }
          value={tab}
          onChange={setTab} />
        
      </div>

      {tab === 'voices' &&
      <div className="mt-6 space-y-8">
          {ttsProviders.map((p) => {
          const ready = serverSecrets.includes(p.secret);
          return (
            <section key={p.id} aria-labelledby={`p-${p.id}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id={`p-${p.id}`} className="text-sm font-semibold text-ink">{p.label}</h2>
                  <StatusChip tone={ready ? 'success' : 'warning'}>{ready ? 'Ready on server' : `Needs ${p.secret}`}</StatusChip>
                </div>
                <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
                  {p.models.map((v) =>
                <li key={v.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-ink">{v.label}</p>
                        <p className="text-xs text-muted">{v.note}</p>
                      </div>
                      <span className="text-xs text-muted">Preview not available yet</span>
                    </li>
                )}
                </ul>
              </section>);

        })}
        </div>
      }

      {tab === 'integrations' &&
      <div className="mt-6">
          <p className="text-sm text-ink-soft">Connections agents use to reach your systems. Secret values live on the server; Studio shows names only.</p>
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
            {Object.entries(connectionSecrets).map(([name, secret]) => {
            const found = serverSecrets.includes(secret);
            return (
              <li key={name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-mono text-sm text-ink">{name}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      <KeyRoundIcon className="h-3 w-3" aria-hidden />
                      <span className="font-mono">{secret}</span>
                    </p>
                  </div>
                  <StatusChip tone={found ? 'success' : 'warning'}>{found ? 'Secret found' : 'Secret missing'}</StatusChip>
                </li>);

          })}
          </ul>
        </div>
      }

      {tab === 'numbers' &&
      <div className="mt-6 rounded-xl border border-dashed border-line px-6 py-12 text-center">
          <StatusChip>Not available yet</StatusChip>
          <p className="mt-3 text-base font-medium text-ink">Phone numbers, dispatch rules and SIP trunks</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            The Agent Builder API doesn’t offer phone number endpoints yet. Your admin sets numbers up with a command-line tool for now; phone channels in your agents keep working.
          </p>
        </div>
      }
    </div>);

}