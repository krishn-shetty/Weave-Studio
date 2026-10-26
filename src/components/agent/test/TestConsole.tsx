import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MicIcon, RotateCcwIcon, SendHorizontalIcon, SquareIcon } from 'lucide-react';
import { isWebChannel, type AgentConfig, type ChannelType } from '../../../types/studio';
import type { TestSession } from '../../../hooks/useTestSession';
import { Button } from '../../ui/Button';
import { StatusChip } from '../../ui/StatusChip';
import { Segmented } from '../../ui/Segmented';
import { ChatForm } from './ChatForm';
import { VoiceBubble } from './VoiceBubble';
import { cn, easeOut, inputClass } from '../../../utils/styles';

interface TestConsoleProps {
  session: TestSession;
  config: AgentConfig;
  revision: number;
  /** Saves pending edits; resolves false if the draft could not be saved. */
  onBeforeStart: () => Promise<boolean>;
  hasUnsaved: boolean;
}

const suggestions = ['When is my bill due?', 'Can I speak to a person?', 'Please call me back', 'Thanks, goodbye'];

export function TestConsole({ session, config, revision, onBeforeStart, hasUnsaved }: TestConsoleProps) {
  const webChannels = (config.channels ?? []).filter((c) => c.enabled && isWebChannel(c.type)).map((c) => c.type);
  const [selected, setSelected] = useState<ChannelType>(webChannels[0] ?? 'web_chat');
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const { status, messages, typing, channel, bubbleState, audioLevel, latestCaption, error, isMuted } = session;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, typing]);

  // The session runs the saved draft, so start only once the server has the latest edits.
  const start = async () => {
    if (!(await onBeforeStart())) return;
    session.start(selected);
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!draft.trim()) return;
    session.send(draft);
    setDraft('');
  };

  const isVoice = channel === 'web_voice' || (status === 'idle' && selected === 'web_voice');

  return (
    <section aria-labelledby="console-title" className="flex min-h-[560px] flex-col rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="console-title" className="text-sm font-semibold text-ink">Talk to your draft</h2>
          <StatusChip className="font-mono">draft · rev {revision}</StatusChip>
          <StatusChip tone={status === 'live' ? 'success' : 'neutral'}>
            {status === 'live' ? 'Live · Real API' : 'Real LiveKit'}
          </StatusChip>
        </div>
        <div className="flex items-center gap-2">
          {status === 'idle' ? (
            <Segmented
              size="sm"
              label="Channel"
              options={webChannels.map((c) => ({ value: c, label: c === 'web_chat' ? 'Web chat' : 'Web voice' }))}
              value={selected}
              onChange={setSelected}
            />
          ) : (
            <>
              {(status === 'live' || status === 'connecting' || status === 'waiting') && (
                <Button size="sm" variant="ghost" onClick={session.stop}>
                  <SquareIcon className="h-3.5 w-3.5" aria-hidden />
                  End
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={start}>
                <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden />
                New conversation
              </Button>
            </>
          )}
        </div>
      </div>

      {status === 'idle' ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-base font-medium text-ink">The agent speaks first.</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            You’ll connect to the live runtime worker over LiveKit. Listen to TTS audio or chat via real streaming messages.
          </p>
          {hasUnsaved && (
            <p className="mt-3 text-[13px] text-ink-soft">
              You have unsaved changes. Tests use the saved draft, so you’ll be asked to save first.
            </p>
          )}
          <Button variant="primary" className="mt-5" onClick={start}>
            {selected === 'web_voice' ? <MicIcon className="h-4 w-4" aria-hidden /> : null}
            Start {selected === 'web_voice' ? 'voice' : 'chat'} test
          </Button>
        </div>
      ) : isVoice ? (
        <div className="flex-1 p-4">
          <VoiceBubble
            state={bubbleState}
            audioLevel={audioLevel}
            captionText={latestCaption}
            errorMessage={error ?? undefined}
            isMuted={isMuted}
            onToggleMute={session.toggleMute}
            onEndCall={session.stop}
            onSwitchToChat={() => {
              session.stop();
              setSelected('web_chat');
            }}
            onStartVoice={start}
          />
        </div>
      ) : (
        <>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5" aria-live="polite" aria-label="Conversation">
            {status === 'connecting' && <p className="text-center text-[13px] text-muted">Connecting to LiveKit room…</p>}
            {status === 'waiting' && <p className="text-center text-[13px] text-muted">Waiting for agent to join…</p>}
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
                      m.from === 'user'
                        ? 'bg-accent text-accent-contrast rounded-br-sm'
                        : 'bg-subtle text-ink border border-line rounded-bl-sm'
                    )}
                  >
                    <p>{m.text}</p>
                    {m.via === 'voice' && <span className="mt-1 block text-[11px] opacity-75">via voice</span>}
                  </div>

                  {m.form && (
                    <div className="mt-3 w-full max-w-md">
                      <ChatForm
                        form={m.form}
                        accepted={m.formStatus === 'accepted'}
                        onSubmit={(vals) => session.submitForm(m.id, m.form!, vals)}
                      />
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

          {status === 'live' && (
            <div className="border-t border-line p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => session.send(s)}
                    className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink-soft hover:border-accent hover:text-ink transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <form onSubmit={submit} className="flex gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  className={cn(inputClass, 'flex-1')}
                />
                <Button variant="primary" type="submit" disabled={!draft.trim()}>
                  <SendHorizontalIcon className="h-4 w-4" />
                </Button>
              </form>
            </div>
          )}
        </>
      )}
    </section>
  );
}