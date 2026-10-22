import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentConfig, ChannelType } from '../types/studio';
import type { ChatMessage, FormRequest, TraceEvent } from '../types/testConsole';
import { getSimulatedReply } from '../utils/simulatedReplies';
import { randomHex } from '../utils/format';

export type SessionStatus = 'idle' | 'connecting' | 'live' | 'ended';

const PHONE_RE = /^\+?[\d\s()-]{7,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useTestSession(agentId: string, config: AgentConfig, revision: number) {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [channel, setChannel] = useState<ChannelType>('web_chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const startRef = useRef(0);
  const timers = useRef<number[]>([]);
  const configRef = useRef(config);
  configRef.current = config;

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const addTrace = useCallback((events: Omit<TraceEvent, 'id' | 'at_ms'>[]) => {
    const at = Date.now() - startRef.current;
    setTrace((prev) => [...prev, ...events.map((e, i) => ({ ...e, id: `t_${randomHex(6)}`, at_ms: at + i * 40 }))]);
  }, []);

  const addMessage = (m: Omit<ChatMessage, 'id'>) => setMessages((prev) => [...prev, { ...m, id: `m_${randomHex(6)}` }]);

  const start = useCallback(
    (type: ChannelType) => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      startRef.current = Date.now();
      setChannel(type);
      setMessages([]);
      setListening(false);
      setStatus('connecting');
      const room = `test-${agentId}-${randomHex(8)}`;
      setTrace([
      {
        id: `t_${randomHex(6)}`,
        at_ms: 0,
        kind: 'session',
        label: 'Session created',
        detail: `room ${room} · ref draft (rev ${revision}) · token valid 15 min`,
        status: 'info'
      }]
      );
      later(() => {
        const cfg = configRef.current;
        const entry = cfg.agents.items.find((a) => a.id === cfg.agents.entry);
        const ch = cfg.channels.find((c) => c.type === type);
        setStatus('live');
        addTrace([{ kind: 'agent', label: `${entry?.name ?? 'Agent'} joined`, detail: `entry agent · ${type === 'web_voice' ? cfg.defaults.models.tts.voice + ' voice' : 'text'}`, status: 'ok' }]);
        addMessage({ from: 'agent', text: ch?.greeting ?? 'Hello, how can I help?' });
      }, 1200);
    },
    [agentId, revision, addTrace]
  );

  const send = useCallback(
    (text: string, via: 'text' | 'voice' = 'text') => {
      const trimmed = text.trim();
      if (!trimmed || status !== 'live') return;
      addMessage({ from: 'user', text: trimmed, via });
      if (via === 'voice') addTrace([{ kind: 'session', label: 'Speech recognised', detail: `${configRef.current.defaults.models.stt.model} · “${trimmed}”`, status: 'info' }]);
      setTyping(true);
      later(() => {
        const reply = getSimulatedReply(trimmed, configRef.current);
        setTyping(false);
        addTrace(reply.trace);
        addMessage({ from: 'agent', text: reply.text, form: reply.form, formStatus: reply.form ? 'open' : undefined });
        if (reply.end) {
          later(() => {
            addMessage({ from: 'system', text: 'The agent ended the chat.' });
            addTrace([{ kind: 'end', label: 'Room disconnected', detail: 'Ended by the agent', status: 'info' }]);
            setStatus('ended');
            setListening(false);
          }, 700);
        }
      }, 850);
    },
    [status, addTrace]
  );

  const submitForm = useCallback(
    (messageId: string, form: FormRequest, values: Record<string, string>): Record<string, string> => {
      const errors: Record<string, string> = {};
      form.fields.forEach((f) => {
        const v = (values[f.name] ?? '').trim();
        if (f.required && !v) errors[f.name] = `Enter your ${f.label.toLowerCase()}.`;else
        if (v && f.type === 'phone' && !PHONE_RE.test(v)) errors[f.name] = 'Enter a phone number with at least 7 digits.';else
        if (v && f.type === 'email' && !EMAIL_RE.test(v)) errors[f.name] = 'Enter a valid email address.';
      });
      addTrace([{ kind: 'form', label: Object.keys(errors).length ? 'Form returned with errors' : 'Form accepted', detail: `request ${form.request_id}`, status: Object.keys(errors).length ? 'error' : 'ok' }]);
      if (Object.keys(errors).length) return errors;
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, formStatus: 'accepted' } : m));
      setTyping(true);
      later(() => {
        setTyping(false);
        const when = values.best_time ? ` in the ${values.best_time.toLowerCase()}` : '';
        addMessage({ from: 'agent', text: `Thanks, ${values.name?.split(' ')[0] ?? 'there'}. Someone from the team will call you${when}. Is there anything else?` });
      }, 700);
      return {};
    },
    [addTrace]
  );

  const toggleListening = useCallback(() => {
    if (status !== 'live') return;
    if (!listening) {
      setListening(true);
      addTrace([{ kind: 'session', label: 'Microphone on', status: 'info' }]);
      return;
    }
    setListening(false);
    send('When is my bill due?', 'voice');
  }, [listening, status, send, addTrace]);

  const stop = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setTyping(false);
    setListening(false);
    if (status === 'live' || status === 'connecting') {
      addMessage({ from: 'system', text: 'You left the conversation.' });
      addTrace([{ kind: 'end', label: 'Room disconnected', detail: 'Ended by you', status: 'info' }]);
    }
    setStatus('ended');
  }, [status, addTrace]);

  return { status, channel, messages, trace, typing, listening, start, send, submitForm, toggleListening, stop };
}

export type TestSession = ReturnType<typeof useTestSession>;