import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CircleAlertIcon, KeyRoundIcon, LockIcon, MicIcon, RotateCcwIcon, SendHorizontalIcon, SquareIcon } from 'lucide-react';
import type { BankingAssistant } from '../../../hooks/useBankingAssistant';
import type { BrowserVoice } from '../../../hooks/useBrowserVoice';
import { REHEARSAL_BANK } from '../../../models/bankingAssistant';
import { Button } from '../../ui/Button';
import { Segmented } from '../../ui/Segmented';
import { StatusChip } from '../../ui/StatusChip';
import { VoiceBubble, type BubbleState } from '../../agent/test/VoiceBubble';
import { cn, easeOut, inputClass } from '../../../utils/styles';
import { MessageCard } from './MessageCard';

export type ConversationMode = 'chat' | 'voice';

const SECURE_LABEL: Record<string, string> = { pin: 'Phone PIN', nric: 'NRIC digits', otp: 'One-time password', current_pin: 'Current Phone PIN', new_pin: 'New Phone PIN', confirm_new_pin: 'New Phone PIN again' };

const SUGGESTIONS = ["What's my balance?", 'Show my recent transactions', 'Did my cheque clear?', 'USD exchange rate', 'Speak to a person'];

// The bubble's wording for browser voice: there is no LiveKit room and no language model here.
const VOICE_WORDING: Partial<Record<BubbleState, string>> = {
  idle: 'Start a voice conversation with the banking assistant',
  connecting: 'Turning on the microphone',
  listening: 'Speak naturally: balances, transactions, cheques, rates…',
  thinking: 'Checking with the bank systems',
  tool_execution: 'Calling banking gateway to process request',
  auth_required: 'Please enter or speak your credentials to verify your identity',
  speaking: 'The assistant is answering',
  muted: 'Unmute to speak; the assistant still answers aloud',
  ended: 'Voice is off. You can keep typing',
  success: 'Banking operation completed successfully',
};

function bubbleStateOf(voice: BrowserVoice, thinking: boolean, secureStep: string | null, identifierStep: string | null): BubbleState {
  if (voice.status === 'error' || voice.status === 'unsupported') return 'error';
  if (voice.status === 'connecting') return 'connecting';
  if (!voice.active) return 'idle';
  if (voice.status === 'speaking') return 'speaking';
  if (secureStep || identifierStep) return 'auth_required';
  if (thinking || voice.status === 'processing') return 'tool_execution';
  return voice.muted ? 'muted' : 'listening';
}

/**
 * The banking conversation, laid out like Studio's Test console: chat or voice on one session, the voice bubble and
 * orb for voice, chat bubbles for both. While a PIN, NRIC or OTP step is open the composer becomes a masked secure
 * field, and anything heard is shown as dots.
 */
