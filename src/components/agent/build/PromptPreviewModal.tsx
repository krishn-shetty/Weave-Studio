import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ClockIcon,
  CopyIcon,
  EyeIcon,
  InfoIcon,
  LayersIcon,
  MessageSquareIcon,
  PhoneIcon,
  RadioIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  WrenchIcon,
  XIcon
} from 'lucide-react';
import { AgentConfig, ChannelType } from '../../../types/studio';
import { getInstructionsText } from '../../../utils/validate';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { StatusChip } from '../../ui/StatusChip';
import { Segmented } from '../../ui/Segmented';
import { cn } from '../../../utils/styles';

interface PromptPreviewModalProps {
  open: boolean;
  onClose: () => void;
  config: AgentConfig;
}

export function PromptPreviewModal({ open, onClose, config }: PromptPreviewModalProps) {
  const [channel, setChannel] = useState<ChannelType>('web_chat');
  const [selectedAgentId, setSelectedAgentId] = useState<string>(config.agents.entry);
  const [verifiedCaller, setVerifiedCaller] = useState(false);
  const [isAfterHours, setIsAfterHours] = useState(false);

  const activeAgent = useMemo(() => {
    return (
      config.agents.items.find((a) => a.id === selectedAgentId) ??
      config.agents.items[0]
    );
  }, [config.agents.items, selectedAgentId]);

  const activeTools = useMemo(() => {
    const ids = activeAgent?.tools ?? [];
    return config.tools.filter((t) => ids.includes(t.id));
  }, [activeAgent, config.tools]);

  const compiledPrompt = useMemo(() => {
    const lines: string[] = [];

    // System Identity & Persona
    lines.push(`You are ${config.persona.name}, an AI assistant representing ${config.persona.company}.`);
    lines.push(`Tone: You must speak with a ${config.persona.tone} tone.`);

    if (config.persona.recording_notice) {
      lines.push('\n[RECORDING NOTICE DIRECTIVE]');
      lines.push('You must state at the beginning of the interaction: "This interaction may be monitored or recorded for training and quality assurance purposes."');
    }

    // Channel specific guidelines
    lines.push(`\n[CHANNEL CONTEXT: ${channel.toUpperCase()}]`);
    if (channel === 'web_voice') {
      lines.push('- You are speaking via Realtime Web Voice. Speak in concise, natural, spoken English.');
      lines.push('- Keep individual replies under 3 sentences to avoid monologue fatigue.');
      lines.push('- Do NOT use markdown asterisks or bullet formatting in spoken audio.');
    } else if (channel === 'phone') {
      lines.push('- You are connected via Telephony SIP phone line. Speak clearly at moderate pacing.');
      lines.push('- Avoid symbols, brackets, or code snippets.');
    } else {
      lines.push('- You are in Web Chat. Use clean, readable paragraphs with concise bullet lists when helpful.');
    }

    // Simulated State
    lines.push('\n[CONVERSATION STATE & SCHEDULE]');
    if (verifiedCaller) {
      lines.push('- Caller status: VERIFIED (Account #NW-849201, Postcode SW1A 1AA confirmed). You may disclose private balance and usage details.');
    } else {
      lines.push('- Caller status: UNVERIFIED. Do not disclose account-specific details or balances until identity is verified.');
    }

    if (isAfterHours) {
      lines.push('- Time of call: 03:15 AM (OUTSIDE OF REGULAR BUSINESS HOURS). Inform caller that specialist teams open at 08:00 AM. Offer to take a message or send an SMS link.');
    } else {
      lines.push('- Time of call: 14:30 PM (BUSINESS HOURS ACTIVE). Escalation teams and live human agents are available.');
    }

    // Role Instructions
    lines.push(`\n[ROLE INSTRUCTIONS: ${activeAgent?.name ?? 'Main'}]`);
    lines.push(getInstructionsText(activeAgent?.instructions) || 'Assist the user courteously and accurately.');

    // Persona Rules
    if (config.persona.rules) {
      lines.push('\n[GUARDRAILS & SAFETY RULES]');
      lines.push(config.persona.rules);
    }

    // Handoff rules
    if (activeAgent?.handoffs && activeAgent.handoffs.length > 0) {
      lines.push('\n[AVAILABLE HANDOFFS]');
      const handoffLabels = activeAgent.handoffs.map((h: any) => typeof h === 'string' ? h : (h.to || h.id || 'target'));
      lines.push(`You may transfer the customer to the following specialized agents: ${handoffLabels.join(', ')}.`);
    }

    return lines.join('\n');
  }, [config, channel, verifiedCaller, isAfterHours, activeAgent]);

  const wordCount = useMemo(() => {
    return compiledPrompt.trim().split(/\s+/).length;
  }, [compiledPrompt]);

  const estimatedTokens = useMemo(() => {
    return Math.round(wordCount * 1.35);
  }, [wordCount]);

  const handleCopy = () => {
    navigator.clipboard.writeText(compiledPrompt);
    toast.success('Compiled prompt copied to clipboard');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Prompt Preview (FR-12)"
      description="Inspect the exact system text and tool schemas sent to the model for any channel, time, and conversation state."
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span>Simulated preview · 0 tokens billed · 0 API cost</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleCopy}>
              <CopyIcon className="h-4 w-4" />
              Copy prompt
            </Button>
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* State and Context Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 shadow-panel">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="block text-xs font-medium text-muted">Channel</span>
              <Segmented
                size="sm"
                label="Channel"
                options={[
                  { value: 'web_chat', label: 'Web Chat' },
                  { value: 'web_voice', label: 'Web Voice' },
                  { value: 'phone', label: 'Phone' }
                ]}
                value={channel}
                onChange={(v) => setChannel(v as ChannelType)}
              />
            </div>

            {config.agents.items.length > 1 && (
              <div>
                <span className="block text-xs font-medium text-muted">Agent Role</span>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-ink"
                >
                  {config.agents.items.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.id})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedCaller}
                onChange={(e) => setVerifiedCaller(e.target.checked)}
                className="rounded border-line text-accent focus:ring-accent"
              />
              Verified caller
            </label>

            <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={isAfterHours}
                onChange={(e) => setIsAfterHours(e.target.checked)}
                className="rounded border-line text-accent focus:ring-accent"
              />
              After hours (3:15 AM)
            </label>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted">
          <div className="flex items-center gap-4">
            <span>
              Words: <strong className="text-ink">{wordCount.toLocaleString()}</strong>
            </span>
            <span>
              Est. Tokens: <strong className="text-ink">~{estimatedTokens.toLocaleString()}</strong>
            </span>
            <span>
              Tools attached: <strong className="text-ink">{activeTools.length}</strong>
            </span>
          </div>
          <StatusChip tone="neutral">Model: {config.defaults.models.llm.model}</StatusChip>
        </div>

        {/* Compiled Prompt Display */}
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
              System Instruction Text
            </h3>
            <div className="max-h-[380px] overflow-y-auto rounded-lg border border-line bg-canvas p-4 font-mono text-xs leading-relaxed text-ink select-text whitespace-pre-wrap">
              {compiledPrompt}
            </div>
          </div>

          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
              Attached Model Tool Schemas ({activeTools.length})
            </h3>
            <div className="max-h-[380px] space-y-2.5 overflow-y-auto rounded-lg border border-line bg-surface p-3">
              {activeTools.length === 0 ? (
                <p className="text-xs text-muted">No tools attached to this agent role.</p>
              ) : (
                activeTools.map((tool) => (
                  <div key={tool.id} className="rounded-md border border-line bg-canvas p-2.5 text-xs font-mono">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-accent">{tool.id}()</span>
                      <span className="rounded bg-subtle px-1.5 py-0.5 text-[10px] uppercase text-muted">
                        {tool.type}
                      </span>
                    </div>
                    <p className="mt-1 font-sans text-xs text-ink-soft">
                      {tool.description}
                    </p>
                    {tool.connection && (
                      <p className="mt-1 text-[11px] text-muted font-sans">
                        Requires: <code className="font-mono text-ink">{tool.connection}</code>
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
