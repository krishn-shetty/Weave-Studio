import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircleIcon,
  ArrowRightIcon,
  BotIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CompassIcon,
  ExternalLinkIcon,
  EyeIcon,
  GripVerticalIcon,
  LayersIcon,
  ListIcon,
  PinIcon,
  PlayIcon,
  PlusIcon,
  RocketIcon,
  SearchIcon,
  ShieldCheckIcon,
  TableIcon,
  WrenchIcon,
} from 'lucide-react';
import { useStudio } from '../contexts/StudioContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { StatusChip } from '../components/ui/StatusChip';
import { Badge } from '../components/ui/Badge';
import { Segmented } from '../components/ui/Segmented';
import { Tooltip } from '../components/ui/Tooltip';
import { toast } from '../components/ui/Toast';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
} from '../components/ui/accordion';
import { CreateAgentDialog } from '../components/agents/CreateAgentDialog';
import { useDraftValidations } from '../hooks/useServerValidation';
import { useAgentsReadiness } from '../hooks/useReadiness';
import type { Readiness } from '../models/readiness';
import { useStepLink } from '../hooks/useStepLink';
import { ProgressRing } from '../components/agent/Readiness';
import type { ValidationView } from '../utils/serverValidation';
import { currentDeployments, draftChangeCount, environments, envShort, envLabel, latestVersion } from '../utils/agentStatus';
import { missingSecrets } from '../utils/providerOptions';
import { useSecretKeys } from '../hooks/useProviders';
import { timeAgo } from '../utils/format';
import { cn, inputClass } from '../utils/styles';

type StatusFilter = 'all' | 'attention' | 'draft' | 'published' | 'live';
type SortKey = 'recent' | 'name' | 'version' | 'custom';

const filters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'draft', label: 'Draft only' },
  { value: 'published', label: 'Published' },
  { value: 'live', label: 'Live' },
];