export function ConversationPanel({
  assistant,
  voice,
  mode,
  onModeChange,
  started,
  starting,
  startError,
  onStart,
  onEnd,
  onNewConversation,
}: {
  assistant: BankingAssistant;
  voice: BrowserVoice;
  mode: ConversationMode;
  onModeChange: (mode: ConversationMode) => void;
  started: boolean;
  starting: boolean;
  startError: string | null;
  onStart: () => void;
  onEnd: () => void;
  onNewConversation: () => void;
}) {
  const [draft, setDraft] = useState('');
  const secureRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { messages, thinking, secureStep, identifierStep, spokenSecrets } = assistant;
  const lastId = messages[messages.length - 1]?.id;
  const isVoice = mode === 'voice';

  // Follow the newest message inside the transcript only; the page stays where the reader put it.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [messages.length, thinking, voice.interim]);

  // A new secure step starts with an empty field.
  useEffect(() => {
    if (secureRef.current) secureRef.current.value = '';
  }, [secureStep]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (secureStep) {
      const input = secureRef.current;
      const value = input?.value ?? '';
      if (input) input.value = ''; // cleared before the request goes out
      if (value.trim()) assistant.handle(value, 'chat');
      return;
    }
    if (!draft.trim()) return;
    assistant.handle(draft, 'chat');
    setDraft('');
  };

  const interim = secureStep || identifierStep ? voice.interim.replace(/\d/g, '•') : voice.interim;
  const bubbleState = bubbleStateOf(voice, thinking, secureStep, identifierStep);
  const latestAssistant = [...messages].reverse().find((m) => m.role === 'assistant')?.text ?? '';

  const conversation = (
    <div
      ref={listRef}
      className={cn('min-h-0 space-y-3 overflow-y-auto px-4 py-5', isVoice ? 'max-h-[360px] min-h-[160px] lg:max-h-none lg:flex-1' : 'flex-1')}
      aria-live="polite"
      aria-label={isVoice ? 'Live transcript' : 'Conversation'}
    >
      {messages.length === 0 && <p className="text-center text-[13px] text-muted">Connecting to the bank&apos;s secure channel…</p>}
      {messages.map((m) => (
        <motion.div
          key={m.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: easeOut }}
          className={cn('flex flex-col', m.role === 'customer' ? 'items-end' : 'items-start')}
        >
          <div
            className={cn(
              'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
              m.role === 'customer'
                ? m.secure
                  ? 'rounded-br-sm border border-dashed border-line-strong bg-surface text-ink-soft'
                  : 'rounded-br-sm bg-accent text-accent-ink'
                : 'rounded-bl-sm border border-line bg-subtle text-ink'
            )}
          >
            <p className={cn(m.secure && 'flex items-center gap-1.5 italic')}>
              {m.secure && <LockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              <span className="sr-only">{m.role === 'assistant' ? 'Assistant: ' : 'You: '}</span>
              {m.text}
            </p>
            {m.role === 'customer' && m.via && <span className="mt-1 block text-[11px] opacity-75">{m.via === 'voice' ? 'spoken' : m.via === 'chat' ? 'typed' : 'selected on screen'}</span>}
          </div>
          {m.card && (
            <div className="mt-3 w-full max-w-md">
              <MessageCard card={m.card} latest={m.id === lastId} busy={thinking} onChoose={assistant.choose} onCurrency={assistant.balanceIn} />
            </div>
          )}
        </motion.div>
      ))}
      {interim && (
        <div className="flex flex-col items-end" aria-hidden>
          <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-sm leading-relaxed text-accent-ink opacity-80 shadow-sm">
            {interim} …
          </div>
        </div>
      )}
      {thinking && (
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted" role="status">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent motion-reduce:animate-none" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:0.15s] motion-reduce:animate-none" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:0.3s] motion-reduce:animate-none" />
          <span>Checking with the bank…</span>
        </div>
      )}
    </div>
  );

  const composer = started && (
    <div className="border-t border-line p-3">
      {secureStep ? (
        <form onSubmit={send}>
          <label htmlFor="assistant-secure" className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-ink">
            <KeyRoundIcon className="h-3.5 w-3.5 text-accent" aria-hidden />
            Secure entry · {SECURE_LABEL[secureStep] ?? 'Code'}
          </label>
          {spokenSecrets ? (
            <div className="flex gap-2">
              <input
                id="assistant-secure"
                ref={secureRef}
                type="password"
                inputMode="numeric"
                autoComplete={secureStep === 'otp' ? 'one-time-code' : 'off'}
                placeholder="Digits only. Sent straight to the bank, never shown."
                className={cn(inputClass, 'flex-1 font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal')}
                maxLength={12}
              />
              <Button type="submit" variant="primary" disabled={thinking}>
                <LockIcon className="h-4 w-4" aria-hidden />
                <span>Send securely</span>
              </Button>
            </div>
          ) : (
            <p className="rounded-lg border border-line bg-subtle px-3 py-2 text-[13px] text-ink-soft">Use the secure keypad in the banking panel. Entering this in the conversation is turned off.</p>
          )}
          <p className="mt-1.5 text-[11px] text-muted">
            {voice.active && spokenSecrets ? 'You can also say the digits. They show as dots and go only to the bank’s secure entry.' : 'Or use the secure keypad in the banking panel.'}
          </p>
        </form>
      ) : (
        <>
          {!isVoice && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={thinking}
                  onClick={() => assistant.handle(s, 'chat')}
                  className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink-soft transition-colors hover:border-accent hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={send} className="flex gap-2">
            <input
              id="assistant-input"
              type="text"
              value={draft}
              aria-label="Message the banking assistant"
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                identifierStep === 'phone_code'
                  ? 'Type your 7-digit Phone Code'
                  : identifierStep === 'account_number'
                    ? 'Type your 12-digit account number'
                    : isVoice
                      ? 'Or type a message during the call…'
                      : 'Type a message…'
              }
              inputMode={identifierStep ? 'numeric' : undefined}
              autoComplete="off"
              className={cn(inputClass, 'flex-1')}
            />
            <Button variant="primary" type="submit" disabled={!draft.trim()} aria-label="Send">
              <SendHorizontalIcon className="h-4 w-4" />
            </Button>
          </form>
        </>
      )}
    </div>
  );

  return (
    <section aria-labelledby="assistant-title" className="flex min-h-[560px] min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface lg:h-[720px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="assistant-title" className="text-sm font-semibold text-ink">
            Talk to the banking assistant
          </h2>
          <StatusChip>{REHEARSAL_BANK}</StatusChip>
          <StatusChip tone={started ? 'success' : 'neutral'} dot={started}>
            {started ? 'Live · Mock bank systems' : 'Banking gateway'}
          </StatusChip>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            size="sm"
            label="Channel"
            options={[
              { value: 'chat', label: 'Web chat' },
              { value: 'voice', label: 'Web voice' },
            ]}
            value={mode}
            onChange={(v) => onModeChange(v as ConversationMode)}
          />
          {started && (
            <Button size="sm" variant="ghost" onClick={onEnd}>
              <SquareIcon className="h-3.5 w-3.5" aria-hidden />
              End
            </Button>
          )}
          {started && (
            <Button size="sm" variant="secondary" onClick={onNewConversation} disabled={starting}>
              <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden />
              New conversation
            </Button>
          )}
        </div>
      </div>

      {!started ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-base font-medium text-ink">The assistant speaks first.</p>
          <p className="mt-1 max-w-md text-sm text-muted">
            {isVoice
              ? 'Talk to the banking assistant with your microphone. What you both say prints as a chat while you talk, and you can type too.'
              : 'Chat with the banking assistant. Ask in your own words: balances, transactions, cheques, rates or a Service Manager.'}
          </p>
          <p className="mt-3 max-w-md text-[12px] text-ink-soft">Sign-in, PIN and confirmations are decided by the banking gateway. PIN, NRIC and one-time passwords never appear in the conversation.</p>
          <Button variant="primary" className="mt-5" onClick={onStart} disabled={starting || (isVoice && !voice.supported)}>
            {isVoice ? <MicIcon className="h-4 w-4" aria-hidden /> : null}
            {starting ? 'Connecting…' : `Start ${isVoice ? 'voice' : 'chat'} conversation`}
          </Button>
          {isVoice && !voice.supported && <p className="mt-2 text-[12px] text-muted">Voice needs Chrome or Edge (browser speech recognition). Web chat works in any browser.</p>}
          {(startError || voice.error) && (
            <p role="alert" className="mt-3 flex max-w-md items-start gap-2 text-left text-[13px] text-danger">
              <CircleAlertIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {startError ?? voice.error}
            </p>
          )}
        </div>
      ) : isVoice ? (
        <>
          <div className="p-4 pb-0">
            <VoiceBubble
              compact
              title="Banking voice assistant"
              descriptions={VOICE_WORDING}
              startLabel="Start voice"
              state={bubbleState}
              audioLevel={voice.status === 'listening' ? voice.level : 0}
              captionText={latestAssistant}
              errorMessage={voice.error ?? undefined}
              isMuted={voice.muted}
              onToggleMute={voice.toggleMute}
              onEndCall={voice.stop}
              onStartVoice={() => void voice.start()}
              onSwitchToChat={() => onModeChange('chat')}
            />
          </div>
          {conversation}
          {composer}
        </>
      ) : (
        <>
          {conversation}
          {composer}
        </>
      )}
    </section>
  );
}
