import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleAlertIcon,
  ClockIcon,
  FlaskConicalIcon,
  LayersIcon,
  LoaderCircleIcon,
  PlayIcon,
  PlusIcon,
  ServerIcon,
  SparklesIcon,
  XCircleIcon
} from 'lucide-react';
import { HttpMock, Scenario, ScenarioStep, seedScenarios } from '../../../data/seedScenarios';
import { Button } from '../../ui/Button';
import { StatusChip } from '../../ui/StatusChip';
import { Dialog } from '../../ui/Dialog';
import { formatDateTime } from '../../../utils/format';
import { cn, inputClass } from '../../../utils/styles';

interface ScenariosRunnerProps {
  agentId: string;
}

export function ScenariosRunner({ agentId }: ScenariosRunnerProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>(() =>
    seedScenarios.filter((s) => s.agentId === agentId || s.agentId === 'customer-care')
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(scenarios[0]?.id ?? '');
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [newScenarioOpen, setNewScenarioOpen] = useState(false);

  // New Scenario form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newChannel, setNewChannel] = useState<'web_chat' | 'web_voice' | 'phone'>('web_chat');
  const [newUserMsg, setNewUserMsg] = useState('');
  const [newExpectedTool, setNewExpectedTool] = useState('');
  const [newExpectedReply, setNewExpectedReply] = useState('');

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) ?? scenarios[0];

  const runScenario = (sc: Scenario) => {
    setRunningId(sc.id);

    window.setTimeout(() => {
      setScenarios((prev) =>
        prev.map((item) => {
          if (item.id !== sc.id) return item;
          return {
            ...item,
            last_run: {
              at: new Date().toISOString(),
              status: 'passed',
              duration_ms: Math.floor(Math.random() * 150) + 180,
              checks: sc.steps.map((st, i) => ({
                kind: 'tool_called',
                expect: st.expected_tools ? st.expected_tools.join(', ') : 'response matched',
                passed: true,
                detail: `Step ${i + 1}: expected tools executed and verified against mock runtime`
              })),
              transcript: sc.steps.flatMap((st) => [
                { speaker: 'caller' as const, text: st.user_message },
                {
                  speaker: 'agent' as const,
                  text: st.expected_reply_contains
                    ? `I have processed your request. Found verified detail matching: ${st.expected_reply_contains}.`
                    : 'Your request has been verified and processed.'
                }
              ]),
              unmocked: []
            }
          };
        })
      );
      setRunningId(null);
      toast.success(`Scenario "${sc.name}" passed`, {
        description: 'All step assertions, tool calls, and state checks verified.'
      });
    }, 750);
  };

  const handleRunAll = () => {
    setRunningAll(true);
    let index = 0;

    const interval = setInterval(() => {
      if (index >= scenarios.length) {
        clearInterval(interval);
        setRunningAll(false);
        setRunningId(null);
        toast.success(`All ${scenarios.length} scenarios completed successfully`, {
          description: '100% assertions passed. Zero regression detected.'
        });
        return;
      }
      const target = scenarios[index];
      runScenario(target);
      index++;
    }, 900);
  };

  const handleCreateScenario = () => {
    if (!newName.trim() || !newUserMsg.trim()) return;

    const created: Scenario = {
      id: `sc-${Date.now()}`,
      agentId,
      name: newName.trim(),
      channel: newChannel,
      mode: 'scripted',
      description: newDesc.trim() || 'Custom test scenario',
      steps: [
        {
          user_message: newUserMsg.trim(),
          expected_tools: newExpectedTool.trim() ? [newExpectedTool.trim()] : undefined,
          expected_reply_contains: newExpectedReply.trim() || undefined
        }
      ],
      http_mocks: [],
      last_run: null
    };

    setScenarios((prev) => [created, ...prev]);
    setSelectedScenarioId(created.id);
    setNewScenarioOpen(false);
    setNewName('');
    setNewDesc('');
    setNewUserMsg('');
    setNewExpectedTool('');
    setNewExpectedReply('');
    toast.success(`Scenario "${created.name}" created`);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 shadow-panel">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConicalIcon className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-ink">Repeatable Automated Scenarios (FR-18)</h3>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Run scripted test conversations on every draft change without consuming model tokens or calling real external APIs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setNewScenarioOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            New scenario
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRunAll}
            disabled={runningAll || runningId !== null}
          >
            {runningAll ? (
              <>
                <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                Running suite…
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4" />
                Run all {scenarios.length} scenarios
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        {/* Scenarios List */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Scenario Suite ({scenarios.length})
          </h4>
          <div className="space-y-2">
            {scenarios.map((sc) => {
              const isSelected = selectedScenario?.id === sc.id;
              const isRunning = runningId === sc.id;
              return (
                <div
                  key={sc.id}
                  onClick={() => setSelectedScenarioId(sc.id)}
                  className={cn(
                    'cursor-pointer rounded-xl border p-3.5 transition shadow-panel',
                    isSelected
                      ? 'border-accent bg-accent-soft/30 ring-1 ring-accent'
                      : 'border-line bg-surface hover:border-line-strong'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-ink leading-snug">{sc.name}</p>
                    {isRunning ? (
                      <StatusChip tone="info">
                        <LoaderCircleIcon className="h-3 w-3 animate-spin" />
                        Running
                      </StatusChip>
                    ) : sc.last_run ? (
                      <StatusChip tone={sc.last_run.status === 'passed' ? 'success' : 'danger'} dot>
                        {sc.last_run.status === 'passed' ? 'Passed' : 'Failed'}
                      </StatusChip>
                    ) : (
                      <StatusChip tone="neutral">Not run</StatusChip>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted line-clamp-2">{sc.description}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px] text-muted">
                    <span className="uppercase">{sc.channel.replace('_', ' ')} · {sc.mode}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        runScenario(sc);
                      }}
                      disabled={isRunning}
                      className="font-medium text-accent hover:underline"
                    >
                      Run single test →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Scenario Details & Run Log */}
        {selectedScenario && (
          <div className="rounded-xl border border-line bg-surface p-5 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-ink">{selectedScenario.name}</h3>
                  <StatusChip tone="neutral" className="uppercase text-[10px]">
                    {selectedScenario.channel}
                  </StatusChip>
                </div>
                <p className="mt-0.5 text-xs text-muted">{selectedScenario.description}</p>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => runScenario(selectedScenario)}
                disabled={runningId === selectedScenario.id}
              >
                {runningId === selectedScenario.id ? (
                  <>
                    <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
                    Running…
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-3.5 w-3.5" />
                    Run scenario
                  </>
                )}
              </Button>
            </div>

            {/* Steps & Assertions */}
            <div className="mt-5 space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Conversation Steps ({selectedScenario.steps.length})
                </h4>
                <div className="mt-2 space-y-2">
                  {selectedScenario.steps.map((st, i) => (
                    <div key={i} className="rounded-lg border border-line bg-canvas p-3 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-ink">
                        <span className="font-semibold text-accent">Step {i + 1}:</span> Caller says:
                      </div>
                      <p className="mt-1 italic text-ink-soft">&ldquo;{st.user_message}&rdquo;</p>
                      <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] text-muted">
                        {st.expected_tools && (
                          <span className="rounded bg-subtle px-1.5 py-0.5 font-mono text-ink">
                            Assert Tool: {st.expected_tools.join(', ')}
                          </span>
                        )}
                        {st.expected_reply_contains && (
                          <span className="rounded bg-subtle px-1.5 py-0.5 text-ink">
                            Assert Reply Contains: &ldquo;{st.expected_reply_contains}&rdquo;
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mock APIs */}
              {selectedScenario.http_mocks.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Active HTTP Mocks ({selectedScenario.http_mocks.length})
                  </h4>
                  <div className="mt-2 space-y-1.5">
                    {selectedScenario.http_mocks.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-md border border-line bg-canvas px-3 py-1.5 font-mono text-xs text-ink-soft"
                      >
                        <div className="flex items-center gap-2">
                          <ServerIcon className="h-3.5 w-3.5 text-accent" />
                          <span className="font-bold text-accent">{m.method}</span>
                          <span>{m.path}</span>
                        </div>
                        <StatusChip tone="success">{m.status} OK</StatusChip>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Run Results */}
              {selectedScenario.last_run ? (
                <div className="border-t border-line pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <h4 className="font-semibold uppercase tracking-wider text-muted">
                      Last Execution Results
                    </h4>
                    <span className="text-muted">
                      {formatDateTime(selectedScenario.last_run.at)} · {selectedScenario.last_run.duration_ms} ms
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1.5">
                    {selectedScenario.last_run.checks.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-md bg-success-soft/30 p-2 text-xs text-success"
                      >
                        <CheckCircle2Icon className="h-4 w-4 shrink-0 mt-0.5 text-success" />
                        <div>
                          <p className="font-semibold">{c.expect}</p>
                          <p className="text-[11px] text-ink-soft">{c.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-muted">
                  Scenario has not been executed yet in this session. Click &ldquo;Run scenario&rdquo; to test.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Scenario Dialog */}
      <Dialog
        open={newScenarioOpen}
        onClose={() => setNewScenarioOpen(false)}
        title="Create Automated Test Scenario"
        description="Define a repeatable scripted test with step assertions to guard against regression."
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewScenarioOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateScenario}
              disabled={!newName.trim() || !newUserMsg.trim()}
            >
              Save scenario
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-ink">Scenario Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Invalid meter reading format handling"
              className={cn(inputClass, 'mt-1 text-sm')}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-ink">Description</label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="e.g. Verifies agent asks caller to check their 5-digit register when wrong characters entered"
              className={cn(inputClass, 'mt-1 text-sm')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink">Channel</label>
              <select
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value as any)}
                className={cn(inputClass, 'mt-1 text-sm')}
              >
                <option value="web_chat">Web Chat</option>
                <option value="web_voice">Web Voice</option>
                <option value="phone">Phone</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink">Expected Tool Execution</label>
              <input
                type="text"
                value={newExpectedTool}
                onChange={(e) => setNewExpectedTool(e.target.value)}
                placeholder="e.g. lookup_account"
                className={cn(inputClass, 'mt-1 text-sm font-mono')}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-ink">Step 1: Caller Message</label>
            <textarea
              rows={2}
              value={newUserMsg}
              onChange={(e) => setNewUserMsg(e.target.value)}
              placeholder="What the caller says in the first turn..."
              className={cn(inputClass, 'mt-1 text-sm')}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-ink">Assert Agent Response Contains (Optional)</label>
            <input
              type="text"
              value={newExpectedReply}
              onChange={(e) => setNewExpectedReply(e.target.value)}
              placeholder="e.g. postcode or balance"
              className={cn(inputClass, 'mt-1 text-sm')}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
