import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentConfig, ChannelType } from '../types/studio';
import type { ChatMessage, FormRequest, TraceEvent } from '../types/testConsole';
import { api, followCall } from '../api/client';
import type { Session } from '../api/types';
import { reportLiveKitStatus } from './useLiveKitStatus';
import type { BubbleState } from '../components/agent/test/VoiceBubble';

export type SessionStatus = 'idle' | 'connecting' | 'waiting' | 'live' | 'ended' | 'error';

const TOPIC_TRANSCRIPTION = 'lk.transcription';
const TOPIC_CHAT = 'lk.chat';
const TOPIC_FORM = 'agent-builder.form';
const TOPIC_FORM_SUBMIT = 'agent-builder.form.submit';

export interface TestSession {
  status: SessionStatus;
  bubbleState: BubbleState;
  channel: ChannelType;
  messages: ChatMessage[];
  trace: TraceEvent[];
  typing: boolean;
  listening: boolean;
  agentSpeaking: boolean;
  audioLevel: number;
  latestCaption: string;
  isMuted: boolean;
  error: string | null;
  start: (type: ChannelType) => Promise<void>;
  stop: () => void;
  send: (text: string) => Promise<void>;
  toggleMute: () => Promise<void>;
  submitForm: (messageId: string, form: FormRequest, values: Record<string, string>) => Record<string, string>;
}

