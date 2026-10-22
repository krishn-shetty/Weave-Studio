import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRightIcon, CircleAlertIcon, FlaskConicalIcon, PlugIcon, SparklesIcon } from 'lucide-react';
import { toast } from 'sonner';
import { calls } from '../data/calls';
import { useStudio } from '../contexts/StudioContext';
import { StatusChip } from '../components/ui/StatusChip';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { AiAssistantModal } from '../components/ui/AiAssistantModal';
import { channelName, outcomeMeta } from '../components/calls/CallsTable';
import { formatDateTime, formatDuration, formatOffset } from '../utils/format';
import { cn, inputClass } from '../utils/styles';
import type { ToolCallRecord, TranscriptLine } from '../types/studio';

type TimelineItem = {type: 'line';at: number;line: TranscriptLine;} | {type: 'tool';at: number;tool: ToolCallRecord;};

export function CallDetail() {
  const { callId } = useParams();
  const { agents } = useStudio();
  const call = calls.find((c) => c.id === callId);

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!call) return [];
    const items: TimelineItem[] = [
    ...call.transcript.map((line) => ({ type: 'line' as const, at: line.at_s, line })),
    ...call.tool_calls.filter((t) => t.kind === 'tool').map((tool) => ({ type: 'tool' as const, at: tool.at_s, tool }))];

    return items.sort((a, b) => a.at - b.at || (a.type === 'line' ? -1 : 1));
  }, [call]);

  if (!call) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-lg font-semibold text-ink">Call not found</h1>
        <Link to="/calls" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">Back to calls</Link>
      </div>);

  }

  const agent = agents.find((a) => a.id === call.agentId);
  const envText = call.environment === 'test' ? 'Test conversation' : call.environment.charAt(0).toUpperCase() + call.environment.slice(1);

  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState(call ? `Scenario from call ${call.id} (${call.caller})` : '');
  const [aiOpen, setAiOpen] = useState(false);

  const handleSaveScenario = () => {
    setScenarioOpen(false);
    toast.success(`Scenario saved to ${agent?.name ?? 'Agent'}`, {
      description: `Captured ${call?.transcript.length} turns and ${call?.tool_calls.length} tool calls for repeatable testing.`
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[13px] text-muted">
        <Link to="/calls" className="hover:text-ink hover:underline">Calls</Link>
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
            {agent &&
            <Link to={`/agents/${agent.id}`} className="font-medium text-accent hover:underline">{agent.name}</Link>
            }
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone="warning">Demo data</StatusChip>
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
        title="Save Call as Automated Test Scenario"
        description="Convert this real call conversation and tool executions into a repeatable test scenario (FR-18)."
        footer={
          <>
            <Button variant="ghost" onClick={() => setScenarioOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveScenario} disabled={!scenarioName.trim()}>
              Save scenario
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-ink">Scenario Name</label>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className={cn(inputClass, 'mt-1 text-sm')}
            />
          </div>

          <div className="rounded-lg border border-line bg-canvas p-3 text-xs space-y-1.5">
            <p className="font-semibold text-ink">Extracted Test Specifications:</p>
            <p className="text-muted">Target agent: <strong className="text-ink">{agent?.name} ({agent?.id})</strong></p>
            <p className="text-muted">Channel: <strong className="text-ink">{channelName[call.channel]}</strong></p>
            <p className="text-muted">Turns captured: <strong className="text-ink">{call.transcript.length} turns</strong></p>
            <p className="text-muted">Tool assertions: <strong className="text-ink">{call.tool_calls.map((t) => t.name).join(', ') || 'None'}</strong></p>
          </div>

          <p className="text-xs text-muted">
            This test will be automatically added to the agent&apos;s Scenarios suite and can be re-run on every draft change.
          </p>
        </div>
      </Dialog>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="transcript-title">
          <h2 id="transcript-title" className="text-sm font-semibold text-ink">Transcript and trace</h2>
          <p className="mt-0.5 text-xs text-muted">Shown as plain text. May contain personal data — don’t copy it into other tools.</p>
          <ol className="mt-4 space-y-4">
            {timeline.map((item, i) =>
            item.type === 'line' ?
            <li key={i} className="grid grid-cols-[48px_72px_minmax(0,1fr)] gap-3">
                  <span className="pt-0.5 font-mono text-xs text-muted">{formatOffset(item.at)}</span>
                  <span className={cn('pt-0.5 text-xs font-medium', item.line.speaker === 'agent' ? 'text-accent' : 'text-ink-soft')}>
                    {item.line.speaker === 'agent' ? 'Agent' : 'Caller'}
                  </span>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{item.line.text}</p>
                </li> :

            <li key={i} className="grid grid-cols-[48px_72px_minmax(0,1fr)] gap-3">
                  <span className="pt-0.5 font-mono text-xs text-muted">{formatOffset(item.at)}</span>
                  <span className="pt-0.5 text-xs font-medium text-muted">Tool</span>
                  <p className={cn('flex flex-wrap items-center gap-2 rounded-md px-2.5 py-1.5 font-mono text-xs', item.tool.status === 'error' ? 'bg-danger-soft text-danger' : 'bg-subtle text-ink-soft')}>
                    <PlugIcon className="h-3.5 w-3.5" aria-hidden />
                    {item.tool.name} · {item.tool.latency_ms} ms · {item.tool.detail}
                  </p>
                </li>

            )}
          </ol>
        </section>

        <aside className="space-y-8">
          {call.errors.length > 0 &&
          <section aria-labelledby="errors-title">
              <h2 id="errors-title" className="text-sm font-semibold text-danger">Errors</h2>
              <ul className="mt-2 space-y-2">
                {call.errors.map((e) =>
              <li key={e} className="flex gap-2 text-[13px] text-ink-soft">
                    <CircleAlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />
                    {e}
                  </li>
              )}
              </ul>
            </section>
          }
          <section aria-labelledby="api-title">
            <h2 id="api-title" className="text-sm font-semibold text-ink">Tool and API calls</h2>
            {call.tool_calls.length === 0 ?
            <p className="mt-2 text-[13px] text-muted">None on this call.</p> :

            <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-surface">
                {call.tool_calls.map((t, i) =>
              <li key={i} className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <code className="truncate font-mono text-xs text-ink">{t.name}</code>
                      <StatusChip tone={t.status === 'ok' ? 'success' : 'danger'}>{t.status === 'ok' ? 'OK' : 'Failed'}</StatusChip>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {t.kind === 'api' ? 'API' : 'Tool'} · at {formatOffset(t.at_s)} · {t.latency_ms} ms
                    </p>
                  </li>
              )}
              </ul>
            }
          </section>
        </aside>
      </div>

      <AiAssistantModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        context={{
          mode: 'summarise_call',
          callTranscript: call.transcript.map((t) => `${t.speaker}: ${t.text}`).join('\n'),
        }}
      />
    </div>);

}