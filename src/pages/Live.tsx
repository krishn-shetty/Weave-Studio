import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ActivityIcon,
  ArrowRightIcon,
  BotIcon,
  CheckCircle2Icon,
  HeadphonesIcon,
  MicIcon,
  PhoneCallIcon,
  PhoneOffIcon,
  RadioIcon,
  RefreshCwIcon,
  ServerIcon,
  ShieldAlertIcon,
  SparklesIcon,
  Volume2Icon,
  WifiIcon,
  ZapIcon,
} from 'lucide-react';
import { useStudio } from '../contexts/StudioContext';
import { Button } from '../components/ui/Button';
import { StatusChip } from '../components/ui/StatusChip';
import { Tooltip } from '../components/ui/Tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
} from '../components/ui/accordion';
import { formatDuration } from '../utils/format';
import { cn } from '../utils/styles';

interface LiveSession {
  id: string;
  agentId: string;
  agentName: string;
  caller: string;
  channel: 'web_voice' | 'phone' | 'web_chat';
  environment: 'production' | 'staging' | 'development';
  startedAt: number;
  durationSeconds: number;
  lastTurn: string;
  latencyMs: number;
  audioActive: boolean;
  transcriptTurns: { speaker: 'agent' | 'caller'; text: string; time: string }[];
}

interface LiveChannel {
  id: string;
  name: string;
  type: string;
  activeCount: number;
  peakCapacity: number;
  status: 'healthy' | 'warning' | 'idle';
  latencyMs: number;
  ingressUrl: string;
}

