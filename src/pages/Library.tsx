import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '../components/ui/Toast';
import {
  AudioLinesIcon,
  CheckIcon,
  CopyIcon,
  KeyRoundIcon,
  PauseIcon,
  PhoneIcon,
  PlayIcon,
  PlugIcon,
  RefreshCwIcon,
  SearchIcon,
  SearchXIcon,
  ServerIcon,
} from 'lucide-react';
import { Segmented } from '../components/ui/Segmented';
import { Button } from '../components/ui/Button';
import { NumbersPanel } from '../components/library/NumbersPanel';
import { VOICE_CATALOG, type CatalogVoice } from '../data/voiceCatalog';
import { INTEGRATIONS_CATALOG } from '../data/integrationsCatalog';
import { useProviders, useSecretKeys } from '../hooks/useProviders';
import { secretState, type SecretState } from '../utils/providerOptions';
import { cn, inputClass } from '../utils/styles';

type Tab = 'voices' | 'providers' | 'integrations' | 'numbers';

const secretNote = (state: SecretState) =>
  state === 'found' ? 'Set on the server' : state === 'missing' ? 'Not set on the server' : 'Checked when you deploy';

const secretTone = (state: SecretState) => (state === 'found' ? 'bg-success' : state === 'missing' ? 'bg-warning' : 'bg-line-strong');

const STAGE_WORDS: Record<string, string> = { stt: 'Speech to text', tts: 'Text to speech', llm: 'Language model', realtime: 'Realtime voice' };

const CATEGORIES = ['All', 'Customer systems', 'Developer tools', 'Knowledge', 'Operations'] as const;

const all = <T extends string>(values: T[]) => [...new Set(values)];

/** A coloured dot and a few words: the status style used across the Library cards. */
function Dot({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-ink-soft">
      <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', tone)} />
      {children}
    </span>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, 'h-9 pl-9 text-[13px]')}
      />
    </div>
  );
}

function Empty({ what, onClear }: { what: string; onClear: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center">
      <SearchXIcon className="mx-auto h-6 w-6 text-muted" aria-hidden />
      <p className="mt-2 text-sm font-medium text-ink">No {what} match</p>
      <button type="button" onClick={onClear} className="mt-1 text-xs font-medium text-accent hover:underline">
        Clear the filters
      </button>
    </div>
  );
}

