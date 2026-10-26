import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../ui/Toast';
import { CircleAlertIcon, CircleCheckIcon, KeyRoundIcon, TriangleAlertIcon } from 'lucide-react';
import type { Path, VersionBump } from '../../types/studio';
import type { DraftEditor } from '../../hooks/useDraftEditor';
import { useStudio } from '../../contexts/StudioContext';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { bumpVersion } from '../../utils/format';
import { describePath } from '../../utils/validate';
import { draftChangeCount, latestVersion, missingSecrets } from '../../utils/agentStatus';
import { cn } from '../../utils/styles';

interface PublishDialogProps {
  open: boolean;
  onClose: () => void;
  editor: DraftEditor;
  onGoToField: (path: Path) => void;
}

const bumps: {value: VersionBump;label: string;text: string;}[] = [
{ value: 'patch', label: 'Patch', text: 'Small fixes: wording, a greeting, a typo.' },
{ value: 'minor', label: 'Minor', text: 'New behaviour: a tool, a channel, new instructions.' },
{ value: 'major', label: 'Major', text: 'A big rework that changes how callers are handled.' }];


export function PublishDialog({ open, onClose, editor, onGoToField }: PublishDialogProps) {
  const { publish } = useStudio();
  const navigate = useNavigate();
  const agent = editor.agent;
  const [bump, setBump] = useState<VersionBump>('minor');
  const [published, setPublished] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPublished(null);
      setBump(agent?.versions.length ? 'patch' : 'minor');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const latest = agent ? latestVersion(agent) : undefined;
  const report = editor.validation;
  const missing = useMemo(() => report ? missingSecrets(report.secrets_required) : [], [report]);
  const changes = agent ? draftChangeCount(agent) : 0;
  if (!agent || !report || !editor.config) return null;

  const handlePublish = () => {
    const res = publish(agent.id, bump);
    if (!res.ok) {
      toast.error('This draft can’t be published', { description: `${res.errors.length} problems need fixing first.` });
      return;
    }
    setPublished(res.version.version);
    toast.success(`Published ${res.version.version}`, { description: 'The version is frozen. Deploy it when you are ready.' });
  };

  if (published) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        title={`Version ${published} is published`}
        footer={
        <>
            <Button variant="ghost" onClick={onClose}>Done</Button>
            <Button
            variant="primary"
            onClick={() => {
              onClose();
              navigate(`/agents/${agent.id}/release?deploy=${published}`);
            }}>
            
              Deploy {published}
            </Button>
          </>
        }>
        
        <div className="flex gap-3">
          <CircleCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
          <p className="text-sm leading-relaxed text-ink-soft">
            It’s frozen and can’t change. Your draft has moved on to <span className="font-mono text-ink">{bumpVersion(published, 'patch')}</span>, so you can keep editing safely. Nothing is live until you deploy.
          </p>
        </div>
      </Dialog>);

  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={report.valid ? 'Publish a new version' : 'This draft can’t be published yet'}
      description={
      report.valid ?
      `Freezes the saved draft (revision ${editor.baseRevision}). ${!latest ? 'This will be the first version.' : changes === null ? `Changes since ${latest.version} could not be counted.` : `${changes} ${changes === 1 ? 'change' : 'changes'} since ${latest.version}.`}` :
      'Saving always works, but publishing needs a draft with no errors. Fix these and try again.'
      }
      footer={
      report.valid ?
      <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handlePublish}>
              Publish {bumpVersion(latest?.version, bump)}
            </Button>
          </> :

      <Button variant="secondary" onClick={onClose}>Close</Button>

      }>
      
      {!report.valid ?
      <ul className="divide-y divide-line rounded-lg border border-line">
          {report.errors.map((e, i) =>
        <li key={i} className="flex items-start gap-3 px-3 py-3">
              <CircleAlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
              <div className="min-w-0 flex-1">
                {e.path && <p className="text-xs font-medium text-muted">{describePath(e.path, editor.config!)}</p>}
                <p className="text-sm text-ink">{e.message}</p>
              </div>
              {e.path &&
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              onClose();
              onGoToField(e.path!);
            }}>
            
                  Go to field
                </Button>
          }
            </li>
        )}
        </ul> :

      <div className="space-y-6">
          <fieldset>
            <legend className="text-sm font-medium text-ink">What kind of change is this?</legend>
            <div role="radiogroup" className="mt-2 grid gap-2 sm:grid-cols-3">
              {bumps.map((b) => {
              const active = b.value === bump;
              return (
                <button
                  key={b.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setBump(b.value)}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-[border-color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                    active ? 'border-accent bg-accent-soft/60 ring-1 ring-accent' : 'border-line hover:border-line-strong'
                  )}>
                  
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-ink">{b.label}</span>
                      <span className="font-mono text-xs text-accent">{bumpVersion(latest?.version, b.value)}</span>
                    </span>
                    <span className="mt-1 block text-[13px] leading-snug text-muted">{b.text}</span>
                  </button>);

            })}
            </div>
          </fieldset>

          {report.warnings.length > 0 &&
        <section>
              <h3 className="text-sm font-medium text-ink">Worth a look before you publish</h3>
              <p className="text-[13px] text-muted">Warnings never block publishing.</p>
              <ul className="mt-2 space-y-1.5">
                {report.warnings.map((w, i) =>
            <li key={i} className="flex items-start gap-2 text-[13px] text-ink-soft">
                    <TriangleAlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                    {w.message}
                  </li>
            )}
              </ul>
            </section>
        }

          <section>
            <h3 className="text-sm font-medium text-ink">Secrets this version needs on the server</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {report.secrets_required.map((s) =>
            <li
              key={s}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs',
                missing.includes(s) ? 'border-warning/30 bg-warning-soft text-warning' : 'border-line text-ink-soft'
              )}>
              
                  <KeyRoundIcon className="h-3 w-3" aria-hidden />
                  {s}
                  {missing.includes(s) && <span className="font-sans">· missing</span>}
                </li>
            )}
            </ul>
            {missing.length > 0 && <p className="mt-2 text-[13px] text-muted">You can still publish. Calls will fail until an admin adds the missing secrets on the server.</p>}
          </section>
        </div>
      }
    </Dialog>);

}