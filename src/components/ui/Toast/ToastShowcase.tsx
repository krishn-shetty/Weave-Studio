import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Sparkles,
  Layers,
  Zap,
  Trash2,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { useToast } from './ToastContext';

export function ToastShowcase() {
  const { toast, toasts, dismissAll } = useToast();
  const [lastAction, setLastAction] = useState<string | null>(null);

  const triggerSuccess = () => {
    toast.success('Agent Published Successfully', {
      description: 'Customer Support Bot v2.4.0 is now live in Staging environment.',
      action: {
        label: 'View Release',
        onClick: () => setLastAction('Clicked "View Release" on Success toast'),
      },
    });
  };

  const triggerError = () => {
    toast.error('WebSocket Handshake Failed', {
      description: 'Could not establish connection to livekit.weave.internal:443.',
      action: {
        label: 'Retry Connection',
        onClick: () => {
          setLastAction('Clicked "Retry Connection"');
          toast.info('Retrying connection to audio gateway...');
        },
      },
    });
  };

  const triggerWarning = () => {
    toast.warning('Unsaved Draft Changes Detected', {
      description: 'A teammate updated the system prompt 3 minutes ago. Consider merging.',
      action: {
        label: 'Review Diff',
        onClick: () => setLastAction('Clicked "Review Diff"'),
      },
    });
  };

  const triggerInfo = () => {
    toast.info('New LLM Model Available', {
      description: 'Claude 3.5 Sonnet and Gemini 1.5 Pro are now enabled for this agent.',
    });
  };

  const triggerSnackbar = () => {
    toast.snackbar('Draft configuration deleted', {
      variant: 'error',
      description: 'Draft #419 was moved to archive.',
      action: {
        label: 'Undo',
        variant: 'primary',
        onClick: () => {
          setLastAction('Action undone!');
          toast.success('Draft configuration restored');
        },
      },
    });
  };

  const triggerBurst = () => {
    // Rapidly triggers multiple alerts to test concurrent stacking
    toast.info('Starting batch deployment...', { duration: 4000 });
    setTimeout(() => {
      toast.warning('High memory usage detected on node-us-east-1', { duration: 4500 });
    }, 120);
    setTimeout(() => {
      toast.error('Voice synthesizer buffer underflow', { duration: 5000 });
    }, 240);
    setTimeout(() => {
      toast.success('Health checks passed on all backup nodes', { duration: 4000 });
    }, 360);
  };

  const triggerPromise = () => {
    const fakeAsyncJob = new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.2) {
          resolve('Audio synthesis model compiled in 1.4s');
        } else {
          reject(new Error('Compilation timeout'));
        }
      }, 1800);
    });

    toast.promise(fakeAsyncJob, {
      loading: 'Compiling audio synthesis pipeline...',
      success: (msg) => msg,
      error: 'Compilation failed. Please inspect logs.',
    });
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-ink">Toast & Snackbar Alert System</h3>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
              Live Preview
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            High accessible contrast • 4s auto-dismiss countdown • Hover-pause • Top-right non-blocking stack
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted">
            Active in stack: <strong className="text-ink font-semibold">{toasts.length}</strong>
          </span>
          {toasts.length > 0 && (
            <button
              type="button"
              onClick={dismissAll}
              className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger-soft transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* 4 Semantic Variants Row */}
      <div className="mt-6">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted">
          1. Four Semantic Toast Variants
        </label>
        <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Success */}
          <button
            type="button"
            onClick={triggerSuccess}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50/70 p-3 text-left transition hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Success</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Emerald / Green</p>
            </div>
          </button>

          {/* Error */}
          <button
            type="button"
            onClick={triggerError}
            className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-50/70 p-3 text-left transition hover:bg-rose-100/70 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white shadow-sm">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-900 dark:text-rose-200">Error</p>
              <p className="text-[11px] text-rose-700 dark:text-rose-400">Rose / Red</p>
            </div>
          </button>

          {/* Warning */}
          <button
            type="button"
            onClick={triggerWarning}
            className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-50/70 p-3 text-left transition hover:bg-amber-100/70 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Warning</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">Amber / Yellow</p>
            </div>
          </button>

          {/* Info */}
          <button
            type="button"
            onClick={triggerInfo}
            className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-50/70 p-3 text-left transition hover:bg-sky-100/70 dark:bg-sky-950/30 dark:hover:bg-sky-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-sky-900 dark:text-sky-200">Info</p>
              <p className="text-[11px] text-sky-700 dark:text-sky-400">Sky / Blue</p>
            </div>
          </button>
        </div>
      </div>

      {/* Advanced Capabilities Row */}
      <div className="mt-5 pt-5 border-t border-line">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted">
          2. Advanced Interactions & Stress Testing
        </label>
        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          {/* Multi-alert Burst */}
          <button
            type="button"
            onClick={triggerBurst}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-subtle px-3.5 py-2 text-xs font-semibold text-ink transition hover:border-line-strong hover:bg-surface active:scale-95 shadow-sm"
          >
            <Layers className="h-4 w-4 text-accent" />
            <span>Burst Test (4 Alerts at Once)</span>
          </button>

          {/* Snackbar with Undo action */}
          <button
            type="button"
            onClick={triggerSnackbar}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-subtle px-3.5 py-2 text-xs font-semibold text-ink transition hover:border-line-strong hover:bg-surface active:scale-95 shadow-sm"
          >
            <RotateCcw className="h-4 w-4 text-amber-600" />
            <span>Custom Snackbar (with 'Undo' Action)</span>
          </button>

          {/* Async Promise Toast */}
          <button
            type="button"
            onClick={triggerPromise}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-subtle px-3.5 py-2 text-xs font-semibold text-ink transition hover:border-line-strong hover:bg-surface active:scale-95 shadow-sm"
          >
            <Zap className="h-4 w-4 text-sky-600" />
            <span>Async Promise Resolution</span>
          </button>
        </div>
      </div>

      {/* Status & Feedback box */}
      {lastAction && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-subtle/80 px-3 py-2 text-xs text-muted">
          <span>
            Last action callback: <code className="font-mono text-ink font-semibold">{lastAction}</code>
          </span>
          <button
            type="button"
            onClick={() => setLastAction(null)}
            className="text-[11px] underline hover:text-ink"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Feature Checklist */}
      <div className="mt-5 rounded-xl border border-line/60 bg-canvas p-4 text-xs">
        <h4 className="font-semibold text-ink flex items-center gap-1.5 mb-2">
          <ShieldCheck className="h-4 w-4 text-success" />
          Accessibility & Engineering Specifications
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
            <span><strong>WCAG AA/AAA</strong>: 14:1+ text contrast on cards</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
            <span><strong>Top-right positioning</strong>: Offset at top-16/18 below h-14 TopBar</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
            <span><strong>4-Second Auto-dismiss</strong>: Smooth countdown progress bar</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
            <span><strong>Hover & Focus Pause</strong>: Timer freezes on hover/focus</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
            <span><strong>Framer Motion Physics</strong>: Slide-in, slide-out, layout glide</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
            <span><strong>Screen-reader accessible</strong>: role="alert" / role="status"</span>
          </div>
        </div>
      </div>
    </div>
  );
}
