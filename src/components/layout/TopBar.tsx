import React, { useState } from 'react';
import { HelpCircleIcon, MessageSquareIcon, MoonIcon, SearchIcon, SunIcon } from 'lucide-react';
import { EnvironmentBadge } from './EnvironmentBadge';
import { SystemHealthIndicator } from '../ui/SystemHealthIndicator';
import { NotificationCenter } from './NotificationCenter';
import { FeedbackModal } from '../ui/FeedbackModal';
import { HelpShortcutsModal } from '../ui/HelpShortcutsModal';
import { useTheme } from '../../contexts/ThemeContext';

interface TopBarProps {
  onOpenPalette: () => void;
}

export function TopBar({ onOpenPalette }: TopBarProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center justify-between border-b border-line bg-surface/90 px-4 sm:px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <EnvironmentBadge />
          <div className="h-4 w-px bg-line" aria-hidden />
          <SystemHealthIndicator />
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Palette button on desktop */}
          <button
            type="button"
            onClick={onOpenPalette}
            className="hidden sm:flex items-center gap-2 rounded-lg border border-line bg-subtle/60 px-2.5 py-1 text-xs text-muted transition hover:border-line-strong hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            title="Search anything (Ctrl+K)"
          >
            <SearchIcon className="h-3 w-3" />
            <span>Search…</span>
            <kbd className="rounded bg-surface px-1 py-0.5 font-mono text-[10px] text-muted shadow-sm">
              Ctrl K
            </kbd>
          </button>

          {/* Feedback Button */}
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted transition hover:border-line-strong hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            title="Send product feedback"
          >
            <MessageSquareIcon className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Feedback</span>
          </button>

          {/* Notifications Center */}
          <NotificationCenter />

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-line-strong hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
          >
            {isDark ? <SunIcon className="h-4 w-4" aria-hidden /> : <MoonIcon className="h-4 w-4" aria-hidden />}
          </button>

          {/* Help & Shortcuts Button */}
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-line-strong hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            title="Keyboard shortcuts & Help (?)"
            aria-label="Help and shortcuts"
          >
            <HelpCircleIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <HelpShortcutsModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
