import React, { useEffect, useRef, useState } from 'react';
import {
  MicIcon,
  MicOffIcon,
  PhoneOffIcon,
  MessageSquareIcon,
  SubtitlesIcon,
  Volume2Icon,
  LoaderCircleIcon,
  AlertCircleIcon,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { cn } from '../../../utils/styles';

export type BubbleState =
  | 'idle'
  | 'connecting'
  | 'waiting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'muted'
  | 'reconnecting'
  | 'error'
  | 'ended';

interface VoiceBubbleProps {
  state: BubbleState;
  audioLevel?: number; // 0.0 to 1.0
  captionText?: string;
  errorMessage?: string;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onEndCall?: () => void;
  onSwitchToChat?: () => void;
  onStartVoice?: () => void;
}

const stateLabels: Record<BubbleState, { label: string; desc: string }> = {
  idle: { label: 'Ready', desc: 'Click to talk with your voice agent' },
  connecting: { label: 'Connecting…', desc: 'Joining LiveKit room and reserving agent' },
  waiting: { label: 'Waiting for agent', desc: 'Connected. Waiting for runtime worker to join' },
  listening: { label: 'Listening…', desc: 'Speak to the agent naturally' },
  thinking: { label: 'Thinking…', desc: 'Generating reply with LLM' },
  speaking: { label: 'Speaking', desc: 'Agent is speaking through TTS' },
  muted: { label: 'Microphone muted', desc: 'Click unmute to speak' },
  reconnecting: { label: 'Reconnecting…', desc: 'Restoring audio stream' },
  error: { label: 'Connection error', desc: 'Failed to establish voice session' },
  ended: { label: 'Call ended', desc: 'Conversation completed' },
};

export function VoiceBubble({
  state,
  audioLevel = 0,
  captionText = '',
  errorMessage,
  isMuted = false,
  onToggleMute,
  onEndCall,
  onSwitchToChat,
  onStartVoice,
}: VoiceBubbleProps) {
  const [showCaptions, setShowCaptions] = useState(true);
  const [smoothedLevel, setSmoothedLevel] = useState(0);
  const animFrameRef = useRef<number | null>(null);
  const levelRef = useRef(audioLevel);
  levelRef.current = audioLevel;

  // Exponential moving average for smooth audio reactive scaling
  useEffect(() => {
    let current = 0;
    const animate = () => {
      const target = levelRef.current;
      current += (target - current) * 0.18;
      setSmoothedLevel(current);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Compute scale and glow based on state and audio level
  const scale = state === 'speaking' || state === 'listening'
    ? Math.min(1.35, Math.max(1.0, 1.0 + smoothedLevel * 0.8))
    : state === 'connecting' || state === 'waiting'
    ? 1.04
    : 1.0;

  const glowRadius = Math.round(15 + smoothedLevel * 45);

  const getBubbleTheme = () => {
    switch (state) {
      case 'speaking':
        return {
          gradient: 'radial-gradient(circle at 35% 35%, #60a5fa, #2563eb 60%, #1d4ed8)',
          glow: `0 0 ${glowRadius}px rgba(37, 99, 235, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.3)`,
          ring: 'border-blue-400/50 animate-pulse',
        };
      case 'listening':
        return {
          gradient: 'radial-gradient(circle at 35% 35%, #34d399, #059669 60%, #047857)',
          glow: `0 0 ${glowRadius}px rgba(16, 185, 129, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.3)`,
          ring: 'border-emerald-400/50 animate-pulse',
        };
      case 'thinking':
        return {
          gradient: 'radial-gradient(circle at 35% 35%, #c084fc, #9333ea 60%, #7e22ce)',
          glow: '0 0 25px rgba(168, 85, 247, 0.5), inset 0 0 15px rgba(255, 255, 255, 0.2)',
          ring: 'border-purple-400/60 animate-spin',
        };
      case 'connecting':
      case 'waiting':
        return {
          gradient: 'radial-gradient(circle at 35% 35%, #94a3b8, #64748b 60%, #475569)',
          glow: '0 0 20px rgba(148, 163, 184, 0.4)',
          ring: 'border-slate-400/40 animate-spin',
        };
      case 'muted':
        return {
          gradient: 'radial-gradient(circle at 35% 35%, #64748b, #475569 60%, #334155)',
          glow: 'none',
          ring: 'border-slate-500/30',
        };
      case 'error':
        return {
          gradient: 'radial-gradient(circle at 35% 35%, #f87171, #dc2626 60%, #b91c1c)',
          glow: '0 0 25px rgba(239, 68, 68, 0.5)',
          ring: 'border-red-500/50',
        };
      case 'ended':
      default:
        return {
          gradient: 'radial-gradient(circle at 35% 35%, #475569, #334155 60%, #1e293b)',
          glow: '0 0 15px rgba(100, 116, 139, 0.3)',
          ring: 'border-slate-600/30',
        };
    }
  };

  const theme = getBubbleTheme();
  const info = stateLabels[state];

  return (
    <div className="flex flex-col items-center justify-between min-h-[480px] p-6 bg-surface rounded-xl border border-line">
      {/* Top status bar */}
      <div className="w-full flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-1.5 font-medium">
          <Volume2Icon className="h-3.5 w-3.5 text-accent" />
          Live Voice Agent
        </span>
        <span
          aria-live="polite"
          className={cn(
            'px-2 py-0.5 rounded-full font-medium',
            state === 'speaking'
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : state === 'listening'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : state === 'thinking'
              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
              : 'bg-subtle text-ink-soft'
          )}
        >
          {info.label}
        </span>
      </div>

      {/* Center Animated Orb */}
      <div className="relative my-8 flex items-center justify-center">
        {/* Outer soft ring */}
        <div
          className={cn('absolute w-64 h-64 rounded-full border-2 transition-all duration-300', theme.ring)}
          style={{ transform: `scale(${scale * 1.08})` }}
        />

        {/* Central Orb */}
        <div
          className="w-48 h-48 rounded-full shadow-2xl transition-transform duration-75 ease-out flex items-center justify-center cursor-pointer select-none"
          style={{
            background: theme.gradient,
            boxShadow: theme.glow,
            transform: `scale(${scale})`,
          }}
          onClick={state === 'idle' ? onStartVoice : undefined}
        >
          {state === 'idle' && (
            <div className="text-center text-white px-4">
              <MicIcon className="h-8 w-8 mx-auto opacity-90 mb-1" />
              <span className="text-xs font-semibold tracking-wide uppercase">Start Voice</span>
            </div>
          )}

          {state === 'connecting' && <LoaderCircleIcon className="h-8 w-8 text-white/80 animate-spin" />}
          {state === 'waiting' && <span className="text-xs font-semibold text-white/90">Waiting…</span>}
          {state === 'muted' && <MicOffIcon className="h-8 w-8 text-white/70" />}
          {state === 'error' && <AlertCircleIcon className="h-8 w-8 text-white" />}
        </div>
      </div>

      {/* State label & description */}
      <div className="text-center">
        <h3 className="text-base font-semibold text-ink">{info.label}</h3>
        <p className="text-xs text-muted mt-1 max-w-sm">
          {errorMessage || info.desc}
        </p>
      </div>

      {/* Live Agent Captions */}
      {showCaptions && (
        <div className="w-full max-w-lg mt-4 min-h-[50px] p-3 rounded-lg bg-canvas border border-line text-center text-sm text-ink-soft">
          {captionText ? (
            <p className="leading-relaxed font-medium text-ink">"{captionText}"</p>
          ) : (
            <p className="text-xs text-muted italic">Captions will stream here as the agent speaks…</p>
          )}
        </div>
      )}

      {/* Control bar */}
      <div className="w-full mt-6 flex flex-wrap items-center justify-center gap-3 border-t border-line pt-4">
        {state !== 'idle' && state !== 'ended' ? (
          <>
            <Button
              variant={isMuted ? 'danger' : 'secondary'}
              size="sm"
              onClick={onToggleMute}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOffIcon className="h-4 w-4" /> : <MicIcon className="h-4 w-4" />}
              {isMuted ? 'Unmute' : 'Mute'}
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={onEndCall}
              title="End conversation"
            >
              <PhoneOffIcon className="h-4 w-4" />
              End call
            </Button>
          </>
        ) : (
          <Button variant="primary" size="sm" onClick={onStartVoice}>
            <MicIcon className="h-4 w-4" />
            Start Voice Conversation
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCaptions((v) => !v)}
          title="Toggle agent speech captions"
        >
          <SubtitlesIcon className="h-4 w-4" />
          {showCaptions ? 'Hide captions' : 'Show captions'}
        </Button>

        {onSwitchToChat && (
          <Button variant="ghost" size="sm" onClick={onSwitchToChat} title="Switch to text chat">
            <MessageSquareIcon className="h-4 w-4" />
            Text chat
          </Button>
        )}
      </div>
    </div>
  );
}
