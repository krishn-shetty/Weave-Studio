import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BotIcon, CircleAlertIcon, LandmarkIcon, MicIcon, RotateCcwIcon, SendHorizontalIcon, SquareIcon } from 'lucide-react';
import { isWebChannel, type AgentConfig, type ChannelType } from '../../../types/studio';
import type { TestSession } from '../../../hooks/useTestSession';
import { Button } from '../../ui/Button';
import { StatusChip } from '../../ui/StatusChip';
import { Segmented } from '../../ui/Segmented';
import { ChatForm } from './ChatForm';
import { VoiceBubble } from './VoiceBubble';
import { AgentSelector } from './AgentSelector';
import { usesGateway } from '../../../models/bankingTools';
import { cn, easeOut, inputClass } from '../../../utils/styles';

interface TestConsoleProps {
  session: TestSession;
  config: AgentConfig;
  revision: number;
  /** Saves pending edits; resolves false if the draft could not be saved. */
  onBeforeStart: () => Promise<boolean>;
  hasUnsaved: boolean;
  currentAgentId?: string;
  onSwitchAgent?: (agentId: string) => void;
}

const defaultSuggestions = ['When is my bill due?', 'Can I speak to a person?', 'Please call me back', 'Thanks, goodbye'];
const bankingSuggestions = ['What is my account balance?', 'Show my recent transactions', 'Can I speak to a person?', 'Thanks, goodbye'];

