import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3Icon,
  BookOpenIcon,
  BotIcon,
  CheckIcon,
  CommandIcon,
  FileTextIcon,
  HouseIcon,
  LibraryIcon,
  MoonIcon,
  PhoneCallIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SlidersIcon,
  SunIcon,
  UserCheckIcon,
  XIcon
} from 'lucide-react';
import { useStudio } from '../../contexts/StudioContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { settingsCatalog } from '../../data/settingsCatalog';
import { cn } from '../../utils/styles';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenCreate?: () => void;
}

interface PaletteItem {
  id: string;
  category: 'Navigation' | 'Agents' | 'Settings' | 'Actions';
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  perform: () => void;
}

export function CommandPalette({ open, onClose, onOpenCreate }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { agents, technicalNames, setTechnicalNames } = useStudio();
  const { user } = useAuth();
  const { theme, toggleTheme, density, setDensity } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Global Ctrl+K / Cmd+K handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (open) onClose();
        else {
          // Open
          const evt = new CustomEvent('open-command-palette');
          window.dispatchEvent(evt);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const items = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [
      // Navigation
      {
        id: 'nav-home',
        category: 'Navigation',
        title: 'Home',
        subtitle: 'Next step, active deployments, and activity',
        icon: HouseIcon,
        perform: () => {
          navigate('/');
          onClose();
        }
      },
      {
        id: 'nav-agents',
        category: 'Navigation',
        title: 'Agents',
        subtitle: 'View, filter, and manage all agents',
        icon: BotIcon,
        perform: () => {
          navigate('/agents');
          onClose();
        }
      },
      {
        id: 'nav-analytics',
        category: 'Navigation',
        title: 'Analytics & Reports',
        subtitle: 'Conversational metrics, resolution rates, latency, and Q4 reports',
        icon: BarChart3Icon,
        perform: () => {
          navigate('/analytics');
          onClose();
        }
      },
      {
        id: 'nav-knowledge',
        category: 'Navigation',
        title: 'Knowledge Base',
        subtitle: 'Manage document sources, indexing jobs, and test vector search',
        icon: BookOpenIcon,
        perform: () => {
          navigate('/knowledge');
          onClose();
        }
      },
      {
        id: 'nav-calls',
        category: 'Navigation',
        title: 'Calls & Transcripts',
        subtitle: 'Call logs, plain text transcripts, tool traces, and errors',
        icon: PhoneCallIcon,
        perform: () => {
          navigate('/calls');
          onClose();
        }
      },
      {
        id: 'nav-library',
        category: 'Navigation',
        title: 'Library',
        subtitle: 'Voices, integration credentials, and phone numbers',
        icon: LibraryIcon,
        perform: () => {
          navigate('/library');
          onClose();
        }
      },
      {
        id: 'nav-settings',
        category: 'Navigation',
        title: 'Settings',
        subtitle: 'Account details, theme, display density, and security',
        icon: SettingsIcon,
        perform: () => {
          navigate('/settings');
          onClose();
        }
      },
      {
        id: 'action-create',
        category: 'Actions',
        title: 'Create new agent',
        subtitle: 'Start from one of 7 starters or describe it in plain English',
        icon: PlusIcon,
        perform: () => {
          onClose();
          onOpenCreate?.();
        }
      },
      // Actions
      {
        id: 'action-theme',
        category: 'Actions',
        title: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`,
        subtitle: `Current theme: ${theme}`,
        icon: theme === 'dark' ? SunIcon : MoonIcon,
        perform: () => {
          toggleTheme();
          onClose();
        }
      },
      {
        id: 'action-density',
        category: 'Actions',
        title: `Set density to ${density === 'comfortable' ? 'compact' : 'comfortable'}`,
        subtitle: `Current density: ${density}`,
        icon: SlidersIcon,
        perform: () => {
          setDensity(density === 'comfortable' ? 'compact' : 'comfortable');
          onClose();
        }
      },
      {
        id: 'action-technical-names',
        category: 'Actions',
        title: `${technicalNames ? 'Hide' : 'Show'} technical names`,
        subtitle: 'Toggle schema keys like persona.company vs friendly labels',
        icon: FileTextIcon,
        badge: technicalNames ? 'Active' : 'Off',
        perform: () => {
          setTechnicalNames(!technicalNames);
          onClose();
        }
      }
    ];

    // Add Agents
    agents.forEach((agent) => {
      list.push({
        id: `agent-${agent.id}`,
        category: 'Agents',
        title: agent.name,
        subtitle: `Agent id: ${agent.id} · ${agent.versions.length ? `Latest: ${agent.versions[0].version}` : 'Draft'}`,
        icon: BotIcon,
        badge: agent.id,
        perform: () => {
          navigate(`/agents/${agent.id}`);
          onClose();
        }
      });
    });

    // Add Settings Search (FR-22)
    const activeAgentId = agents[0]?.id ?? 'customer-care';
    settingsCatalog.forEach((s) => {
      list.push({
        id: `setting-${s.path}`,
        category: 'Settings',
        title: s.label,
        subtitle: `${s.path} — ${s.help}`,
        icon: SlidersIcon,
        badge: s.group,
        perform: () => {
          navigate(`/agents/${activeAgentId}/build?view=detailed`);
          onClose();
          window.setTimeout(() => {
            const el = document.getElementById(`field-${s.path.replace(/\./g, '_')}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('ring-2', 'ring-accent', 'ring-offset-2');
              window.setTimeout(() => el.classList.remove('ring-2', 'ring-accent', 'ring-offset-2'), 2000);
            }
          }, 300);
        }
      });
    });

    return list;
  }, [agents, density, navigate, onClose, onOpenCreate, setDensity, setTechnicalNames, technicalNames, theme, toggleTheme]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 30);
    return items
      .filter((item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        (item.badge && item.badge.toLowerCase().includes(q))
      )
      .slice(0, 40);
  }, [items, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].perform();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-16 backdrop-blur-sm sm:pt-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-line bg-surface shadow-overlay"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center border-b border-line px-4">
          <SearchIcon className="h-5 w-5 shrink-0 text-muted" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, page, agent, or setting (e.g. 'timeout', 'Ada', 'voice')..."
            className="w-full bg-transparent px-3 py-3.5 text-sm text-ink outline-none placeholder:text-muted"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden rounded bg-subtle px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted sm:inline-block">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2" role="listbox">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">
              No results found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filtered.map((item, index) => {
              const active = index === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={active}
                  onClick={() => item.perform()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors',
                    active ? 'bg-accent-soft text-accent' : 'hover:bg-subtle text-ink'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm',
                        active ? 'bg-accent/10 text-accent' : 'bg-subtle text-muted'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className={cn('truncate text-sm font-medium', active ? 'text-accent' : 'text-ink')}>
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="truncate text-xs text-muted">{item.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.badge && (
                      <span className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-muted">
                        {item.badge}
                      </span>
                    )}
                    <span className="rounded bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-muted">
                      {item.category}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line bg-canvas/60 px-4 py-2 text-[12px] text-muted">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono font-semibold">↑↓</kbd> to navigate
            </span>
            <span>
              <kbd className="font-mono font-semibold">↵</kbd> to select
            </span>
          </div>
          <span>Weave Studio Command Palette</span>
        </div>
      </div>
    </div>
  );
}
