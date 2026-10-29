import React, { useCallback, useEffect, useState } from 'react';
import { CheckIcon, EyeIcon, EyeOffIcon, LogOutIcon, Settings2Icon, ShieldCheckIcon, WalletIcon } from 'lucide-react';
import { gateway, GatewayError } from '../../../api/gateway';
import type { AccountDetails, AccountView, ProfileView } from '../../../api/gatewayTypes';
import type { BalanceSnapshot } from '../../../models/bankingAssistant';
import type { RunEvent } from '../../../models/bankingScenarios';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { StatusChip } from '../../ui/StatusChip';
import { Tooltip } from '../../ui/Tooltip';
import { cn } from '../../../utils/styles';
import { BalanceCard } from './BalanceCard';

const METHOD: Record<ProfileView['method'], string> = { phonecode_pin: 'Phone Code and Phone PIN', account_nric_otp: 'Account number, NRIC and SMS code' };
const ROLE: Record<'AS' | 'AC', string> = { AS: 'Role AS (as reported by the bank)', AC: 'Role AC (as reported by the bank)' };

/** "500000000101" → "5000 0000 0101". */
const grouped = (n: string) => n.replace(/(\d{4})(?=\d)/g, '$1 ');

/**
 * Full account details for the eye icon and the Account details view. They come from the rehearsal's mock bank
 * systems for the verified customer only, are fetched when first asked for, and are dropped on sign-out (the
 * overview is only mounted while verified).
 */
