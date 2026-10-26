import React, { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Path, StageId } from '../types/studio';
import { useDraftEditor } from '../hooks/useDraftEditor';
import { AgentHeader } from '../components/agent/AgentHeader';
import { BuildStage, type FocusRequest } from '../components/agent/BuildStage';
import { TestStage } from '../components/agent/TestStage';
import { ReleaseStage } from '../components/agent/ReleaseStage';
import { MonitorStage } from '../components/agent/MonitorStage';
import { NextStepBar } from '../components/agent/NextStepBar';
import { ConflictDialog } from '../components/agent/ConflictDialog';
import { PublishDialog } from '../components/agent/PublishDialog';
import { SaveFirstDialog } from '../components/agent/SaveFirstDialog';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { Button } from '../components/ui/Button';
import { useStudio } from '../contexts/StudioContext';

const stageIds: StageId[] = ['build', 'test', 'release', 'monitor'];

export function AgentWorkspace() {
  const params = useParams();
  const agentId = params.agentId ?? '';
  const stageParam = (params['*'] ?? '').split('/')[0] as StageId;
  const stage: StageId = stageIds.includes(stageParam) ? stageParam : 'build';
  const navigate = useNavigate();
  const editor = useDraftEditor(agentId);
  const { refreshAgent } = useStudio();
  const [retrying, setRetrying] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);

  const goToField = useCallback(
    (path: Path) => {
      navigate(`/agents/${agentId}/build`);
      setFocusRequest({ path, nonce: Date.now() });
    },
    [agentId, navigate]
  );

  // Publish freezes the saved draft: with unsaved edits it asks to save first.
  const { ensureSaved } = editor;
  const openPublish = useCallback(async () => {
    if (await ensureSaved('Publish')) setPublishOpen(true);
  }, [ensureSaved]);

  if (editor.agent?.loadError) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center" role="alert">
        <h1 className="text-lg font-semibold text-ink">{editor.agent.name} could not be loaded</h1>
        <p className="mt-1 text-sm text-muted">{editor.agent.loadError}</p>
        <p className="mt-1 text-sm text-muted">Nothing is shown or editable until the draft can be read from the server.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button
            variant="primary"
            disabled={retrying}
            onClick={async () => {
              setRetrying(true);
              await refreshAgent(agentId).finally(() => setRetrying(false));
            }}
          >
            {retrying ? 'Trying…' : 'Try again'}
          </Button>
          <Link to="/agents" className="inline-flex items-center px-3 text-sm font-medium text-accent hover:underline">Back to agents</Link>
        </div>
      </div>);

  }

  if (!editor.agent || !editor.config || !editor.validation) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-lg font-semibold text-ink">Agent not found</h1>
        <p className="mt-1 text-sm text-muted">There’s no agent with the id “{agentId}”, or you don’t have access to it.</p>
        <Link to="/agents" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">Back to agents</Link>
      </div>);

  }

  return (
    <div className="flex min-h-screen flex-col">
      <AgentHeader editor={editor} onPublish={openPublish} />
      <div className="flex-1">
        <ErrorBoundary fallbackTitle="An error occurred in this workspace stage">
          {stage === 'build' && <BuildStage editor={editor} focusRequest={focusRequest} />}
          {stage === 'test' && <TestStage editor={editor} onGoToField={goToField} />}
          {stage === 'release' && <ReleaseStage editor={editor} onPublish={openPublish} />}
          {stage === 'monitor' && <MonitorStage editor={editor} />}
        </ErrorBoundary>
      </div>
      <NextStepBar stage={stage} agentId={agentId} onPublish={openPublish} />
      <ConflictDialog editor={editor} />
      <SaveFirstDialog editor={editor} />
      <PublishDialog open={publishOpen} onClose={() => setPublishOpen(false)} editor={editor} onGoToField={goToField} />
    </div>);

}