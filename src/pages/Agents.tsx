import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PinIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { useStudio } from '../contexts/StudioContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { StatusChip } from '../components/ui/StatusChip';
import { Segmented } from '../components/ui/Segmented';
import { CreateAgentDialog } from '../components/agents/CreateAgentDialog';
import { validateConfig } from '../utils/validate';
import { currentDeployments, draftChangeCount, environments, envShort, latestVersion, missingSecrets } from '../utils/agentStatus';
import { timeAgo } from '../utils/format';
import { cn, inputClass } from '../utils/styles';

type StatusFilter = 'all' | 'attention' | 'draft' | 'published' | 'live';
type SortKey = 'recent' | 'name' | 'version';

const filters: {value: StatusFilter;label: string;}[] = [
{ value: 'all', label: 'All' },
{ value: 'attention', label: 'Needs attention' },
{ value: 'draft', label: 'Draft only' },
{ value: 'published', label: 'Published' },
{ value: 'live', label: 'Live' }];


export function Agents() {
  const { agents, pinnedAgentIds, togglePinAgent } = useStudio();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const q = params.get('q') ?? '';
  const status = params.get('status') as StatusFilter ?? 'all';
  const sort = params.get('sort') as SortKey ?? 'recent';

  const setParam = (key: string, value: string, fallback: string) => {
    const next = new URLSearchParams(params);
    if (value === fallback) next.delete(key);else
    next.set(key, value);
    setParams(next, { replace: true });
  };

  const rows = useMemo(
    () =>
    agents.map((a) => {
      const report = validateConfig(a.draft.config);
      const latest = latestVersion(a);
      const current = currentDeployments(a);
      const missing = latest ? missingSecrets(validateConfig(latest.config).secrets_required) : [];
      const isPinned = pinnedAgentIds.includes(a.id);
      return { agent: a, report, latest, current, missing, changes: draftChangeCount(a), isPinned };
    }),
    [agents, pinnedAgentIds]
  );

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.
    filter((r) => !needle || r.agent.name.toLowerCase().includes(needle) || r.agent.id.includes(needle)).
    filter((r) => {
      if (status === 'attention') return !r.report.valid || r.missing.length > 0;
      if (status === 'draft') return !r.latest;
      if (status === 'published') return !!r.latest;
      if (status === 'live') return Object.keys(r.current).length > 0;
      return true;
    }).
    sort((a, b) => {
      // Pinned agents always sort to the top
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (sort === 'name') return a.agent.name.localeCompare(b.agent.name);
      if (sort === 'version') return (b.latest?.version ?? '').localeCompare(a.latest?.version ?? '', undefined, { numeric: true });
      return new Date(b.agent.draft.saved_at).getTime() - new Date(a.agent.draft.saved_at).getTime();
    });
  }, [rows, q, status, sort]);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Agents</h1>
          <p className="mt-1 text-sm text-muted">{agents.length} agents in Northwind workspace</p>
        </div>
        {can('edit') &&
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" aria-hidden />
            Create agent
          </Button>
        }
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            aria-label="Search agents"
            value={q}
            onChange={(e) => setParam('q', e.target.value, '')}
            placeholder="Search by name or id"
            className={`${inputClass} pl-9`} />
          
        </div>
        <Segmented label="Filter by status" options={filters} value={status} onChange={(v) => setParam('status', v, 'all')} />
        <label className="ml-auto flex items-center gap-2 text-[13px] text-muted">
          Sort
          <select value={sort} onChange={(e) => setParam('sort', e.target.value, 'recent')} className={`${inputClass} w-auto py-1.5`}>
            <option value="recent">Recently edited</option>
            <option value="name">Name</option>
            <option value="version">Latest version</option>
          </select>
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th scope="col" className="px-4 py-2.5 font-medium">Agent</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Draft</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Latest version</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Live in</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Last edited</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ agent, report, latest, current, missing, changes, isPinned }) =>
            <tr
              key={agent.id}
              onClick={() => navigate(`/agents/${agent.id}`)}
              className="cursor-pointer border-b border-line transition-colors duration-150 last:border-0 hover:bg-canvas">
              
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinAgent(agent.id);
                      }}
                      className={cn(
                        'rounded p-1 transition-colors',
                        isPinned ? 'text-accent hover:text-accent/80' : 'text-muted/40 hover:text-muted'
                      )}
                      title={isPinned ? 'Unpin agent' : 'Pin agent to top'}
                    >
                      <PinIcon className={cn('h-3.5 w-3.5', isPinned && 'fill-accent')} />
                    </button>
                    <div>
                      <Link to={`/agents/${agent.id}`} className="font-medium text-ink hover:underline" onClick={(e) => e.stopPropagation()}>
                        {agent.name}
                      </Link>
                      <p className="font-mono text-xs text-muted">{agent.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {report.valid ? <StatusChip tone="success" dot>Valid</StatusChip> : <StatusChip tone="danger" dot>{report.errors.length} {report.errors.length === 1 ? 'problem' : 'problems'}</StatusChip>}
                    {changes > 0 && <StatusChip>{changes} unpublished</StatusChip>}
                    {missing.length > 0 && <StatusChip tone="warning" title={missing.join(', ')}>Missing secret</StatusChip>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {latest ? <span className="font-mono text-[13px]">{latest.version}</span> : <span className="text-muted">Not published</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {environments.filter((e) => current[e]).map((e) =>
                  <StatusChip key={e} tone={e === 'production' ? 'accent' : 'neutral'}>
                        {envShort(e)} <span className="font-mono">{current[e]?.version}</span>
                      </StatusChip>
                  )}
                    {Object.keys(current).length === 0 && <span className="text-muted">Nowhere yet</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-[13px] text-muted">
                  {timeAgo(agent.draft.saved_at)}
                  <br />
                  by {agent.draft.saved_by}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {visible.length === 0 &&
        <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-ink">No agents match</p>
            <p className="mt-1 text-sm text-muted">Try a different search or filter.</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => setParams({}, { replace: true })}>
              Clear filters
            </Button>
          </div>
        }
      </div>
      <CreateAgentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>);

}