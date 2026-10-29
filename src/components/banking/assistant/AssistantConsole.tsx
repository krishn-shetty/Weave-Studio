import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyRoundIcon, LandmarkIcon, ShieldCheckIcon } from 'lucide-react';
import { followRoomTimeline, gateway, GatewayError } from '../../../api/gateway';
import type { Rehearsal } from '../../../api/gatewayTypes';
import { useBankingAssistant, type BankingAssistant } from '../../../hooks/useBankingAssistant';
import { useBankingChannel } from '../../../hooks/useBankingChannel';
import { useBrowserVoice } from '../../../hooks/useBrowserVoice';
import { REHEARSAL_BANK } from '../../../models/bankingAssistant';
import { evaluate, SCENARIOS, type RunEvent } from '../../../models/bankingScenarios';
import type { TraceEvent } from '../../../types/testConsole';
import { traceFromGateway } from '../../../utils/gatewayTrace';
import { TracePanel } from '../../agent/test/TracePanel';
import { Segmented } from '../../ui/Segmented';
import { CustomerChannelPanel } from '../CustomerChannelPanel';
import { EnvironmentNotice } from '../EnvironmentNotice';
import { HostFaults, MockPhone } from '../RehearsalConsole';
import { AccountOverview } from './AccountOverview';
import { ConversationPanel, type ConversationMode } from './ConversationPanel';
import { ScenarioPanel } from './ScenarioPanel';

const SMS_POLL_MS = 3_000;

type SideTab = 'banking' | 'scenarios' | 'trace';

/**
 * The banking assistant rehearsal, laid out like Studio's Test stage: the conversation (web chat or web voice) on
 * the left, the caller's banking surfaces, scenarios and the gateway trace in a side panel that scrolls on its own.
 * It runs on the real gateway with its mock bank systems; the gateway decides sign-in, entitlements and
 * confirmations, and the assistant speaks only from tool results. Needs a mock gateway and
 * BANKING_GATEWAY_REHEARSALS=on.
 */
