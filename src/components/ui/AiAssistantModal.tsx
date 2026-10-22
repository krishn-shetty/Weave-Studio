import React, { useState } from 'react';
import { toast } from 'sonner';
import { BotIcon, CheckIcon, CornerDownLeftIcon, SparklesIcon, UndoIcon, Wand2Icon } from 'lucide-react';
import type { AgentConfig, Issue } from '../../types/studio';
import { Dialog } from './Dialog';
import { Button } from './Button';

export interface AiAssistantContext {
  mode: 'explain' | 'fix_error' | 'summarise_call';
  settingName?: string;
  settingDescription?: string;
  error?: Issue;
  callTranscript?: string;
  currentConfig?: AgentConfig;
  onApplyFix?: (patchedConfig: AgentConfig) => void;
}

interface AiAssistantModalProps {
  open: boolean;
  onClose: () => void;
  context: AiAssistantContext | null;
}

export function AiAssistantModal({ open, onClose, context }: AiAssistantModalProps) {
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!context) return null;

  const handleApplyFix = () => {
    if (!context.currentConfig || !context.onApplyFix) return;
    setLoading(true);

    setTimeout(() => {
      // Create intelligent patch for demo/prototype based on error
      const patched = structuredClone(context.currentConfig!);
      if (context.error?.message.includes('not a declared tools id')) {
        // Add tool to declared tools or fix agent tool array
        if (!patched.tools.some((t) => t.id === 'lookup')) {
          patched.tools.push({
            id: 'lookup',
            type: 'http',
            description: 'Customer data lookup API',
          });
        }
      } else if (context.error?.message.includes('recording')) {
        patched.persona.recording_notice = true;
      } else if (context.error?.message.includes('timeout')) {
        patched.defaults.conversation.inactivity_timeout_s = 45;
      } else {
        patched.persona.rules = `${patched.persona.rules} Always verify caller identity before answering account inquiries.`.trim();
      }

      context.onApplyFix!(patched);
      setApplied(true);
      setLoading(false);
      toast.success('AI suggestion applied to draft', {
        description: 'You can press Ctrl+Z to undo anytime.',
      });
      onClose();
    }, 450);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={
        context.mode === 'explain'
          ? `Explain Setting · ${context.settingName ?? 'Setting'}`
          : context.mode === 'fix_error'
          ? 'AI Proposed Fix for Validation Error'
          : 'AI Call Summary & Prompt Improvement'
      }
      description="In-context AI assistance provided through the enterprise gateway LLM route."
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span className="rounded bg-accent-soft px-1.5 py-0.5 font-semibold text-accent flex items-center gap-1">
              <SparklesIcon className="h-3 w-3" />
              AI Proposal
            </span>
            <span>Spend cap: $0.00 / $5.00 · Rate limit: 48/60 left</span>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            {context.mode === 'fix_error' && context.onApplyFix && (
              <Button variant="primary" onClick={handleApplyFix} disabled={loading || applied}>
                <CheckIcon className="h-3.5 w-3.5 mr-1" />
                {applied ? 'Applied' : 'Apply fix to draft'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {context.mode === 'explain' && (
          <div className="space-y-3">
            <div className="rounded-lg border border-line bg-subtle/40 p-3.5">
              <span className="font-semibold text-ink text-sm block mb-1">
                {context.settingName ?? 'Configuration Field'}
              </span>
              <p className="text-ink-soft leading-relaxed">
                {context.settingDescription ??
                  'This parameter governs runtime conversational behavior and speech model synthesis.'}
              </p>
            </div>

            <div className="rounded-lg border border-line bg-surface p-3 space-y-2">
              <p className="font-semibold text-ink">Recommended Best Practice:</p>
              <p className="text-ink-soft">
                For customer support and telephony lines, keep response tokens concise (under 80 words per turn) and maintain latency below 800ms.
              </p>
              <div className="pt-2 border-t border-line text-muted">
                <strong>Cost awareness:</strong> Voice synthesis cost is determined by character count (~$0.015 / 1k characters). Shorter responses reduce speech provider API expenses.
              </div>
            </div>
          </div>
        )}

        {context.mode === 'fix_error' && (
          <div className="space-y-3">
            <div className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-danger">
              <span className="font-semibold block mb-0.5">Reported Issue:</span>
              <p>{context.error?.message ?? 'Configuration validation failed.'}</p>
            </div>

            <div className="rounded-lg border border-line bg-surface p-3.5 space-y-2">
              <span className="font-semibold text-ink flex items-center gap-1.5">
                <Wand2Icon className="h-4 w-4 text-accent" />
                Proposed Solution:
              </span>
              <p className="text-ink-soft leading-relaxed">
                {context.error?.message.includes('tools')
                  ? 'The agent role references a tool ID that was not declared in the top-level tools array. We will declare the tool in `tools` or align the reference.'
                  : context.error?.message.includes('recording')
                  ? 'Turn on `recording_notice: true` in `persona` to notify inbound callers and satisfy telecom compliance requirements.'
                  : 'Adjust the configuration field to conform to schema draft 2020-12 specifications.'}
              </p>

              <div className="mt-2 rounded bg-canvas p-2.5 font-mono text-[11px] border border-line text-ink">
                <span className="text-success">+ Apply safe declarative fix</span>
              </div>
            </div>

            <p className="text-muted text-[11px]">
              Note: This change will be applied directly to your working draft with complete Undo (Ctrl+Z) support.
            </p>
          </div>
        )}

        {context.mode === 'summarise_call' && (
          <div className="space-y-3">
            <div className="rounded-lg border border-line bg-subtle/50 p-3.5 space-y-1.5">
              <span className="font-semibold text-ink block">Call Diagnostic Summary:</span>
              <p className="text-ink-soft leading-relaxed">
                The caller inquired about tracking order #82910. The assistant successfully verified the postal code, but hesitated on estimated delivery date before handing over to human escalation.
              </p>
            </div>

            <div className="rounded-lg border border-accent/30 bg-accent-soft/30 p-3.5 space-y-2">
              <span className="font-semibold text-accent block">Prompt Enhancement Recommendation:</span>
              <p className="text-ink-soft">
                Add the following rule to your Persona instructions:
              </p>
              <div className="rounded bg-surface p-2.5 font-mono text-[11px] border border-line text-ink">
                "When order tracking status shows 'Out for delivery', proactively inform the caller that delivery is scheduled before 5:00 PM local time before asking if they need additional assistance."
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
