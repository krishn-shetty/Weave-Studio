import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '../components/ui/Toast';
import {
  CheckIcon,
  CopyIcon,
  KeyRoundIcon,
  PauseIcon,
  PhoneCallIcon,
  PlayIcon,
  PlugIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  ServerIcon,
} from 'lucide-react';
import { Segmented } from '../components/ui/Segmented';
import { StatusChip } from '../components/ui/StatusChip';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { DemoDataBadge } from '../components/ui/DemoDataBadge';
import { api } from '../api/client';
import { useStudio } from '../contexts/StudioContext';
import { VOICE_CATALOG, type CatalogVoice } from '../data/voiceCatalog';
import { INTEGRATIONS_CATALOG, type IntegrationItem } from '../data/integrationsCatalog';
import type { Provider } from '../api/types';
import { cn, inputClass } from '../utils/styles';

type Tab = 'voices' | 'providers' | 'integrations' | 'numbers';

interface ConfiguredIntegration {
  id: string;
  endpoint: string;
  secretName: string;
  updatedAt: string;
}

interface DemoPhoneNumber {
  id: string;
  number: string;
  carrier: string;
  status: 'active' | 'pending' | 'reserved';
  assignedBot: string;
  environment: 'development' | 'staging' | 'production';
  dnis: string;
}

