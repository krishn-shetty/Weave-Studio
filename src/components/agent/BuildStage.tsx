import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileJsonIcon } from 'lucide-react';
import type { EditorView, Path } from '../../types/studio';
import type { DraftEditor } from '../../hooks/useDraftEditor';
import type { SettingGroupId } from '../../data/settingsCatalog';
import { Segmented } from '../ui/Segmented';
import { Button } from '../ui/Button';
import { GuidedView } from './build/GuidedView';
import { DetailedView } from './build/DetailedView';
import { JsonView } from './build/JsonView';
import { WorkflowCanvas } from './build/WorkflowCanvas';
import { ValidationPanel } from './ValidationPanel';
import { ConcurrentEditBanner } from './ConcurrentEditBanner';
import { ImportExportModal } from './build/ImportExportModal';
import { fieldId } from '../../utils/path';

export interface FocusRequest {
  path: Path;
  nonce: number;
}

interface BuildStageProps {
  editor: DraftEditor;
  focusRequest: FocusRequest | null;
}

const views: {value: EditorView;label: string;}[] = [
  { value: 'guided', label: 'Guided' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'canvas', label: 'Workflow' },
  { value: 'json', label: 'JSON' }
];

function highlight(path: Path, minLength: number): boolean {
  for (let len = path.length; len >= minLength && len > 0; len--) {
    const el = document.getElementById(fieldId(path.slice(0, len)));
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.querySelector<HTMLElement>('input, textarea, select, button')?.focus({ preventScroll: true });
      el.classList.add('ring-2', 'ring-danger/40', 'ring-offset-4');
      window.setTimeout(() => el.classList.remove('ring-2', 'ring-danger/40', 'ring-offset-4'), 1800);
      return true;
    }
  }
  return false;
}

export function BuildStage({ editor, focusRequest }: BuildStageProps) {
  const [params, setParams] = useSearchParams();
  const view = (views.some((v) => v.value === params.get('view')) ? params.get('view') : 'guided') as EditorView;
  const [detailedGroup, setDetailedGroup] = useState<SettingGroupId | null>(null);
  const [importExportOpen, setImportExportOpen] = useState(false);

  const setView = useCallback(
    (v: EditorView) => {
      const next = new URLSearchParams(params);
      if (v === 'guided') next.delete('view');else
      next.set('view', v);
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  const focusPath = useCallback(
    (path: Path) => {
      if (view !== 'json' && highlight(path, Math.min(path.length, 2))) return;
      setView('detailed');
      window.setTimeout(() => highlight(path, 1), 120);
    },
    [view, setView]
  );

  useEffect(() => {
    if (!focusRequest) return;
    const t = window.setTimeout(() => focusPath(focusRequest.path), 60);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.nonce]);

  if (!editor.config || !editor.agent) return null;

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-10">
      <ConcurrentEditBanner editor={editor} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Segmented label="Editor view" options={views} value={view} onChange={setView} />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setImportExportOpen(true)}
            title="Import or Export JSON configuration"
          >
            <FileJsonIcon className="h-3.5 w-3.5 mr-1" />
            Import / Export
          </Button>
        </div>
        <p className="text-[13px] text-muted">One draft, three views. A change in one shows up in the others.</p>
      </div>

      <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {view === 'guided' &&
          <GuidedView
            editor={editor}
            onMore={(g) => {
              setDetailedGroup(g);
              setView('detailed');
            }} />

          }
          {view === 'detailed' && <DetailedView editor={editor} initialGroup={detailedGroup} onOpenJson={() => setView('json')} />}
          {view === 'canvas' && (
            <WorkflowCanvas
              editor={editor}
              onGoToDetailedGroup={(g) => {
                setDetailedGroup(g as SettingGroupId);
                setView('detailed');
              }}
            />
          )}
          {view === 'json' && <JsonView editor={editor} />}
        </div>
        <aside className="self-start xl:sticky xl:top-44">
          <ValidationPanel
            view={editor.validationView}
            config={editor.config}
            onGoTo={focusPath}
          />
        </aside>
      </div>

      <ImportExportModal
        open={importExportOpen}
        onClose={() => setImportExportOpen(false)}
        agent={editor.agent}
        currentConfig={editor.config}
        onConfigImported={editor.replaceConfig}
      />

    </div>);

}