export function Agents() {
  const { agents, pinnedAgentIds, togglePinAgent } = useStudio();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const q = params.get('q') ?? '';
  const status = (params.get('status') as StatusFilter) ?? 'all';
  const sort = (params.get('sort') as SortKey) ?? 'recent';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const pageSizeParam = Number(params.get('size') ?? '10') || 10;
  const [pageSize, setPageSize] = useState<number>(pageSizeParam);
  const [viewMode, setViewMode] = useState<'accordion' | 'table'>('accordion');
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);

  // Custom ordering state
  const [customOrder, setCustomOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('weave_agents_order');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const setParam = (key: string, value: string, fallback: string) => {
    const next = new URLSearchParams(params);
    if (value === fallback) next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(newPage));
    setParams(next, { replace: true });
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    const next = new URLSearchParams(params);
    next.set('size', String(newSize));
    next.delete('page');
    setParams(next, { replace: true });
  };

  const secretKeys = useSecretKeys();
  // The server's checks on each saved draft (POST /validate); null while it has not answered.
  const validations = useDraftValidations(agents);
  // Readiness per agent: the same model as the agent's header, Overview and Release.
  const readinessById = useAgentsReadiness(agents);
  const rows = useMemo(
    () =>
      agents.map((a) => {
        const checks = validations[a.id];
        const report = checks?.report ?? null;
        const latest = latestVersion(a);
        const current = currentDeployments(a);
        const missing = report ? missingSecrets(report.secrets_required, secretKeys) : [];
        const isPinned = pinnedAgentIds.includes(a.id);
        return { agent: a, report, checks, latest, current, missing, changes: draftChangeCount(a), isPinned, readiness: readinessById[a.id]?.readiness };
      }),
    [agents, pinnedAgentIds, secretKeys, validations, readinessById]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows
      .filter((r) => !needle || r.agent.name.toLowerCase().includes(needle) || r.agent.id.includes(needle))
      .filter((r) => {
        if (status === 'attention') return r.report?.valid === false || r.checks?.status === 'failed' || r.missing.length > 0;
        if (status === 'draft') return !r.latest;
        if (status === 'published') return !!r.latest;
        if (status === 'live') return Object.keys(r.current).length > 0;
        return true;
      });

    // Custom order map if available
    const orderMap = new Map(customOrder.map((id, index) => [id, index]));

    return list.sort((a, b) => {
      // Pinned agents always sort to the top
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (customOrder.length > 0 && orderMap.has(a.agent.id) && orderMap.has(b.agent.id)) {
        return (orderMap.get(a.agent.id) ?? 0) - (orderMap.get(b.agent.id) ?? 0);
      }

      if (sort === 'name') return a.agent.name.localeCompare(b.agent.name);
      if (sort === 'version')
        return (b.latest?.version ?? '').localeCompare(a.latest?.version ?? '', undefined, { numeric: true });
      return new Date(b.agent.draft.saved_at).getTime() - new Date(a.agent.draft.saved_at).getTime();
    });
  }, [rows, q, status, sort, customOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visible = filtered.slice(startIndex, startIndex + pageSize);

  const handleReorderById = (sourceId: string, targetId: string, position: 'top' | 'bottom') => {
    if (sourceId === targetId) return;

    const previousOrder = [...customOrder];

    // Determine current order of all items
    const currentListIds = filtered.map((r) => r.agent.id);
    const fullOrder = Array.from(new Set([...currentListIds, ...agents.map((a) => a.id)]));

    const sourceIdx = fullOrder.indexOf(sourceId);
    const targetIdx = fullOrder.indexOf(targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    fullOrder.splice(sourceIdx, 1);
    let newTargetIdx = fullOrder.indexOf(targetId);
    if (position === 'bottom') {
      newTargetIdx += 1;
    }
    fullOrder.splice(newTargetIdx, 0, sourceId);

    setCustomOrder(fullOrder);
    try {
      localStorage.setItem('weave_agents_order', JSON.stringify(fullOrder));
      toast.success('Agent order updated');
    } catch {
      setCustomOrder(previousOrder);
      toast.error('Failed to update agent order');
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const handleReorder = (newItems: typeof visible) => {
    const previousOrder = [...customOrder];
    const newVisibleIds = newItems.map((item) => item.agent.id);
    const fullOrder = Array.from(new Set([...newVisibleIds, ...agents.map((a) => a.id)]));
    setCustomOrder(fullOrder);
    try {
      localStorage.setItem('weave_agents_order', JSON.stringify(fullOrder));
      toast.success('Agent order updated');
    } catch {
      setCustomOrder(previousOrder);
      toast.error('Failed to update agent order');
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10 scroll-mt-20">
      <div className="flex flex-wrap items-end justify-between gap-4 scroll-mt-20">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Agents</h1>
          <p className="mt-1 text-sm text-muted">{agents.length} agents in Northwind workspace</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-line bg-surface p-0.5">
            <Tooltip content="Accordion list view with reordering & configuration breakdown" position="top">
              <button
                type="button"
                onClick={() => setViewMode('accordion')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  viewMode === 'accordion'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                )}
              >
                <ListIcon className="h-3.5 w-3.5" />
                <span>Accordions</span>
              </button>
            </Tooltip>
            <Tooltip content="Compact table grid view" position="top">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  viewMode === 'table'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                )}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
            </Tooltip>
          </div>

          {can('edit') && (
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <PlusIcon className="h-4 w-4" aria-hidden />
              Create agent
            </Button>
          )}
        </div>
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
            className={`${inputClass} pl-9`}
          />
        </div>
        <Segmented label="Filter by status" options={filters} value={status} onChange={(v) => setParam('status', v, 'all')} />
        <label className="ml-auto flex items-center gap-2 text-[13px] text-muted">
          Sort
          <select
            value={sort}
            onChange={(e) => {
              setCustomOrder([]);
              localStorage.removeItem('weave_agents_order');
              setParam('sort', e.target.value, 'recent');
            }}
            className={`${inputClass} w-auto py-1.5`}
          >
            <option value="recent">Recently edited</option>
            <option value="name">Name</option>
            <option value="version">Latest version</option>
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6 rounded-xl border border-line bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink">No agents match</p>
          <p className="mt-1 text-sm text-muted">Try a different search or filter.</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => setParams({}, { replace: true })}>
            Clear filters
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th scope="col" className="px-4 py-2.5 font-medium">Agent</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Draft</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Latest version</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Live in</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Next step</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Last edited</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ agent, checks, latest, current, missing, changes, isPinned, readiness }) => (
                <tr
                  key={agent.id}
                  onClick={() => navigate(`/agents/${agent.id}`)}
                  className="cursor-pointer border-b border-line transition-colors duration-150 last:border-0 hover:bg-canvas"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Tooltip content={isPinned ? 'Unpin agent' : 'Pin agent to top'} position="top">
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
                          aria-label={isPinned ? 'Unpin agent' : 'Pin agent to top'}
                        >
                          <PinIcon className={cn('h-3.5 w-3.5', isPinned && 'fill-accent')} />
                        </button>
                      </Tooltip>
                      <div>
                        <Link
                          to={`/agents/${agent.id}`}
                          className="font-medium text-ink hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {agent.name}
                        </Link>
                        <p className="font-mono text-xs text-muted">{agent.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <ChecksBadge view={checks} />
                      {!!changes && <StatusChip>{changes} unpublished</StatusChip>}
                      {missing.length > 0 && <StatusChip tone="warning" title={missing.join(', ')}>Missing secret</StatusChip>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {latest ? <span className="font-mono text-[13px]">{latest.version}</span> : <span className="text-muted">Not published</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {environments
                        .filter((e) => current[e])
                        .map((e) => (
                          <StatusChip key={e} tone={e === 'production' ? 'accent' : 'neutral'}>
                            {envShort(e)} <span className="font-mono">{current[e]?.version}</span>
                          </StatusChip>
                        ))}
                      {Object.keys(current).length === 0 && <span className="text-muted">Nowhere yet</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {readiness && <NextStepCell agentId={agent.id} readiness={readiness} />}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted">
                    {timeAgo(agent.draft.saved_at)}
                    <br />
                    by {agent.draft.saved_by}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="border-t border-line px-4 py-3 flex items-center justify-between text-xs text-muted">
              <span>
                Showing {startIndex + 1}–{Math.min(startIndex + pageSize, filtered.length)} of {filtered.length} agents
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safePage <= 1}
                  onClick={() => handlePageChange(safePage - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <span className="px-2 font-medium text-ink">
                  {safePage} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safePage >= totalPages}
                  onClick={() => handlePageChange(safePage + 1)}
                  aria-label="Next page"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Uniform Accordion Experience */
        <div className="mt-5 p-1">
          <Accordion
            items={visible}
            getId={(item) => item.agent.id}
            onReorder={handleReorder}
            onReorderById={handleReorderById}
            enableReordering={true}
            enableDragAndDrop={true}
            allowMultiple={false}
            expandedIds={expandedAgentId ? [expandedAgentId] : []}
            onExpandedChange={(ids) => setExpandedAgentId(ids.length > 0 ? ids[ids.length - 1] : null)}
            renderOverlay={(item) => (
              <div
                className={cn(
                  'grid grid-cols-[24px_36px_minmax(0,1fr)_auto_auto] gap-x-3.5 items-center px-4 sm:px-5 py-3 min-h-[64px]',
                  'select-none bg-surface rounded-xl border border-accent/40 shadow-overlay relative'
                )}
              >
                {item.report?.valid === false && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px] bg-danger rounded-l-xl z-10 pointer-events-none"
                    aria-hidden="true"
                  />
                )}
                {/* 1. Grip */}
                <div className="flex items-center justify-center w-6 shrink-0 text-accent">
                  <GripVerticalIcon className="h-4 w-4" />
                </div>
                {/* 2. Icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft/30 text-accent">
                  <BotIcon className="h-5 w-5" />
                </div>
                {/* 3. MAIN */}
                <div className="min-w-0 flex flex-col justify-center">
                  <div className="text-sm font-semibold text-ink leading-snug truncate">
                    {item.agent.name}
                  </div>
                  <div className="text-xs text-muted leading-snug mt-0.5 truncate">
                    <span className="font-mono text-ink-soft">{item.agent.id}</span>
                    <span className="mx-1 text-muted/60">·</span>
                    <span>saved {timeAgo(item.agent.draft.saved_at)} by {item.agent.draft.saved_by}</span>
                  </div>
                </div>
                {/* 4. STATUS */}
                <div className="flex items-center justify-end gap-2 shrink-0">
                  {!!item.changes && (
                    <Badge variant="neutral" className="h-6 text-xs">
                      {item.changes} unpublished
                    </Badge>
                  )}
                  {item.missing.length > 0 && (
                    <StatusChip tone="warning" title={item.missing.join(', ')} className="h-6 text-xs">
                      Missing secret
                    </StatusChip>
                  )}
                  <ChecksBadge view={item.checks} className="h-6 text-xs" />
                  {item.readiness && (
                    <ReadinessIndicator readiness={item.readiness} />
                  )}
                  <Badge variant="outline" mono className="h-6 text-xs">
                    {item.latest ? item.latest.version : 'Unpublished'}
                  </Badge>
                </div>
                {/* 5. ACTIONS */}
                <div className="flex items-center justify-end gap-1.5 text-muted shrink-0">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center">
                    <ChevronDownIcon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            )}
            pagination={{
              page: safePage,
              pageSize,
              totalItems: filtered.length,
              onPageChange: handlePageChange,
              onPageSizeChange: handlePageSizeChange,
              pageSizeOptions: [5, 10, 20, 50],
            }}
          >
            {visible.map(({ agent, report, checks, latest, current, missing, changes, isPinned, readiness }, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === visible.length - 1;

              return (
                <AccordionItem
                  key={agent.id}
                  id={agent.id}
                  index={idx}
                  isFirst={isFirst}
                  isLast={isLast}
                  hasProblem={report?.valid === false}
                >
                  <AccordionHeader
                    id={agent.id}
                    icon={<BotIcon className="h-5 w-5 text-accent" />}
                    hasProblem={report?.valid === false}
                    title={
                      <Tooltip content={agent.name} position="top" disabled={agent.name.length < 24}>
                        <div className="text-sm font-semibold text-ink leading-snug truncate">
                          {agent.name}
                        </div>
                      </Tooltip>
                    }
                    subtitle={
                      <Tooltip
                        content={
                          <div className="text-left text-xs space-y-0.5">
                            <div><span className="text-muted">Agent ID:</span> <span className="font-mono">{agent.id}</span></div>
                            <div><span className="text-muted">Last saved:</span> {new Date(agent.draft.saved_at).toLocaleString()}</div>
                            <div><span className="text-muted">Author:</span> {agent.draft.saved_by}</div>
                          </div>
                        }
                        position="top"
                      >
                        <div className="text-xs text-muted leading-snug mt-0.5 truncate cursor-default">
                          <span className="font-mono text-ink-soft">{agent.id}</span>
                          <span className="mx-1 text-muted/60">·</span>
                          <span>saved {timeAgo(agent.draft.saved_at)} by {agent.draft.saved_by}</span>
                        </div>
                      </Tooltip>
                    }
                    status={
                      <>
                        {!!changes && (
                          <Badge variant="neutral" className="h-6 text-xs shrink-0">
                            {changes} unpublished
                          </Badge>
                        )}
                        {missing.length > 0 && (
                          <StatusChip tone="warning" title={missing.join(', ')} className="h-6 text-xs shrink-0">
                            Missing secret
                          </StatusChip>
                        )}
                        <div className="shrink-0 flex items-center">
                          <ChecksBadge view={checks} className="h-6 text-xs" />
                        </div>
                        {readiness && (
                          <div className="shrink-0 flex items-center">
                            <ReadinessIndicator readiness={readiness} />
                          </div>
                        )}
                        <div className="shrink-0 flex items-center">
                          <Badge variant="outline" mono className="h-6 text-xs">
                            {latest ? latest.version : 'Unpublished'}
                          </Badge>
                        </div>
                      </>
                    }
                    actions={
                      <>
                        <Tooltip content={isPinned ? 'Unpin agent' : 'Pin to top of list'} position="top">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinAgent(agent.id);
                            }}
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                              isPinned
                                ? 'text-accent hover:text-accent/80 hover:bg-accent-soft/30'
                                : 'text-muted/60 hover:text-ink hover:bg-subtle'
                            )}
                            aria-label={isPinned ? 'Unpin agent' : 'Pin agent'}
                          >
                            <PinIcon className={cn('h-4 w-4', isPinned && 'fill-accent')} />
                          </button>
                        </Tooltip>

                        <WorkspaceAction agentId={agent.id} agentName={agent.name} />
                      </>
                    }
                  />

                  <AccordionContent>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left column: Deployments + Configuration Health */}
                      <div className="lg:col-span-7 xl:col-span-8 space-y-5">
                        {/* Active Deployments */}
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                              <RocketIcon className="h-3.5 w-3.5 text-accent" />
                              <span>Active Deployments</span>
                            </h4>
                            <span className="text-[11px] text-muted">
                              {Object.keys(current).length > 0
                                ? `${Object.keys(current).length} environment${Object.keys(current).length === 1 ? '' : 's'} live`
                                : 'None deployed yet'}
                            </span>
                          </div>
                          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                            {environments.map((env) => {
                              const deployed = current[env];
                              const isProd = env === 'production';
                              return (
                                <div
                                  key={env}
                                  className={cn(
                                    'flex flex-col justify-between rounded-xl border p-3.5 min-h-[88px] transition-colors',
                                    deployed
                                      ? isProd
                                        ? 'border-accent/35 bg-accent-soft/20 dark:bg-accent-soft/10 shadow-xs'
                                        : 'border-line-strong/60 bg-surface shadow-xs'
                                      : 'border-line/60 bg-surface/60'
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="text-xs font-semibold text-ink">
                                      {envLabel(env)}
                                    </span>
                                    {deployed ? (
                                      <StatusChip
                                        tone={isProd ? 'accent' : 'success'}
                                        dot
                                        className="text-[10px] h-5 px-1.5"
                                      >
                                        Live
                                      </StatusChip>
                                    ) : (
                                      <span className="text-[10px] font-medium text-muted/70 bg-subtle px-1.5 py-0.5 rounded">
                                        Inactive
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-2.5">
                                    {deployed ? (
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="font-mono text-xs font-medium text-ink">
                                          {deployed.version}
                                        </span>
                                        {deployed.deployed_at && (
                                          <span className="text-[10px] text-muted truncate">
                                            · {timeAgo(deployed.deployed_at)}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-muted/70 font-mono">
                                        Not deployed
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Configuration Health */}
                        <div className="pt-1">
                          <div className="flex items-center justify-between mb-2.5">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                              <ShieldCheckIcon className="h-3.5 w-3.5 text-accent" />
                              <span>Configuration Health</span>
                            </h4>
                            {report && report.valid && (
                              <Badge variant="success" dot className="h-5 text-[11px]">
                                All Checks Passed
                              </Badge>
                            )}
                            {report && !report.valid && (
                              <Badge variant="danger" dot className="h-5 text-[11px]">
                                {report.errors.length} {report.errors.length === 1 ? 'Error' : 'Errors'} Found
                              </Badge>
                            )}
                          </div>

                          {!report ? (
                            <div className="rounded-xl border border-line bg-surface p-4 text-xs text-muted flex items-center gap-2.5">
                              {checks?.status === 'failed' ? (
                                <>
                                  <AlertCircleIcon className="h-4 w-4 text-warning shrink-0" />
                                  <span>The server’s checks could not be run: {checks.error}</span>
                                </>
                              ) : (
                                <>
                                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent shrink-0" />
                                  <span>The server is checking the saved draft…</span>
                                </>
                              )}
                            </div>
                          ) : report.valid ? (
                            <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success-soft/30 dark:bg-success-soft/10 p-4 text-xs text-success">
                              <CheckCircle2Icon className="h-4 w-4 shrink-0 text-success" />
                              <div className="min-w-0">
                                <div className="font-semibold text-ink">Configuration checks pass</div>
                                <div className="text-muted mt-0.5">The draft configuration has passed all schema validations and is ready for release.</div>
                              </div>
                            </div>
                          ) : (
                            <div className="max-h-[260px] overflow-y-auto overflow-x-hidden pr-1.5 space-y-2.5">
                              {report.errors.map((err, i) => (
                                <div
                                  key={i}
                                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-danger/25 bg-danger-soft/30 dark:bg-danger-soft/15 p-3 text-xs text-danger transition-colors hover:border-danger/40"
                                >
                                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                    <AlertCircleIcon className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium text-ink break-words leading-relaxed">
                                        {err.message}
                                      </div>
                                      {err.path && (
                                        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                                          <span className="font-mono text-danger/80 bg-danger-soft/50 dark:bg-danger-soft/30 px-1.5 py-0.5 rounded break-all">
                                            {err.path}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="shrink-0 self-end sm:self-center">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => navigate(`/agents/${agent.id}/build`)}
                                      className="h-7 text-xs px-2.5 bg-surface hover:bg-subtle text-ink border-line shadow-xs font-medium"
                                    >
                                      <span>Fix in Build</span>
                                      <ArrowRightIcon className="h-3 w-3 ml-1 text-accent" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right column: Quick Navigation */}
                      <div className="lg:col-span-5 xl:col-span-4 rounded-xl border border-line bg-surface p-4 sm:p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-line/60 pb-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                            <CompassIcon className="h-3.5 w-3.5 text-accent" />
                            <span>Quick Navigation</span>
                          </h4>
                          <span className="text-[11px] text-muted">Workspace Stages</span>
                        </div>

                        <div className="grid gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/agents/${agent.id}/build`)}
                            className="group flex w-full items-center justify-between rounded-lg border border-line/70 bg-canvas/40 p-2.5 text-left transition-all duration-150 hover:border-accent/40 hover:bg-accent-soft/20 dark:hover:bg-accent-soft/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft/40 text-accent group-hover:scale-105 transition-transform">
                                <WrenchIcon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-ink group-hover:text-accent transition-colors">
                                  Configure in Build Stage
                                </div>
                                <div className="text-[11px] text-muted truncate">
                                  Prompts, tools, models & instructions
                                </div>
                              </div>
                            </div>
                            <ChevronRightIcon className="h-4 w-4 text-muted/60 group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                          </button>

                          <button
                            type="button"
                            onClick={() => navigate(`/agents/${agent.id}/test`)}
                            className="group flex w-full items-center justify-between rounded-lg border border-line/70 bg-canvas/40 p-2.5 text-left transition-all duration-150 hover:border-success/40 hover:bg-success-soft/20 dark:hover:bg-success-soft/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft/40 text-success group-hover:scale-105 transition-transform">
                                <PlayIcon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-ink group-hover:text-success transition-colors">
                                  Test Conversation Live
                                </div>
                                <div className="text-[11px] text-muted truncate">
                                  Test conversations & scenario runs
                                </div>
                              </div>
                            </div>
                            <ChevronRightIcon className="h-4 w-4 text-muted/60 group-hover:text-success group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                          </button>

                          <button
                            type="button"
                            onClick={() => navigate(`/agents/${agent.id}/release`)}
                            className="group flex w-full items-center justify-between rounded-lg border border-line/70 bg-canvas/40 p-2.5 text-left transition-all duration-150 hover:border-info/40 hover:bg-info-soft/20 dark:hover:bg-info-soft/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-soft/40 text-info group-hover:scale-105 transition-transform">
                                <RocketIcon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-ink group-hover:text-info transition-colors">
                                  Release & Deployment
                                </div>
                                <div className="text-[11px] text-muted truncate">
                                  Publish versions & target environments
                                </div>
                              </div>
                            </div>
                            <ChevronRightIcon className="h-4 w-4 text-muted/60 group-hover:text-info group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                          </button>

                          <button
                            type="button"
                            onClick={() => navigate(`/agents/${agent.id}/monitor`)}
                            className="group flex w-full items-center justify-between rounded-lg border border-line/70 bg-canvas/40 p-2.5 text-left transition-all duration-150 hover:border-line-strong hover:bg-subtle/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-strong"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-subtle text-ink-soft group-hover:scale-105 transition-transform">
                                <LayersIcon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-ink group-hover:text-ink transition-colors">
                                  Performance Telemetry
                                </div>
                                <div className="text-[11px] text-muted truncate">
                                  Traces, latency, tokens & cost analytics
                                </div>
                              </div>
                            </div>
                            <ChevronRightIcon className="h-4 w-4 text-muted/60 group-hover:text-ink group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}

      <CreateAgentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function WorkspaceAction({ agentId, agentName }: { agentId: string; agentName: string }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const stages = [
    { label: 'Build', path: `/agents/${agentId}/build`, icon: WrenchIcon, description: 'Prompts, tools & models' },
    { label: 'Test', path: `/agents/${agentId}/test`, icon: PlayIcon, description: 'Test conversations & scenario runs' },
    { label: 'Release', path: `/agents/${agentId}/release`, icon: RocketIcon, description: 'Deployments & environments' },
    { label: 'Monitor', path: `/agents/${agentId}/monitor`, icon: EyeIcon, description: 'Traces, latency & costs' },
  ];

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="inline-flex h-8 items-stretch rounded-lg border border-accent/30 bg-accent-soft/25 p-0.5 shadow-xs transition-colors hover:border-accent/50 hover:bg-accent-soft/40 focus-within:ring-2 focus-within:ring-accent/40">
        <Tooltip content="Open workspace builder" position="top">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/agents/${agentId}`);
            }}
            className="flex h-full items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-accent dark:text-accent-strong transition-colors hover:bg-accent hover:text-white dark:hover:bg-accent dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={`Open ${agentName} workspace`}
          >
            <ExternalLinkIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Workspace</span>
          </button>
        </Tooltip>

        <span className="my-1 w-px bg-accent/20" />

        <Tooltip content="Workspace stages menu" position="top">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen((prev) => !prev);
            }}
            aria-expanded={isOpen}
            aria-haspopup="menu"
            className="flex h-full w-7 items-center justify-center rounded-md text-accent dark:text-accent-strong transition-colors hover:bg-accent hover:text-white dark:hover:bg-accent dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Toggle workspace stages menu"
          >
            <ChevronDownIcon className={cn('h-3 w-3 transition-transform duration-150', isOpen && 'rotate-180')} />
          </button>
        </Tooltip>
      </div>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-xl border border-line-strong/40 bg-surface p-1.5 shadow-overlay backdrop-blur"
        >
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Workspace Stages
          </div>
          {stages.map((st) => {
            const Icon = st.icon;
            return (
              <button
                key={st.label}
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  navigate(st.path);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-subtle hover:text-ink focus-visible:bg-subtle focus-visible:outline-none text-ink/90"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-soft/30 text-accent">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="font-medium text-ink">{st.label}</div>
                  <div className="text-[10px] text-muted">{st.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** What the server's checks say about an agent's saved draft, as a badge. */
function ChecksBadge({ view, className }: { view: ValidationView | undefined; className?: string }) {
  if (view?.status === 'checked' && view.report) {
    return view.report.valid ?
    <Badge variant="success" dot className={className}>Checks pass</Badge> :

    <Badge variant="danger" dot className={className}>
        {view.report.errors.length} {view.report.errors.length === 1 ? 'problem' : 'problems'}
      </Badge>;

  }
  if (view?.status === 'failed') return <Badge variant="warning" className={className} title={view.error ?? undefined}>Not checked</Badge>;
  return <Badge variant="neutral" className={className}>Checking…</Badge>;
}

/** Small, visually consistent readiness completion indicator with an accessible tooltip */
function ReadinessIndicator({ readiness }: { readiness: Readiness }) {
  const { done, total, next } = readiness;
  const percent = total > 0 ? Math.round((done / total) * 100) : 100;
  const isComplete = total > 0 && done >= total;
  const remaining = Math.max(0, total - done);

  return (
    <Tooltip
      position="top"
      content={
        <div className="p-1 max-w-[240px] text-left space-y-1.5">
          <div className="flex items-center justify-between gap-3 font-semibold text-xs border-b border-line/50 pb-1 text-ink">
            <span>Readiness Checklist</span>
            <span className="font-mono text-accent">{percent}%</span>
          </div>
          <div className="text-[11px] text-muted">
            {done} of {total} checks passed
            {remaining > 0 ? ` · ${remaining} task${remaining === 1 ? '' : 's'} remaining` : ' · Ready for launch'}
          </div>
          {next && (
            <div className="pt-1 border-t border-line/30 text-[11px]">
              <span className="text-muted">Next task: </span>
              <span className={cn('font-medium', next.state === 'blocked' ? 'text-danger' : 'text-accent')}>
                {next.label}
              </span>
              <p className="text-[10px] text-muted leading-tight mt-0.5">{next.text}</p>
            </div>
          )}
        </div>
      }
    >
      <div
        tabIndex={0}
        role="status"
        aria-label={`Readiness: ${percent}% complete, ${done} of ${total} checks passed.${next ? ` Next task: ${next.label}.` : ''}`}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full cursor-default inline-flex shrink-0"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {isComplete ? (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-success-soft text-success border border-success/30 h-6 select-none">
            <CheckCircle2Icon className="h-3 w-3 shrink-0" />
            <span>Ready</span>
          </span>
        ) : next?.state === 'blocked' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-danger-soft/70 text-danger border border-danger/30 h-6 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-danger shrink-0" />
            <span className="font-mono text-[11px]">{percent}%</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold">Blocked</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-subtle text-ink-soft border border-line h-6 select-none">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent/40 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            <span className="font-mono text-[11px] font-medium">{percent}%</span>
            <span className="text-[10px] text-muted">({done}/{total})</span>
          </span>
        )}
      </div>
    </Tooltip>
  );
}

/** How far an agent is from live, and its next step (the readiness model), as a link to where it is done. */
function NextStepCell({ agentId, readiness }: { agentId: string; readiness: Readiness }) {
  const link = useStepLink(agentId);
  const next = readiness.next;
  return (
    <div className="flex items-center gap-2">
      <ProgressRing done={readiness.done} total={readiness.total} size={22} />
      {next ?
      <Link
        to={link(next)}
        onClick={(e) => e.stopPropagation()}
        title={next.text}
        className={cn('truncate text-[13px] font-medium hover:underline', next.state === 'blocked' ? 'text-danger' : 'text-accent')}>
          {next.label}
        </Link> :

      <span className="text-[13px] font-medium text-success">Live</span>
      }
    </div>);

}
