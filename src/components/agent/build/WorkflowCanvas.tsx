import React, { useMemo, useState } from 'react';
import {
  ArrowRightIcon,
  BotIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  GlobeIcon,
  LayersIcon,
  MessageSquareIcon,
  PhoneIcon,
  PlugIcon,
  PlusIcon,
  RadioIcon,
  SearchIcon,
  SendIcon,
  SlidersIcon,
  SparklesIcon,
  UserCheckIcon,
  ZoomInIcon,
  ZoomOutIcon
} from 'lucide-react';
import type { AgentConfig, ChannelType, ToolDefinition } from '../../../types/studio';
import type { DraftEditor } from '../../../hooks/useDraftEditor';
import { getGreetingText, getInstructionsText } from '../../../utils/validate';
import { Button } from '../../ui/Button';
import { StatusChip } from '../../ui/StatusChip';
import { cn } from '../../../utils/styles';

interface WorkflowCanvasProps {
  editor: DraftEditor;
  onGoToDetailedGroup?: (group: string) => void;
}

const toolKindMeta: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: 'accent' | 'neutral' | 'success' | 'warning' }> = {
  http: { label: 'HTTP API', icon: PlugIcon, tone: 'accent' },
  knowledge_search: { label: 'Knowledge Base', icon: SearchIcon, tone: 'success' },
  transfer: { label: 'Human Transfer', icon: UserCheckIcon, tone: 'warning' },
  send_sms: { label: 'SMS Notification', icon: SendIcon, tone: 'neutral' },
  end_call: { label: 'End Conversation', icon: PhoneIcon, tone: 'neutral' },
  mcp: { label: 'MCP Tool', icon: PlugIcon, tone: 'warning' }
};