export function TestConsole({ session, config, revision, onBeforeStart, hasUnsaved, currentAgentId, onSwitchAgent }: TestConsoleProps) {
  const isBanking = usesGateway(config);
  const suggestions = isBanking ? bankingSuggestions : defaultSuggestions;
  // One tab per web channel type the draft has enabled; the server is asked for that channel by its id.
  const webChannels = (config.channels ?? []).filter((c) => c.enabled && isWebChannel(c.type));
  const channelTypes = [...new Set(webChannels.map((c) => c.type))];
  const [selected, setSelected] = useState<ChannelType>(channelTypes[0] ?? 'web_chat');
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const { status, messages, typing, channel, bubbleState, audioLevel, latestCaption, error, endReason, isMuted } = session;
  const live = status === 'live';
  const active = live || status === 'connecting' || status === 'waiting';
  const settingUp = saving || status === 'connecting' || status === 'waiting';
  // The conversation is shown on its own tab; the other tab shows its start screen.
  const showing = status !== 'idle' && channel === selected;
  const isVoice = selected === 'web_voice';

  // A reply streams into its message, so follow its text as well as new messages.
  const lastText = messages[messages.length - 1]?.text;
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, lastText, typing]);

  // The session runs the saved draft, so start only once the server has the latest edits.
  const start = async () => {
    if (settingUp) return;
    // Unlock audio inside this click, before saving and connecting take it out of the click.
    session.primeAudio();
    setSaving(true);
    let saved = false;
    try {
      saved = await onBeforeStart();
    } finally {
      setSaving(false);
    }
    if (saved) await session.start(selected, webChannels.find((c) => c.type === selected)?.id);
  };

  const switchTab = (next: ChannelType) => {
    if (next === selected) return;
    if (active) session.stop();
    setSelected(next);
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!draft.trim() || !live) return;
    session.send(draft);
    setDraft('');
  };

  const conversation = (
    <div
      ref={listRef}
      className={cn('min-h-0 space-y-3 overflow-y-auto px-4 py-5', isVoice ? 'max-h-[360px] min-h-[160px] lg:max-h-none lg:flex-1' : 'flex-1')}
      aria-live="polite"
      aria-label={isVoice ? 'Live transcript' : 'Conversation'}
    >
      {!isVoice && status === 'connecting' && <p className="text-center text-[13px] text-muted">Connecting to the LiveKit room…</p>}
      {!isVoice && status === 'waiting' && <p className="text-center text-[13px] text-muted">Waiting for the agent to join…</p>}
      {isVoice && messages.length === 0 && (
        <p className="text-center text-[13px] text-muted">What you and the agent say prints here as you talk.</p>
      )}
      {messages.map((m) =>
        m.from === 'system' ? (
          <p key={m.id} className="py-2 text-center text-[13px] text-muted">
            {m.text}
          </p>
        ) : (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: easeOut }}
            className={cn('flex flex-col', m.from === 'user' ? 'items-end' : 'items-start')}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
                m.from === 'user' ? 'bg-accent text-accent-ink rounded-br-sm' : 'bg-subtle text-ink border border-line rounded-bl-sm',
                m.partial && 'opacity-80'
              )}
            >
              <p>
                {m.text}
                {m.partial && <span aria-hidden> …</span>}
              </p>
              {m.via && <span className="mt-1 block text-[11px] opacity-75">{m.via === 'voice' ? 'spoken' : 'typed'}</span>}
            </div>

            {m.form && (
              <div className="mt-3 w-full max-w-md">
                <ChatForm form={m.form} accepted={m.formStatus === 'accepted'} onSubmit={(vals) => session.submitForm(m.id, m.form!, vals)} />
              </div>
            )}
          </motion.div>
        )
      )}
      {typing && (
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:0.3s]" />
          <span>Agent is generating response…</span>
        </div>
      )}
    </div>
  );

  const composer = active && (
    <div className="border-t border-line p-3">
      {!isVoice && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={!live}
              onClick={() => session.send(s)}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink-soft hover:border-accent hover:text-ink transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:text-ink-soft"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="text"
          value={draft}
          disabled={!live}
          aria-label="Message"
          onChange={(e) => setDraft(e.target.value)}
          placeholder={!live ? 'Waiting for the agent to join…' : isVoice ? 'Or type a message during the call…' : 'Type a message…'}
          className={cn(inputClass, 'flex-1 disabled:cursor-not-allowed disabled:opacity-60')}
        />
        <Button variant="primary" type="submit" disabled={!live || !draft.trim()} aria-label="Send">
          <SendHorizontalIcon className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );

  return (
    <section aria-labelledby="console-title" className="flex min-h-[560px] min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface lg:h-[720px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="console-title" className="text-sm font-semibold text-ink">Talk to your draft</h2>
          {currentAgentId && onSwitchAgent && (
            <AgentSelector
              currentAgentId={currentAgentId}
              onSelect={(id) => {
                if (active) session.stop();
                onSwitchAgent(id);
              }}
            />
          )}
          <StatusChip className="font-mono">draft · rev {revision}</StatusChip>
          <StatusChip tone={live ? 'success' : 'neutral'}>{live ? 'Live · Real API' : 'Real LiveKit'}</StatusChip>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {channelTypes.length > 0 && (
            <Segmented
              size="sm"
              label="Channel"
              options={channelTypes.map((c) => ({ value: c, label: c === 'web_chat' ? 'Web chat' : 'Web voice' }))}
              value={selected}
              onChange={switchTab}
            />
          )}
          {showing && active && (
            <Button size="sm" variant="ghost" onClick={session.stop}>
              <SquareIcon className="h-3.5 w-3.5" aria-hidden />
              End
            </Button>
          )}
          {showing && (
            <Button size="sm" variant="secondary" onClick={start} disabled={settingUp}>
              <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden />
              New conversation
            </Button>
          )}
        </div>
      </div>

      {!showing ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          {isBanking ? (
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent-soft/40 px-3 py-1 text-xs font-medium text-accent">
              <LandmarkIcon className="h-3.5 w-3.5" aria-hidden />
              <span>Banking AI Agent · 33 Tools Connected</span>
            </div>
          ) : (
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-subtle px-3 py-1 text-xs font-medium text-ink-soft">
              <BotIcon className="h-3.5 w-3.5" aria-hidden />
              <span>{config.agent?.name || 'Configured Draft Agent'}</span>
            </div>
          )}

          <p className="text-base font-semibold text-ink">The agent speaks first.</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {isVoice
              ? 'Talk to the live runtime worker over LiveKit. What you both say prints as a chat while you talk, and you can type too.'
              : 'Chat with the live runtime worker over LiveKit. Replies stream in as the agent writes them.'}
          </p>

          {isBanking && (
            <div className="mt-4 max-w-md rounded-lg border border-line bg-subtle/50 p-3 text-left text-xs space-y-1.5">
              <div className="flex items-center justify-between font-medium text-ink">
                <span>Demo Rehearsal Credentials</span>
                <span className="text-[11px] text-muted">Mock Bank Host</span>
              </div>
              <p className="text-muted leading-relaxed">
                • <strong className="text-ink">Phone Code:</strong> 1234567 | <strong className="text-ink">PIN:</strong> 135790 (3 accounts)<br />
                • <strong className="text-ink">Account & OTP:</strong> 500000000201 | NRIC: 1234567<br />
                • <strong className="text-ink">Entitlement Test:</strong> 500000000301 | NRIC: 7654321 (Balance refused)
              </p>
            </div>
          )}

          {hasUnsaved && (
            <p className="mt-3 text-[13px] text-ink-soft">You have unsaved changes. Tests use the saved draft, so you’ll be asked to save first.</p>
          )}
          <Button variant="primary" className="mt-5" onClick={start} disabled={settingUp}>
            {isVoice ? <MicIcon className="h-4 w-4" aria-hidden /> : null}
            Start {isVoice ? 'voice' : 'chat'} test
          </Button>
        </div>
      ) : isVoice ? (
        <>
          <div className="p-4 pb-0">
            <VoiceBubble
              compact
              state={bubbleState}
              audioLevel={audioLevel}
              captionText={latestCaption}
              errorMessage={error ?? endReason ?? undefined}
              audioBlocked={session.audioBlocked}
              onEnableAudio={session.enableAudio}
              micError={session.micError}
              onRetryMic={session.retryMic}
              isMuted={isMuted}
              onToggleMute={session.toggleMute}
              onEndCall={session.stop}
              onStartVoice={start}
            />
          </div>
          {conversation}
          {composer}
        </>
      ) : (
        <>
          {status === 'error' && error && (
            <div role="alert" className="mx-4 mt-4 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm">
              <p className="flex min-w-0 flex-1 items-start gap-2 text-ink">
                <CircleAlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
                {error}
              </p>
              <Button size="sm" variant="secondary" onClick={start} disabled={settingUp}>
                <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden />
                Try again
              </Button>
            </div>
          )}
          {conversation}
          {composer}
        </>
      )}
    </section>
  );
}
