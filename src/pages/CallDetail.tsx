import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  DownloadIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useStudio } from "../contexts/StudioContext";
import { StatusChip } from "../components/ui/StatusChip";
import { channelName, outcomeMeta } from "../components/calls/CallsTable";
import { formatDateTime, formatDuration, formatOffset } from "../utils/format";
import { cn } from "../utils/styles";
import { api } from "../api/client";
import { useSetBreadcrumbTitle } from "../contexts/BreadcrumbContext";
import type {
  CallRecord,
  ToolCallRecord,
  TranscriptLine,
} from "../types/studio";
import type { CallTranscriptResponse } from "../api/types";
import { toCallRecord } from "../utils/callRecords";

// Seconds into the call: elapsed_s when the record has it, else the turn's time (`at`, ISO) minus the call's start.
function secondsIntoCall(turn: CallTranscriptResponse["turns"][number], startedAt: string): number | undefined {
  if (typeof turn.elapsed_s === "number") return Math.round(turn.elapsed_s);
  const at = typeof turn.at === "string" ? Date.parse(turn.at) : NaN;
  const start = Date.parse(startedAt);
  return Number.isFinite(at) && Number.isFinite(start) ? Math.max(0, Math.round((at - start) / 1000)) : undefined;
}

function mapTranscript(response: CallTranscriptResponse): TranscriptLine[] {
  return response.turns.map((turn) => ({
    speaker: turn.role === "agent" || turn.role === "assistant" ? "agent" : "caller",
    text: turn.text,
    at_s: secondsIntoCall(turn, response.call.started_at),
  }));
}

function mapCall(response: CallTranscriptResponse, agentId: string, lines: TranscriptLine[]): CallRecord {
  return { ...toCallRecord(response.call, agentId), transcript: lines };
}

type TimelineItem =
  | { type: "line"; at: number | undefined; line: TranscriptLine }
  | { type: "tool"; at: number | undefined; tool: ToolCallRecord };

async function getCallRecord(
  agentId: string,
  callId: string,
  signal: AbortSignal,
): Promise<CallRecord | null> {
  const transcript = await api.getTranscript(agentId, callId, { signal });
  if (transcript?.call) return mapCall(transcript, agentId, mapTranscript(transcript));
  return null;
}

export function CallDetail() {
  const { callId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { agents } = useStudio();

  const [call, setCall] = useState<CallRecord | null>(null);
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSetBreadcrumbTitle(
    call ? `${call.caller} (${call.id.slice(0, 10)})` : null,
  );

  // Which agent this call belongs to: the link says so (?agent=). Older links: a test room is named
  // test-<agent>-<hex>. Never a guess beyond that.
  const agentId = useMemo(() => {
    const fromLink = searchParams.get("agent");
    if (fromLink) return fromLink;
    const match = callId ? /^(?:test|session)-([a-z0-9_-]+)-[0-9a-f]+_/.exec(callId) : null;
    return match?.[1] ?? null;
  }, [callId, searchParams]);

  useEffect(() => {
    if (!callId) {
      setError("Call record not found on the server.");
      setLoading(false);
      return;
    }
    if (!agentId) {
      setError("This link does not say which agent the call belongs to. Open the call from the Calls list.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setCall(null);
    setTranscriptLines([]);
    setLoading(true);
    setError(null);

    const loadCallData = async () => {
      try {
        const record = await getCallRecord(agentId, callId, controller.signal);
        if (!active) return;
        if (record) {
          setCall(record);
          setTranscriptLines(record.transcript);
        } else {
          setError("Call record not found on the server.");
        }
      } catch (err: unknown) {
        if (active && !controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Could not fetch call record.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadCallData();
    return () => {
      active = false;
      controller.abort();
    };
  }, [callId, agentId]);

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!call) return [];
    const items: TimelineItem[] = [
      ...transcriptLines.map((line) => ({
        type: "line" as const,
        at: line.at_s,
        line,
      })),
      ...call.tool_calls
        .filter((t) => t.kind === "tool")
        .map((tool) => ({ type: "tool" as const, at: tool.at_s, tool })),
    ];

    // Lines stay in the order the server recorded them; a time only reorders items that both have one.
    return items.sort((a, b) => (a.at === undefined || b.at === undefined ? 0 : a.at - b.at || (a.type === "line" ? -1 : 1)));
  }, [call, transcriptLines]);

  const agent = agents.find((a) => a.id === (call?.agentId ?? agentId));
  let envText = "";
  if (call) {
    envText = call.environment === "test"
      ? "Test conversation"
      : call.environment === "other"
        ? `Ran on ${call.ref}`
        : call.environment.charAt(0).toUpperCase() + call.environment.slice(1);
  }

  const handleBack = () => {
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof historyIndex === "number" && historyIndex > 0) {
      navigate(-1);
    } else {
      navigate("/calls", { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <RefreshCwIcon className="mx-auto h-6 w-6 animate-spin text-muted" />
        <h1 className="mt-4 text-base font-semibold text-ink">
          Loading call details…
        </h1>
      </div>
    );
  }

  if (!call || error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-lg font-semibold text-ink">Call not found</h1>
        <p className="mt-1 text-sm text-muted">
          {error || "Could not find this call record on the server."}
        </p>
        <Link
          to="/calls"
          className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
        >
          Back to calls
        </Link>
      </div>
    );
  }

  const downloadUrl = api.downloadCallUrl(call.agentId, call.id);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
      <button
        type="button"
        onClick={handleBack}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back
      </button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            {call.caller}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">{call.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted">
            <StatusChip tone={outcomeMeta[call.outcome].tone}>
              {outcomeMeta[call.outcome].label}
            </StatusChip>
            <span>{formatDateTime(call.started_at)}</span>
            <span>{formatDuration(call.duration_s)}</span>
            <span>{channelName[call.channel]}</span>
            <span>
              {envText} · <span className="font-mono">{call.version}</span>
            </span>
            {agent && (
              <Link
                to={`/agents/${agent.id}`}
                className="font-medium text-accent hover:underline"
              >
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
        </div>
      </div>

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
              {timeline.map((item) => {
                if (item.type === "line") {
                  const isAgent = item.line.speaker === "agent";
                  return (
                    <li
                      key={`${item.line.at_s ?? ''}-${item.line.speaker}-${item.line.text}`}
                      className={cn(
                        "flex gap-3",
                        isAgent ? "justify-start" : "justify-end",
                      )}
                    >
                      {isAgent && (
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
                          aria-hidden
                        >
                          {(agent?.name || "A").slice(0, 1)}
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[80%] rounded-xl px-4 py-2.5 text-sm",
                          isAgent
                            ? "border border-line bg-surface text-ink"
                            : "bg-accent text-accent-contrast",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3 text-xs opacity-70">
                          <span className="font-medium">
                            {isAgent ? agent?.name || "Agent" : call.caller}
                          </span>
                          {item.at !== undefined && <span>{formatOffset(item.at)}</span>}
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
                <dd className="mt-0.5 font-mono text-ink break-all">
                  {call.id}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Started</dt>
                <dd className="mt-0.5 text-ink">
                  {formatDateTime(call.started_at)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Duration</dt>
                <dd className="mt-0.5 text-ink">
                  {formatDuration(call.duration_s)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Channel</dt>
                <dd className="mt-0.5 text-ink">{channelName[call.channel]}</dd>
              </div>
              <div>
                <dt className="text-muted">Agent</dt>
                <dd className="mt-0.5 text-ink">{agent?.name ?? call.agentId}</dd>
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
