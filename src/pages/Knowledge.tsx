import React, { useEffect, useMemo, useState } from 'react';
import { toast } from '../components/ui/Toast';
import {
  BookOpenIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  FileTextIcon,
  LoaderCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
  UploadCloudIcon,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StatusChip } from '../components/ui/StatusChip';
import { Segmented } from '../components/ui/Segmented';
import { Dialog } from '../components/ui/Dialog';
import { Tooltip } from '../components/ui/Tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
} from '../components/ui/accordion';
import { formatBytes, formatDateTime } from '../utils/format';
import { cn, inputClass } from '../utils/styles';
import { api } from '../api/client';
import { useStudio } from '../contexts/StudioContext';
import type { KnowledgeBase, KnowledgeFile, KnowledgeSearchResult } from '../api/types';

type Tab = 'search' | 'bases' | 'files';

function formatUsedBy(usedBy: unknown): string {
  if (Array.isArray(usedBy)) {
    return usedBy.length > 0 ? usedBy.join(', ') : 'All roles';
  }
  if (usedBy && typeof usedBy === 'object') {
    const obj = usedBy as { agents?: string[]; tools?: string[] };
    const agents = Array.isArray(obj.agents) ? obj.agents : [];
    const tools = Array.isArray(obj.tools) ? obj.tools : [];
    const all = [...agents, ...tools];
    return all.length > 0 ? all.join(', ') : 'All roles';
  }
  if (typeof usedBy === 'string' && usedBy.trim()) {
    return usedBy;
  }
  return 'All roles';
}

