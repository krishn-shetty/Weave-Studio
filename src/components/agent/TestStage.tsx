import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { usesGateway } from '../../models/bankingTools';
import { useGatewayTimeline } from '../../hooks/useGatewayTimeline';
import { CustomerChannelPanel } from '../banking/CustomerChannelPanel';
import { AgentSelector } from './test/AgentSelector';

interface TestStageProps {
  editor: DraftEditor;
  onGoToField: (path: Path) => void;
}

export function TestStage({ editor, onGoToField }: TestStageProps) {
  const navigate = useNavigate();
  const config = editor.config!;
  const validation = editor.validationView.report;
  const session = useTestSession(editor.agent!.id, config, editor.baseRevision);
  const hasWebChannel = (config.channels ?? []).some((c) => c.enabled && isWebChannel(c.type));
  // Drafts wired to the banking gateway get the caller's banking surfaces and the gateway's own timeline.
  const banking = usesGateway(config);
  const gatewayTrace = useGatewayTimeline(session.room, session.startedAt, banking);
  const trace = React.useMemo(
    () => (gatewayTrace.length ? [...session.trace, ...gatewayTrace].sort((a, b) => a.at_ms - b.at_ms) : session.trace),
    [session.trace, gatewayTrace]
  );

  let blocker: React.ReactNode = null;
  // The server's checks inform; the server itself refuses a session for a draft it cannot run (and says why).
  const problems = validation && !validation.valid ? (
      <div role="status" className="mb-4 rounded-xl border border-danger/30 bg-danger-soft/40 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <CircleAlertIcon className="h-4 w-4 text-danger" aria-hidden />
          The server’s checks found {validation.errors.length} {validation.errors.length === 1 ? 'problem' : 'problems'}. It may refuse to start a test until they are fixed.
        </p>
        <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-surface text-left">
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
      </div>
    ) : null;
  if (!hasWebChannel) {
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

  // A readiness step about the tests opens the scenarios (?focus=scenarios).
  const [params] = useSearchParams();
  const [activeTab, setActiveTab] = React.useState<'live' | 'readiness' | 'scenarios'>(params.get('focus') === 'scenarios' ? 'scenarios' : 'live');

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
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
          <AgentSelector
            currentAgentId={editor.agent!.id}
            onSelect={(id) => {
              if (id !== editor.agent!.id) {
                if (session.status !== 'idle') session.stop();
                navigate(`/agents/${id}/test`);
              }
            }}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span>Tests execute against saved revision rev {editor.baseRevision}</span>
        </div>
      </div>

      {activeTab === 'live' && problems}
      {activeTab === 'live' ? (
        blocker ?? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <TestConsole
              session={session}
              config={config}
              revision={editor.baseRevision}
              onBeforeStart={() => editor.ensureSaved('Start the test')}
              hasUnsaved={editor.dirty}
              currentAgentId={editor.agent!.id}
              onSwitchAgent={(id) => {
                if (session.status !== 'idle') session.stop();
                navigate(`/agents/${id}/test`);
              }}
            />
            <div className="flex min-w-0 flex-col gap-4">
              {banking && (
                <div className="rounded-xl border border-line bg-surface p-4">
                  {session.roomToken ? (
                    <CustomerChannelPanel
                      token={session.roomToken}
                      onAskForPerson={() => void session.send('I would like to speak to a Service Manager.')}
                      onRequestCallback={() => void session.send('Please arrange a call back.')}
                      onUseAccount={(account) => void session.send(`Please use my ${account.type.toLowerCase()} ending ${account.ending.replace(/\D/g, '')}.`)}
                    />
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Banking Gateway</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Standby
                        </span>
                      </div>
                      <p className="text-[13px] text-muted leading-relaxed">
                        This draft uses the Banking Gateway. Sign-in, secure PIN keypad, unmasked accounts, and confirmations activate here once the conversation starts.
                      </p>
                      <div className="rounded-lg border border-line bg-subtle/50 p-2.5 text-xs space-y-1">
                        <div className="font-medium text-ink">Demo Credentials:</div>
                        <div className="text-muted"><strong className="text-ink">Phone Code:</strong> 1234567 | <strong className="text-ink">PIN:</strong> 135790</div>
                        <div className="text-muted"><strong className="text-ink">Account:</strong> 500000000201 | <strong className="text-ink">NRIC:</strong> 1234567</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* The trace scrolls inside its own column instead of stretching the page. */}
              <div className="flex max-h-[640px] min-h-0 flex-col lg:max-h-[720px] [&>section]:max-h-full">
                <TracePanel trace={trace} />
              </div>
            </div>
          </div>
        )
      ) : activeTab === 'readiness' ? (
        <VoiceReadinessPanel botId={editor.agent!.id} config={config} />
      ) : (
        <ScenariosRunner agentId={editor.agent!.id} ensureSaved={editor.ensureSaved} />
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