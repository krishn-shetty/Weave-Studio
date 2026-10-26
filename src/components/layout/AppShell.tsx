import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { EyeIcon, FlameIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStudio } from '../../contexts/StudioContext';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandPalette } from '../ui/CommandPalette';
import { CreateAgentDialog } from '../agents/CreateAgentDialog';
import { HelpShortcutsModal } from '../ui/HelpShortcutsModal';
import { Breadcrumbs } from './Breadcrumbs';

export function AppShell() {
  const { user } = useAuth();
  const { activeEnvironment } = useStudio();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const handleOpenPalette = () => setPaletteOpen(true);
    const handleOpenHelp = () => setHelpOpen(true);
    window.addEventListener('open-command-palette', handleOpenPalette);
    window.addEventListener('open-help-modal', handleOpenHelp);

    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in input, textarea, contenteditable, don't trigger ? shortcut
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('open-command-palette', handleOpenPalette);
      window.removeEventListener('open-help-modal', handleOpenHelp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />;

  return (
    <div className="flex min-h-screen w-full bg-canvas text-ink">
      <Sidebar onOpenPalette={() => setPaletteOpen(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenPalette={() => setPaletteOpen(true)} />

        {user.role === 'viewer' && (
          <div className="flex items-center gap-2 border-b border-info/20 bg-info-soft px-6 py-2 text-[13px] text-info" role="status">
            <EyeIcon className="h-4 w-4 shrink-0" aria-hidden />
            You have view access. You can look at agents and calls; changes are turned off. Ask an admin for editor access.
          </div>
        )}

        {activeEnvironment === 'production' && (
          <div className="flex items-center justify-between border-b border-danger/30 bg-danger-soft/60 px-6 py-1.5 text-xs text-danger" role="alert">
            <div className="flex items-center gap-2">
              <FlameIcon className="h-4 w-4 shrink-0" />
              <span className="font-semibold">Active Context: Production Environment.</span>
              <span className="text-ink-soft hidden sm:inline">Actions and deployments alter live customer calls immediately.</span>
            </div>
            <span className="rounded bg-danger-soft px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-danger border border-danger/30">
              Live Serving
            </span>
          </div>
        )}

        <main className="min-w-0 flex-1 flex flex-col">
          <div className="border-b border-line/60 bg-surface/50 backdrop-blur-xs px-4 py-2.5 sm:px-6 lg:px-10">
            <Breadcrumbs />
          </div>
          <div className="flex-1">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onOpenCreate={() => setCreateOpen(true)}
      />
      <CreateAgentDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <HelpShortcutsModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </div>
  );
}