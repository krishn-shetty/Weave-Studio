import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightIcon } from 'lucide-react';
import type { Agent } from '../../../types/studio';
import { Dialog } from '../../ui/Dialog';
import { ChangeList } from '../ChangeList';
import { diffConfigs, groupChanges, meaningfulChanges } from '../../../utils/diff';
import { inputClass } from '../../../utils/styles';

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

  const configOf = (ref: string) => ref === 'draft' ? agent.draft.config : agent.versions.find((v) => v.version === ref)?.config;
  const changes = useMemo(() => meaningfulChanges(diffConfigs(configOf(a), configOf(b))), [a, b, agent]); // eslint-disable-line react-hooks/exhaustive-deps
  const sections = groupChanges(changes).length;
  const options = [{ value: 'draft', label: `Draft (rev ${agent.draft.revision})` }, ...agent.versions.map((v) => ({ value: v.version, label: v.version }))];

  return (
    <Dialog open={open} onClose={onClose} size="xl" title="Compare" description={`${changes.length} ${changes.length === 1 ? 'change' : 'changes'} in ${sections} ${sections === 1 ? 'section' : 'sections'}`}>
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
      <ChangeList changes={changes} emptyText="These two are identical." />
    </Dialog>);

}