export function WorkflowCanvas({ editor, onGoToDetailedGroup }: WorkflowCanvasProps) {
  const { config, update, canEdit } = editor;
  const [zoom, setZoom] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  if (!config) return null;

  const entryAgent = config.agents.items.find((a) => a.id === config.agents.entry) ?? config.agents.items[0];
  const subAgents = config.agents.items.filter((a) => a.id !== entryAgent?.id);

  const enabledChannels = config.channels.filter((c) => c.enabled);
  const tools = config.tools ?? [];

  return (
    <div className="flex flex-col rounded-xl border border-line bg-canvas shadow-panel overflow-hidden">
      {/* Canvas Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <LayersIcon className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-ink">Visual Call Flow (Workflow Canvas)</span>
          <StatusChip tone="accent">Interactive</StatusChip>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setZoom((z) => Math.max(0.7, Number((z - 0.1).toFixed(1))))}
            title="Zoom out"
          >
            <ZoomOutIcon className="h-4 w-4" />
          </Button>
          <span className="font-mono text-xs text-muted w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))))}
            title="Zoom in"
          >
            <ZoomInIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setZoom(1)}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Interactive Diagram Area */}
      <div
        className="relative min-h-[580px] p-8 overflow-x-auto select-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface/40 via-canvas to-canvas"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}
      >
        <div className="mx-auto max-w-5xl space-y-12">
          {/* LAYER 1: CHANNEL TRIGGERS */}
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
              <span>1. Inbound Channel Triggers</span>
              <span className="text-line-strong">———</span>
              <span>{enabledChannels.length} active</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {config.channels.map((ch) => {
                const isSelected = selectedNodeId === `channel-${ch.id}`;
                return (
                  <div
                    key={ch.id}
                    onClick={() => setSelectedNodeId(`channel-${ch.id}`)}
                    className={cn(
                      'cursor-pointer rounded-xl border p-4 transition shadow-panel bg-surface',
                      ch.enabled
                        ? isSelected
                          ? 'border-accent ring-2 ring-accent/30'
                          : 'border-line hover:border-line-strong'
                        : 'border-dashed border-line/80 opacity-60'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-medium text-ink text-sm">
                        {ch.type === 'web_chat' && <GlobeIcon className="h-4 w-4 text-accent" />}
                        {ch.type === 'web_voice' && <RadioIcon className="h-4 w-4 text-success" />}
                        {ch.type === 'phone' && <PhoneIcon className="h-4 w-4 text-info" />}
                        <span className="capitalize">{ch.type.replace('_', ' ')}</span>
                      </div>
                      <StatusChip tone={ch.enabled ? 'success' : 'neutral'} dot={ch.enabled}>
                        {ch.enabled ? 'Active' : 'Disabled'}
                      </StatusChip>
                    </div>

                    <p className="mt-2 text-xs text-muted line-clamp-2 italic">
                      &ldquo;{getGreetingText(ch.greeting)}&rdquo;
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px] text-muted">
                      <span>ID: {ch.id}</span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const idx = config.channels.findIndex((c) => c.id === ch.id);
                            if (idx !== -1) update(['channels', idx, 'enabled'], !ch.enabled);
                          }}
                          className="font-medium text-accent hover:underline"
                        >
                          {ch.enabled ? 'Turn off' : 'Turn on'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SVG FLOW CONNECTOR */}
          <div className="flex justify-center -my-6">
            <div className="h-8 w-0.5 bg-line-strong relative">
              <span className="absolute -bottom-1 -left-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" />
            </div>
          </div>

          {/* LAYER 2: ENTRY AGENT & SUB-AGENTS */}
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
              <span>2. Conversational Agent Roles & Handoffs</span>
              <span className="text-line-strong">———</span>
              <span>{config.agents.items.length} role configured</span>
            </div>

            <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
              {/* Primary Entry Role */}
              {entryAgent && (
                <div
                  onClick={() => setSelectedNodeId(`agent-${entryAgent.id}`)}
                  className={cn(
                    'cursor-pointer rounded-xl border p-5 transition shadow-panel bg-surface',
                    selectedNodeId === `agent-${entryAgent.id}`
                      ? 'border-accent ring-2 ring-accent/30'
                      : 'border-line hover:border-line-strong'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                        <BotIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-ink">{entryAgent.name}</h4>
                        <p className="font-mono text-xs text-muted">Entry Role: {entryAgent.id}</p>
                      </div>
                    </div>
                    <StatusChip tone="accent">Entrypoint</StatusChip>
                  </div>

                  <div className="mt-3.5 space-y-2 text-xs text-ink-soft">
                    <div>
                      <span className="font-semibold text-muted">Spoken Persona:</span>{' '}
                      <span className="font-medium text-ink">{config.persona.name} ({config.persona.tone} tone)</span>
                    </div>
                    <div>
                      <span className="font-semibold text-muted">Core Directives:</span>
                      <p className="mt-1 line-clamp-3 leading-relaxed text-muted font-sans">
                        {getInstructionsText(entryAgent.instructions) || 'Assist customer and route queries.'}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-muted">Assigned Tools:</span>{' '}
                      <span className="font-mono text-ink font-medium">
                        {entryAgent.tools.join(', ') || 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Agents or Handoffs */}
              <div className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5 shadow-panel">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-ink">Specialized Sub-Agents</h4>
                    <span className="text-xs text-muted">{subAgents.length} configured</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Sub-agents handle specific tasks (e.g. tier-2 billing, verification, out of hours) via conversational handoffs.
                  </p>

                  <div className="mt-4 space-y-2">
                    {subAgents.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-muted">
                        Single role architecture. All tools are managed directly by {entryAgent?.name}.
                      </div>
                    ) : (
                      subAgents.map((sa) => (
                        <div
                          key={sa.id}
                          className="flex items-center justify-between rounded-lg border border-line bg-canvas p-2.5 text-xs"
                        >
                          <div>
                            <p className="font-medium text-ink">{sa.name}</p>
                            <p className="font-mono text-[11px] text-muted">{sa.id}</p>
                          </div>
                          <span className="text-muted font-mono">{sa.tools.length} tools</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-line/60">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-xs"
                    onClick={() => onGoToDetailedGroup?.('roles')}
                  >
                    Manage agent roles in Detailed view →
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* SVG FLOW CONNECTOR */}
          <div className="flex justify-center -my-6">
            <div className="h-8 w-0.5 bg-line-strong relative">
              <span className="absolute -bottom-1 -left-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" />
            </div>
          </div>

          {/* LAYER 3: TOOLS & BACKEND INTEGRATIONS */}
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
              <span>3. Integrated Tools & Capabilities</span>
              <span className="text-line-strong">———</span>
              <span>{tools.length} tools attached</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => {
                const meta = toolKindMeta[tool.type] ?? {
                  label: tool.type,
                  icon: PlugIcon,
                  tone: 'neutral' as const
                };
                const Icon = meta.icon;
                const isSelected = selectedNodeId === `tool-${tool.id}`;
                return (
                  <div
                    key={tool.id}
                    onClick={() => setSelectedNodeId(`tool-${tool.id}`)}
                    className={cn(
                      'cursor-pointer rounded-xl border p-3.5 transition shadow-panel bg-surface',
                      isSelected
                        ? 'border-accent ring-2 ring-accent/30'
                        : 'border-line hover:border-line-strong'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-subtle text-accent">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="font-mono text-xs font-semibold text-ink">{tool.id}()</span>
                      </div>
                      <StatusChip tone={meta.tone} className="text-[10px]">
                        {meta.label}
                      </StatusChip>
                    </div>

                    <p className="mt-2 text-xs text-muted line-clamp-2">
                      {tool.description}
                    </p>

                    {tool.connection && (
                      <p className="mt-2.5 font-mono text-[11px] text-accent-strong bg-accent-soft/40 px-2 py-0.5 rounded w-fit">
                        Connection: {tool.connection}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
