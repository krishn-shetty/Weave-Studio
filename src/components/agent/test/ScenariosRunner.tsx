import React, { useEffect, useState } from 'react';
import { toast } from '../../ui/Toast';
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
  RefreshCwIcon,
  ServerIcon,
  XCircleIcon,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { StatusChip } from '../../ui/StatusChip';
import { Dialog } from '../../ui/Dialog';
import { formatDateTime } from '../../../utils/format';
import { cn, inputClass } from '../../../utils/styles';
import { api } from '../../../api/client';
import type { Scenario, TestRun } from '../../../api/types';

interface ScenariosRunnerProps {
  agentId: string;
}

export function ScenariosRunner({ agentId }: ScenariosRunnerProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newScenarioOpen, setNewScenarioOpen] = useState(false);

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
        if (testsRes.value.scenarios.length > 0 && !selectedScenarioId) {
          setSelectedScenarioId(testsRes.value.scenarios[0].id);
        }
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

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) ?? scenarios[0];

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
    setSelectedScenarioId(newId);
    setNewScenarioOpen(false);
    setNewName('');
    setNewDesc('');
    setNewUserMsg('');
    setNewExpectedReply('');
    toast.success(`Scenario "${created.name}" created`);
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
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* List of Scenarios */}
          <div className="space-y-2">
            {scenarios.map((sc) => {
              const isSelected = sc.id === selectedScenarioId;
              const isRunning = runningId === sc.id;
              const status = sc.last_result?.status;

              return (
                <div
                  key={sc.id}
                  onClick={() => setSelectedScenarioId(sc.id)}
                  className={cn(
                    'group cursor-pointer rounded-lg border p-3 transition-colors',
                    isSelected ? 'border-accent bg-accent-soft/30' : 'border-line bg-surface hover:bg-subtle'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink truncate">{sc.name}</p>
                      {sc.description && <p className="text-[11px] text-muted truncate mt-0.5">{sc.description}</p>}
                    </div>
                    {isRunning ? (
                      <LoaderCircleIcon className="h-4 w-4 animate-spin text-accent shrink-0" />
                    ) : status === 'passed' ? (
                      <CheckCircle2Icon className="h-4 w-4 text-green-500 shrink-0" />
                    ) : status === 'failed' ? (
                      <XCircleIcon className="h-4 w-4 text-red-500 shrink-0" />
                    ) : (
                      <StatusChip tone="neutral">Unrun</StatusChip>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Scenario Detail */}
          {selectedScenario && (
            <div className="rounded-xl border border-line bg-surface p-6 shadow-panel">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <h3 className="text-base font-semibold text-ink">{selectedScenario.name}</h3>
                  <p className="text-xs text-muted mt-0.5">{selectedScenario.description || 'Automated regression test'}</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => runScenario(selectedScenario)}
                  disabled={runningId === selectedScenario.id}
                >
                  {runningId === selectedScenario.id ? (
                    <>
                      <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
                      Testing…
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-3.5 w-3.5" />
                      Run Scenario
                    </>
                  )}
                </Button>
              </div>

              {selectedScenario.steps && selectedScenario.steps.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Steps & Assertions</h4>
                  <ol className="space-y-3">
                    {selectedScenario.steps.map((st, i) => (
                      <li key={i} className="rounded-lg border border-line bg-canvas p-3 text-xs">
                        <span className="font-semibold text-accent uppercase tracking-wider block mb-1">
                          Step {i + 1} ({st.role})
                        </span>
                        <p className="text-ink">{st.text}</p>
                        {st.check && (
                          <div className="mt-2 rounded bg-subtle p-2 text-[11px] font-mono text-muted">
                            Check: {st.check.kind} (expected: {st.check.expected})
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
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