export function useTestSession(agentId: string, _config?: AgentConfig, _revision?: number): TestSession {
  void _config;
  void _revision;
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [bubbleState, setBubbleState] = useState<BubbleState>('idle');
  const [channel, setChannel] = useState<ChannelType>('web_chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [latestCaption, setLatestCaption] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<any>(null);
  const audioHostRef = useRef<HTMLDivElement | null>(null);
  const streamUnsubRef = useRef<(() => void) | null>(null);
  const startRef = useRef(0);
  const activeAgentRef = useRef(agentId);
  activeAgentRef.current = agentId;

  // Ensure an invisible audio host element exists in the DOM
  useEffect(() => {
    let host = document.getElementById('livekit-audio-host') as HTMLDivElement;
    if (!host) {
      host = document.createElement('div');
      host.id = 'livekit-audio-host';
      host.style.display = 'none';
      document.body.appendChild(host);
    }
    audioHostRef.current = host;
    return () => {
      if (audioHostRef.current) {
        audioHostRef.current.replaceChildren();
      }
    };
  }, []);

  const addTrace = useCallback((events: Omit<TraceEvent, 'id' | 'at_ms'>[]) => {
    const at = Date.now() - startRef.current;
    setTrace((prev) => [
      ...prev,
      ...events.map((e, i) => ({
        ...e,
        id: `t_${Date.now().toString(36)}_${i}`,
        at_ms: at + i * 40,
      })),
    ]);
  }, []);

  const addMessage = useCallback((m: Omit<ChatMessage, 'id'>) => {
    setMessages((prev) => [...prev, { ...m, id: `m_${Date.now().toString(36)}_${prev.length}` }]);
  }, []);

  const cleanup = useCallback(() => {
    if (streamUnsubRef.current) {
      streamUnsubRef.current();
      streamUnsubRef.current = null;
    }
    const room = roomRef.current;
    roomRef.current = null;
    if (audioHostRef.current) {
      audioHostRef.current.replaceChildren();
    }
    if (room) {
      try {
        room.removeAllListeners();
        room.disconnect();
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const stop = useCallback(() => {
    cleanup();
    setStatus('ended');
    setBubbleState('ended');
    setListening(false);
    setAgentSpeaking(false);
    setTyping(false);
    addMessage({ from: 'system', text: 'Conversation ended.' });
    addTrace([{ kind: 'end', label: 'Room disconnected', detail: 'User left the conversation', status: 'info' }]);
  }, [cleanup, addMessage, addTrace]);

  const start = useCallback(
    async (type: ChannelType) => {
      cleanup();
      startRef.current = Date.now();
      setChannel(type);
      setMessages([]);
      setTrace([]);
      setError(null);
      setLatestCaption('');
      setIsMuted(false);
      setStatus('connecting');
      setBubbleState('connecting');

      try {
        // 1. Ask real backend API for LiveKit join token
        const session: Session = await api.startSession(activeAgentRef.current, {
          ref: 'draft',
          channel: type,
        });

        addTrace([
          {
            kind: 'session',
            label: 'Session created',
            detail: `Room: ${session.room} · token expires in ${session.expires_in_s}s`,
            status: 'info',
          },
        ]);

        // 2. Connect live trace SSE stream for real runtime events
        try {
          const unsub = followCall(activeAgentRef.current, session.room, {
            onRecord: (record: any) => {
              if (record.kind) {
                addTrace([
                  {
                    kind: record.kind === 'tool' ? 'tool' : 'agent',
                    label: record.name || record.kind,
                    detail: record.detail || JSON.stringify(record),
                    status: record.status || 'info',
                  },
                ]);
              }
            },
          });
          streamUnsubRef.current = unsub;
        } catch {
          // SSE fallback
        }

        // 3. Dynamically import livekit-client
        const { Room, RoomEvent, Track } = await import('livekit-client');
        const room = new Room({
          audioCaptureDefaults: {
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        roomRef.current = room;

        // Register transcript stream handler for agent speech
        room.registerTextStreamHandler(TOPIC_TRANSCRIPTION, async (reader: any, participant: any) => {
          const isLocal = participant?.identity === room.localParticipant.identity;
          let fullText = '';
          try {
            for await (const chunk of reader) {
              fullText += chunk;
              if (!isLocal) {
                setLatestCaption(fullText);
                setAgentSpeaking(true);
                setBubbleState('speaking');
              }
            }
          } catch {
            // ignore
          }

          if (!isLocal && fullText.trim()) {
            addMessage({ from: 'agent', text: fullText });
            setAgentSpeaking(false);
            setBubbleState('listening');
          } else if (isLocal && fullText.trim()) {
            addMessage({ from: 'user', text: fullText });
          }
        });

        // Register form protocol handler
        room.registerTextStreamHandler(TOPIC_FORM, async (reader: any) => {
          let jsonText = '';
          for await (const chunk of reader) jsonText += chunk;
          try {
            const formPacket = JSON.parse(jsonText);
            if (formPacket.type === 'form') {
              addMessage({
                from: 'agent',
                text: formPacket.title || 'Please fill in this form',
                form: formPacket,
                formStatus: 'open',
              });
            }
          } catch {
            // ignore
          }
        });

        // Track subscriptions: attach audio track
        room.on(RoomEvent.TrackSubscribed, (track: any) => {
          if (track.kind === Track.Kind.Audio && audioHostRef.current) {
            const element = track.attach();
            audioHostRef.current.appendChild(element);
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track: any) => {
          track.detach().forEach((el: any) => el.remove());
        });

        // Active speakers changed & audio levels
        room.on(RoomEvent.ActiveSpeakersChanged, (speakers: any[]) => {
          const agentSpeaker = speakers.find((s) => s.identity !== room.localParticipant.identity);
          if (agentSpeaker) {
            setAgentSpeaking(true);
            setAudioLevel(agentSpeaker.audioLevel || 0.4);
            setBubbleState('speaking');
          } else {
            setAgentSpeaking(false);
            const localSpeaker = speakers.find((s) => s.identity === room.localParticipant.identity);
            if (localSpeaker) {
              setAudioLevel(localSpeaker.audioLevel || 0.3);
              setBubbleState('listening');
            } else {
              setAudioLevel(0);
              setBubbleState((prev) => (prev === 'speaking' ? 'listening' : prev));
            }
          }
        });

        room.on(RoomEvent.ParticipantConnected, (p: any) => {
          addTrace([
            {
              kind: 'agent',
              label: `${p.identity} joined`,
              detail: 'Runtime worker connected to the room',
              status: 'ok',
            },
          ]);
          setStatus('live');
          setBubbleState('listening');
          setListening(true);
        });

        room.on(RoomEvent.ParticipantDisconnected, (p: any) => {
          addTrace([
            {
              kind: 'agent',
              label: `${p.identity} left`,
              detail: 'Agent participant disconnected',
              status: 'info',
            },
          ]);
        });

        room.on(RoomEvent.Disconnected, () => {
          stop();
        });

        // 4. Connect to LiveKit room
        await room.connect(session.livekit_url, session.token);
        reportLiveKitStatus({ state: 'ok', at: Date.now(), connectMs: Date.now() - startRef.current });
        setStatus('live');
        await room.startAudio().catch((err: unknown) => {
          // Audio autoplay may require user interaction
          void err;
        });

        // 5. Enable microphone if voice channel
        if (type === 'web_voice') {
          try {
            await room.localParticipant.setMicrophoneEnabled(true);
            setListening(true);
            setBubbleState('listening');
            addTrace([
              {
                kind: 'session',
                label: 'Microphone enabled',
                detail: 'Audio track published to room',
                status: 'ok',
              },
            ]);
          } catch (micErr: any) {
            addTrace([
              {
                kind: 'session',
                label: 'Microphone permission denied',
                detail: micErr?.message || 'Access blocked',
                status: 'info',
              },
            ]);
          }
        }
      } catch (err: any) {
        setStatus('error');
        setBubbleState('error');
        const msg = err?.message || 'Could not start live conversation.';
        reportLiveKitStatus({ state: 'failed', at: Date.now(), message: msg });
        setError(msg);
        addTrace([
          {
            kind: 'session',
            label: 'Connection failed',
            detail: msg,
            status: 'error',
          },
        ]);
      }
    },
    [cleanup, addTrace, addMessage, stop]
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !roomRef.current) return;

      addMessage({ from: 'user', text: trimmed, via: channel === 'web_voice' ? 'voice' : 'text' });
      setTyping(true);
      setBubbleState('thinking');

      try {
        await roomRef.current.localParticipant.sendText(trimmed, { topic: TOPIC_CHAT });
      } catch (err: any) {
        addTrace([
          {
            kind: 'session',
            label: 'Failed to send message',
            detail: err?.message,
            status: 'error',
          },
        ]);
      } finally {
        setTyping(false);
      }
    },
    [channel, addMessage, addTrace]
  );

  const toggleMute = useCallback(async () => {
    if (!roomRef.current) return;
    const next = !isMuted;
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(!next);
      setIsMuted(next);
      setBubbleState(next ? 'muted' : 'listening');
    } catch {
      // ignore
    }
  }, [isMuted]);

  const submitForm = useCallback(
    (messageId: string, form: FormRequest, values: Record<string, string>): Record<string, string> => {
      const errors: Record<string, string> = {};
      form.fields.forEach((f) => {
        const v = (values[f.name] ?? '').trim();
        if (f.required && !v) errors[f.name] = `Enter your ${f.label.toLowerCase()}.`;
      });

      if (Object.keys(errors).length > 0) return errors;

      if (roomRef.current) {
        const payload = JSON.stringify({ request_id: (form as any).request_id || (form as any).requestId || messageId, values });
        roomRef.current.localParticipant.sendText(payload, { topic: TOPIC_FORM_SUBMIT }).catch((err: unknown) => {
          void err;
        });
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, formStatus: 'accepted' as const, formValues: values } : m))
      );
      addMessage({ from: 'system', text: `Sent details for ${form.title}.` });
      return {};
    },
    [addMessage]
  );

  return {
    status,
    bubbleState,
    channel,
    messages,
    trace,
    typing,
    listening,
    agentSpeaking,
    audioLevel,
    latestCaption,
    isMuted,
    error,
    start,
    stop,
    send,
    toggleMute,
    submitForm,
  };
}