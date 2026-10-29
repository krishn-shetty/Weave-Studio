import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2Icon, CircleDashedIcon, CircleDotIcon, ClipboardListIcon, CopyIcon, RotateCcwIcon } from 'lucide-react';
import { gateway, GatewayError } from '../../../api/gateway';
import type { TestLogin } from '../../../api/gatewayTypes';
import { evaluate, SCENARIOS, type RunEvent, type ScenarioStatus } from '../../../models/bankingScenarios';
import { Button } from '../../ui/Button';
import { Segmented } from '../../ui/Segmented';
import { cn } from '../../../utils/styles';

const STATUS: Record<ScenarioStatus, { label: string; icon: typeof CheckCircle2Icon; className: string }> = {
  passed: { label: 'Passed', icon: CheckCircle2Icon, className: 'text-success' },
  in_progress: { label: 'In progress', icon: CircleDotIcon, className: 'text-warning' },
  not_run: { label: 'Not run', icon: CircleDashedIcon, className: 'text-muted' },
};

const METHOD_LABEL: Record<TestLogin['method'], string> = { phonecode_pin: 'Phone Code + PIN', account_nric_otp: 'Account + NRIC + OTP' };

function Copy({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1200);
        });
      }}
      className="inline-flex items-center gap-1 rounded px-1 font-mono text-[12px] text-ink hover:bg-subtle"
      aria-label={`Copy ${label} ${value}`}
    >
      {value}
      <CopyIcon className={cn('h-3 w-3', done ? 'text-success' : 'text-muted')} aria-hidden />
    </button>
  );
}

/**
 * The guide for a rehearsal: the documented mock test logins, and scenarios that pass only on what the gateway
 * actually did in this page's sessions.
 */
export function ScenarioPanel({ events, onReset }: { events: RunEvent[]; onReset: () => void }) {
  const [tab, setTab] = useState<'scenarios' | 'logins'>('scenarios');
  const [logins, setLogins] = useState<TestLogin[] | null>(null);
  const [otpSource, setOtpSource] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    gateway.rehearsal
      .testLogins(controller.signal)
      .then((r) => {
        setLogins(r.logins);
        setOtpSource(r.otp_source);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(e instanceof GatewayError ? e.message : 'The test logins could not be loaded.');
      });
    return () => controller.abort();
  }, []);

  const results = useMemo(() => Object.fromEntries(SCENARIOS.map((s) => [s.id, evaluate(s.id, events)])), [events]);
  const passed = Object.values(results).filter((r) => r.status === 'passed').length;

  return (
    <section aria-labelledby="scenarios-title" className="rounded-xl border border-line bg-surface p-4 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="scenarios-title" className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ClipboardListIcon className="h-4 w-4 text-muted" aria-hidden />
          Test accounts and scenarios
        </h3>
        <Segmented
          label="Guide view"
          options={[
            { value: 'scenarios', label: `Scenarios ${passed}/${SCENARIOS.length}` },
            { value: 'logins', label: 'Test logins' },
          ]}
          value={tab}
          onChange={(v) => setTab(v as 'scenarios' | 'logins')}
        />
      </div>

      {tab === 'logins' ? (
        <div className="mt-3 space-y-3">
          {error && (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          )}
          {!logins && !error && <p className="text-[13px] text-muted">Loading the test logins…</p>}
          {logins && (
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[520px] text-left text-[13px]">
                <thead className="bg-subtle text-[12px] text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Test login</th>
                    <th className="px-3 py-2 font-medium">Identify with</th>
                    <th className="px-3 py-2 font-medium">Then key in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {logins.map((l) => (
                    <tr key={l.id} className="align-top">
                      <td className="px-3 py-2">
                        <span className="block font-medium text-ink">{l.label}</span>
                        <span className="block text-[12px] text-muted">
                          {METHOD_LABEL[l.method]} · {l.exercises}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="block text-[11px] text-muted">{l.method === 'phonecode_pin' ? 'Phone Code' : 'Account number'}</span>
                        <Copy value={l.identifier} label={l.method === 'phonecode_pin' ? 'Phone Code' : 'account number'} />
                      </td>
                      <td className="px-3 py-2">
                        <span className="block text-[11px] text-muted">{l.method === 'phonecode_pin' ? 'Phone PIN' : 'NRIC digits'}</span>
                        <Copy value={l.secret} label={l.method === 'phonecode_pin' ? 'PIN' : 'NRIC digits'} />
                        {l.otp && <span className="block text-[11px] text-muted">then the OTP from the mock phone</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[12px] text-ink-soft">
            <span className="font-medium text-ink">One-time passwords:</span> {otpSource || 'shown in the mock phone panel and printed in the gateway terminal.'} These are mock bank systems with test data only; no real
            account or SMS is involved.
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <ol className="space-y-2">
            {SCENARIOS.map((s, i) => {
              const r = results[s.id] ?? { status: 'not_run' as const, note: '' };
              const st = STATUS[r.status];
              const Icon = st.icon;
              return (
                <li key={s.id}>
                  <details className="group rounded-lg border border-line px-3 py-2 open:bg-subtle/50">
                    <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px]">
                      <Icon className={cn('h-4 w-4 shrink-0', st.className)} aria-hidden />
                      <span className="min-w-0 flex-1 text-ink">
                        {i + 1}. {s.title}
                      </span>
                      <span className={cn('shrink-0 text-[12px]', st.className)}>{st.label}</span>
                    </summary>
                    <ol className="mt-2 list-inside list-decimal space-y-0.5 pl-6 text-[12px] text-ink-soft">
                      {s.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    {s.login && <p className="mt-1 pl-6 text-[11px] text-muted">Login: {METHOD_LABEL[s.login as TestLogin['method']]} (see Test logins)</p>}
                    <p className="mt-1 pl-6 text-[12px] text-ink">{r.note}</p>
                  </details>
                </li>
              );
            })}
          </ol>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted">A scenario passes only when the gateway did it in a session on this page.</p>
            <Button size="sm" variant="ghost" onClick={onReset} disabled={events.length === 0}>
              <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden />
              Reset results
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
