import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '../components/ui/Toast';
import {
  CheckIcon,
  CopyIcon,
  KeyRoundIcon,
  PauseIcon,
  PlayIcon,
  PlugIcon,
  RefreshCwIcon,
  SearchIcon,
  ServerIcon,
} from 'lucide-react';
import { Segmented } from '../components/ui/Segmented';
import { StatusChip } from '../components/ui/StatusChip';
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
  const [integrationFilter, setIntegrationFilter] = useState('All');
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

  // Filter voices
  const filteredVoices = useMemo(() => {
    return VOICE_CATALOG.filter((v) => {
      const matchQuery =
        v.name.toLowerCase().includes(voiceQuery.toLowerCase()) ||
        v.style.toLowerCase().includes(voiceQuery.toLowerCase()) ||
        v.language.toLowerCase().includes(voiceQuery.toLowerCase()) ||
        v.tags.some((t) => t.toLowerCase().includes(voiceQuery.toLowerCase()));

      const matchProvider = selectedProvider === 'All' || v.provider.toLowerCase() === selectedProvider.toLowerCase();
      const matchGender = selectedGender === 'All' || v.gender.toLowerCase() === selectedGender.toLowerCase();
      const matchLocale = selectedLocale === 'All' || v.locale === selectedLocale;

      return matchQuery && matchProvider && matchGender && matchLocale;
    });
  }, [voiceQuery, selectedProvider, selectedGender, selectedLocale]);

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

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Library & Resources</h1>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
              Shared Catalog
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Audition voices, inspect runtime model providers, configure tool integrations, and manage telephony routing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void loadProviders()} disabled={loadingProviders}>
            <RefreshCwIcon className={loadingProviders ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
            Sync Providers
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-6">
        <Segmented
          label="Library section"
          options={[
            { value: 'voices', label: `Voice Catalog (${VOICE_CATALOG.length})` },
            { value: 'providers', label: `Runtime Providers (${providers.length})` },
            { value: 'integrations', label: `Integrations & Tools (${INTEGRATIONS_CATALOG.length})` },
            { value: 'numbers', label: 'Phone numbers' },
          ]}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
        />
      </div>

      {/* =========================================================================
          TAB 1: VOICES CATALOG WITH AUDIO PREVIEWS
      ========================================================================= */}
      {tab === 'voices' && (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-line bg-surface p-5 shadow-panel">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">Curated TTS Voice Catalog</h2>
                <p className="mt-0.5 text-xs text-muted">
                  Listen to studio-grade audio previews from ElevenLabs & Cartesia. Copy any Voice ID directly into your agent TTS configuration.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Server Keys:</span>
                <StatusChip tone={providerStatus.get('elevenlabs')?.keyAvailable ? 'success' : 'neutral'}>
                  ElevenLabs {providerStatus.get('elevenlabs')?.keyAvailable ? 'Ready' : 'No Key'}
                </StatusChip>
                <StatusChip tone={providerStatus.get('cartesia')?.keyAvailable ? 'success' : 'neutral'}>
                  Cartesia {providerStatus.get('cartesia')?.keyAvailable ? 'Ready' : 'No Key'}
                </StatusChip>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  placeholder="Search voices, styles, accents…"
                  value={voiceQuery}
                  onChange={(e) => setVoiceQuery(e.target.value)}
                  className={cn(inputClass, 'pl-9 text-xs')}
                />
              </div>

              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className={cn(inputClass, 'text-xs')}
              >
                <option value="All">All Providers</option>
                <option value="ElevenLabs">ElevenLabs</option>
                <option value="Cartesia">Cartesia</option>
              </select>

              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className={cn(inputClass, 'text-xs')}
              >
                <option value="All">All Genders</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>

              <select
                value={selectedLocale}
                onChange={(e) => setSelectedLocale(e.target.value)}
                className={cn(inputClass, 'text-xs')}
              >
                <option value="All">All Locales</option>
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="en-AU">English (Australia)</option>
                <option value="es-ES">Spanish (Spain)</option>
                <option value="es-MX">Spanish (Mexico)</option>
              </select>
            </div>
          </div>

          {/* Voices Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVoices.map((voice) => {
              const isPlaying = playingVoiceId === voice.id;
              const isCopied = copiedVoiceId === voice.voiceId;
              const providerInfo = providerStatus.get(voice.provider.toLowerCase());

              return (
                <div
                  key={voice.id}
                  className={cn(
                    'group relative rounded-xl border border-line bg-surface p-5 transition hover:border-line-strong hover:shadow-card',
                    isPlaying && 'border-accent bg-accent-soft/20 ring-1 ring-accent'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleTogglePlayVoice(voice)}
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                          isPlaying
                            ? 'border-accent bg-accent text-white shadow-sm'
                            : 'border-line bg-canvas text-ink hover:border-line-strong hover:bg-subtle'
                        )}
                        title={isPlaying ? 'Pause audio sample' : 'Play audio sample'}
                      >
                        {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4 ml-0.5" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-ink text-sm">{voice.name}</h3>
                          <span className="rounded bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-ink-soft">
                            {voice.gender}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">{voice.language}</p>
                      </div>
                    </div>

                    <StatusChip tone={providerInfo?.keyAvailable ? 'success' : 'neutral'}>
                      {voice.provider}
                    </StatusChip>
                  </div>

                  <p className="mt-3 text-xs text-ink-soft leading-relaxed italic line-clamp-2">
                    &ldquo;{voice.style}&rdquo;
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {voice.tags.map((t) => (
                      <span key={t} className="rounded-md bg-canvas px-2 py-0.5 text-[10px] text-muted border border-line/60">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-xs">
                    <div className="min-w-0">
                      <span className="text-[10px] text-muted block uppercase tracking-wider">Voice ID</span>
                      <code className="font-mono text-[11px] text-ink truncate block max-w-[170px]" title={voice.voiceId}>
                        {voice.voiceId}
                      </code>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyVoiceId(voice.voiceId)}
                      className="text-xs text-muted hover:text-ink"
                    >
                      {isCopied ? <CheckIcon className="h-3.5 w-3.5 text-green-600" /> : <CopyIcon className="h-3.5 w-3.5" />}
                      {isCopied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: RUNTIME PROVIDERS (LIVE GET /providers)
      ========================================================================= */}
      {tab === 'providers' && (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-line bg-surface p-5 shadow-panel">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-ink">Live Runtime Providers</h2>
                  {providersError ? <StatusChip tone="danger">Could not load</StatusChip> : providersAnswer ? <StatusChip tone="success">From the server</StatusChip> : <StatusChip>Loading…</StatusChip>}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  Providers reported by <code className="font-mono">GET /providers</code> on the Agent Builder API.{providersAnswer?.note ? ` ${providersAnswer.note}` : ''}
                </p>
                {providersError && <p className="mt-2 text-xs text-danger" role="alert">{providersError}</p>}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2" aria-busy={loadingProviders}>
            {loadingProviders && [0, 1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl border border-line bg-subtle/50" aria-hidden />)}
            {providers.map((p) => {
              const hasKey = !!p.key_available;
              const needsKey = !!p.default_secret;
              return (
                <div key={p.name} className="rounded-xl border border-line bg-surface p-5 shadow-panel">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <ServerIcon className="h-4 w-4 text-accent" />
                      <div>
                        <h3 className="text-sm font-semibold capitalize text-ink">{p.name}</h3>
                        <p className="font-mono text-[11px] text-muted">{p.plugin || 'builtin runtime engine'}</p>
                      </div>
                    </div>
                    <StatusChip tone={p.installed ? 'success' : 'neutral'}>
                      {p.installed ? 'Plugin Installed' : 'Not Installed'}
                    </StatusChip>
                  </div>

                  <div className="mt-4">
                    <span className="text-[11px] font-medium text-muted block mb-1">Supported Stages</span>
                    <div className="flex flex-wrap gap-1.5">
                      {p.stages.map((s) => (
                        <span
                          key={s}
                          className="rounded bg-subtle px-2 py-0.5 font-mono text-[11px] font-medium text-ink-soft uppercase"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-line/60 pt-3 flex items-center justify-between text-xs">
                    <span className="text-muted flex items-center gap-1.5">
                      <KeyRoundIcon className="h-3.5 w-3.5" />
                      {p.default_secret || 'No Secret Required'}
                    </span>
                    {needsKey ?
                    <StatusChip tone={hasKey ? 'success' : 'warning'}>
                      {hasKey ? 'Key Configured' : 'Key Missing'}
                    </StatusChip> :
                    <StatusChip>No key needed</StatusChip>}
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
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-line bg-surface p-5 shadow-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-ink">Systems your tools can call</h2>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  Studio does not connect these itself. An agent reaches a system through an HTTP tool you add in Build; the key it uses is a secret an admin sets on the server under the name shown.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  placeholder="Filter integrations by name, system, category…"
                  value={integrationQuery}
                  onChange={(e) => setIntegrationQuery(e.target.value)}
                  className={cn(inputClass, 'pl-9 text-xs')}
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {['All', 'Customer systems', 'Developer tools', 'Knowledge', 'Operations'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setIntegrationFilter(cat)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                      integrationFilter === cat
                        ? 'bg-accent text-white shadow-sm'
                        : 'border border-line bg-surface text-muted hover:border-line-strong hover:text-ink'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS_CATALOG.filter((item) => {
              const matchCat = integrationFilter === 'All' || item.category === integrationFilter;
              const matchQ =
                item.name.toLowerCase().includes(integrationQuery.toLowerCase()) ||
                item.description.toLowerCase().includes(integrationQuery.toLowerCase());
              return matchCat && matchQ;
            }).map((item) => {
              return (
                <div key={item.id} className="rounded-xl border border-line bg-surface p-5 shadow-panel flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                          <PlugIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-ink">{item.name}</h3>
                          <span className="text-[10px] text-muted block uppercase font-medium">{item.category}</span>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-ink-soft leading-relaxed">
                      {item.description}
                    </p>

                    <div className="mt-4 space-y-1.5">
                      <span className="text-[10px] text-muted font-medium uppercase tracking-wider block">What the tool needs</span>
                      {item.fields.map((f) => (
                        <div key={f} className="flex items-center gap-1.5 text-xs text-muted">
                          <span className="h-1 w-1 rounded-full bg-accent" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-line/60 pt-3 flex items-center justify-between">
                    <span className="font-mono text-[11px] text-muted flex items-center gap-1">
                      <KeyRoundIcon className="h-3 w-3" />
                      {item.defaultSecret}
                    </span>
                    <span className="text-[11px] text-muted">{secretNote(secretState(item.defaultSecret, secretKeys))}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'numbers' && <NumbersPanel />}

    </div>
  );
}