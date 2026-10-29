import React, { useEffect, useId, useState } from 'react';
import { FlaskConicalIcon, MessageSquareIcon, PlayIcon, SquareIcon, ZapIcon } from 'lucide-react';
import { followRoomTimeline, gateway, GatewayError } from '../../api/gateway';
import type { ManifestTool, Rehearsal } from '../../api/gatewayTypes';
import { useBankingChannel } from '../../hooks/useBankingChannel';
import type { TraceEvent } from '../../types/testConsole';
import { traceFromGateway } from '../../utils/gatewayTrace';
import { Button } from '../ui/Button';
import { cn, inputClass } from '../../utils/styles';
import { TracePanel } from '../agent/test/TracePanel';
import { AgentToolRunner } from './AgentToolRunner';
import { CustomerChannelPanel } from './CustomerChannelPanel';

const FAULT_METHODS = ['loginWithPhoneCode', 'verifyAccountAndNric', 'otpSend', 'getBalance', 'incomingFunds', 'recentTransactions', 'chequebooks', 'stopCheques', 'requestStatement', 'requestChequebook', 'primeRate', 'fxRate', 'timeDepositRates'];
const HANG_METHODS = ['stopCheques', 'requestStatement', 'requestChequebook'];
const SMS_POLL_MS = 3_000;

/**
 * Rehearse a banking conversation against the real gateway on its mock bank systems, before the agent runtime can
 * reach it: staff play the caller (sign-in panel, keypad, confirmation card) and the agent (tool calls), and watch
 * the gateway's timeline. Needs a mock gateway and BANKING_GATEWAY_REHEARSALS=on; it says so otherwise.
 */