export function AssistantConsole() {
  const [rehearsal, setRehearsal] = useState<Rehearsal | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [mode, setMode] = useState<ConversationMode>('chat');
  const [tab, setTab] = useState<SideTab>('banking');
  const [timeline, setTimeline] = useState<TraceEvent[]>([]);
  const [sms, setSms] = useState<string[]>([]);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const channel = useBankingChannel(rehearsal?.channel_token ?? null);
  const sideRef = useRef<HTMLDivElement>(null);

  // Voice and assistant refer to each other: what is heard goes to the assistant; what it says is spoken.
  const assistantRef = useRef<BankingAssistant | null>(null);
  const voice = useBrowserVoice((text) => assistantRef.current?.handle(text, 'voice'));
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const speech = useRef<Promise<void>>(Promise.resolve());
  const onSay = useCallback((text: string) => {
    const v = voiceRef.current;
    if (v.isActive() && v.canSpeak) speech.current = speech.current.then(() => v.speak(text));
  }, []);
  // Scenario results span sessions on this page ("New conversation" keeps them; "Reset results" clears them).
  const onEvent = useCallback((event: RunEvent) => setEvents((prev) => [...prev, event]), []);
  const assistant = useBankingAssistant({ callId: rehearsal?.call_id ?? null, channel, voiceActive: voice.active, onSay, onEvent });
  assistantRef.current = assistant;

  const { setProcessing } = voice;
  useEffect(() => setProcessing(assistant.thinking), [assistant.thinking, setProcessing]);

  // The keypad on the banking panel reports its outcome to the assistant (for the scenarios).
  const panelChannel = useMemo(() => ({ ...channel, submitCapture: assistant.submitFromKeypad }), [channel, assistant.submitFromKeypad]);

  // Greet once the session's secure channel is open.
  const greeted = useRef<string | null>(null);
  useEffect(() => {
    if (!rehearsal || channel.connection !== 'open' || greeted.current === rehearsal.call_id) return;
    greeted.current = rehearsal.call_id;
    void assistant.greet();
  }, [rehearsal, channel.connection, assistant]);

  // When the bank needs the caller (keypad, confirmation, sign-in done), show the Banking tab and bring it into view.
  const attention = `${assistant.secureStep ?? ''}|${channel.confirmation?.id ?? ''}:${channel.confirmation?.phase ?? ''}|${channel.state?.auth.state ?? ''}`;
  useEffect(() => {
    if (!rehearsal) return;
    setTab('banking');
    const frame = window.requestAnimationFrame(() => {
      const box = sideRef.current;
      const target = box?.querySelector<HTMLElement>('[aria-label="On-screen digits"]')?.closest('section') ?? box?.querySelector<HTMLElement>('[data-confirmation]') ?? null;
      if (!box || !target) return;
      const top = target.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 12;
      box.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [attention, rehearsal]);

  // The gateway's timeline for this session.
  useEffect(() => {
    if (!rehearsal) return;
    const controller = new AbortController();
    const startedAt = Date.now();
    let n = 0;
    setTimeline([]);
    followRoomTimeline(rehearsal.room, (e) => setTimeline((prev) => [...prev, traceFromGateway(e, startedAt, `a${(n += 1)}`)]), () => undefined, controller.signal).catch(() => undefined);
    return () => controller.abort();
  }, [rehearsal]);

  // The mock phone: SMS one-time passwords for this session's customer.
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

  // Ending or leaving ends the gateway session.
  useEffect(() => {
    if (!rehearsal) return;
    return () => void gateway.rehearsal.end(rehearsal.call_id).catch(() => undefined);
  }, [rehearsal]);

  const start = async (withVoice: boolean) => {
    setStarting(true);
    setStartError(null);
    setSms([]);
    try {
      // Ask for the microphone first, from the click, so the greeting can be spoken.
      if (withVoice) await voice.start();
      setRehearsal(await gateway.rehearsal.start(withVoice ? 'web_voice' : 'web_chat'));
    } catch (e) {
      voice.stop();
      const err = e instanceof GatewayError ? e : null;
      setStartError(
        err && (err.kind === 'refused' || err.kind === 'not_found')
          ? 'Rehearsals are off. They need the mock gateway (npm run start:mock) and BANKING_GATEWAY_REHEARSALS=on for the Studio server.'
          : (err?.message ?? 'The conversation could not start.')
      );
    } finally {
      setStarting(false);
    }
  };

  const end = () => {
    voice.stop();
    speech.current = Promise.resolve();
    setRehearsal(null);
  };

  const newConversation = async () => {
    const withVoice = voice.isActive();
    end();
    await start(withVoice);
  };

  // Chat and voice share one session: switching only turns the microphone on or off.
  const changeMode = (next: ConversationMode) => {
    setMode(next);
    if (next === 'chat') voice.stop();
  };

  const profile = channel.state?.profile ?? null;
  const passed = useMemo(() => SCENARIOS.filter((s) => evaluate(s.id, events).status === 'passed').length, [events]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-ink shadow-sm" aria-hidden>
            <LandmarkIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-ink">{REHEARSAL_BANK} · Business Banking</p>
            <p className="truncate text-[12px] text-muted">Virtual banking assistant · rule-based, answers only from the banking gateway</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          {/* The page header above already states mock or live bank systems; here only a live/non-mock gateway is flagged. */}
          {channel.state?.hosts === 'live' && <EnvironmentNotice hosts="live" policyApproved={channel.state.policy_approved} />}
          {rehearsal && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
              Session <code className="font-mono">{rehearsal.call_id.slice(10, 18)}</code>
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <ConversationPanel
          assistant={assistant}
          voice={voice}
          mode={mode}
          onModeChange={changeMode}
          started={Boolean(rehearsal)}
          starting={starting}
          startError={startError}
          onStart={() => void start(mode === 'voice')}
          onEnd={end}
          onNewConversation={() => void newConversation()}
        />

        <aside aria-label="Banking side panel" className="flex min-h-0 min-w-0 flex-col gap-3 lg:h-[720px]">
          <Segmented
            label="Side panel"
            options={[
              { value: 'banking', label: 'Banking' },
              { value: 'scenarios', label: `Scenarios ${passed}/${SCENARIOS.length}` },
              { value: 'trace', label: `Trace${timeline.length ? ` (${timeline.length})` : ''}` },
            ]}
            value={tab}
            onChange={(v) => setTab(v as SideTab)}
          />
          <div ref={sideRef} className="max-h-[720px] min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1 lg:max-h-none">
            {tab === 'banking' &&
              (rehearsal ? (
                <>
                  <div className="rounded-xl border border-line bg-surface p-4">
                    <CustomerChannelPanel
                      token={rehearsal.channel_token}
                      channel={panelChannel}
                      showProfile={false}
                      showEnvironment={false}
                      heading="Secure banking"
                      onAskForPerson={() => assistant.handle('I would like to speak to a Service Manager.', 'screen')}
                      onRequestCallback={() => assistant.handle('Please arrange a call back.', 'screen')}
                    />
                  </div>
                  {profile && (
                    <AccountOverview
                      callId={rehearsal.call_id}
                      profile={profile}
                      selected={assistant.selectedAccount}
                      balances={assistant.balances}
                      busy={assistant.thinking}
                      onSelect={assistant.selectAccount}
                      onCurrency={assistant.balanceIn}
                      onSignOut={() => void channel.restart()}
                      record={assistant.record}
                    />
                  )}
                  <MockPhone messages={sms} />
                  <EntrySetting assistant={assistant} />
                </>
              ) : (
                <div className="rounded-xl border border-line bg-surface p-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <ShieldCheckIcon className="h-4 w-4 text-success" aria-hidden />
                    Secure banking
                  </h3>
                  <p className="mt-1 text-[13px] text-ink-soft">Sign-in, the secure keypad, your accounts and confirmations appear here once the conversation starts.</p>
                  <ul className="mt-3 space-y-2 text-[12px] text-muted">
                    <li>• Verified by the banking gateway, never by the assistant.</li>
                    <li>• PIN, NRIC and one-time passwords go only to secure entry.</li>
                    <li>• Test logins are under Scenarios.</li>
                  </ul>
                </div>
              ))}
            {tab === 'scenarios' && (
              <>
                <ScenarioPanel events={events} onReset={() => setEvents([])} />
                {rehearsal && <HostFaults callId={rehearsal.call_id} />}
              </>
            )}
            {tab === 'trace' && <TracePanel trace={timeline} />}
          </div>
        </aside>
      </div>
    </div>
  );
}

function EntrySetting({ assistant }: { assistant: BankingAssistant }) {
  return (
    <section aria-labelledby="entry-title" className="rounded-xl border border-line bg-surface p-4">
      <h3 id="entry-title" className="flex items-center gap-2 text-sm font-semibold text-ink">
        <KeyRoundIcon className="h-4 w-4 text-muted" aria-hidden />
        PIN and OTP entry
      </h3>
      <p className="mt-0.5 text-[12px] text-muted">The secure keypad always works. This rehearsal can also take the digits typed or spoken in the conversation.</p>
      <div className="mt-2">
        <Segmented
          label="PIN and OTP entry"
          size="sm"
          options={[
            { value: 'conversation', label: 'Keypad, typed or spoken' },
            { value: 'keypad', label: 'Keypad only' },
          ]}
          value={assistant.spokenSecrets ? 'conversation' : 'keypad'}
          onChange={(v) => assistant.setSpokenSecrets(v === 'conversation')}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted">Digits from the conversation go straight to the gateway&apos;s secure entry and show as dots. Spoken digits pass through the browser&apos;s speech service. Production follows its approved policy (keypad).</p>
    </section>
  );
}
