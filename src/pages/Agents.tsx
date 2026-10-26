import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRightIcon,
  BotIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileCodeIcon,
  GripVerticalIcon,
  LayersIcon,
  ListIcon,
  PinIcon,
  PlayIcon,
  PlusIcon,
  RocketIcon,
  SearchIcon,
  TableIcon,
  WrenchIcon,
  XCircleIcon,
} from 'lucide-react';
import { useStudio } from '../contexts/StudioContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { StatusChip } from '../components/ui/StatusChip';
import { Badge } from '../components/ui/Badge';
import { TruncatedText } from '../components/ui/TruncatedText';
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
import { validateConfig } from '../utils/validate';
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
  const rows = useMemo(
    () =>
      agents.map((a) => {
        const report = a.loadError
          ? { valid: false, errors: [{ path: null, message: `Could not load the draft: ${a.loadError}` }], warnings: [], secrets_required: [], unsupported: [] }
          : validateConfig(a.draft.config);
        const latest = latestVersion(a);
        const current = currentDeployments(a);
        const missing = latest?.config ? missingSecrets(validateConfig(latest.config).secrets_required, secretKeys) : [];
        const isPinned = pinnedAgentIds.includes(a.id);
        return { agent: a, report, latest, current, missing, changes: draftChangeCount(a), isPinned };
      }),
    [agents, pinnedAgentIds, secretKeys]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows
      .filter((r) => !needle || r.agent.name.toLowerCase().includes(needle) || r.agent.id.includes(needle))
      .filter((r) => {
        if (status === 'attention') return !r.report.valid || r.missing.length > 0;
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
                <th scope="col" className="px-4 py-2.5 font-medium">Last edited</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ agent, report, latest, current, missing, changes, isPinned }) => (
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
                      {report.valid ? (
                        <StatusChip tone="success" dot>Valid</StatusChip>
                      ) : (
                        <StatusChip tone="danger" dot>
                          {report.errors.length} {report.errors.length === 1 ? 'problem' : 'problems'}
                        </StatusChip>
                      )}
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
            renderOverlay={(item) => (
              <div
                className={cn(
                  'grid grid-cols-[24px_40px_minmax(0,1fr)_auto_auto] gap-x-4 items-center px-5 py-4 min-h-[76px]',
                  'select-none bg-surface rounded-[12px] relative'
                )}
              >
                {!item.report.valid && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px] bg-danger rounded-l-[11px] z-10 pointer-events-none"
                    aria-hidden="true"
                  />
                )}
                {/* 1. Grip */}
                <div className="flex items-center justify-center w-6 shrink-0 text-accent">
                  <GripVerticalIcon className="h-4 w-4" />
                </div>
                {/* 2. Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-subtle text-accent">
                  <BotIcon className="h-5 w-5" />
                </div>
                {/* 3. MAIN */}
                <div className="min-w-0 flex flex-col justify-center">
                  <div className="text-[15px] font-semibold text-ink leading-snug truncate">
                    {item.agent.name}
                  </div>
                  <div className="text-[13px] text-muted leading-snug mt-0.5 truncate">
                    <span className="font-mono text-ink-soft">{item.agent.id}</span>
                    {' · saved '}
                    {timeAgo(item.agent.draft.saved_at)}
                    {' by '}
                    {item.agent.draft.saved_by}
                  </div>
                </div>
                {/* 4. STATUS */}
                <div className="flex items-center justify-end gap-2 shrink-0">
                  {!!item.changes && (
                    <Badge variant="neutral" className="h-6">
                      {item.changes} unpublished
                    </Badge>
                  )}
                  <div className="w-[96px] min-w-[96px] flex justify-center">
                    <Badge
                      variant={item.report.valid ? 'success' : 'danger'}
                      dot
                      className="w-full justify-center h-6"
                    >
                      {item.report.valid
                        ? 'Valid'
                        : `${item.report.errors.length} ${item.report.errors.length === 1 ? 'problem' : 'problems'}`}
                    </Badge>
                  </div>
                  <div className="w-[100px] min-w-[100px] flex justify-center">
                    <Badge variant="outline" mono className="w-full justify-center h-6">
                      {item.latest ? item.latest.version : 'Unpublished'}
                    </Badge>
                  </div>
                </div>
                {/* 5. ACTIONS */}
                <div className="flex items-center justify-end gap-2 text-muted">
                  <ChevronDownIcon className="h-4 w-4" />
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
            {visible.map(({ agent, report, latest, current, missing, changes, isPinned }, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === visible.length - 1;

              return (
                <AccordionItem
                  key={agent.id}
                  id={agent.id}
                  index={idx}
                  isFirst={isFirst}
                  isLast={isLast}
                  hasProblem={!report.valid}
                >
                  <AccordionHeader
                    id={agent.id}
                    icon={<BotIcon className="h-5 w-5 text-accent" />}
                    hasProblem={!report.valid}
                    title={
                      <TruncatedText
                        text={agent.name}
                        className="text-[15px] font-semibold text-ink leading-snug"
                      >
                        {agent.name}
                      </TruncatedText>
                    }
                    subtitle={
                      <TruncatedText
                        text={`${agent.id} · saved ${timeAgo(agent.draft.saved_at)} by ${agent.draft.saved_by}`}
                        className="text-[13px] text-muted leading-snug"
                      >
                        <span className="font-mono text-ink-soft">{agent.id}</span>
                        {' · saved '}
                        {timeAgo(agent.draft.saved_at)}
                        {' by '}
                        {agent.draft.saved_by}
                      </TruncatedText>
                    }
                    status={
                      <>
                        {!!changes && (
                          <Badge variant="neutral" className="h-6">
                            {changes} unpublished
                          </Badge>
                        )}
                        <div className="w-[96px] min-w-[96px] flex justify-center">
                          <Badge
                            variant={report.valid ? 'success' : 'danger'}
                            dot
                            className="w-full justify-center h-6"
                          >
                            {report.valid
                              ? 'Valid'
                              : `${report.errors.length} ${report.errors.length === 1 ? 'problem' : 'problems'}`}
                          </Badge>
                        </div>
                        <div className="w-[100px] min-w-[100px] flex justify-center">
                          <Badge variant="outline" mono className="w-full justify-center h-6">
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
                    <div className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                            Active Deployments
                          </h4>
                          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
                            {environments.map((env) => {
                              const deployed = current[env];
                              return (
                                <div
                                  key={env}
                                  className="rounded-lg border border-line bg-surface p-3 text-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-ink">{envLabel(env)}</span>
                                    {deployed ? (
                                      <StatusChip tone={env === 'production' ? 'accent' : 'success'} dot>
                                        Live
                                      </StatusChip>
                                    ) : (
                                      <span className="text-[11px] text-muted">—</span>
                                    )}
                                  </div>
                                  <div className="mt-2 font-mono text-ink text-[13px]">
                                    {deployed ? deployed.version : 'Not deployed'}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Validation summary */}
                          <div className="mt-5">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                              Configuration Health
                            </h4>
                            {report.valid ? (
                              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-success font-medium">
                                <CheckCircle2Icon className="h-3.5 w-3.5" />
                                All settings and required role bindings are valid.
                              </p>
                            ) : (
                              <div className="mt-2 space-y-1.5">
                                {report.errors.map((err, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between rounded-lg bg-danger-soft/50 px-3 py-2 text-xs text-danger"
                                  >
                                    <span>{err.message}</span>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => navigate(`/agents/${agent.id}/build`)}
                                      className="h-6 text-[11px] py-0 px-2"
                                    >
                                      Fix in Build
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quick Actions & Journey panel */}
                        <div className="rounded-lg border border-line bg-surface/70 p-4 space-y-3">
                          <h4 className="text-xs font-semibold text-ink">Quick Navigation</h4>
                          <div className="grid gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="justify-start"
                              onClick={() => navigate(`/agents/${agent.id}/build`)}
                            >
                              <WrenchIcon className="h-3.5 w-3.5 mr-2 text-accent" />
                              <span>Configure in Build Stage</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="justify-start"
                              onClick={() => navigate(`/agents/${agent.id}/test`)}
                            >
                              <PlayIcon className="h-3.5 w-3.5 mr-2 text-success" />
                              <span>Test Conversation Live</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="justify-start"
                              onClick={() => navigate(`/agents/${agent.id}/release`)}
                            >
                              <RocketIcon className="h-3.5 w-3.5 mr-2 text-info" />
                              <span>Release & Deployment</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="justify-start text-muted hover:text-ink"
                              onClick={() => navigate(`/agents/${agent.id}/monitor`)}
                            >
                              <LayersIcon className="h-3.5 w-3.5 mr-2" />
                              <span>Performance Telemetry</span>
                            </Button>
                          </div>
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