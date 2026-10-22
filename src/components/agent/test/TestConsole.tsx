import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MicIcon, RotateCcwIcon, SendHorizontalIcon, SquareIcon } from 'lucide-react';
import type { AgentConfig, ChannelType } from '../../../types/studio';
import type { TestSession } from '../../../hooks/useTestSession';
import { Button } from '../../ui/Button';
import { StatusChip } from '../../ui/StatusChip';
import { Segmented } from '../../ui/Segmented';
import { ChatForm } from './ChatForm';
import { cn, easeOut, inputClass } from '../../../utils/styles';

interface TestConsoleProps {
  session: TestSession;
  config: AgentConfig;
  revision: number;
  onBeforeStart: () => void;
  hasUnsaved: boolean;
}

const suggestions = ['When is my bill due?', 'Can I speak to a person?', 'Please call me back', 'Thanks, bye'];

export function TestConsole({ session, config, revision, onBeforeStart, hasUnsaved }: TestConsoleProps) {
  const webChannels = config.channels.filter((c) => c.enabled && c.type !== 'phone').map((c) => c.type);
  const [selected, setSelected] = useState<ChannelType>(webChannels[0] ?? 'web_chat');
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const { status, messages, typing, listening, channel } = session;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, typing]);

  const start = () => {
    onBeforeStart();
    session.start(selected);
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    session.send(draft);
    setDraft('');
  };

  const isVoice = channel === 'web_voice';

  return (
    <section aria-labelledby="console-title" className="flex min-h-[560px] flex-col rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="console-title" className="text-sm font-semibold text-ink">Talk to your draft</h2>
          <StatusChip className="font-mono">draft · rev {revision}</StatusChip>
          <StatusChip tone="warning" title="Replies are produced in the browser from your configuration. Real model replies need LiveKit credentials on the server.">
            Simulated
          </StatusChip>
        </div>
        <div className="flex items-center gap-2">
          {status === 'idle' ?
          <Segmented
            size="sm"
            label="Channel"
            options={webChannels.map((c) => ({ value: c, label: c === 'web_chat' ? 'Web chat' : 'Web voice' }))}
            value={selected}
            onChange={setSelected} /> :


          <>
              {(status === 'live' || status === 'connecting') &&
            <Button size="sm" variant="ghost" onClick={session.stop}>
                  <SquareIcon className="h-3.5 w-3.5" aria-hidden />
                  End
                </Button>
            }
              <Button size="sm" variant="secondary" onClick={start}>
                <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden />
                New conversation
              </Button>
            </>
          }
        </div>
      </div>

      {status === 'idle' ?
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-base font-medium text-ink">The agent speaks first.</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            You’ll hear its {selected === 'web_voice' ? 'voice' : 'greeting'} in a second or two, then you can reply. Forms the agent asks for appear in the conversation.
          </p>
          {hasUnsaved && <p className="mt-3 text-[13px] text-ink-soft">Your unsaved changes will be saved first — tests always use the saved draft.</p>}
          <Button variant="primary" className="mt-5" onClick={start}>
            {selected === 'web_voice' ? <MicIcon className="h-4 w-4" aria-hidden /> : null}
            Start {selected === 'web_voice' ? 'voice' : 'chat'} test
          </Button>
        </div> :

      <>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5" aria-live="polite" aria-label="Conversation">
            {status === 'connecting' && <p className="text-center text-[13px] text-muted">Starting the agent…</p>}
            {messages.map((m) =>
          m.from === 'system' ?
          <p key={m.id} className="py-2 text-center text-[13px] text-muted">{m.text}</p> :

          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: easeOut }}
            className={cn('flex flex-col', m.from === 'user' ? 'items-end' : 'items-start')}>
            
                  <div
              className={cn(
                'max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                m.from === 'user' ? 'rounded-br-md bg-ink text-white' : 'rounded-bl-md bg-subtle text-ink'
              )}>
              
                    {m.text}
                  </div>
                  {m.via === 'voice' && <span className="mt-1 text-[11px] text-muted">from your voice</span>}
                  {m.form &&
            <ChatForm form={m.form} accepted={m.formStatus === 'accepted'} onSubmit={(values) => session.submitForm(m.id, m.form!, values)} />
            }
                </motion.div>

          )}
            {typing &&
          <div className="flex items-center gap-1 px-1" aria-label="Agent is replying">
                {[0, 1, 2].map((i) =>
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-muted"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: 'linear' }} />

            )}
              </div>
          }
          </div>

          {status === 'live' &&
        <div className="border-t border-line px-4 py-3">
              {messages.filter((m) => m.from === 'user').length < 2 &&
          <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {suggestions.map((s) =>
            <button
              key={s}
              type="button"
              onClick={() => session.send(s)}
              className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-soft transition-colors duration-150 hover:border-line-strong hover:bg-subtle hover:text-ink">
              
                      {s}
                    </button>
            )}
                </div>
          }
              {isVoice &&
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-subtle px-3 py-2.5">
                  <button
              type="button"
              onClick={session.toggleListening}
              aria-pressed={listening}
              aria-label={listening ? 'Stop talking and send' : 'Start talking'}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                listening ? 'bg-danger text-white' : 'bg-accent text-accent-ink hover:bg-accent-strong'
              )}>
              
                    {listening ? <SquareIcon className="h-4 w-4" aria-hidden /> : <MicIcon className="h-4 w-4" aria-hidden />}
                  </button>
                  <div className="flex h-6 flex-1 items-center gap-0.5" aria-hidden>
                    {Array.from({ length: 28 }, (_, i) =>
              <motion.span
                key={i}
                className="w-1 rounded-full bg-accent/60"
                animate={listening ? { height: [4, 6 + i * 7 % 16, 4] } : { height: 4 }}
                transition={listening ? { duration: 0.6, repeat: Infinity, delay: i % 7 * 0.05, ease: 'easeInOut' } : { duration: 0.15 }} />

              )}
                  </div>
                  <p className="text-xs text-muted">{listening ? 'Listening… tap to send' : 'Tap to talk. Microphone blocked? Type below.'}</p>
                </div>
          }
              <form onSubmit={submit} className="flex items-end gap-2">
                <label htmlFor="test-input" className="sr-only">Message</label>
                <textarea
              id="test-input"
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={isVoice ? 'Or type a message…' : 'Type a message…'}
              className={cn(inputClass, 'max-h-32 min-h-[38px] resize-none')} />
            
                <Button type="submit" variant="primary" aria-label="Send" disabled={!draft.trim()} className="h-[38px] w-[38px] px-0">
                  <SendHorizontalIcon className="h-4 w-4" aria-hidden />
                </Button>
              </form>
            </div>
        }
        </>
      }
    </section>);

}