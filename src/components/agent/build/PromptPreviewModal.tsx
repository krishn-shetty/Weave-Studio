import { useEffect, useState } from 'react';
import { toast } from '../../ui/Toast';
import { CopyIcon, RefreshCwIcon, TriangleAlertIcon } from 'lucide-react';
import type { AgentConfig } from '../../../types/studio';
import type { PromptPreview } from '../../../api/types';
import { api } from '../../../api/client';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { StatusChip } from '../../ui/StatusChip';
import { cn, inputClass } from '../../../utils/styles';

interface PromptPreviewModalProps {
  open: boolean;
  onClose: () => void;
  config: AgentConfig;
}

/**
 * The exact instructions an agent would get, built by the server (POST /preview/prompt) from what is in the editor now,
 * unsaved edits included. Channel, agent and time are what-ifs.
 */
export function PromptPreviewModal({ open, onClose, config }: PromptPreviewModalProps) {
  const channels = (config.channels ?? []).filter((c) => c.enabled);
  const agents = config.agents?.items ?? [];
  const [channelId, setChannelId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [now, setNow] = useState('');
  const [preview, setPreview] = useState<PromptPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const body: Record<string, unknown> = { config };
    if (channelId) body.channel = channelId;
    if (agentId) body.agent = agentId;
    if (now) body.now = now;
    setLoading(true);
    setError(null);
    // Debounced: the config changes on every keystroke while the dialog is open.
    const timer = window.setTimeout(() => {
      api
        .previewPrompt(body, { signal: controller.signal })
        .then(setPreview)
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setError(err instanceof Error ? err.message : 'The server could not build the preview.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, config, channelId, agentId, now, attempt]);

  const handleCopy = () => {
    if (!preview) return;
    navigator.clipboard.writeText(preview.instructions).then(
      () => toast.success('Instructions copied'),
      () => toast.error('Could not copy to the clipboard')
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Prompt preview"
      description="The exact instructions the agent would get, built by the server from what is in the editor now (unsaved edits included)."
      footer={
        <>
          <Button variant="secondary" onClick={handleCopy} disabled={!preview}>
            <CopyIcon className="h-4 w-4" aria-hidden />
            Copy instructions
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4">
          <label className="block">
            <span className="block text-xs font-medium text-muted">Channel</span>
            <select className={cn(inputClass, 'mt-1 w-44')} value={channelId} onChange={(e) => setChannelId(e.target.value)}>
              <option value="">Default</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id} title={c.id}>
                  {c.type === 'web_chat' ? 'Web chat' : c.type === 'web_voice' ? 'Web voice' : 'Phone'} ({c.id})
                </option>
              ))}
            </select>
          </label>
          {agents.length > 1 && (
            <label className="block">
              <span className="block text-xs font-medium text-muted">Agent</span>
              <select className={cn(inputClass, 'mt-1 w-48')} value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                <option value="">The one callers meet first</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id} title={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className="block text-xs font-medium text-muted">What if it were</span>
            <input type="datetime-local" className={cn(inputClass, 'mt-1 w-56')} value={now} onChange={(e) => setNow(e.target.value)} />
          </label>
          {preview && (
            <p className="ml-auto text-xs text-muted" aria-live="polite">
              {preview.stats.words} words · about {preview.stats.approx_tokens} tokens · {preview.stats.tools_offered}{' '}
              {preview.stats.tools_offered === 1 ? 'tool' : 'tools'} offered
            </p>
          )}
        </div>

        {error ? (
          <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm">
            <p className="text-danger">The server could not build the preview: {error}</p>
            <Button size="sm" variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
              <RefreshCwIcon className="h-3.5 w-3.5" aria-hidden />
              Try again
            </Button>
          </div>
        ) : !preview ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading the preview">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-line p-3">
                <div className="h-3 w-32 animate-pulse rounded bg-subtle" />
                <div className="mt-2 h-3 w-full animate-pulse rounded bg-subtle" />
                <div className="mt-1.5 h-3 w-4/5 animate-pulse rounded bg-subtle" />
              </div>
            ))}
          </div>
        ) : (
          <div className={cn('space-y-5 transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
            {preview.warnings.length > 0 && (
              <ul className="space-y-1.5 rounded-lg border border-warning/30 bg-warning-soft p-3">
                {preview.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-ink-soft">
                    <TriangleAlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                    {typeof w === 'string' ? w : w.message}
                  </li>
                ))}
              </ul>
            )}

            {(preview.greeting || preview.opening) && (
              <section aria-labelledby="pp-first">
                <h3 id="pp-first" className="text-sm font-medium text-ink">
                  First words
                </h3>
                {preview.greeting && <p className="mt-1 text-sm text-ink-soft">Says: “{preview.greeting}”</p>}
                {preview.opening && <p className="mt-1 text-sm text-ink-soft">Told to: {preview.opening}</p>}
              </section>
            )}

            <section aria-labelledby="pp-sections">
              <h3 id="pp-sections" className="text-sm font-medium text-ink">
                Instructions for {preview.agent.name}
                {preview.channel && <span className="font-normal text-muted"> on {preview.channel.id}</span>}
              </h3>
              <ol className="mt-2 space-y-2">
                {preview.sections.map((s, i) => (
                  <li key={`${s.kind}-${i}`} className={cn('rounded-lg border p-3', s.active ? 'border-line bg-surface' : 'border-dashed border-line bg-subtle/40')}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-ink" title={s.kind}>
                        {s.label}
                      </span>
                      {!s.active && <StatusChip>Not in the prompt right now</StatusChip>}
                      {s.when && <span className="text-xs text-muted">when {s.when}</span>}
                    </div>
                    <p className={cn('mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed', s.active ? 'text-ink-soft' : 'text-muted')}>{s.text}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section aria-labelledby="pp-tools">
              <h3 id="pp-tools" className="text-sm font-medium text-ink">
                Tools the model sees
              </h3>
              {preview.tools.length === 0 ? (
                <p className="mt-1 text-sm text-muted">None.</p>
              ) : (
                <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
                  {preview.tools.map((t) => (
                    <li key={t.id ?? t.name} className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-medium text-ink">{t.name}</span>
                        {t.offered ? <StatusChip tone="success">Offered</StatusChip> : <StatusChip tone="warning">Not offered</StatusChip>}
                      </div>
                      {t.description && <p className="mt-1 text-[13px] text-ink-soft">{t.description}</p>}
                      {!t.offered && t.reason && <p className="mt-1 text-xs text-warning">{t.reason}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </Dialog>
  );
}
