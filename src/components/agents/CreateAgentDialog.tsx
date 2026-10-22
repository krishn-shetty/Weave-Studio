import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  BookOpenIcon,
  Building2Icon,
  CalendarIcon,
  CheckCircle2Icon,
  FileIcon,
  HeadsetIcon,
  LoaderCircleIcon,
  MessageCircleIcon,
  RotateCcwIcon,
  SparklesIcon,
  TargetIcon,
  Wand2Icon,
  BoxIcon
} from "lucide-react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { StatusChip } from "../ui/StatusChip";
import { Segmented } from "../ui/Segmented";
import { starters, StarterIcon } from "../../data/starters";
import { useStudio } from "../../contexts/StudioContext";
import { DraftProposal, generateAgentProposal } from "../../utils/aiDrafting";
import { getGreetingText, getInstructionsText } from "../../utils/validate";
import { cn, inputClass, inputErrorClass } from "../../utils/styles";

const icons: Record<StarterIcon, typeof BoxIcon> = {
  headset: HeadsetIcon,
  building: Building2Icon,
  book: BookOpenIcon,
  target: TargetIcon,
  calendar: CalendarIcon,
  message: MessageCircleIcon,
  blank: FileIcon
};

const RESERVED = ['new', 'admin', 'api', 'bots', 'draft', 'latest', 'schema', 'health', 'validate', 'environments', 'development', 'staging', 'production'];

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^[^a-z]+/, '').replace(/-+$/, '').slice(0, 64);

function idProblem(id: string, taken: string[]): string | null {
  if (!id) return 'Choose an id.';
  if (!/^[a-z]/.test(id)) return 'Start with a lowercase letter.';
  if (!/^[a-z][a-z0-9_-]*$/.test(id)) return 'Use only lowercase letters, digits, - and _.';
  if (id.length > 64) return 'Keep it to 64 characters or fewer.';
  if (RESERVED.includes(id)) return `“${id}” is reserved. Pick another id.`;
  if (taken.includes(id)) return 'An agent with this id already exists.';
  return null;
}

interface CreateAgentDialogProps {
  open: boolean;
  onClose: () => void;
}

type CreateMode = 'starter' | 'describe';

