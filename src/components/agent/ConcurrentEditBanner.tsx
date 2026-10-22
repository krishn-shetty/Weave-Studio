import React, { useEffect, useState } from 'react';
import { AlertTriangleIcon, GitMergeIcon, RefreshCwIcon, UserIcon, XIcon } from 'lucide-react';
import type { DraftEditor } from '../../hooks/useDraftEditor';
import { timeAgo } from '../../utils/format';

interface ConcurrentEditBannerProps {
  editor: DraftEditor;
  onOpenConflict: () => void;
}

export function ConcurrentEditBanner({ editor, onOpenConflict }: ConcurrentEditBannerProps) {
  const [detectedConflict, setDetectedConflict] = useState<{
    who: string;
    revision: number;
    at: string;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // If the editor status itself became conflict, show the banner
    if (editor.status === 'conflict') {
      setDetectedConflict({
        who: 'Priya Nair',
        revision: (editor.baseRevision ?? 1) + 1,
        at: new Date().toISOString(),
      });
      setDismissed(false);
    }
  }, [editor.status, editor.baseRevision]);

  // Periodic simulated polling every 15s per FR-29
  useEffect(() => {
    const timer = setInterval(() => {
      // In production, this calls GET /bots/{id}/draft and compares revision with editor.baseRevision
      // If server revision > editor.baseRevision, trigger banner
    }, 15000);
    return () => clearInterval(timer);
  }, [editor.baseRevision]);

  const simulateExternalSave = () => {
    setDetectedConflict({
      who: 'Sarah Miller',
      revision: (editor.baseRevision ?? 1) + 1,
      at: new Date().toISOString(),
    });
    setDismissed(false);
  };

  if (!detectedConflict || dismissed) {
    return (
      <div className="hidden">
        <button id="simulate-concurrent-edit-btn" onClick={simulateExternalSave}>
          Simulate
        </button>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-xs text-ink animate-in fade-in slide-in-from-top-1"
    >
      <div className="flex items-center gap-2.5">
        <AlertTriangleIcon className="h-4 w-4 shrink-0 text-warning" />
        <div>
          <span className="font-semibold text-ink">
            Concurrent change detected:
          </span>{' '}
          <span className="text-ink-soft">
            {detectedConflict.who} saved draft revision {detectedConflict.revision} ({timeAgo(detectedConflict.at)}).
            Your editor currently holds revision {editor.baseRevision}.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenConflict}
          className="flex items-center gap-1.5 rounded-lg bg-ink px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <GitMergeIcon className="h-3.5 w-3.5" />
          Review diff & merge
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 text-muted hover:text-ink rounded"
          title="Dismiss notification"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
