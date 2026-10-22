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

const stageIds: StageId[] = ['build', 'test', 'release', 'monitor'];

export function AgentWorkspace() {
  const params = useParams();
  const agentId = params.agentId ?? '';
  const stageParam = (params['*'] ?? '').split('/')[0] as StageId;
  const stage: StageId = stageIds.includes(stageParam) ? stageParam : 'build';
  const navigate = useNavigate();
  const editor = useDraftEditor(agentId);
  const [publishOpen, setPublishOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);

  const goToField = useCallback(
    (path: Path) => {
      navigate(`/agents/${agentId}/build`);
      setFocusRequest({ path, nonce: Date.now() });
    },
    [agentId, navigate]
  );

  const openPublish = useCallback(() => {
    editor.flush();
    setPublishOpen(true);
  }, [editor]);

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
        {stage === 'build' && <BuildStage editor={editor} focusRequest={focusRequest} />}
        {stage === 'test' && <TestStage editor={editor} onGoToField={goToField} />}
        {stage === 'release' && <ReleaseStage editor={editor} onPublish={openPublish} />}
        {stage === 'monitor' && <MonitorStage editor={editor} />}
      </div>
      <NextStepBar stage={stage} agentId={agentId} onPublish={openPublish} />
      <ConflictDialog editor={editor} />
      <PublishDialog open={publishOpen} onClose={() => setPublishOpen(false)} editor={editor} onGoToField={goToField} />
    </div>);

}