export function Library() {
  const [tab, setTab] = useState<Tab>('voices');

  // GET /providers, shared with the pickers in Build (and the secret checks below)
  const secretKeys = useSecretKeys();
  const { answer: providersAnswer, error: providersError, loading: loadingProviders, reload: loadProviders } = useProviders();
  const providers = useMemo(() => providersAnswer?.providers ?? [], [providersAnswer]);

  // Voice Catalog State
  const [voiceQuery, setVoiceQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('All');
  const [selectedGender, setSelectedGender] = useState('All');
  const [selectedLocale, setSelectedLocale] = useState('All');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [copiedVoiceId, setCopiedVoiceId] = useState<string | null>(null);

  // Integrations State
  const [integrationFilter, setIntegrationFilter] = useState<string>('All');
  const [integrationQuery, setIntegrationQuery] = useState('');
  // Cleanup audio playback on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Handle Voice Audio Sample Play/Pause
  const handleTogglePlayVoice = (voice: CatalogVoice) => {
    if (playingVoiceId === voice.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingVoiceId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    try {
      const audio = new Audio(voice.previewUrl);
      audioRef.current = audio;
      setPlayingVoiceId(voice.id);
      audio.play().catch(() => {
        toast.error('Unable to play preview', { description: 'The provider audio preview stream could not be loaded.' });
        setPlayingVoiceId(null);
      });
      audio.onended = () => setPlayingVoiceId(null);
      audio.onerror = () => setPlayingVoiceId(null);
    } catch {
      setPlayingVoiceId(null);
    }
  };

  const handleCopyVoiceId = (voiceId: string) => {
    navigator.clipboard.writeText(voiceId);
    setCopiedVoiceId(voiceId);
    toast.success('Voice ID copied', { description: `${voiceId} copied to clipboard.` });
    setTimeout(() => setCopiedVoiceId(null), 2000);
  };

  // Filter choices come from the catalogue itself, so a voice added there shows up here.
  const voiceProviders = useMemo(() => all(VOICE_CATALOG.map((v) => v.provider)), []);
  const voiceLocales = useMemo(
    () => all(VOICE_CATALOG.map((v) => v.locale)).map((locale) => ({ locale, label: VOICE_CATALOG.find((v) => v.locale === locale)?.language ?? locale })),
    []
  );

  // Filter voices
  const filteredVoices = useMemo(() => {
    const q = voiceQuery.toLowerCase();
    return VOICE_CATALOG.filter((v) => {
      const matchQuery =
        v.name.toLowerCase().includes(q) ||
        v.style.toLowerCase().includes(q) ||
        v.language.toLowerCase().includes(q) ||
        v.tags.some((t) => t.toLowerCase().includes(q));

      const matchProvider = selectedProvider === 'All' || v.provider.toLowerCase() === selectedProvider.toLowerCase();
      const matchGender = selectedGender === 'All' || v.gender.toLowerCase() === selectedGender.toLowerCase();
      const matchLocale = selectedLocale === 'All' || v.locale === selectedLocale;

      return matchQuery && matchProvider && matchGender && matchLocale;
    });
  }, [voiceQuery, selectedProvider, selectedGender, selectedLocale]);

  const clearVoiceFilters = () => {
    setVoiceQuery('');
    setSelectedProvider('All');
    setSelectedGender('All');
    setSelectedLocale('All');
  };

  const filteredIntegrations = useMemo(() => {
    const q = integrationQuery.toLowerCase();
    return INTEGRATIONS_CATALOG.filter((item) => {
      const matchCat = integrationFilter === 'All' || item.category === integrationFilter;
      const matchQ = item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [integrationFilter, integrationQuery]);

  // Provider readiness lookup
  const providerStatus = useMemo(() => {
    const map = new Map<string, { installed: boolean; keyAvailable: boolean }>();
    providers.forEach((p) => {
      map.set(p.name.toLowerCase(), {
        installed: !!p.installed,
        keyAvailable: !!p.key_available,
      });
    });
    return map;
  }, [providers]);

  const installedCount = providers.filter((p) => p.installed).length;
  const keysSet = providers.filter((p) => p.default_secret && p.key_available).length;
  const keysNeeded = providers.filter((p) => p.default_secret).length;

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'voices', label: 'Voices', icon: AudioLinesIcon, count: VOICE_CATALOG.length },
    { id: 'providers', label: 'Providers', icon: ServerIcon, count: providersAnswer ? providers.length : undefined },
    { id: 'integrations', label: 'Integrations', icon: PlugIcon, count: INTEGRATIONS_CATALOG.length },
    { id: 'numbers', label: 'Phone numbers', icon: PhoneIcon },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Library</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Voices, model providers, systems your tools can call, and phone numbers. Shared by every agent.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="-mx-4 mt-6 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <div role="group" aria-label="Library section" className="inline-flex rounded-lg border border-line bg-subtle p-0.5">
          {tabs.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                  active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', active && 'text-accent')} aria-hidden />
                {t.label}
                {t.count !== undefined && (
                  <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', active ? 'bg-accent-soft text-accent' : 'bg-surface/70 text-muted')}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          TAB 1: VOICES CATALOG WITH AUDIO PREVIEWS
      ========================================================================= */}
      {tab === 'voices' && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p className="text-[13px] text-muted">Play a sample, then copy its voice ID into an agent’s voice settings.</p>
            <div className="flex flex-wrap items-center gap-3" aria-label="Provider keys on the server">
              {voiceProviders.map((name) => {
                const ready = providerStatus.get(name.toLowerCase())?.keyAvailable;
                return (
                  <Dot key={name} tone={ready ? 'bg-success' : 'bg-line-strong'}>
                    {name} {ready ? 'key set' : 'no key'}
                  </Dot>
                );
              })}
            </div>
          </div>

          {/* Filters Bar */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SearchBox value={voiceQuery} onChange={setVoiceQuery} placeholder="Search voices, styles, accents…" />
            <Segmented
              label="Provider"
              size="sm"
              value={selectedProvider}
              onChange={setSelectedProvider}
              options={[{ value: 'All', label: 'All providers' }, ...voiceProviders.map((p) => ({ value: p, label: p }))]}
            />
            <Segmented
              label="Gender"
              size="sm"
              value={selectedGender}
              onChange={setSelectedGender}
              options={[
                { value: 'All', label: 'Any' },
                { value: 'Female', label: 'Female' },
                { value: 'Male', label: 'Male' },
              ]}
            />
            <select
              aria-label="Language"
              value={selectedLocale}
              onChange={(e) => setSelectedLocale(e.target.value)}
              className={cn(inputClass, 'h-9 w-auto py-1 text-[13px]')}
            >
              <option value="All">All languages</option>
              {voiceLocales.map((l) => (
                <option key={l.locale} value={l.locale}>{l.label}</option>
              ))}
            </select>
            <span className="ml-auto text-xs tabular-nums text-muted" aria-live="polite">
              {filteredVoices.length} of {VOICE_CATALOG.length}
            </span>
          </div>

          {/* Voices Grid */}
          {filteredVoices.length === 0 ? (
            <div className="mt-5"><Empty what="voices" onClear={clearVoiceFilters} /></div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVoices.map((voice) => {
                const isPlaying = playingVoiceId === voice.id;
                const isCopied = copiedVoiceId === voice.voiceId;
                // Tags that only repeat the language or the style say nothing new.
                const extraTags = voice.tags.filter((t) => t !== voice.style && !voice.language.includes(t));

                return (
                  <div
                    key={voice.id}
                    className={cn(
                      'group flex flex-col rounded-xl border bg-surface p-4 transition-[border-color,box-shadow] duration-150',
                      isPlaying ? 'border-accent/60 shadow-card ring-1 ring-accent/30' : 'border-line hover:border-line-strong hover:shadow-card'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleTogglePlayVoice(voice)}
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                          isPlaying ? 'bg-accent text-white shadow-sm' : 'bg-accent-soft text-accent hover:bg-accent hover:text-white'
                        )}
                        aria-label={isPlaying ? `Pause ${voice.name}` : `Play ${voice.name}`}
                        title={isPlaying ? 'Pause audio sample' : 'Play audio sample'}
                      >
                        {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="ml-0.5 h-4 w-4" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="truncate text-sm font-semibold text-ink">{voice.name}</h3>
                          <span className="shrink-0 text-[11px] font-medium text-muted">{voice.provider}</span>
                        </div>
                        <p className="truncate text-xs text-ink-soft">{voice.style}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {[voice.gender, voice.language, ...extraTags].map((t) => (
                        <span key={t} className="rounded-full bg-subtle px-2 py-0.5 text-[11px] text-ink-soft">
                          {t}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto flex items-center gap-2 pt-4">
                      <code
                        className="min-w-0 flex-1 truncate rounded-md bg-canvas px-2 py-1 font-mono text-[11px] text-ink-soft ring-1 ring-inset ring-line"
                        title={voice.voiceId}
                      >
                        {voice.voiceId}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyVoiceId(voice.voiceId)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                        aria-label={`Copy voice ID for ${voice.name}`}
                        title="Copy voice ID"
                      >
                        {isCopied ? <CheckIcon className="h-3.5 w-3.5 text-success" /> : <CopyIcon className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: RUNTIME PROVIDERS (LIVE GET /providers)
      ========================================================================= */}
      {tab === 'providers' && (
        <div className="mt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="max-w-2xl text-[13px] text-muted">
              What the server reports from <code className="font-mono text-xs">GET /providers</code>.{providersAnswer?.note ? ` ${providersAnswer.note}` : ''}
            </p>
            <Button variant="secondary" size="sm" onClick={() => void loadProviders()} disabled={loadingProviders}>
              <RefreshCwIcon className={cn('h-3.5 w-3.5', loadingProviders && 'animate-spin')} aria-hidden />
              Refresh
            </Button>
          </div>

          {providersError && (
            <div role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
              Could not load the providers: {providersError}
            </div>
          )}

          {providersAnswer && (
            <dl className="mt-4 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-surface">
              {[
                { label: 'Providers', value: providers.length },
                { label: 'Plugins installed', value: installedCount },
                { label: 'Keys set', value: `${keysSet} of ${keysNeeded}` },
              ].map((s) => (
                <div key={s.label} className="px-4 py-3">
                  <dt className="text-xs text-muted">{s.label}</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy={loadingProviders}>
            {loadingProviders && !providersAnswer && [0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-36 animate-pulse rounded-xl border border-line bg-subtle/50" aria-hidden />)}
            {providers.map((p) => {
              const hasKey = !!p.key_available;
              const needsKey = !!p.default_secret;
              return (
                <div key={p.name} className={cn('flex flex-col rounded-xl border border-line bg-surface p-4', !p.installed && 'bg-canvas/60')}>
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold uppercase',
                        p.installed ? 'bg-accent-soft text-accent' : 'bg-subtle text-muted'
                      )}
                      aria-hidden
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold capitalize text-ink">{p.name}</h3>
                      <p className="truncate font-mono text-[11px] text-muted" title={p.plugin || undefined}>{p.plugin || 'built in'}</p>
                    </div>
                  </div>

                  <div className="mb-4 mt-3 flex flex-wrap gap-1">
                    {p.stages.map((s) => (
                      <span key={s} className="rounded-full bg-subtle px-2 py-0.5 text-[11px] text-ink-soft">
                        {STAGE_WORDS[s.toLowerCase()] ?? s}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto space-y-1.5 border-t border-line/60 pt-3">
                    <Dot tone={p.installed ? 'bg-success' : 'bg-line-strong'}>{p.installed ? 'Plugin installed' : 'Plugin not installed'}</Dot>
                    <div className="flex items-center justify-between gap-2">
                      <Dot tone={!needsKey ? 'bg-line-strong' : hasKey ? 'bg-success' : 'bg-warning'}>
                        {!needsKey ? 'No key needed' : hasKey ? 'Key set' : 'Key missing'}
                      </Dot>
                      {needsKey && (
                        <span className="flex min-w-0 items-center gap-1 font-mono text-[11px] text-muted" title={p.default_secret ?? undefined}>
                          <KeyRoundIcon className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="truncate">{p.default_secret}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: INTEGRATIONS & TOOL CONNECTIONS
      ========================================================================= */}
      {tab === 'integrations' && (
        <div className="mt-6">
          <p className="max-w-3xl text-[13px] text-muted">
            Studio does not connect these itself. An agent reaches a system through an HTTP tool you add in Build; the key it uses is a secret an admin sets on the server under the name shown.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SearchBox value={integrationQuery} onChange={setIntegrationQuery} placeholder="Search integrations…" />
            <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
              <Segmented
                label="Category"
                size="sm"
                value={integrationFilter}
                onChange={setIntegrationFilter}
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <span className="ml-auto text-xs tabular-nums text-muted" aria-live="polite">
              {filteredIntegrations.length} of {INTEGRATIONS_CATALOG.length}
            </span>
          </div>

          {filteredIntegrations.length === 0 ? (
            <div className="mt-5">
              <Empty what="integrations" onClear={() => { setIntegrationQuery(''); setIntegrationFilter('All'); }} />
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredIntegrations.map((item) => {
                const state = secretState(item.defaultSecret, secretKeys);
                return (
                  <div key={item.id} className="flex flex-col rounded-xl border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-card">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                        <PlugIcon className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold leading-snug text-ink">{item.name}</h3>
                        <p className="mt-0.5 text-[11px] text-muted">{item.category}</p>
                      </div>
                    </div>

                    <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{item.description}</p>

                    <div className="mt-3">
                      <p className="text-[11px] font-medium text-muted">What the tool needs</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {item.fields.map((f) => (
                          <span key={f} className="rounded-full bg-subtle px-2 py-0.5 text-[11px] text-ink-soft">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-4">
                      <span className="flex min-w-0 items-center gap-1 font-mono text-[11px] text-muted" title={item.defaultSecret}>
                        <KeyRoundIcon className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate">{item.defaultSecret}</span>
                      </span>
                      <Dot tone={secretTone(state)}>{secretNote(state)}</Dot>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'numbers' && <NumbersPanel />}

    </div>
  );
}
