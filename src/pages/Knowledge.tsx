import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
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
  UploadCloudIcon
} from 'lucide-react';
import {
  initialKnowledgeBases,
  initialKnowledgeFiles,
  KnowledgeBaseItem,
  KnowledgeFile,
  sampleQueryMatches
} from '../data/knowledgeData';
import { Button } from '../components/ui/Button';
import { StatusChip } from '../components/ui/StatusChip';
import { Segmented } from '../components/ui/Segmented';
import { Dialog } from '../components/ui/Dialog';
import { formatBytes, formatDateTime } from '../utils/format';
import { cn, inputClass } from '../utils/styles';

type Tab = 'search' | 'bases' | 'files';

export function Knowledge() {
  const [tab, setTab] = useState<Tab>('search');
  const [bases, setBases] = useState<KnowledgeBaseItem[]>(initialKnowledgeBases);
  const [files, setFiles] = useState<KnowledgeFile[]>(initialKnowledgeFiles);
  const [selectedBaseId, setSelectedBaseId] = useState<string>('billing_policies');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(sampleQueryMatches.bill);

  // Build Job State
  const [buildingBaseId, setBuildingBaseId] = useState<string | null>(null);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);

  // Upload Dialog State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  const selectedBase = useMemo(
    () => bases.find((b) => b.id === selectedBaseId) ?? bases[0],
    [bases, selectedBaseId]
  );

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);

    window.setTimeout(() => {
      const q = searchQuery.toLowerCase();
      let matches = sampleQueryMatches.default;
      if (q.includes('bill') || q.includes('pay') || q.includes('debit') || q.includes('cost') || q.includes('tariff')) {
        matches = sampleQueryMatches.bill;
      } else if (q.includes('outage') || q.includes('gas') || q.includes('leak') || q.includes('emergency') || q.includes('power')) {
        matches = sampleQueryMatches.outage;
      } else if (q.includes('appoint') || q.includes('dentist') || q.includes('clinic') || q.includes('book')) {
        matches = sampleQueryMatches.appointment;
      }
      setSearchResults(matches);
      setSearching(false);
    }, 450);
  };

  const handleStartBuild = (baseId: string) => {
    setBuildingBaseId(baseId);
    setBuildProgress(10);
    setBuildLogs([
      `[${new Date().toLocaleTimeString()}] Fetching source documents for base '${baseId}'...`,
      `[${new Date().toLocaleTimeString()}] Chunking text passages using recursive splitter (500 tokens, 50 overlap)...`
    ]);

    const step1 = setTimeout(() => {
      setBuildProgress(45);
      setBuildLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Generating embeddings via text-embedding-3-small (1536 dim)...`,
        `[${new Date().toLocaleTimeString()}] Embedding batch 1/3 (50 passages completed)...`
      ]);
    }, 900);

    const step2 = setTimeout(() => {
      setBuildProgress(80);
      setBuildLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Building HNSW vector index with cosine similarity...`,
        `[${new Date().toLocaleTimeString()}] Verifying index consistency and writing metadata...`
      ]);
    }, 1800);

    const step3 = setTimeout(() => {
      setBuildProgress(100);
      setBuildLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Index build complete. 182 passages indexed successfully.`
      ]);
      setBuildingBaseId(null);
      setBases((prev) =>
        prev.map((b) =>
          b.id === baseId
            ? { ...b, status: 'ready', lastBuilt: new Date().toISOString(), passagesCount: b.passagesCount + 14 }
            : b
        )
      );
      toast.success('Knowledge index built successfully', {
        description: 'New passages are live for test searches and agent retrieval.'
      });
    }, 2700);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
    };
  };

  const handleUploadSubmit = () => {
    if (!uploadedFileName.trim()) return;
    setUploading(true);

    window.setTimeout(() => {
      const ext = uploadedFileName.endsWith('.pdf')
        ? 'pdf'
        : uploadedFileName.endsWith('.csv')
        ? 'csv'
        : 'markdown';

      const newFile: KnowledgeFile = {
        id: `f-${Date.now()}`,
        name: uploadedFileName.trim(),
        sizeBytes: 154200,
        modified: new Date().toISOString(),
        type: ext,
        usedByBases: [selectedBaseId]
      };

      setFiles((prev) => [newFile, ...prev]);
      setBases((prev) =>
        prev.map((b) =>
          b.id === selectedBaseId
            ? { ...b, files: [...b.files, newFile.name], status: 'needs_rebuild' }
            : b
        )
      );

      setUploading(false);
      setUploadOpen(false);
      setUploadedFileName('');
      toast.success(`'${newFile.name}' uploaded`, {
        description: `Associated with '${selectedBase.name}'. Rebuild the index to update search.`
      });
    }, 800);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Knowledge</h1>
          <p className="mt-1 text-sm text-muted">
            Upload company policies and manuals, build vector indices, and test retrieval for your agents.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setUploadOpen(true)}>
            <UploadCloudIcon className="h-4 w-4" aria-hidden />
            Upload document
          </Button>
          <Button
            variant="primary"
            disabled={buildingBaseId !== null}
            onClick={() => handleStartBuild(selectedBaseId)}
          >
            {buildingBaseId === selectedBaseId ? (
              <>
                <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden />
                Building index…
              </>
            ) : (
              <>
                <RefreshCwIcon className="h-4 w-4" aria-hidden />
                Build index
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <Segmented
          label="Knowledge View"
          options={[
            { value: 'search', label: 'Test Vector Search' },
            { value: 'bases', label: 'Knowledge Bases' },
            { value: 'files', label: 'Uploaded Files' }
          ]}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
        />
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>Active base:</span>
          <select
            className={cn(inputClass, 'w-auto py-1 text-xs')}
            value={selectedBaseId}
            onChange={(e) => setSelectedBaseId(e.target.value)}
          >
            {bases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.passagesCount} passages)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Building Job Alert */}
      {buildingBaseId && (
        <div className="mt-6 rounded-xl border border-line bg-surface p-5 shadow-panel" aria-live="polite">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <LoaderCircleIcon className="h-5 w-5 animate-spin text-accent" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-ink">
                  Building index for {selectedBase.name}
                </p>
                <p className="text-xs text-muted">
                  Embedding passages using {selectedBase.embeddingModel}. The previous index continues serving callers during build.
                </p>
              </div>
            </div>
            <span className="font-mono text-sm font-semibold text-accent">{buildProgress}%</span>
          </div>

          <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-subtle">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${buildProgress}%` }}
            />
          </div>

          <div className="mt-3 max-h-28 overflow-y-auto rounded-lg bg-canvas p-2.5 font-mono text-[11px] text-muted">
            {buildLogs.map((log, i) => (
              <p key={i}>{log}</p>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1: TEST SEARCH */}
      {tab === 'search' && (
        <div className="mt-6 space-y-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask a question or test search term, e.g. 'direct debit payment dates', 'gas leak smell', or 'copay'..."
                className={cn(inputClass, 'pl-9 text-sm')}
              />
            </div>
            <Button variant="primary" type="submit" disabled={searching}>
              {searching ? (
                <>
                  <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden />
                  Searching…
                </>
              ) : (
                'Run test search'
              )}
            </Button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
            <div className="flex items-center gap-2">
              <span>Quick tests:</span>
              {['Direct debit due date', 'Suspected gas leak', 'Cancellation fee'].map((queryText) => (
                <button
                  key={queryText}
                  type="button"
                  onClick={() => {
                    setSearchQuery(queryText);
                    window.setTimeout(() => handleSearch(), 50);
                  }}
                  className="rounded-full bg-subtle px-2.5 py-1 text-ink-soft transition hover:bg-line hover:text-ink"
                >
                  {queryText}
                </button>
              ))}
            </div>
            <span>
              {searchResults.length} ranked {searchResults.length === 1 ? 'passage hit' : 'passage hits'}
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-ink">Retrieved Passages & Relevance Scores</h2>
              {searchResults.map((hit, idx) => {
                const isHigh = hit.score >= 0.85;
                const isMed = hit.score >= 0.65 && hit.score < 0.85;
                return (
                  <article
                    key={hit.id}
                    className="rounded-xl border border-line bg-surface p-4 shadow-panel transition hover:border-line-strong"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5 text-xs">
                      <div className="flex items-center gap-2 font-mono text-muted">
                        <FileTextIcon className="h-3.5 w-3.5 text-accent" aria-hidden />
                        <span className="font-semibold text-ink">{hit.source}</span>
                        {hit.location && <span>· {hit.location}</span>}
                      </div>
                      <StatusChip tone={isHigh ? 'success' : isMed ? 'accent' : 'neutral'}>
                        {(hit.score * 100).toFixed(0)}% Match ({hit.score})
                      </StatusChip>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                      {hit.passage}
                    </p>
                  </article>
                );
              })}
            </div>

            {/* Model Injection Preview */}
            <div className="self-start rounded-xl border border-line bg-surface p-5 shadow-panel">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-4 w-4 text-accent" aria-hidden />
                <h3 className="text-sm font-semibold text-ink">What the Model Sees</h3>
              </div>
              <p className="mt-1 text-xs text-muted">
                How top-scoring passages are injected into the agent&apos;s system context during runtime calls.
              </p>
              <div className="mt-3.5 rounded-lg bg-canvas p-3 font-mono text-xs leading-relaxed text-ink-soft">
                <p className="text-muted"># RETRIEVED KNOWLEDGE (Score &gt;= 0.60):</p>
                {searchResults.slice(0, 2).map((s, i) => (
                  <div key={i} className="mt-2 border-t border-line/60 pt-2">
                    <p className="text-[11px] font-semibold text-accent">
                      [Document: {s.source}]
                    </p>
                    <p className="mt-1 text-[11px] text-ink">{s.passage}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
                <CheckCircle2Icon className="h-3.5 w-3.5 text-success" />
                Agents quote source documents and never invent policy details.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KNOWLEDGE BASES */}
      {tab === 'bases' && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bases.map((base) => (
              <div
                key={base.id}
                className={cn(
                  'flex flex-col justify-between rounded-xl border p-5 transition shadow-panel',
                  selectedBaseId === base.id ? 'border-accent bg-accent-soft/20' : 'border-line bg-surface'
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <StatusChip tone={base.status === 'ready' ? 'success' : 'warning'}>
                      {base.status === 'ready' ? 'Index Ready' : 'Needs Rebuild'}
                    </StatusChip>
                    <span className="font-mono text-xs text-muted">
                      {base.passagesCount} passages
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-ink">{base.name}</h3>
                  <p className="mt-1 text-xs text-muted leading-relaxed">{base.description}</p>

                  <div className="mt-4 space-y-1.5 border-t border-line/60 pt-3 text-xs text-muted">
                    <p>
                      <span className="font-medium text-ink">Files:</span> {base.files.join(', ')}
                    </p>
                    <p>
                      <span className="font-medium text-ink">Used by:</span> {base.agentsUsing.join(', ')}
                    </p>
                    <p>
                      <span className="font-medium text-ink">Model:</span> {base.embeddingModel}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-2 pt-2">
                  <Button
                    size="sm"
                    variant={selectedBaseId === base.id ? 'primary' : 'secondary'}
                    onClick={() => setSelectedBaseId(base.id)}
                  >
                    {selectedBaseId === base.id ? 'Selected base' : 'Select'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleStartBuild(base.id)}
                    disabled={buildingBaseId !== null}
                  >
                    Rebuild
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: UPLOADED FILES */}
      {tab === 'files' && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Document Name</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Type</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Size</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Modified</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Associated Bases</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-canvas">
                  <td className="px-4 py-3 font-medium text-ink">
                    <div className="flex items-center gap-2">
                      <FileTextIcon className="h-4 w-4 text-accent" />
                      <span>{file.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 uppercase text-xs text-muted">{file.type}</td>
                  <td className="px-4 py-3 text-xs text-muted">{formatBytes(file.sizeBytes)}</td>
                  <td className="px-4 py-3 text-xs text-muted">{formatDateTime(file.modified)}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {file.usedByBases.map((b) => (
                        <span key={b} className="rounded bg-subtle px-1.5 py-0.5 text-muted">
                          {b}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setFiles((prev) => prev.filter((f) => f.id !== file.id));
                        toast.success(`Removed ${file.name}`);
                      }}
                      title="Remove file"
                    >
                      <Trash2Icon className="h-3.5 w-3.5 text-muted hover:text-danger" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Document"
        description="Add PDF guides, Markdown FAQ documents, or CSV tables to index for agent retrieval."
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
                'Upload and link to base'
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink">File Name or Preset</label>
            <input
              type="text"
              value={uploadedFileName}
              onChange={(e) => setUploadedFileName(e.target.value)}
              placeholder="e.g. refund_policy_2026.pdf"
              className={cn(inputClass, 'mt-1 text-sm')}
            />
          </div>

          <div>
            <span className="text-xs text-muted">Quick sample presets:</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[
                'customer_disputes_code_of_practice.pdf',
                'residential_ev_charging_tariffs.md',
                'service_level_agreements_v2.pdf'
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setUploadedFileName(preset)}
                  className="rounded-md border border-line bg-subtle px-2 py-1 text-xs text-ink hover:bg-line-strong/20"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-subtle p-3 text-xs text-muted">
            <p className="font-medium text-ink">Target knowledge base:</p>
            <p className="mt-0.5">{selectedBase.name} ({selectedBase.id})</p>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