export function Library() {
  const { agents } = useStudio();
  const [tab, setTab] = useState<Tab>('voices');

  // Real backend providers
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

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
  const [configuredIntegrations, setConfiguredIntegrations] = useState<Record<string, ConfiguredIntegration>>(() => {
    try {
      const saved = localStorage.getItem('weave_configured_integrations');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [activeModalIntegration, setActiveModalIntegration] = useState<IntegrationItem | null>(null);
  const [modalEndpoint, setModalEndpoint] = useState('');
  const [modalSecret, setModalSecret] = useState('');

  // Phone Numbers State
  const [demoNumbers, setDemoNumbers] = useState<DemoPhoneNumber[]>([
    {
      id: 'num-1',
      number: '+1 (415) 890-4001',
      carrier: 'Twilio SIP Trunk',
      status: 'active',
      assignedBot: 'voice-test',
      environment: 'development',
      dnis: '90004',
    },
    {
      id: 'num-2',
      number: '+1 (650) 419-2044',
      carrier: 'LiveKit SIP Dispatch',
      status: 'active',
      assignedBot: 'support-agent',
      environment: 'production',
      dnis: '90008',
    },
    {
      id: 'num-3',
      number: '+1 (800) 555-0199',
      carrier: 'FreeSWITCH Interconnect',
      status: 'reserved',
      assignedBot: 'nimbus-care',
      environment: 'staging',
      dnis: '90012',
    },
  ]);
  const [addNumberModal, setAddNumberModal] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newBotId, setNewBotId] = useState(agents[0]?.id || 'voice-test');
  const [newEnv, setNewEnv] = useState<'development' | 'staging' | 'production'>('development');

  // Load real providers from GET /providers
  const loadProviders = async () => {
    setLoadingProviders(true);
    try {
      const res = await api.providers();
      if (res && Array.isArray(res.providers)) {
        setProviders(res.providers);
      }
    } catch {
      // ignore
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

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

  // Integrations save
  const handleSaveIntegration = () => {
    if (!activeModalIntegration) return;
    const updated = {
      ...configuredIntegrations,
      [activeModalIntegration.id]: {
        id: activeModalIntegration.id,
        endpoint: modalEndpoint,
        secretName: modalSecret || activeModalIntegration.defaultSecret,
        updatedAt: new Date().toISOString(),
      },
    };
    setConfiguredIntegrations(updated);
    localStorage.setItem('weave_configured_integrations', JSON.stringify(updated));
    toast.success(`Configured ${activeModalIntegration.name}`, {
      description: `Connection settings saved locally for agent tool execution.`,
    });
    setActiveModalIntegration(null);
  };

  // Add demo number
  const handleAddNumber = () => {
    if (!newNumber.trim()) return;
    const item: DemoPhoneNumber = {
      id: `num-${Date.now()}`,
      number: newNumber.trim(),
      carrier: 'LiveKit SIP Trunk',
      status: 'active',
      assignedBot: newBotId,
      environment: newEnv,
      dnis: `90${Math.floor(100 + Math.random() * 900)}`,
    };
    setDemoNumbers((prev) => [item, ...prev]);
    toast.success(`Registered ${item.number}`, {
      description: `Inbound calls mapped to ${item.assignedBot} (${item.environment}).`,
    });
    setNewNumber('');
    setAddNumberModal(false);
  };

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
          <Button variant="secondary" size="sm" onClick={loadProviders} disabled={loadingProviders}>
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
            { value: 'numbers', label: `Telephony & SIP (${demoNumbers.length})` },
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
                  <StatusChip tone="success">Connected to Server</StatusChip>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  Real providers reported by <code className="font-mono">GET /providers</code> at <code className="font-mono">http://16.79.174.151:8100</code>.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {providers.map((p) => {
              const hasKey = !!p.key_available;
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
                    <StatusChip tone={hasKey ? 'success' : 'warning'}>
                      {hasKey ? 'Key Configured' : 'Key Missing'}
                    </StatusChip>
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
                  <h2 className="text-base font-semibold text-ink">Connected Systems & Tool Integrations</h2>
                  <DemoDataBadge label="Interactive Catalog" detail="Configures connection variables for tools used in agent configs." />
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  Connect third-party customer databases, ticketing systems, calendars, and webhooks so agents can run tools.
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
              const config = configuredIntegrations[item.id];
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
                      <StatusChip tone={config ? 'success' : 'neutral'}>
                        {config ? 'Connected' : 'Available'}
                      </StatusChip>
                    </div>

                    <p className="mt-3 text-xs text-ink-soft leading-relaxed">
                      {item.description}
                    </p>

                    <div className="mt-4 space-y-1.5">
                      <span className="text-[10px] text-muted font-medium uppercase tracking-wider block">Required Config</span>
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
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setActiveModalIntegration(item);
                        setModalEndpoint(config?.endpoint || '');
                        setModalSecret(config?.secretName || item.defaultSecret);
                      }}
                    >
                      {config ? 'Edit Config' : 'Connect'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: TELEPHONY & SIP NUMBERS
      ========================================================================= */}
      {tab === 'numbers' && (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-line bg-surface p-5 shadow-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-ink">Inbound Phone Numbers & SIP Routing</h2>
                  <DemoDataBadge label="Provisioning Preview" detail="Shows SIP trunk lines and dispatch rules connecting to bots." />
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  Direct inward dialing (DID) numbers and SIP trunks routed directly to deployed agents and environments.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => setAddNumberModal(true)}>
                <PlusIcon className="h-4 w-4" />
                Assign Number
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-panel">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted bg-canvas/50">
                  <th className="px-5 py-3 font-medium">Phone Number</th>
                  <th className="px-5 py-3 font-medium">Trunk / Provider</th>
                  <th className="px-5 py-3 font-medium">Assigned Bot</th>
                  <th className="px-5 py-3 font-medium">Target Environment</th>
                  <th className="px-5 py-3 font-medium">DNIS Routing</th>
                  <th className="px-5 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {demoNumbers.map((num) => (
                  <tr key={num.id} className="hover:bg-canvas/30 transition">
                    <td className="px-5 py-4 font-mono font-medium text-ink flex items-center gap-2.5">
                      <PhoneCallIcon className="h-4 w-4 text-accent shrink-0" />
                      {num.number}
                    </td>
                    <td className="px-5 py-4 text-muted text-xs">{num.carrier}</td>
                    <td className="px-5 py-4 font-medium text-ink text-xs">{num.assignedBot}</td>
                    <td className="px-5 py-4 text-xs">
                      <span className="capitalize rounded-full bg-subtle px-2.5 py-0.5 text-[11px] font-medium text-ink-soft">
                        {num.environment}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-muted">{num.dnis}</td>
                    <td className="px-5 py-4 text-right">
                      <StatusChip tone={num.status === 'active' ? 'success' : 'neutral'}>
                        {num.status === 'active' ? 'Serving Calls' : num.status}
                      </StatusChip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Integration Connection Modal */}
      {activeModalIntegration && (
        <Dialog
          open={!!activeModalIntegration}
          onClose={() => setActiveModalIntegration(null)}
          title={`Configure ${activeModalIntegration.name}`}
          description="Enter your system endpoint and secret variable name. Values are stored securely for agent tool invocations."
          footer={
            <>
              <Button variant="ghost" onClick={() => setActiveModalIntegration(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveIntegration}>
                Save Connection
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-ink-soft block mb-1">Service Endpoint URL</label>
              <input
                type="url"
                placeholder="https://api.yourdomain.com/v1"
                value={modalEndpoint}
                onChange={(e) => setModalEndpoint(e.target.value)}
                className={cn(inputClass, 'text-xs')}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft block mb-1">
                Environment Secret Name
              </label>
              <input
                type="text"
                placeholder={activeModalIntegration.defaultSecret}
                value={modalSecret}
                onChange={(e) => setModalSecret(e.target.value)}
                className={cn(inputClass, 'font-mono text-xs')}
              />
              <p className="mt-1 text-[11px] text-muted">
                The actual API key is injected server-side by the runtime using this environment variable.
              </p>
            </div>
          </div>
        </Dialog>
      )}

      {/* Add Number Modal */}
      {addNumberModal && (
        <Dialog
          open={addNumberModal}
          onClose={() => setAddNumberModal(false)}
          title="Assign Telephony Inbound Line"
          description="Route an E.164 phone number to one of your Weave Studio bots via SIP trunking."
          footer={
            <>
              <Button variant="ghost" onClick={() => setAddNumberModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAddNumber} disabled={!newNumber.trim()}>
                Register Number
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-ink-soft block mb-1">Phone Number (E.164 format)</label>
              <input
                type="tel"
                placeholder="+1 (555) 000-1234"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                className={cn(inputClass, 'font-mono text-xs')}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft block mb-1">Route to Agent</label>
              <select
                value={newBotId}
                onChange={(e) => setNewBotId(e.target.value)}
                className={cn(inputClass, 'text-xs')}
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft block mb-1">Environment</label>
              <select
                value={newEnv}
                onChange={(e) => setNewEnv(e.target.value as any)}
                className={cn(inputClass, 'text-xs')}
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}