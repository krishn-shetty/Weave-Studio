import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3Icon, BookOpenIcon, BotIcon, CommandIcon, HouseIcon, LibraryIcon, LogOutIcon, PhoneCallIcon, SearchIcon, SettingsIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { WeaveMark } from '../ui/WeaveMark';
import { cn } from '../../utils/styles';

const nav = [
  { to: '/', label: 'Home', icon: HouseIcon, end: true },
  { to: '/agents', label: 'Agents', icon: BotIcon, end: false },
  { to: '/analytics', label: 'Analytics', icon: BarChart3Icon, end: false },
  { to: '/knowledge', label: 'Knowledge', icon: BookOpenIcon, end: false },
  { to: '/calls', label: 'Calls', icon: PhoneCallIcon, end: false },
  { to: '/library', label: 'Library', icon: LibraryIcon, end: false },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false }
];

const roleLabel = { admin: 'Admin', editor: 'Editor', viewer: 'Viewer' } as const;

export function Sidebar({ onOpenPalette }: { onOpenPalette?: () => void }) {
  const { user, signOut } = useAuth();
  return (
    <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r border-line bg-surface lg:w-60">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <WeaveMark />
        <span className="hidden text-[15px] font-semibold tracking-tight text-ink lg:inline">Weave Studio</span>
      </div>

      <div className="px-2.5 pt-1 pb-2">
        <button
          type="button"
          onClick={() => onOpenPalette ? onOpenPalette() : window.dispatchEvent(new CustomEvent('open-command-palette'))}
          className="flex w-full items-center justify-between rounded-lg border border-line bg-subtle/60 px-2.5 py-1.5 text-xs text-muted transition hover:border-line-strong hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          title="Search anything (Ctrl+K)"
        >
          <span className="flex items-center gap-2">
            <SearchIcon className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden lg:inline">Quick search…</span>
          </span>
          <kbd className="hidden rounded bg-surface px-1 py-0.5 font-mono text-[10px] text-muted shadow-sm lg:inline">
            Ctrl K
          </kbd>
        </button>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-0.5 px-2.5">
        {nav.map((item) =>
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={item.label}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                isActive ? 'bg-accent-soft text-accent' : 'text-ink-soft hover:bg-subtle hover:text-ink'
              )
            }>
            <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            <span className="hidden lg:inline">{item.label}</span>
          </NavLink>
        )}
      </nav>
      <div className="border-t border-line p-3">
        <div className="mb-3 hidden items-center gap-2 px-1 text-xs text-muted lg:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
          Agent Builder API reachable via gateway
        </div>
        {user &&
        <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-subtle text-xs font-semibold text-ink-soft" aria-hidden>
              {user.initials}
            </span>
            <div className="hidden min-w-0 flex-1 lg:block">
              <p className="truncate text-sm font-medium text-ink">{user.name}</p>
              <p className="truncate text-xs text-muted">{roleLabel[user.role]} · from company SSO</p>
            </div>
            <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
            className="hidden rounded-md p-1.5 text-muted transition-colors duration-150 hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 lg:block">
            
              <LogOutIcon className="h-4 w-4" />
            </button>
          </div>
        }
      </div>
    </aside>);

}