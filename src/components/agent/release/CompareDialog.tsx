import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightIcon } from 'lucide-react';
import type { Agent } from '../../../types/studio';
import { Dialog } from '../../ui/Dialog';
import { ChangeList } from '../ChangeList';
import { diffConfigs, groupChanges, meaningfulChanges } from '../../../utils/diff';
import { inputClass } from '../../../utils/styles';
import { useVersionConfig } from '../../../hooks/useVersionConfig';

interface CompareDialogProps {
  open: boolean;
  onClose: () => void;
  agent: Agent;
  initialA: string;
  initialB: string;
}

export function CompareDialog({ open, onClose, agent, initialA, initialB }: CompareDialogProps) {
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);

  useEffect(() => {
    if (open) {
      setA(initialA);
      setB(initialB);
    }
  }, [open, initialA, initialB]);

  const from = useVersionConfig(agent, a);
  const to = useVersionConfig(agent, b);
  const ready = !!from.config && !!to.config;
  const changes = useMemo(() => (from.config && to.config ? meaningfulChanges(diffConfigs(from.config, to.config)) : []), [from.config, to.config]);
  const sections = groupChanges(changes).length;
  const loadError = from.error ?? to.error;
  const options = [{ value: 'draft', label: `Draft (rev ${agent.draft.revision})` }, ...agent.versions.map((v) => ({ value: v.version, label: v.version }))];

  return (
    <Dialog open={open} onClose={onClose} size="xl" title="Compare" description={ready ? `${changes.length} ${changes.length === 1 ? 'change' : 'changes'} in ${sections} ${sections === 1 ? 'section' : 'sections'}` : loadError ? 'A version could not be loaded.' : 'Loading the versions…'}>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-[13px] font-medium text-ink-soft">From</span>
          <select className={`${inputClass} mt-1 w-48 font-mono`} value={a} onChange={(e) => setA(e.target.value)}>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <ArrowRightIcon className="mb-2.5 h-4 w-4 text-muted" aria-hidden />
        <label className="block">
          <span className="text-[13px] font-medium text-ink-soft">To</span>
          <select className={`${inputClass} mt-1 w-48 font-mono`} value={b} onChange={(e) => setB(e.target.value)}>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </div>
      {loadError ? (
        <p className="text-sm text-danger" role="alert">{loadError}</p>
      ) : ready ? (
        <ChangeList changes={changes} emptyText="These two are identical." />
      ) : (
        <div className="space-y-2" aria-busy="true" aria-label="Loading">
          <div className="h-4 w-2/3 animate-pulse rounded bg-subtle" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-subtle" />
          <div className="h-4 w-3/5 animate-pulse rounded bg-subtle" />
        </div>
      )}
    </Dialog>);

}