export function Live() {
  const { agents } = useStudio();
  const [activeTab, setActiveTab] = useState<'sessions' | 'channels' | 'infrastructure'>('sessions');

  // Live session mock timer for realistic ticking
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [sessions, setSessions] = useState<LiveSession[]>(() => [
    {
      id: 'session-prod-9941a',
      agentId: agents[0]?.id || 'voice-test',
      agentName: agents[0]?.name || 'Customer Concierge',
      caller: 'Sarah Jenkins (+1 415-555-0192)',
      channel: 'web_voice',
      environment: 'production',
      startedAt: Date.now() - 48000,
      durationSeconds: 48,
      lastTurn: 'I can assist you with upgrading your subscription tier to Enterprise.',
      latencyMs: 142,
      audioActive: true,
      transcriptTurns: [
        { speaker: 'caller', text: 'Hello, I have a question about our enterprise billing renewal.', time: '0:04' },
        { speaker: 'agent', text: 'Welcome to Northwind Support! I would be glad to check your billing agreement.', time: '0:12' },
        { speaker: 'caller', text: 'Does the tier include dedicated SIP trunk concurrency?', time: '0:28' },
        { speaker: 'agent', text: 'Yes, Enterprise includes up to 50 concurrent SIP voice channels and automated rollback.', time: '0:39' },
      ],
    },
    {
      id: 'session-prod-8812b',
      agentId: agents[1]?.id || agents[0]?.id || 'support-agent',
      agentName: agents[1]?.name || agents[0]?.name || 'Technical Support Lead',
      caller: 'Marcus Vance (+1 650-555-0144)',
      channel: 'phone',
      environment: 'production',
      startedAt: Date.now() - 114000,
      durationSeconds: 114,
      lastTurn: 'Checking system gateway availability for your regional data cluster.',
      latencyMs: 168,
      audioActive: false,
      transcriptTurns: [
        { speaker: 'caller', text: 'Hi, our webhook dispatch seems to be timing out in staging.', time: '0:06' },
        { speaker: 'agent', text: 'Let me inspect the active endpoint logs and certificate validity.', time: '0:22' },
        { speaker: 'agent', text: 'Checking system gateway availability for your regional data cluster.', time: '1:45' },
      ],
    },
    {
      id: 'session-dev-4421c',
      agentId: agents[0]?.id || 'voice-test',
      agentName: agents[0]?.name || 'Customer Concierge',
      caller: 'Internal QA Test Runner',
      channel: 'web_voice',
      environment: 'development',
      startedAt: Date.now() - 22000,
      durationSeconds: 22,
      lastTurn: 'Verifying automated scenario assertions against draft revision.',
      latencyMs: 115,
      audioActive: true,
      transcriptTurns: [
        { speaker: 'caller', text: 'Running preflight automated voice check.', time: '0:02' },
        { speaker: 'agent', text: 'Verifying automated scenario assertions against draft revision.', time: '0:18' },
      ],
    },
  ]);

  const [channels, setChannels] = useState<LiveChannel[]>([
    {
      id: 'ch-web-voice',
      name: 'WebRTC Voice Gateway',
      type: 'LiveKit Cloud Serverless',
      activeCount: 14,
      peakCapacity: 250,
      status: 'healthy',
      latencyMs: 42,
      ingressUrl: 'wss://livekit.weave-studio.internal/rtc',
    },
    {
      id: 'ch-sip-trunk',
      name: 'PSTN / SIP Inbound Trunk',
      type: 'Twilio Elastic SIP Dispatch',
      activeCount: 8,
      peakCapacity: 100,
      status: 'healthy',
      latencyMs: 65,
      ingressUrl: 'sip:ingress@sip.weave-studio.internal',
    },
    {
      id: 'ch-web-chat',
      name: 'Web Chat Socket Hub',
      type: 'Bidirectional JSON-RPC',
      activeCount: 29,
      peakCapacity: 1000,
      status: 'healthy',
      latencyMs: 18,
      ingressUrl: 'https://gateway.weave-studio.internal/v1/chat',
    },
  ]);

  // Session pagination state
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionPageSize, setSessionPageSize] = useState(5);

  const totalSessionPages = Math.max(1, Math.ceil(sessions.length / sessionPageSize));
  const safeSessionPage = Math.min(sessionPage, totalSessionPages);
  const sessionStartIndex = (safeSessionPage - 1) * sessionPageSize;
  const visibleSessions = sessions.slice(sessionStartIndex, sessionStartIndex + sessionPageSize);

  const handleReorderSessions = (newVisible: typeof visibleSessions) => {
    const next = [...sessions];
    next.splice(sessionStartIndex, visibleSessions.length, ...newVisible);
    setSessions(next);
  };

  const handleEndSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              Live Monitoring
            </h1>
            <span className="flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Live Gateway Active
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Real-time active agent conversations, streaming voice telemetry, and live dispatcher channels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              // Add a simulated live call
              const newId = `session-live-${Date.now().toString(36)}`;
              setSessions((prev) => [
                {
                  id: newId,
                  agentId: agents[0]?.id || 'voice-test',
                  agentName: agents[0]?.name || 'Support Agent',
                  caller: `Live Web Visitor (${Math.floor(Math.random() * 900 + 100)})`,
                  channel: 'web_voice',
                  environment: 'production',
                  startedAt: Date.now(),
                  durationSeconds: 1,
                  lastTurn: 'Connecting speech audio pipeline…',
                  latencyMs: 120,
                  audioActive: true,
                  transcriptTurns: [
                    { speaker: 'caller', text: 'Hello? Can anyone hear me?', time: '0:01' },
                    { speaker: 'agent', text: 'Hello! I am here and listening. How can I help you today?', time: '0:03' },
                  ],
                },
                ...prev,
              ]);
            }}
          >
            <RadioIcon className="h-3.5 w-3.5 text-accent" />
            <span>Simulate Incoming Call</span>
          </Button>

          <Button variant="secondary" size="sm">
            <RefreshCwIcon className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Active Live Calls</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-soft text-success">
              <RadioIcon className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{sessions.length}</p>
          <p className="mt-1 text-[11px] text-muted">Across 3 live environments</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Average Turn Latency</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-accent">
              <ZapIcon className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink">141 ms</p>
          <p className="mt-1 text-[11px] text-success font-medium">Optimal voice threshold (&lt;250ms)</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Speech Packet Health</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-info-soft text-info">
              <WifiIcon className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink">99.98%</p>
          <p className="mt-1 text-[11px] text-muted">0.02% packet jitter</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Live Channels Ingress</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warning-soft text-warning">
              <ServerIcon className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink">3 Online</p>
          <p className="mt-1 text-[11px] text-muted">All gateways operational</p>
        </div>
      </div>

      {/* Main Accordion Sections */}
      <div className="mt-8 space-y-8">
        {/* Section 1: Active Conversations Accordion */}
        <section aria-labelledby="live-sessions-heading">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 id="live-sessions-heading" className="text-base font-semibold text-ink">
                Active Live Conversations ({sessions.length})
              </h2>
              <p className="text-xs text-muted">
                Ongoing caller sessions with real-time turn traces and audio diagnostics.
              </p>
            </div>
            <span className="text-xs text-muted">
              Drag handles or use Move controls to prioritize inspection
            </span>
          </div>

          {sessions.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-12 text-center">
              <HeadphonesIcon className="mx-auto h-8 w-8 text-muted" />
              <h3 className="mt-3 text-sm font-semibold text-ink">No live calls in progress</h3>
              <p className="mt-1 text-xs text-muted">
                New incoming web voice, phone, or chat calls will automatically appear here.
              </p>
            </div>
          ) : (
            <Accordion
              items={visibleSessions}
              onReorder={handleReorderSessions}
              enableReordering={true}
              enableDragAndDrop={true}
              pagination={{
                page: safeSessionPage,
                pageSize: sessionPageSize,
                totalItems: sessions.length,
                onPageChange: (p) => setSessionPage(p),
                onPageSizeChange: (s) => {
                  setSessionPageSize(s);
                  setSessionPage(1);
                },
                pageSizeOptions: [3, 5, 10],
              }}
            >
              {visibleSessions.map((session, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === visibleSessions.length - 1;
                const elapsed = Math.floor((currentTime - session.startedAt) / 1000);

                return (
                  <AccordionItem
                    key={session.id}
                    id={session.id}
                    index={idx}
                    isFirst={isFirst}
                    isLast={isLast}
                  >
                    <AccordionHeader
                      id={session.id}
                      icon={<PhoneCallIcon className="h-4 w-4 text-success" />}
                      title={session.caller}
                      subtitle={
                        <span>
                          {session.agentName} · In call for {formatDuration(elapsed)} · Turn latency: {session.latencyMs}ms
                        </span>
                      }
                      badge={
                        <div className="flex items-center gap-1.5">
                          <StatusChip tone="success" dot>
                            Live Streaming
                          </StatusChip>
                          <StatusChip tone={session.environment === 'production' ? 'accent' : 'neutral'}>
                            {session.environment}
                          </StatusChip>
                          {session.audioActive && (
                            <span className="flex items-center gap-1 rounded bg-success-soft px-1.5 py-0.5 text-[10px] font-semibold text-success">
                              <Volume2Icon className="h-3 w-3 animate-pulse" />
                              Speaking
                            </span>
                          )}
                        </div>
                      }
                      actions={
                        <div className="flex items-center gap-1">
                          <Tooltip content="Terminate this live call" position="top">
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleEndSession(session.id)}
                              className="h-8 px-2.5 text-xs"
                            >
                              <PhoneOffIcon className="h-3.5 w-3.5 mr-1" />
                              <span>Disconnect</span>
                            </Button>
                          </Tooltip>
                        </div>
                      }
                    />

                    <AccordionContent>
                      <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                            Live Conversation Turns ({session.transcriptTurns.length})
                          </h4>
                          <div className="mt-3 space-y-2.5 rounded-lg border border-line bg-surface p-3 max-h-56 overflow-y-auto">
                            {session.transcriptTurns.map((turn, tIdx) => (
                              <div
                                key={tIdx}
                                className={cn(
                                  'rounded-md p-2 text-xs',
                                  turn.speaker === 'agent'
                                    ? 'border border-line/60 bg-subtle/50 text-ink'
                                    : 'bg-accent-soft/40 text-accent-strong font-medium'
                                )}
                              >
                                <div className="flex items-center justify-between text-[11px] opacity-70 mb-0.5">
                                  <span>{turn.speaker === 'agent' ? session.agentName : 'Caller'}</span>
                                  <span>{turn.time}</span>
                                </div>
                                <p>{turn.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-lg border border-line bg-surface p-4 text-xs space-y-3">
                          <h4 className="font-semibold text-ink">Streaming Telemetry</h4>
                          <div className="flex justify-between py-1 border-b border-line/50">
                            <span className="text-muted">Session ID:</span>
                            <span className="font-mono text-ink text-[11px]">{session.id}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-line/50">
                            <span className="text-muted">Codec:</span>
                            <span className="font-mono text-ink">Opus (48kHz Fullband)</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-line/50">
                            <span className="text-muted">Round-trip Latency:</span>
                            <span className="font-semibold text-success">{session.latencyMs} ms</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-line/50">
                            <span className="text-muted">Token Gen Speed:</span>
                            <span className="font-mono text-ink">44.8 tok/sec</span>
                          </div>
                          <div className="pt-2">
                            <Link
                              to={`/agents/${session.agentId}/test`}
                              className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                            >
                              <span>Open in Agent Test Console</span>
                              <ArrowRightIcon className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </section>

        {/* Section 2: Live Ingress Channels Accordion */}
        <section aria-labelledby="live-channels-heading">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 id="live-channels-heading" className="text-base font-semibold text-ink">
                Live Ingress Channels & Dispatchers ({channels.length})
              </h2>
              <p className="text-xs text-muted">
                Active telecommunication trunks and web gateways serving traffic.
              </p>
            </div>
          </div>

          <Accordion
            items={channels}
            onReorder={setChannels}
            enableReordering={true}
            enableDragAndDrop={true}
          >
            {channels.map((ch, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === channels.length - 1;

              return (
                <AccordionItem
                  key={ch.id}
                  id={ch.id}
                  index={idx}
                  isFirst={isFirst}
                  isLast={isLast}
                >
                  <AccordionHeader
                    id={ch.id}
                    icon={<ServerIcon className="h-4 w-4 text-accent" />}
                    title={ch.name}
                    subtitle={
                      <span>
                        {ch.type} · {ch.activeCount} active connections of {ch.peakCapacity} limit
                      </span>
                    }
                    badge={
                      <div className="flex items-center gap-1.5">
                        <StatusChip tone="success" dot>
                          Healthy
                        </StatusChip>
                        <span className="font-mono text-xs text-muted">{ch.latencyMs}ms</span>
                      </div>
                    }
                  />

                  <AccordionContent>
                    <div className="grid gap-4 sm:grid-cols-3 text-xs">
                      <div className="rounded-lg border border-line bg-surface p-3">
                        <span className="text-muted block">Ingress Target:</span>
                        <code className="font-mono text-[11px] text-ink break-all mt-1 block">
                          {ch.ingressUrl}
                        </code>
                      </div>
                      <div className="rounded-lg border border-line bg-surface p-3">
                        <span className="text-muted block">Current Concurrency:</span>
                        <span className="text-sm font-semibold text-ink mt-1 block">
                          {ch.activeCount} / {ch.peakCapacity}
                        </span>
                      </div>
                      <div className="rounded-lg border border-line bg-surface p-3">
                        <span className="text-muted block">Uptime:</span>
                        <span className="text-sm font-semibold text-success mt-1 block">
                          99.99% (Past 30 days)
                        </span>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </section>
      </div>
    </div>
  );
}
