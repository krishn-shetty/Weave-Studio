import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleAlertIcon, PhoneIcon } from 'lucide-react';
import type { DraftEditor } from '../../hooks/useDraftEditor';
import { isWebChannel, type Path } from '../../types/studio';
import { useTestSession } from '../../hooks/useTestSession';
import { TestConsole } from './test/TestConsole';
import { TracePanel } from './test/TracePanel';
import { ScenariosRunner } from './test/ScenariosRunner';
import { VoiceReadinessPanel } from './test/VoiceReadinessPanel';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import { describePath } from '../../utils/validate';

interface TestStageProps {
  editor: DraftEditor;
  onGoToField: (path: Path) => void;
}

export function TestStage({ editor, onGoToField }: TestStageProps) {
  const navigate = useNavigate();
  const config = editor.config!;
  const validation = editor.validation!;
  const session = useTestSession(editor.agent!.id, config, editor.baseRevision);
  const hasWebChannel = (config.channels ?? []).some((c) => c.enabled && isWebChannel(c.type));

  let blocker: React.ReactNode = null;
  if (!validation.valid) {
    blocker = (
      <Blocker
        icon={<CircleAlertIcon className="h-5 w-5 text-danger" aria-hidden />}
        title={`Fix ${validation.errors.length} ${validation.errors.length === 1 ? 'problem' : 'problems'} before testing`}
        body="A draft with errors can’t start a conversation. Each problem links to the setting."
      >
        <ul className="mt-4 w-full max-w-md divide-y divide-line rounded-lg border border-line text-left">
          {validation.errors.map((e, i) => (
            <li key={i} className="flex items-start justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                {e.path && <p className="text-xs text-muted">{describePath(e.path, config)}</p>}
                <p className="text-[13px] text-ink">{e.message}</p>
              </div>
              {e.path && (
                <Button size="sm" variant="secondary" onClick={() => onGoToField(e.path!)}>
                  Fix
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Blocker>
    );
  } else if (!hasWebChannel) {
    blocker = (
      <Blocker
        icon={<PhoneIcon className="h-5 w-5 text-muted" aria-hidden />}
        title="This agent is phone only"
        body="Testing in Studio uses web chat or web voice. Turn one of them on under Where it is available — you can keep it off in production."
      >
        <Button variant="secondary" className="mt-4" onClick={() => navigate(`/agents/${editor.agent!.id}/build`)}>
          Go to Build
        </Button>
      </Blocker>
    );
  }

  const [activeTab, setActiveTab] = React.useState<'live' | 'readiness' | 'scenarios'>('live');

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Segmented
          label="Test Mode"
          options={[
            { value: 'live', label: 'Live Conversation' },
            { value: 'readiness', label: 'Voice Readiness' },
            { value: 'scenarios', label: 'Automated Scenarios' },
          ]}
          value={activeTab}
          onChange={(v) => setActiveTab(v as 'live' | 'readiness' | 'scenarios')}
        />
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span>Tests execute against saved revision rev {editor.baseRevision}</span>
        </div>
      </div>

      {activeTab === 'live' ? (
        blocker ?? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <TestConsole
              session={session}
              config={config}
              revision={editor.baseRevision}
              onBeforeStart={editor.flush}
              hasUnsaved={editor.status === 'unsaved'}
            />
            <div className="lg:max-h-[640px]">
              <TracePanel trace={session.trace} />
            </div>
          </div>
        )
      ) : activeTab === 'readiness' ? (
        <VoiceReadinessPanel botId={editor.agent!.id} config={config} />
      ) : (
        <ScenariosRunner agentId={editor.agent!.id} />
      )}
    </div>
  );
}

interface BlockerProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}

function Blocker({ icon, title, body, children }: BlockerProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-line bg-surface px-6 py-14 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-subtle">{icon}</span>
      <h2 className="mt-4 text-base font-semibold text-ink">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted">{body}</p>
      {children}
    </div>
  );
}