function useAccountDetails(callId: string) {
  const [details, setDetails] = useState<AccountDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async (): Promise<AccountDetails | null> => {
    if (details) return details;
    setLoading(true);
    setError(null);
    try {
      const d = await gateway.rehearsal.accountDetails(callId);
      setDetails(d);
      return d;
    } catch (e) {
      setError(e instanceof GatewayError ? e.message : 'The account details could not be loaded.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [callId, details]);
  return { details, error, loading, load };
}

function RevealButton({ shown, label, onToggle, disabled }: { shown: boolean; label: string; onToggle: () => void; disabled?: boolean }) {
  const text = shown ? `Hide ${label}` : `Show ${label}`;
  return (
    <Tooltip content={text}>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={shown}
        aria-label={text}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 motion-reduce:transition-none"
      >
        {shown ? <EyeOffIcon className="h-4 w-4" aria-hidden /> : <EyeIcon className="h-4 w-4" aria-hidden />}
      </button>
    </Tooltip>
  );
}

export function AccountOverview({
  callId,
  profile,
  selected,
  balances,
  busy,
  onSelect,
  onCurrency,
  onSignOut,
  record,
}: {
  callId: string;
  profile: ProfileView;
  selected: string | null;
  balances: Record<string, BalanceSnapshot>;
  busy: boolean;
  onSelect: (account: AccountView) => void;
  onCurrency: (accountRef: string, currency: string) => void;
  onSignOut: () => void;
  record: (event: RunEvent) => void;
}) {
  const { details, error, loading, load } = useAccountDetails(callId);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);

  const toggle = async (ref: string) => {
    if (revealed.has(ref)) {
      setRevealed((s) => new Set([...s].filter((r) => r !== ref)));
      record({ type: 'hide' });
      return;
    }
    if (await load()) {
      setRevealed((s) => new Set([...s, ref]));
      record({ type: 'reveal' });
    }
  };

  const numberOf = (ref: string) => details?.accounts.find((a) => a.account_ref === ref)?.number ?? null;
  const selectedBalance = selected ? balances[selected] : undefined;

  return (
    <section aria-labelledby="overview-title" className="space-y-3">
      <div className="rounded-xl border border-line bg-surface p-4 shadow-panel">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="overview-title" className="flex items-center gap-2 text-sm font-semibold text-ink">
              <WalletIcon className="h-4 w-4 text-primary" aria-hidden />
              Your accounts
            </h3>
            <p className="mt-0.5 truncate text-[12px] text-muted">
              {profile.business_name_masked} · customer {profile.customer_ref_ending}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <StatusChip tone="success">
              <ShieldCheckIcon className="h-3 w-3" aria-hidden />
              Verified
            </StatusChip>
            <Tooltip content="Account details">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label="Account details and settings"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Settings2Icon className="h-4 w-4" aria-hidden />
              </button>
            </Tooltip>
          </div>
        </div>

        {profile.accounts.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-soft">No accounts can be used in this conversation. A Service Manager can help.</p>
        ) : (
          <ul className="mt-3 space-y-2" aria-label="Accounts">
            {profile.accounts.map((a) => {
              const isSelected = selected === a.account_ref;
              const shown = revealed.has(a.account_ref) ? numberOf(a.account_ref) : null;
              const snapshot = balances[a.account_ref];
              return (
                <li key={a.account_ref}>
                  <div className={cn('flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors motion-reduce:transition-none', isSelected ? 'border-primary bg-primary-soft/60' : 'border-line hover:bg-subtle')}>
                    <button
                      type="button"
                      onClick={() => onSelect(a)}
                      disabled={busy}
                      aria-pressed={isSelected}
                      aria-label={`${a.type} ending ${a.ending.replace(/\D/g, '')}${isSelected ? ', selected' : ''}. Check its balance.`}
                      className="flex min-w-0 flex-1 flex-col items-start text-left disabled:cursor-wait"
                    >
                      <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                        {a.type}
                        {isSelected && <CheckIcon className="h-3.5 w-3.5 text-primary" aria-hidden />}
                      </span>
                      <span className="font-mono text-[13px] text-ink-soft" aria-live="polite">
                        {shown ? grouped(shown) : `•••• ${a.ending.replace(/\D/g, '')}`}
                      </span>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="font-mono text-[11px] text-muted">{a.currencies.join(' · ')}</span>
                      {snapshot && <span className={cn('font-mono text-[12px]', snapshot.inDebit ? 'text-danger' : 'text-ink')}>{snapshot.current.replace(/^-/, '−')}</span>}
                    </div>
                    <RevealButton shown={Boolean(shown)} label="account number" onToggle={() => void toggle(a.account_ref)} disabled={loading} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {error && (
          <p role="alert" className="mt-2 text-[12px] text-danger">
            {error}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted">Tap an account to check its balance. Account numbers are masked until you choose to show them.</p>
          <Button variant="ghost" size="sm" onClick={onSignOut} disabled={busy}>
            <LogOutIcon className="h-3.5 w-3.5" aria-hidden />
            Sign out
          </Button>
        </div>
      </div>

      {selectedBalance && <BalanceCard balance={selectedBalance} busy={busy} onCurrency={(c) => onCurrency(selectedBalance.accountRef as string, c)} onRefresh={() => onCurrency(selectedBalance.accountRef as string, selectedBalance.currency)} />}

      <AccountDetailsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} profile={profile} details={details} load={load} loading={loading} error={error} record={record} />
    </section>
  );
}

function AccountDetailsDialog({
  open,
  onClose,
  profile,
  details,
  load,
  loading,
  error,
  record,
}: {
  open: boolean;
  onClose: () => void;
  profile: ProfileView;
  details: AccountDetails | null;
  load: () => Promise<AccountDetails | null>;
  loading: boolean;
  error: string | null;
  record: (event: RunEvent) => void;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!open) setShow(false); // closing hides everything again
  }, [open]);

  const toggle = async () => {
    if (show) {
      setShow(false);
      record({ type: 'hide' });
    } else if (await load()) {
      setShow(true);
      record({ type: 'reveal' });
    }
  };

  const full = show && details ? details : null;
  return (
    <Dialog open={open} onClose={onClose} title="Account details" description="What the bank verified in this conversation. Identifiers are masked by default." size="lg">
      <div className="space-y-5 text-[13px]">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-subtle px-3 py-2">
          <span className="text-ink-soft">{show ? 'Full details are showing on this screen.' : 'Business name and account numbers are masked.'}</span>
          <Button size="sm" variant="secondary" onClick={() => void toggle()} disabled={loading} aria-pressed={show}>
            {show ? <EyeOffIcon className="h-3.5 w-3.5" aria-hidden /> : <EyeIcon className="h-3.5 w-3.5" aria-hidden />}
            {show ? 'Hide details' : 'Show details'}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}

        <section>
          <h4 className="text-[12px] font-semibold uppercase tracking-wide text-muted">Customer</h4>
          <dl className="mt-2 grid grid-cols-[minmax(120px,auto)_1fr] gap-x-4 gap-y-1.5">
            <dt className="text-muted">Business name</dt>
            <dd className="text-ink">{full ? full.display_name : profile.business_name_masked}</dd>
            <dt className="text-muted">Customer reference</dt>
            <dd className="font-mono text-ink">{full ? full.customer_id : profile.customer_ref_ending}</dd>
            <dt className="text-muted">Verified with</dt>
            <dd className="text-ink">{METHOD[profile.method]}</dd>
            <dt className="text-muted">Access</dt>
            <dd className="text-ink">{profile.role ? ROLE[profile.role] : 'Phone banking user'}</dd>
            <dt className="text-muted">Language</dt>
            <dd className="text-ink">{profile.language === 'zh' ? 'Mandarin' : 'English'}</dd>
          </dl>
        </section>

        <section>
          <h4 className="text-[12px] font-semibold uppercase tracking-wide text-muted">Accounts</h4>
          <div className="mt-2 overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[440px] text-left">
              <thead className="bg-subtle text-[12px] text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Account</th>
                  <th className="px-3 py-2 font-medium">Number</th>
                  <th className="px-3 py-2 font-medium">Currencies</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {profile.accounts.map((a) => {
                  const d = details?.accounts.find((x) => x.account_ref === a.account_ref);
                  return (
                    <tr key={a.account_ref}>
                      <td className="px-3 py-2 text-ink">{a.type}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-ink">{full && d ? grouped(d.number) : `•••• ${a.ending.replace(/\D/g, '')}`}</td>
                      <td className="px-3 py-2 font-mono text-ink-soft">{a.currencies.join(' · ')}</td>
                      <td className="px-3 py-2 text-ink-soft">{d?.omnibus ? 'Omnibus / shared facility' : d?.dormant ? 'Dormant' : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <p className="rounded-lg bg-subtle px-3 py-2 text-[12px] text-ink-soft">
          Masked by default: business name (first letters only), customer reference and account numbers (last four digits). Showing them affects this screen only. The assistant never reads a full account number aloud, and PIN, NRIC
          and one-time passwords are never shown anywhere. Full details here come from the rehearsal&apos;s mock bank systems.
        </p>
      </div>
    </Dialog>
  );
}