export function Knowledge() {
  const { agents } = useStudio();
  const [tab, setTab] = useState<Tab>('search');

  // Agent selector
  const [selectedAgentId, setSelectedAgentId] = useState<string>(() => agents[0]?.id || 'voice-test');

  useEffect(() => {
    if (agents.length > 0 && !agents.some((a) => a.id === selectedAgentId)) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ text: string; source: string; score: number }>>([]);
  const [searchMs, setSearchMs] = useState<number | null>(null);

  // Build Job State
  const [buildingBaseId, setBuildingBaseId] = useState<string | null>(null);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);

  // Upload Dialog State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  // Pagination for Accordions
  const [basesPage, setBasesPage] = useState(1);
  const [basesPageSize, setBasesPageSize] = useState(5);
  const [filesPage, setFilesPage] = useState(1);
  const [filesPageSize, setFilesPageSize] = useState(5);

  // Fetch knowledge data for selected agent
  const fetchKnowledge = async () => {
    if (!selectedAgentId) return;
    setLoading(true);
    try {
      const [knowledgeRes, filesRes] = await Promise.allSettled([
        api.getKnowledge(selectedAgentId),
        api.listKnowledgeFiles(selectedAgentId),
      ]);

      let loadedBases: KnowledgeBase[] = [];
      if (knowledgeRes.status === 'fulfilled') {
        const val: any = knowledgeRes.value;
        if (Array.isArray(val)) loadedBases = val;
        else if (val && Array.isArray(val.bases)) loadedBases = val.bases;
      }
      setBases(loadedBases);
      if (loadedBases.length > 0 && (!selectedBaseId || !loadedBases.some((b) => b.id === selectedBaseId))) {
        setSelectedBaseId(loadedBases[0].id);
      }

      if (filesRes.status === 'fulfilled' && Array.isArray(filesRes.value) && filesRes.value.length > 0) {
        setFiles(filesRes.value);
      } else if (knowledgeRes.status === 'fulfilled' && Array.isArray((knowledgeRes.value as any)?.files)) {
        setFiles((knowledgeRes.value as any).files);
      } else {
        setFiles([]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, [selectedAgentId]);

  const selectedBase = useMemo(
    () => bases.find((b) => b.id === selectedBaseId) ?? bases[0],
    [bases, selectedBaseId]
  );

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim() || !selectedBaseId) return;
    setSearching(true);
    try {
      const result: KnowledgeSearchResult = await api.searchKnowledge(selectedAgentId, selectedBaseId, {
        query: searchQuery.trim(),
        top_k: 4,
      });
      setSearchResults(result.hits || []);
      setSearchMs(result.ms);
    } catch (err: any) {
      toast.error('Search failed', { description: err?.message || 'Embedding model or key unavailable.' });
    } finally {
      setSearching(false);
    }
  };

  const handleStartBuild = async (baseId: string) => {
    setBuildingBaseId(baseId);
    setBuildLogs([`[${new Date().toLocaleTimeString()}] Submitting build job for base '${baseId}'...`]);

    try {
      await api.buildKnowledge(selectedAgentId, baseId);
      toast.info('Vector index build started');

      // Poll status
      const pollTimer = setInterval(async () => {
        try {
          const status = await api.knowledgeStatus(selectedAgentId, baseId);
          if (status.build?.log && status.build.log.length > 0) {
            setBuildLogs(status.build.log);
          }
          if (status.build?.status === 'done') {
            clearInterval(pollTimer);
            setBuildingBaseId(null);
            toast.success(`Vector index built for ${baseId}`);
            fetchKnowledge();
          } else if (status.build?.status === 'failed') {
            clearInterval(pollTimer);
            setBuildingBaseId(null);
            toast.error('Build failed', { description: status.problems?.join(', ') || 'Error building index' });
          }
        } catch {
          clearInterval(pollTimer);
          setBuildingBaseId(null);
        }
      }, 1500);
    } catch (err: any) {
      setBuildingBaseId(null);
      toast.error('Could not start build', { description: err?.message || 'Check embedding provider key.' });
    }
  };

  const handleUploadSubmit = async () => {
    const name = uploadedFileName.trim();
    if (!name) return;

    setUploading(true);
    try {
      const filePayload = uploadedFile || new Blob(['Sample knowledge document content.'], { type: 'text/plain' });
      await api.uploadKnowledgeFile(selectedAgentId, name, filePayload);
      toast.success(`File ${name} uploaded`);
      setUploadOpen(false);
      setUploadedFile(null);
      setUploadedFileName('');
      fetchKnowledge();
    } catch (err: any) {
      toast.error('Upload failed', { description: err?.message || 'Upload rejected by server.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    try {
      await api.deleteKnowledgeFile(selectedAgentId, fileName, true);
      toast.success(`File ${fileName} deleted`);
      fetchKnowledge();
    } catch (err: any) {
      toast.error('Delete failed', { description: err?.message });
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Knowledge</h1>
          <p className="mt-1 text-sm text-muted">
            Vector stores, documents, and real semantic search backed by the Agent Builder API.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-muted flex items-center gap-2">
            Agent:
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className={cn(inputClass, 'w-auto py-1 text-xs')}
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.id})
                </option>
              ))}
            </select>
          </label>
          <Button variant="secondary" size="sm" onClick={fetchKnowledge} disabled={loading}>
            <RefreshCwIcon className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setUploadOpen(true)}>
            <PlusIcon className="h-4 w-4" aria-hidden />
            Upload file
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <Segmented
          label="Knowledge View"
          options={[
            { value: 'search', label: 'Semantic Search Test' },
            { value: 'bases', label: `Knowledge Bases (${bases.length})` },
            { value: 'files', label: `Uploaded Files (${files.length})` },
          ]}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
        />
      </div>

      {tab === 'search' && (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-line bg-surface p-6 shadow-panel">
            <h2 className="text-base font-semibold text-ink">Semantic Search Try-It</h2>
            <p className="mt-1 text-sm text-muted">
              Test what passages your agent retrieves for a customer query using real vector search.
            </p>

            {bases.length === 0 ? (
              <div className="mt-6 rounded-lg border border-line bg-subtle p-6 text-center text-sm text-muted">
                No knowledge base configured for {selectedAgentId} yet. Define a knowledge base in your bot configuration or select another agent.
              </div>
            ) : (
              <>
                <form onSubmit={handleSearch} className="mt-5 flex gap-2">
                  <div className="relative flex-1">
                    <SearchIcon
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                      aria-hidden
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. When are bills due? Can I pay online?"
                      className={cn(inputClass, 'pl-9 text-sm')}
                    />
                  </div>
                  <Button variant="primary" type="submit" disabled={searching || !searchQuery.trim()}>
                    {searching ? (
                      <>
                        <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden />
                        Searching…
                      </>
                    ) : (
                      'Search base'
                    )}
                  </Button>
                </form>

                {searchMs !== null && (
                  <p className="mt-2 text-xs text-muted">
                    Returned {searchResults.length} passages in {searchMs}ms
                  </p>
                )}

                <div className="mt-6 space-y-3">
                  {searchResults.length === 0 ? (
                    <p className="text-xs text-muted italic">Type a query above to test retrieval against this base.</p>
                  ) : (
                    searchResults.map((hit, i) => (
                      <div key={i} className="rounded-lg border border-line bg-canvas p-4 text-sm">
                        <div className="flex items-center justify-between text-xs text-muted">
                          <span className="font-medium text-ink">{hit.source}</span>
                          <span className="font-mono text-accent">Score: {(hit.score * 100).toFixed(1)}%</span>
                        </div>
                        <p className="mt-2 text-ink-soft leading-relaxed">{hit.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'bases' && (
        <div className="mt-6 space-y-6">
          {bases.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-12 text-center text-sm text-muted">
              No knowledge bases defined in this bot’s draft configuration.
            </div>
          ) : (
            <Accordion
              items={bases.slice((basesPage - 1) * basesPageSize, basesPage * basesPageSize)}
              onReorder={(newItems) => {
                const start = (basesPage - 1) * basesPageSize;
                const next = [...bases];
                next.splice(start, newItems.length, ...newItems);
                setBases(next);
              }}
              enableReordering={true}
              enableDragAndDrop={true}
              pagination={{
                page: basesPage,
                pageSize: basesPageSize,
                totalItems: bases.length,
                onPageChange: (p) => setBasesPage(p),
                onPageSizeChange: (s) => {
                  setBasesPageSize(s);
                  setBasesPage(1);
                },
                pageSizeOptions: [3, 5, 10],
              }}
            >
              {bases.slice((basesPage - 1) * basesPageSize, basesPage * basesPageSize).map((base, idx, arr) => {
                const isFirst = idx === 0;
                const isLast = idx === arr.length - 1;

                return (
                  <AccordionItem
                    key={base.id}
                    id={base.id}
                    index={idx}
                    isFirst={isFirst}
                    isLast={isLast}
                  >
                    <AccordionHeader
                      id={base.id}
                      icon={<DatabaseIcon className="h-4 w-4 text-accent" />}
                      title={base.id}
                      subtitle={`Type: ${base.type} · Mode: ${base.mode}`}
                      badge={
                        <StatusChip
                          tone={base.embedding_key_available ? 'success' : 'warning'}
                          dot
                        >
                          {base.build?.status || 'Ready'}
                        </StatusChip>
                      }
                      actions={
                        <Tooltip content="Build and sync vector embeddings" position="top">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleStartBuild(base.id)}
                            disabled={buildingBaseId === base.id}
                            className="h-8 px-2.5 text-xs"
                          >
                            {buildingBaseId === base.id ? (
                              <>
                                <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin mr-1" />
                                Building…
                              </>
                            ) : (
                              'Build Index'
                            )}
                          </Button>
                        </Tooltip>
                      }
                    />

                    <AccordionContent>
                      <div className="space-y-4">
                        {buildingBaseId === base.id && buildLogs.length > 0 && (
                          <div className="rounded-lg bg-black/90 p-3 font-mono text-xs text-green-400">
                            {buildLogs.map((l, i) => (
                              <p key={i}>{l}</p>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                          <div className="rounded-lg border border-line bg-surface p-3">
                            <span className="text-muted block">Sources</span>
                            <span className="text-ink font-semibold mt-1 block">
                              {base.sources?.length || 0} files
                            </span>
                          </div>
                          <div className="rounded-lg border border-line bg-surface p-3">
                            <span className="text-muted block">Used by</span>
                            <span className="text-ink font-semibold mt-1 block truncate">
                              {formatUsedBy(base.used_by)}
                            </span>
                          </div>
                          <div className="rounded-lg border border-line bg-surface p-3">
                            <span className="text-muted block">Embedding Key</span>
                            <span
                              className={cn(
                                'font-semibold mt-1 block',
                                base.embedding_key_available ? 'text-success' : 'text-warning'
                              )}
                            >
                              {base.embedding_key_available ? 'Available' : 'Missing'}
                            </span>
                          </div>
                          <div className="rounded-lg border border-line bg-surface p-3">
                            <span className="text-muted block">Vector Status</span>
                            <span className="text-ink font-semibold mt-1 block capitalize">
                              {base.build?.status || 'Ready'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      )}

      {tab === 'files' && (
        <div className="mt-6">
          {files.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-12 text-center text-sm text-muted">
              No files uploaded for {selectedAgentId} yet. Click "Upload file" to add guides, FAQs, or markdown.
            </div>
          ) : (
            <Accordion
              items={files.slice((filesPage - 1) * filesPageSize, filesPage * filesPageSize)}
              onReorder={(newItems) => {
                const start = (filesPage - 1) * filesPageSize;
                const next = [...files];
                next.splice(start, newItems.length, ...newItems);
                setFiles(next);
              }}
              enableReordering={true}
              enableDragAndDrop={true}
              pagination={{
                page: filesPage,
                pageSize: filesPageSize,
                totalItems: files.length,
                onPageChange: (p) => setFilesPage(p),
                onPageSizeChange: (s) => {
                  setFilesPageSize(s);
                  setFilesPage(1);
                },
                pageSizeOptions: [5, 10, 20],
              }}
            >
              {files.slice((filesPage - 1) * filesPageSize, filesPage * filesPageSize).map((file, idx, arr) => {
                const isFirst = idx === 0;
                const isLast = idx === arr.length - 1;

                return (
                  <AccordionItem
                    key={file.name}
                    id={file.name}
                    index={idx}
                    isFirst={isFirst}
                    isLast={isLast}
                  >
                    <AccordionHeader
                      id={file.name}
                      icon={<FileTextIcon className="h-4 w-4 text-muted" />}
                      title={file.name}
                      subtitle={`Modified: ${formatDateTime(file.modified)}`}
                      badge={
                        <span className="rounded bg-subtle px-2 py-0.5 font-mono text-[11px] text-muted font-medium">
                          {formatBytes(file.size)}
                        </span>
                      }
                      actions={
                        <Tooltip content={`Delete file ${file.name}`} position="top">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFile(file.name)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            aria-label={`Delete ${file.name}`}
                          >
                            <Trash2Icon className="h-3.5 w-3.5" />
                          </Button>
                        </Tooltip>
                      }
                    />

                    <AccordionContent>
                      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
                        <div>
                          <p className="font-medium text-ink">Document Indexing State</p>
                          <p className="text-muted mt-0.5">
                            Ready for chunking, vector embeddings, and retrieval-augmented generation.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-muted text-[11px]">
                            {file.size} bytes
                          </span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Knowledge Document"
        description="Upload a text, markdown, PDF or JSON document directly to this bot on the Agent Builder server."
        footer={
          <>
            <Button variant="ghost" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUploadSubmit} disabled={!uploadedFileName.trim() || uploading}>
              {uploading ? (
                <>
                  <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden />
                  Uploading…
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-ink-soft block">Choose file from disk</label>
            <input
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setUploadedFile(f);
                  setUploadedFileName(f.name);
                }
              }}
              className="mt-1 text-xs text-muted"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-ink-soft block">File Name on Server</label>
            <input
              type="text"
              value={uploadedFileName}
              onChange={(e) => setUploadedFileName(e.target.value)}
              placeholder="e.g. faq_customer_guide.md"
              className={cn(inputClass, 'mt-1 text-sm')}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
