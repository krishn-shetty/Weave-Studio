import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  BookOpenIcon,
  Building2Icon,
  CalendarIcon,
  FileIcon,
  HeadsetIcon,
  LoaderCircleIcon,
  MessageCircleIcon,
  TargetIcon,
  BoxIcon
} from "lucide-react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { StatusChip } from "../ui/StatusChip";
import { starters, StarterIcon } from "../../data/starters";
import { useStudio } from "../../contexts/StudioContext";
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

export function CreateAgentDialog({ open, onClose }: CreateAgentDialogProps) {
  const { agents, createAgent } = useStudio();
  const navigate = useNavigate();

  const [starterId, setStarterId] = useState('customer_care');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [id, setId] = useState('');
  const [idTouched, setIdTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setStarterId('customer_care');
      setName('');
      setCompany('');
      setId('');
      setIdTouched(false);
      setSubmitted(false);
      setCreating(false);
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
    setCreating(true);
    try {
      await createAgent({
        id,
        name: name.trim(),
        company: company.trim(),
        starterId
      });
      toast.success(`${name.trim()} created`, {
        description: 'Draft saved. Next: make it yours, then test it.'
      });
      onClose();
      navigate(`/agents/${id}/build`);
    } catch (err: any) {
      toast.error('Could not create agent', { description: err?.message || 'Server rejected creation' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Create an agent"
      description="Pick a starter, name it, and Studio saves a first draft you can change."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateStarter} disabled={creating}>
            {creating ? (
              <>
                <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden />
                Creating…
              </>
            ) : (
              'Create agent'
            )}
          </Button>
        </>
      }
    >
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
    </Dialog>
  );
}