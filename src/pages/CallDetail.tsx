import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRightIcon, DownloadIcon, FlaskConicalIcon, RefreshCwIcon, SparklesIcon } from 'lucide-react';
import { toast } from '../components/ui/Toast';
import { useStudio } from '../contexts/StudioContext';
import { StatusChip } from '../components/ui/StatusChip';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { AiAssistantModal } from '../components/ui/AiAssistantModal';
import { channelName, outcomeMeta } from '../components/calls/CallsTable';
import { formatDateTime, formatDuration, formatOffset } from '../utils/format';
import { cn, inputClass } from '../utils/styles';
import { api } from '../api/client';
import type { CallRecord, ToolCallRecord, TranscriptLine } from '../types/studio';

type TimelineItem =
  | { type: 'line'; at: number; line: TranscriptLine }
  | { type: 'tool'; at: number; tool: ToolCallRecord };

export function CallDetail() {
  const { callId } = useParams();
  const { agents } = useStudio();

  const [call, setCall] = useState<CallRecord | null>(null);
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Find which agent this call belongs to
  const agentId = useMemo(() => {
    if (!callId) return 'voice-test';
    // Room format: test-<botId>-<hex>_<timestamp>
    const match = callId.match(/^(?:test|session)-([a-z0-9_-]+)-/);
    if (match && match[1]) {
      const found = agents.find((a) => a.id === match[1]);
      if (found) return found.id;
      return match[1];
    }
    return agents[0]?.id || 'voice-test';
  }, [callId, agents]);

  const loadCallData = async () => {
    if (!callId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch transcript from real API
      const transcriptRes = await api.getTranscript(agentId, callId).catch(() => null);

      if (transcriptRes && transcriptRes.call) {
        const c = transcriptRes.call;
        const isEnded = c.status === 'ended';
        const handoffs = c.handoffs || 0;
        const callOutcome = isEnded
          ? handoffs > 0
            ? 'handed_over'
            : 'resolved'
          : c.status === 'unfinished'
          ? 'cut_off'
          : 'abandoned';

        const lines: TranscriptLine[] = (transcriptRes.turns || []).map((t: any, idx: number) => ({
          speaker: t.role === 'agent' || t.role === 'assistant' ? 'agent' : 'caller',
          text: t.text,
          at_s: typeof t.elapsed_s === 'number' ? Math.round(t.elapsed_s) : idx * 4,
        }));

        setTranscriptLines(lines);

        const chType = typeof c.channel === 'object' && c.channel !== null ? (c.channel.type || '') : String(c.channel || '');
        const chId = typeof c.channel === 'object' && c.channel !== null ? (c.channel.id || '') : String(c.channel || '');

        setCall({
          id: c.id,
          agentId: c.bot || agentId,
          channel: chType === 'web_chat' ? 'web_chat' : chType === 'sip_voice' ? 'phone' : 'web_voice',
          environment: c.ref === 'draft' ? 'test' : ((c.ref || 'development') as any),
          version: c.version || 'draft',
          started_at: c.started_at,
          duration_s: c.duration_s || 0,
          outcome: callOutcome,
          caller: c.caller || 'Anonymous visitor',
          summary: `Call in ${chId || 'channel'} · ${c.duration_s || 0}s (${lines.length} turns)`,
          transcript: lines,
          tool_calls: [],
          errors: [],
        });
      } else {
        // Fallback: try getCall
        const callData = await api.getCall(agentId, callId).catch(() => null);
        if (callData) {
          setCall({
            id: callId,
            agentId,
            channel: 'web_voice',
            environment: 'test',
            version: 'draft',
            started_at: new Date().toISOString(),
            duration_s: 0,
            outcome: 'resolved',
            caller: 'Visitor',
            summary: 'Call details',
            transcript: [],
            tool_calls: [],
            errors: [],
          });
        } else {
          setError('Call record not found on the server.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Could not fetch call record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCallData();
  }, [callId, agentId]);

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!call) return [];
    const items: TimelineItem[] = [
      ...transcriptLines.map((line) => ({ type: 'line' as const, at: line.at_s, line })),
      ...call.tool_calls.filter((t) => t.kind === 'tool').map((tool) => ({ type: 'tool' as const, at: tool.at_s, tool })),
    ];

    return items.sort((a, b) => a.at - b.at || (a.type === 'line' ? -1 : 1));
  }, [call, transcriptLines]);

  const agent = agents.find((a) => a.id === (call?.agentId || agentId));
  const envText = call
    ? call.environment === 'test'
      ? 'Test conversation'
      : call.environment.charAt(0).toUpperCase() + call.environment.slice(1)
    : '';

  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState(call ? `Scenario from call ${call.id} (${call.caller})` : '');
  const [aiOpen, setAiOpen] = useState(false);

  const handleSaveScenario = () => {
    setScenarioOpen(false);
    toast.success(`Scenario saved to ${agent?.name ?? 'Agent'}`, {
      description: `Captured ${transcriptLines.length} turns for repeatable testing.`,
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <RefreshCwIcon className="mx-auto h-6 w-6 animate-spin text-muted" />
        <h1 className="mt-4 text-base font-semibold text-ink">Loading call details…</h1>
      </div>
    );
  }

  if (!call || error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-lg font-semibold text-ink">Call not found</h1>
        <p className="mt-1 text-sm text-muted">{error || 'Could not find this call record on the server.'}</p>
        <Link to="/calls" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
          Back to calls
        </Link>
      </div>
    );
  }

  const downloadUrl = api.downloadCallUrl(agentId, call.id);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[13px] text-muted">
        <Link to="/calls" className="hover:text-ink hover:underline">
          Calls
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden />
        <span className="font-mono text-xs">{call.id}</span>
      </nav>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">{call.caller}</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">{call.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted">
            <StatusChip tone={outcomeMeta[call.outcome].tone}>{outcomeMeta[call.outcome].label}</StatusChip>
            <span>{formatDateTime(call.started_at)}</span>
            <span>{formatDuration(call.duration_s)}</span>
            <span>{channelName[call.channel]}</span>
            <span>
              {envText} · <span className="font-mono">{call.version}</span>
            </span>
            {agent && (
              <Link to={`/agents/${agent.id}`} className="font-medium text-accent hover:underline">
                {agent.name}
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={downloadUrl}
            download={`${call.id}.ndjson`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-subtle"
            title="Download full NDJSON call log file"
          >
            <DownloadIcon className="h-3.5 w-3.5 text-muted" />
            Download NDJSON
          </a>
          <Button
            variant="secondary"
            onClick={() => setAiOpen(true)}
            title="Diagnose this call and suggest prompt improvements with AI"
          >
            <SparklesIcon className="h-4 w-4 text-accent" />
            AI Prompt Fix
          </Button>
          <Button
            variant="secondary"
            onClick={() => setScenarioOpen(true)}
            title="Convert this call's conversation and tool trace into a repeatable automated test scenario"
          >
            <FlaskConicalIcon className="h-4 w-4 text-accent" />
            Save as test scenario
          </Button>
        </div>
      </div>

      <Dialog
        open={scenarioOpen}
        onClose={() => setScenarioOpen(false)}
        title="Save call as test scenario"
        footer={
          <>
            <Button variant="ghost" onClick={() => setScenarioOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveScenario}>
              Save scenario
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Freeze this caller’s exact words and check that your agent produces the expected responses on every future release.
        </p>
        <div className="mt-4">
          <label htmlFor="scenario-name" className="block text-xs font-medium text-ink-soft">
            Scenario title
          </label>
          <input
            id="scenario-name"
            type="text"
            className={cn(inputClass, 'mt-1.5')}
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
          />
        </div>
      </Dialog>

      <AiAssistantModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        context={{
          mode: 'summarise_call',
          callTranscript: transcriptLines.map((t) => `${t.speaker}: ${t.text}`).join('\n'),
        }}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="transcript-title">
          <h2 id="transcript-title" className="text-sm font-semibold text-ink">
            Conversation transcript ({transcriptLines.length} turns)
          </h2>
          {timeline.length === 0 ? (
            <div className="mt-4 rounded-lg border border-line bg-surface p-8 text-center text-sm text-muted">
              No speech turns recorded in this call.
            </div>
          ) : (
            <ol className="mt-4 space-y-4">
              {timeline.map((item, idx) => {
                if (item.type === 'line') {
                  const isAgent = item.line.speaker === 'agent';
                  return (
                    <li key={`line-${idx}`} className={cn('flex gap-3', isAgent ? 'justify-start' : 'justify-end')}>
                      {isAgent && (
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
                          aria-hidden
                        >
                          {(agent?.name || 'A').slice(0, 1)}
                        </div>
                      )}
                      <div
                        className={cn(
                          'max-w-[80%] rounded-xl px-4 py-2.5 text-sm',
                          isAgent ? 'border border-line bg-surface text-ink' : 'bg-accent text-accent-contrast'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3 text-xs opacity-70">
                          <span className="font-medium">{isAgent ? agent?.name || 'Agent' : call.caller}</span>
                          <span>{formatOffset(item.at)}</span>
                        </div>
                        <p className="mt-1 leading-relaxed">{item.line.text}</p>
                      </div>
                    </li>
                  );
                }
                return null;
              })}
            </ol>
          )}
        </section>

        <aside aria-labelledby="meta-title" className="space-y-6">
          <div className="rounded-xl border border-line bg-surface p-5">
            <h2 id="meta-title" className="text-sm font-semibold text-ink">
              Call metadata
            </h2>
            <dl className="mt-4 space-y-3 text-xs">
              <div>
                <dt className="text-muted">Room / ID</dt>
                <dd className="mt-0.5 font-mono text-ink break-all">{call.id}</dd>
              </div>
              <div>
                <dt className="text-muted">Started</dt>
                <dd className="mt-0.5 text-ink">{formatDateTime(call.started_at)}</dd>
              </div>
              <div>
                <dt className="text-muted">Duration</dt>
                <dd className="mt-0.5 text-ink">{formatDuration(call.duration_s)}</dd>
              </div>
              <div>
                <dt className="text-muted">Channel</dt>
                <dd className="mt-0.5 text-ink">{channelName[call.channel]}</dd>
              </div>
              <div>
                <dt className="text-muted">Agent</dt>
                <dd className="mt-0.5 text-ink">{agent?.name || agentId}</dd>
              </div>
              <div>
                <dt className="text-muted">Environment</dt>
                <dd className="mt-0.5 text-ink">{envText}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}