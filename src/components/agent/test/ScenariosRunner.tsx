import React, { useEffect, useState } from 'react';
import { toast } from '../../ui/Toast';
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  FlaskConicalIcon,
  LoaderCircleIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
  XCircleIcon,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { StatusChip } from '../../ui/StatusChip';
import { Dialog } from '../../ui/Dialog';
import { Tooltip } from '../../ui/Tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
} from '../../ui/accordion';
import { cn, inputClass } from '../../../utils/styles';
import { api } from '../../../api/client';
import type { Scenario, TestRun } from '../../../api/types';

interface ScenariosRunnerProps {
  agentId: string;
}

export function ScenariosRunner({ agentId }: ScenariosRunnerProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newScenarioOpen, setNewScenarioOpen] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // New Scenario form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUserMsg, setNewUserMsg] = useState('');
  const [newExpectedReply, setNewExpectedReply] = useState('');

  const fetchScenarios = async () => {
    setLoading(true);
    try {
      const [testsRes, runsRes] = await Promise.allSettled([
        api.listTests(agentId),
        api.listTestRuns(agentId, 10),
      ]);

      if (testsRes.status === 'fulfilled' && testsRes.value && Array.isArray(testsRes.value.scenarios)) {
        setScenarios(testsRes.value.scenarios);
      }

      if (runsRes.status === 'fulfilled' && Array.isArray(runsRes.value)) {
        setRuns(runsRes.value);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, [agentId]);

  const runScenario = async (sc: Scenario) => {
    setRunningId(sc.id);
    try {
      const res = await api.runTests(agentId, { scenarios: [sc.id] });
      toast.info('Test run started', { description: `Job ${res.run_id} running on server.` });

      // Poll test run status
      const pollTimer = setInterval(async () => {
        try {
          const run = await api.getTestRun(agentId, res.run_id);
          if (run.status !== 'running') {
            clearInterval(pollTimer);
            setRunningId(null);
            fetchScenarios();
            if (run.status === 'passed') {
              toast.success(`Scenario "${sc.name}" passed`);
            } else {
              toast.error(`Scenario "${sc.name}" ${run.status}`);
            }
          }
        } catch {
          clearInterval(pollTimer);
          setRunningId(null);
        }
      }, 1500);
    } catch (err: any) {
      setRunningId(null);
      toast.error('Could not run test', { description: err?.message || 'Server rejected scenario run' });
    }
  };

  const handleRunAll = async () => {
    setRunningAll(true);
    try {
      const res = await api.runTests(agentId, {});
      toast.info('Running all automated scenarios', { description: `Run id: ${res.run_id}` });

      const pollTimer = setInterval(async () => {
        try {
          const run = await api.getTestRun(agentId, res.run_id);
          if (run.status !== 'running') {
            clearInterval(pollTimer);
            setRunningAll(false);
            fetchScenarios();
            toast.success(`Scenarios finished: ${run.status}`);
          }
        } catch {
          clearInterval(pollTimer);
          setRunningAll(false);
        }
      }, 1500);
    } catch (err: any) {
      setRunningAll(false);
      toast.error('Failed to run all', { description: err?.message });
    }
  };

  const handleCreateScenario = async () => {
    if (!newName.trim()) return;

    const newId = `sc_${Date.now().toString(36)}`;
    const created: Scenario = {
      id: newId,
      name: newName.trim(),
      description: newDesc.trim() || undefined,
      steps: [
        { role: 'caller', text: newUserMsg.trim() },
        { role: 'agent', text: newExpectedReply.trim() },
      ],
    };

    setScenarios((prev) => [created, ...prev]);
    setNewScenarioOpen(false);
    setNewName('');
    setNewDesc('');
    setNewUserMsg('');
    setNewExpectedReply('');
    toast.success(`Scenario "${created.name}" created`);
  };

  const totalPages = Math.max(1, Math.ceil(scenarios.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visibleScenarios = scenarios.slice(startIndex, startIndex + pageSize);

  const handleReorder = (newVisible: typeof visibleScenarios) => {
    const next = [...scenarios];
    next.splice(startIndex, visibleScenarios.length, ...newVisible);
    setScenarios(next);
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Automated Test Scenarios</h2>
          <p className="text-xs text-muted">
            End-to-end regression tests executed via <code className="font-mono text-xs">POST /bots/{agentId}/tests/run</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchScenarios} disabled={loading}>
            <RefreshCwIcon className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setNewScenarioOpen(true)}>
            <PlusIcon className="h-4 w-4" aria-hidden />
            Add Scenario
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRunAll}
            disabled={runningAll || scenarios.length === 0}
          >
            {runningAll ? (
              <>
                <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden />
                Running…
              </>
            ) : (
              <>
                <PlayIcon className="h-3.5 w-3.5" aria-hidden />
                Run All ({scenarios.length})
              </>
            )}
          </Button>
        </div>
      </div>

      {scenarios.length === 0 && !loading ? (
        <div className="rounded-xl border border-line bg-surface p-12 text-center">
          <FlaskConicalIcon className="mx-auto h-8 w-8 text-muted" />
          <h3 className="mt-3 text-sm font-semibold text-ink">No automated test scenarios yet</h3>
          <p className="mt-1 max-w-sm mx-auto text-xs text-muted">
            Define repeatable tests to verify prompt instructions, tool executions, and responses before publishing releases.
          </p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => setNewScenarioOpen(true)}>
            Create first scenario
          </Button>
        </div>
      ) : (
        /* Uniform Accordion for Scenarios */
        <div>
          <Accordion
            items={visibleScenarios}
            onReorder={handleReorder}
            enableReordering={true}
            enableDragAndDrop={true}
            defaultExpandedIds={visibleScenarios[0] ? [visibleScenarios[0].id] : []}
            pagination={{
              page: safePage,
              pageSize,
              totalItems: scenarios.length,
              onPageChange: (p) => setPage(p),
              onPageSizeChange: (s) => {
                setPageSize(s);
                setPage(1);
              },
              pageSizeOptions: [3, 5, 10],
            }}
          >
            {visibleScenarios.map((sc, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === visibleScenarios.length - 1;
              const isRunning = runningId === sc.id;
              const status = sc.last_result?.status;

              return (
                <AccordionItem
                  key={sc.id}
                  id={sc.id}
                  index={idx}
                  isFirst={isFirst}
                  isLast={isLast}
                >
                  <AccordionHeader
                    id={sc.id}
                    icon={<FlaskConicalIcon className="h-4 w-4 text-accent" />}
                    title={sc.name}
                    subtitle={sc.description || `${sc.steps?.length || 0} assertions defined`}
                    badge={
                      isRunning ? (
                        <span className="flex items-center gap-1 rounded bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                          <LoaderCircleIcon className="h-3 w-3 animate-spin" />
                          Executing
                        </span>
                      ) : status === 'passed' ? (
                        <StatusChip tone="success" dot>Passed</StatusChip>
                      ) : status === 'failed' ? (
                        <StatusChip tone="danger" dot>Failed</StatusChip>
                      ) : (
                        <StatusChip tone="neutral">Unrun</StatusChip>
                      )
                    }
                    actions={
                      <Tooltip content="Execute this test scenario immediately" position="top">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => runScenario(sc)}
                          disabled={isRunning}
                          className="h-8 px-2.5 text-xs"
                        >
                          {isRunning ? (
                            <>
                              <LoaderCircleIcon className="h-3 w-3 animate-spin mr-1" />
                              Running…
                            </>
                          ) : (
                            <>
                              <PlayIcon className="h-3 w-3 mr-1" />
                              Run
                            </>
                          )}
                        </Button>
                      </Tooltip>
                    }
                  />

                  <AccordionContent>
                    <div className="space-y-4">
                      {sc.steps && sc.steps.length > 0 ? (
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                            Conversation Steps & Assertions
                          </h4>
                          <ol className="space-y-2.5">
                            {sc.steps.map((st, i) => (
                              <li key={i} className="rounded-lg border border-line bg-surface p-3 text-xs">
                                <span className="font-semibold text-accent uppercase tracking-wider block mb-1">
                                  Step {i + 1} ({st.role === 'caller' ? 'Caller Speech' : 'Expected Agent Reply'})
                                </span>
                                <p className="text-ink font-medium">{st.text}</p>
                                {st.check && (
                                  <div className="mt-2 rounded bg-subtle p-2 text-[11px] font-mono text-muted">
                                    Assertion: {st.check.kind} (expected: {st.check.expected})
                                  </div>
                                )}
                              </li>
                            ))}
                          </ol>
                        </div>
                      ) : (
                        <p className="text-xs text-muted">No custom steps defined for this scenario.</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}

      {/* New Scenario Dialog */}
      <Dialog
        open={newScenarioOpen}
        onClose={() => setNewScenarioOpen(false)}
        title="Add Automated Test Scenario"
        description="Configure expected caller input and agent assertions."
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewScenarioOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateScenario} disabled={!newName.trim()}>
              Save Scenario
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-medium text-ink-soft block">Scenario Title</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Verify billing inquiry handover"
              className={cn(inputClass, 'mt-1')}
            />
          </div>

          <div>
            <label className="font-medium text-ink-soft block">Description</label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Optional summary of test scope"
              className={cn(inputClass, 'mt-1')}
            />
          </div>

          <div>
            <label className="font-medium text-ink-soft block">Caller prompt</label>
            <input
              type="text"
              value={newUserMsg}
              onChange={(e) => setNewUserMsg(e.target.value)}
              placeholder="e.g. Can I pay my water bill online?"
              className={cn(inputClass, 'mt-1')}
            />
          </div>

          <div>
            <label className="font-medium text-ink-soft block">Expected agent reply keyword</label>
            <input
              type="text"
              value={newExpectedReply}
              onChange={(e) => setNewExpectedReply(e.target.value)}
              placeholder="e.g. online, portal, payment"
              className={cn(inputClass, 'mt-1')}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
