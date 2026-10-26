import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronRightIcon, CircleAlertIcon, CircleCheckIcon, CircleDotIcon, EyeIcon, LoaderCircleIcon, Redo2Icon, RocketIcon, SaveIcon, Undo2Icon } from 'lucide-react';
import type { StageId } from '../../types/studio';
import type { DraftEditor } from '../../hooks/useDraftEditor';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { StatusChip } from '../ui/StatusChip';
import { PromptPreviewModal } from './build/PromptPreviewModal';
import { currentDeployments, environments, envLabel, latestVersion } from '../../utils/agentStatus';
import { formatClock } from '../../utils/format';
import { cn } from '../../utils/styles';

const stages: {id: StageId;label: string;}[] = [
{ id: 'build', label: 'Build' },
{ id: 'test', label: 'Test' },
{ id: 'release', label: 'Release' },
{ id: 'monitor', label: 'Monitor' }];


interface AgentHeaderProps {
  editor: DraftEditor;
  onPublish: () => void;
}

export function AgentHeader({ editor, onPublish }: AgentHeaderProps) {
  const { can } = useAuth();
  const [previewOpen, setPreviewOpen] = useState(false);
  const agent = editor.agent;
  if (!agent) return null;
  const latest = latestVersion(agent);
  const current = currentDeployments(agent);
  const live = environments.filter((e) => current[e]);
  const view = editor.validationView;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 py-3.5 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{editor.config?.meta?.name || agent.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted" aria-live="polite">
              <SaveIndicator editor={editor} />
              <span aria-hidden className="text-line-strong">|</span>
              {view.status === 'checked' && view.report ?
              view.report.valid ?
              <StatusChip tone="success" dot>Checks pass</StatusChip> :

              <StatusChip tone="danger" dot>
                    {view.report.errors.length} {view.report.errors.length === 1 ? 'problem' : 'problems'}
                  </StatusChip> :

              view.status === 'failed' ?
              <span className="text-warning" title={view.error ?? undefined}>Could not check</span> :
              <span className="text-muted">Checking…</span>
              }
              <span aria-hidden className="text-line-strong">|</span>
              <span>{latest ? <>Latest <span className="font-mono text-ink">{latest.version}</span></> : 'Not published yet'}</span>
              <span aria-hidden className="text-line-strong">|</span>
              <span>{live.length ? `Live in ${live.map(envLabel).join(', ')}` : 'Not live anywhere'}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 border-r border-line pr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={editor.undo}
                disabled={!editor.canUndo || !editor.canEdit}
                title="Undo (Ctrl+Z)"
              >
                <Undo2Icon className="h-4 w-4" aria-hidden />
                <span className="sr-only">Undo</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={editor.redo}
                disabled={!editor.canRedo || !editor.canEdit}
                title="Redo (Ctrl+Y)"
              >
                <Redo2Icon className="h-4 w-4" aria-hidden />
                <span className="sr-only">Redo</span>
              </Button>
            </div>

            {editor.canEdit &&
            <Button
              variant={editor.dirty ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => void editor.save()}
              disabled={!editor.canSave}
              aria-keyshortcuts="Control+S Meta+S"
              title={editor.parseError ? `The JSON view has text that is not valid JSON: ${editor.parseError}` : editor.canSave ? 'Save the draft (Ctrl+S / ⌘S)' : 'Nothing to save'}>
                {editor.saveState === 'saving' ? <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden /> : <SaveIcon className="h-4 w-4" aria-hidden />}
                {editor.saveState === 'saving' ? 'Saving…' : 'Save'}
              </Button>
            }

            {editor.config && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPreviewOpen(true)}
                title="See exact compiled model instructions for any channel or state"
              >
                <EyeIcon className="h-4 w-4 text-accent" aria-hidden />
                Preview prompt
              </Button>
            )}

            <Button
              variant={editor.dirty ? 'secondary' : 'primary'}
              onClick={onPublish}
              disabled={!can('publish')}
              title={can('publish') ? 'Freeze the saved draft as a numbered version' : 'Viewers can’t publish'}>
              <RocketIcon className="h-4 w-4" aria-hidden />
              Publish
            </Button>
          </div>
        </div>
        <nav aria-label="Agent stages" className="mt-3 flex items-center gap-1 overflow-x-auto">
          {stages.map((s, i) =>
          <React.Fragment key={s.id}>
              <NavLink
              to={`/agents/${agent.id}/${s.id}`}
              className={({ isActive }) =>
              cn(
                '-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                isActive ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
              )
              }>
              
                {s.label}
              </NavLink>
              {i < stages.length - 1 && <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-line-strong" aria-hidden />}
            </React.Fragment>
          )}
        </nav>
      </div>
      {editor.config && (
        <PromptPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          config={editor.config}
        />
      )}
    </header>);

}

function SaveIndicator({ editor }: {editor: DraftEditor;}) {
  if (!editor.canEdit) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <EyeIcon className="h-3.5 w-3.5" aria-hidden />
        Read only
      </span>);

  }
  const { saveState } = editor;
  if (saveState === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" aria-hidden />
        {editor.saveLabel}
      </span>);

  }
  if (saveState === 'conflict' || saveState === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-danger" title={editor.saveError ?? undefined}>
        <CircleAlertIcon className="h-3.5 w-3.5" aria-hidden />
        {editor.saveLabel}{editor.saveError ? `: ${editor.saveError}` : ''}
      </span>);

  }
  if (editor.dirty) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-warning">
        <CircleDotIcon className="h-3.5 w-3.5" aria-hidden />
        {editor.saveLabel}
      </span>);

  }
  return (
    <span className="inline-flex items-center gap-1.5" title={`Draft revision ${editor.baseRevision}`}>
      <CircleCheckIcon className="h-3.5 w-3.5 text-success" aria-hidden />
      {editor.saveLabel}{editor.savedAt ? ` ${formatClock(editor.savedAt)}` : ''}
    </span>);

}
