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
import { botIdProblem, freeBotId } from "../../models/setup";
import { startSetup } from "../../utils/setupProgress";
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
  // The id is made from the name and is always free ("-2" when taken); it can be changed under Advanced.
  const effectiveId = idTouched ? id : name.trim() ? freeBotId(name, taken) : '';
  const problem = effectiveId ? botIdProblem(effectiveId, taken) || null : name.trim() ? 'Give it an id.' : null;
  const nameProblem = name.trim() ? null : 'Give the agent a name.';
  const companyProblem = null;

  const handleName = (v: string) => setName(v);

  const handleCreateStarter = async () => {
    setSubmitted(true);
    if (problem || nameProblem || companyProblem) return;
    setCreating(true);
    try {
      await createAgent({
        id: effectiveId,
        name: name.trim(),
        company: company.trim(),
        starterId
      });
      toast.success(`${name.trim()} created`, {
        description: 'Next: a few steps to make it yours, try it and put it live.'
      });
      startSetup(effectiveId);
      onClose();
      navigate(`/agents/${effectiveId}/setup/purpose`);
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
      description="Pick a starter and name it. The server makes the agent, and a few steps make it yours."
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
            label="Company name (optional)"
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
          <details className="rounded-lg border border-line px-3 py-2" open={idTouched || (submitted && !!problem)}>
            <summary className="cursor-pointer text-[13px] font-medium text-ink-soft">Advanced</summary>
            <Field
              id="create-id"
              label="Agent id"
              help="Made from the name. Lowercase letters, digits, - and _; starts with a letter. Can’t be changed later."
              error={(submitted || idTouched) && problem ? problem : undefined}
              className="mt-2"
            >
              <input
                id="create-id-input"
                className={cn(inputClass, 'font-mono', (submitted || idTouched) && problem && inputErrorClass)}
                value={effectiveId}
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
          </details>
        </div>
      </div>
    </Dialog>
  );
}