export function RehearsalConsole({ tools }: { tools: ManifestTool[] }) {
  const [rehearsal, setRehearsal] = useState<Rehearsal | null>(null);
  const [startError, setStartError] = useState<GatewayError | null>(null);
  const [starting, setStarting] = useState(false);
  const [timeline, setTimeline] = useState<TraceEvent[]>([]);
  const [sms, setSms] = useState<string[]>([]);
  const channel = useBankingChannel(rehearsal?.channel_token ?? null);

  // The gateway's timeline for this rehearsal.
  useEffect(() => {
    if (!rehearsal) return;
    const controller = new AbortController();
    const startedAt = Date.now();
    let n = 0;
    setTimeline([]);
    followRoomTimeline(rehearsal.room, (e) => setTimeline((prev) => [...prev, traceFromGateway(e, startedAt, `r${(n += 1)}`)]), () => undefined, controller.signal).catch(() => undefined);
    return () => controller.abort();
  }, [rehearsal]);

  // The mock phone: SMS one-time passwords sent to this rehearsal's customer.
  useEffect(() => {
    if (!rehearsal) return;
    const controller = new AbortController();
    const poll = () =>
      gateway.rehearsal
        .sms(rehearsal.call_id, controller.signal)
        .then((messages) => setSms(messages.map((m) => m.text)))
        .catch(() => undefined);
    void poll();
    const timer = window.setInterval(poll, SMS_POLL_MS);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [rehearsal]);

  // Leaving the page ends the rehearsal's gateway session.
  useEffect(() => {
    if (!rehearsal) return;
    return () => void gateway.rehearsal.end(rehearsal.call_id).catch(() => undefined);
  }, [rehearsal]);

  const start = async () => {
    setStarting(true);
    setStartError(null);
    setSms([]);
    try {
      setRehearsal(await gateway.rehearsal.start('web_chat'));
    } catch (e) {
      setStartError(e instanceof GatewayError ? e : new GatewayError(0, 'server', 'The rehearsal could not start.'));
    } finally {
      setStarting(false);
    }
  };

  // The account the caller picked on their screen becomes the agent's default account_ref, as in a conversation.
  const [pickedAccount, setPickedAccount] = useState<string | null>(null);
  const accounts = channel.state?.profile?.accounts ?? [];
  const defaultAccountRef = accounts.length === 1 ? (accounts[0]?.account_ref ?? null) : accounts.some((a) => a.account_ref === pickedAccount) ? pickedAccount : null;

  if (!rehearsal) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <FlaskConicalIcon className="h-4 w-4 text-warning" aria-hidden />
          Rehearse a banking conversation
        </h2>
        <p className="mt-1 max-w-2xl text-[13px] text-ink-soft">
          Runs against the gateway&apos;s mock bank systems with test logins (listed in <code className="font-mono">services/banking-gateway/README.md</code>). You play the caller on the left and the agent on the right; the gateway&apos;s
          real state machine, keypad, confirmations and audit decide every outcome. No language model is involved, and no real account is touched.
        </p>
        <Button variant="primary" className="mt-4" onClick={start} disabled={starting}>
          <PlayIcon className="h-4 w-4" aria-hidden />
          Start a rehearsal
        </Button>
        {startError && (
          <p role="alert" className="mt-3 text-[13px] text-danger">
            {startError.kind === 'refused' || startError.kind === 'not_found'
              ? 'Rehearsals are off. They need a mock gateway (npm run start:mock) and BANKING_GATEWAY_REHEARSALS=on for the Studio server.'
              : startError.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning-soft px-4 py-2 text-[13px]">
        <span className="flex items-center gap-2 text-ink">
          <FlaskConicalIcon className="h-4 w-4 text-warning" aria-hidden />
          Rehearsal on mock bank systems · <code className="font-mono text-[12px]">{rehearsal.call_id.slice(0, 18)}…</code>
        </span>
        <Button size="sm" variant="secondary" onClick={() => setRehearsal(null)}>
          <SquareIcon className="h-3.5 w-3.5" aria-hidden />
          End rehearsal
        </Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_340px]">
        <div className="rounded-xl border border-line bg-canvas p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">The caller&apos;s screen</p>
          <CustomerChannelPanel token={rehearsal.channel_token} channel={channel} onUseAccount={(a) => setPickedAccount(a.account_ref)} />
        </div>
        <div className="space-y-4">
          <AgentToolRunner callId={rehearsal.call_id} tools={tools} defaultAccountRef={defaultAccountRef} />
          <HostFaults callId={rehearsal.call_id} />
        </div>
        <div className="space-y-4">
          <MockPhone messages={sms} />
          <div className="max-h-[560px]">
            <TracePanel trace={timeline} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MockPhone({ messages }: { messages: string[] }) {
  return (
    <section aria-label="Mock phone" className="rounded-xl border border-dashed border-line-strong bg-surface p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <MessageSquareIcon className="h-4 w-4 text-muted" aria-hidden />
        Mock phone
      </h3>
      <p className="text-[12px] text-muted">Stands in for the customer&apos;s mobile: SMS from the mock OTP service.</p>
      {messages.length === 0 ? (
        <p className="mt-2 text-[13px] text-muted">No messages.</p>
      ) : (
        <ul className="mt-2 space-y-1.5" aria-live="polite">
          {messages.map((m, i) => (
            <li key={i} className="rounded-md bg-subtle px-3 py-1.5 font-mono text-[12px] text-ink">
              {m}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function HostFaults({ callId }: { callId: string }) {
  const id = useId();
  const [method, setMethod] = useState('stopCheques');
  const [kind, setKind] = useState<'error' | 'hang'>('error');
  const [code, setCode] = useState('196');
  const [note, setNote] = useState<string | null>(null);
  const arm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await gateway.rehearsal.hostFault(callId, { method, kind, code: kind === 'error' ? code : undefined });
      setNote(kind === 'hang' ? `The next ${method} call will not answer (the gateway times it out).` : `The next ${method} call will fail with host code ${code}.`);
    } catch (err) {
      setNote(err instanceof GatewayError ? err.message : 'Could not arm the fault.');
    }
  };
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-line bg-surface p-4">
      <h3 id={`${id}-title`} className="flex items-center gap-2 text-sm font-semibold text-ink">
        <ZapIcon className="h-4 w-4 text-muted" aria-hidden />
        Break the next host call
      </h3>
      <form onSubmit={arm} className="mt-2 grid grid-cols-2 gap-2">
        <label className="col-span-2 text-[12px] text-ink">
          Bank system call
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={cn(inputClass, 'mt-0.5')}>
            {FAULT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="text-[12px] text-ink">
          How
          <select value={kind} onChange={(e) => setKind(e.target.value as 'error' | 'hang')} className={cn(inputClass, 'mt-0.5')}>
            <option value="error">Error code</option>
            <option value="hang" disabled={!HANG_METHODS.includes(method)}>
              No answer
            </option>
          </select>
        </label>
        {kind === 'error' && (
          <label className="text-[12px] text-ink">
            Code
            <input value={code} onChange={(e) => setCode(e.target.value)} className={cn(inputClass, 'mt-0.5 font-mono')} />
          </label>
        )}
        <Button type="submit" variant="secondary" className="col-span-2">
          Arm
        </Button>
      </form>
      {note && (
        <p className="mt-2 text-[12px] text-ink-soft" role="status">
          {note}
        </p>
      )}
    </section>
  );
}