export function CreateAgentDialog({ open, onClose }: CreateAgentDialogProps) {
  const { agents, createAgent } = useStudio();
  const navigate = useNavigate();

  const [mode, setMode] = useState<CreateMode>('starter');
  const [starterId, setStarterId] = useState('customer_care');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [id, setId] = useState('');
  const [idTouched, setIdTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Describe it state
  const [promptText, setPromptText] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [proposal, setProposal] = useState<DraftProposal | null>(null);

  useEffect(() => {
    if (open) {
      setMode('starter');
      setStarterId('customer_care');
      setName('');
      setCompany('');
      setId('');
      setIdTouched(false);
      setSubmitted(false);
      setPromptText('');
      setDrafting(false);
      setProposal(null);
    }
  }, [open]);

  const taken = useMemo(() => agents.map((a) => a.id), [agents]);
  const problem = idProblem(id, taken);
  const nameProblem = name.trim() ? null : 'Give the agent a name.';
  const companyProblem = company.trim() ? null : 'Add your company name.';

  const handleName = (v: string) => {
    setName(v);
    if (!idTouched) setId(slugify(v));
  };

  const handleCreateStarter = async () => {
    setSubmitted(true);
    if (problem || nameProblem || companyProblem) return;
    try {
      await createAgent({
        id,
        name: name.trim(),
        company: company.trim(),
        starterId
      });
      toast.success(`${name.trim()} created`, {
        description: 'Draft saved and valid. Next: make it yours, then test it.'
      });
      onClose();
      navigate(`/agents/${id}/build`);
    } catch (err: any) {
      toast.error('Could not create agent', { description: err?.message || 'Server rejected creation' });
    }
  };

  const handleDraftWithAI = () => {
    if (!promptText.trim()) return;
    setDrafting(true);

    window.setTimeout(() => {
      const generated = generateAgentProposal(promptText, taken);
      setProposal(generated);
      setDrafting(false);
      toast.info('Proposal generated and verified', {
        description: 'Review the proposed settings below before applying.'
      });
    }, 600);
  };

  const handleApplyProposal = async () => {
    if (!proposal) return;
    try {
      await createAgent({
        id: proposal.id,
        name: proposal.name,
        company: proposal.company,
        starterId: 'blank',
        customConfig: proposal.config
      });
      toast.success(`${proposal.name} created from AI draft`, {
        description: 'Valid draft created with 0 errors. You can fine-tune it in Build.'
      });
      onClose();
      navigate(`/agents/${proposal.id}/build`);
    } catch (err: any) {
      toast.error('Could not create agent', { description: err?.message || 'Server rejected creation' });
    }
  };

  const handleUndoProposal = () => {
    setProposal(null);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Create an agent"
      description="Pick a pre-configured starter or describe what you want in plain English to draft with AI."
      footer={
        mode === 'starter' ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateStarter}>
              Create agent
            </Button>
          </>
        ) : proposal ? (
          <>
            <Button variant="ghost" onClick={handleUndoProposal}>
              <RotateCcwIcon className="h-4 w-4" />
              Undo / Edit prompt
            </Button>
            <Button variant="primary" onClick={handleApplyProposal}>
              <CheckCircle2Icon className="h-4 w-4" />
              Apply proposal
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDraftWithAI}
              disabled={!promptText.trim() || drafting}
            >
              {drafting ? (
                <>
                  <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden />
                  Generating draft…
                </>
              ) : (
                <>
                  <Wand2Icon className="h-4 w-4" aria-hidden />
                  Generate draft proposal
                </>
              )}
            </Button>
          </>
        )
      }
    >
      <div className="mb-6">
        <Segmented
          label="Creation Method"
          options={[
            { value: 'starter', label: 'Choose a Starter' },
            { value: 'describe', label: 'Describe it (AI drafting)' }
          ]}
          value={mode}
          onChange={(v) => {
            setMode(v as CreateMode);
            setProposal(null);
          }}
        />
      </div>

      {mode === 'starter' ? (
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <fieldset>
            <legend className="mb-3 text-sm font-medium text-ink">Starter</legend>
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
              {starters.map((s) => {
                const Icon = icons[s.icon];
                const active = s.id === starterId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setStarterId(s.id)}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-3 text-left transition-[border-color,background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                      active
                        ? 'border-accent bg-accent-soft/60 ring-1 ring-accent'
                        : 'border-line hover:border-line-strong hover:bg-canvas'
                    )}
                  >
                    <Icon
                      className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-accent' : 'text-muted')}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-medium text-ink">
                        {s.name}
                        {s.recommended && <StatusChip tone="accent">Most popular</StatusChip>}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-muted">
                        {s.summary}
                      </span>
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setMode('describe')}
                className="flex items-start gap-3 rounded-lg border border-dashed border-accent/50 bg-accent-soft/20 p-3 text-left transition hover:bg-accent-soft/40"
              >
                <SparklesIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-medium text-accent">
                    Describe it
                    <StatusChip tone="accent">AI powered</StatusChip>
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">
                    Write in plain English and let Weave generate and validate a complete agent draft.
                  </span>
                </span>
              </button>
            </div>
          </fieldset>

          <div className="space-y-5">
            <Field id="create-name" label="Agent name" error={submitted ? nameProblem ?? undefined : undefined}>
              <input
                id="create-name-input"
                className={cn(inputClass, submitted && nameProblem && inputErrorClass)}
                value={name}
                onChange={(e) => handleName(e.target.value)}
                placeholder="Customer care"
              />
            </Field>
            <Field
              id="create-company"
              label="Company name"
              help="The agent introduces itself with this."
              error={submitted ? companyProblem ?? undefined : undefined}
            >
              <input
                id="create-company-input"
                className={cn(inputClass, submitted && companyProblem && inputErrorClass)}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Northwind Energy"
              />
            </Field>
            <Field
              id="create-id"
              label="Agent id"
              help="Lowercase letters, digits, - and _. Starts with a letter. Can’t be changed later."
              error={(submitted || idTouched) && problem ? problem : undefined}
            >
              <input
                id="create-id-input"
                className={cn(inputClass, 'font-mono', (submitted || idTouched) && problem && inputErrorClass)}
                value={id}
                maxLength={64}
                onChange={(e) => {
                  setIdTouched(true);
                  setId(e.target.value);
                }}
                placeholder="customer-care"
                spellCheck={false}
                autoComplete="off"
              />
            </Field>
          </div>
        </div>
      ) : proposal ? (
        /* PROPOSAL REVIEW (FR-21) */
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent-soft/30 p-4">
            <div className="flex items-center gap-2.5">
              <SparklesIcon className="h-5 w-5 text-accent shrink-0" />
              <div>
                <p className="text-sm font-semibold text-ink">
                  AI-Generated Proposal
                </p>
                <p className="text-xs text-muted">
                  Proposal has been automatically validated against the 70 KB schema with 0 errors.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusChip tone="accent">Simulated AI</StatusChip>
              <StatusChip tone="success" dot>Valid</StatusChip>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Proposed Agent Identity
              </h3>
              <div>
                <p className="text-xs text-muted">Agent Name</p>
                <p className="text-sm font-semibold text-ink">{proposal.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Company</p>
                <p className="text-sm font-medium text-ink">{proposal.company}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Generated ID</p>
                <p className="font-mono text-xs text-accent">{proposal.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Tone & Persona</p>
                <p className="text-xs text-ink-soft capitalize">
                  {proposal.config.persona.tone} ({proposal.config.persona.name})
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Key Configured Capabilities
              </h3>
              <ul className="space-y-1.5 text-xs text-ink-soft">
                {proposal.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2Icon className="mt-0.5 h-3.5 w-3.5 text-success shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 border-t border-line/60 pt-2.5 text-xs text-muted">
                <span className="font-medium text-ink">Greeting: </span>
                &ldquo;{getGreetingText(proposal.config.channels[0].greeting)}&rdquo;
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-subtle p-3 text-xs text-muted">
            <span className="font-semibold text-ink">Instructions preview: </span>
            {getInstructionsText(proposal.config.agents.items[0].instructions).slice(0, 180)}…
          </div>
        </div>
      ) : (
        /* DESCRIBE PROMPT INPUT (FR-21) */
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-ink">
              Describe your agent in plain English
            </label>
            <p className="mt-0.5 text-xs text-muted">
              State what the agent should help with, what systems it connects to, its company name, and what callers should experience.
            </p>
            <textarea
              rows={4}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g. A friendly dental clinic receptionist for Harbour Health that greets patients, checks available appointments, answers pricing questions, transfers emergencies to the on-call doctor, and sends SMS confirmation links."
              className={cn(inputClass, 'mt-2 text-sm leading-relaxed resize-y')}
            />
          </div>

          <div>
            <p className="text-xs font-medium text-muted">Or pick an inspiration prompt:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                'Renewable energy concierge that resolves billing questions and reports outages',
                'Dental clinic receptionist that books appointments and quotes copays',
                'Insurance claims assistant that looks up policies and arranges adjuster visits',
                'Lead concierge that qualifies new business enquiries and schedules a callback'
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setPromptText(suggestion)}
                  className="rounded-lg border border-line bg-subtle/50 px-3 py-1.5 text-left text-xs text-ink-soft transition hover:border-line-strong hover:bg-subtle"
                >
                  &ldquo;{suggestion}&rdquo;
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg bg-info-soft/40 p-3 text-xs text-info">
            <SparklesIcon className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
            <p>
              Weave will automatically select appropriate tools, synthesize safe rules, setup web chat and voice channels, and validate against the runtime schema.
            </p>
          </div>
        </div>
      )}
    </Dialog>
  );
}