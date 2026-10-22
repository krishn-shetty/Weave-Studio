import type { AgentConfig } from '../types/studio';
import type { Starter } from '../data/starters';

interface BuildInput {
  id: string;
  name: string;
  company: string;
  starter: Starter;
}

export function buildConfig({ id, name, company, starter }: BuildInput): AgentConfig {
  const greeting = starter.greeting.replace('{company}', company).replace('{persona}', starter.personaName);
  return {
    schema_version: '1.1',
    meta: {
      id,
      name,
      version: '1.0.0',
      status: 'draft',
      description: starter.summary,
    },
    runtime: {
      engine: 'livekit-agents',
      provider_mode: 'plugins',
      timezone: 'Europe/London',
    },
    persona: {
      name: starter.personaName,
      company,
      tone: starter.tone,
      style_rules: starter.rules ? [starter.rules] : [],
      shared_rules: [],
      disclosures: { recording_notice: 'This call may be recorded.' },
      rules: starter.rules,
      recording_notice: true,
    },
    defaults: {
      language: { primary: 'en-GB', speaks: ['en-GB'] },
      models: {
        llm: { provider: 'openai', model: 'gpt-4.1-mini' },
        stt: { provider: 'deepgram', model: 'nova-3' },
        tts: { provider: 'cartesia', model: 'sonic-3', voice_id: 'maya', voice: 'maya' },
      },
      conversation: {
        inactivity_timeout_s: 20,
        allow_interruptions: true,
        max_tool_steps: 4,
        inactivity: {
          enabled: true,
          clock: 'auto',
          timeout_s: 20,
          max_nudges: 1,
          nudges: [{ type: 'say', text: 'Hello, are you still there?' }],
          on_exhausted: {
            do: [
              { type: 'say', text: 'Goodbye!' },
              { type: 'end_call' },
            ],
          },
        },
        turn_handling: {
          endpointing: { min_delay: 0.25, max_delay: 2 },
          preemptive_generation: { enabled: true, preemptive_tts: true },
        },
      },
    },
    channels: [
      {
        id: 'web-chat',
        type: 'web_chat',
        enabled: true,
        greeting: { say: greeting },
        modalities: { input: ['text'], output: ['text'] },
      },
      {
        id: 'web-voice',
        type: 'web_voice',
        enabled: true,
        greeting: { say: greeting },
        modalities: { input: ['audio'], output: ['audio'] },
      },
      {
        id: 'phone',
        type: 'phone',
        enabled: false,
        greeting: { say: greeting },
        modalities: { input: ['audio'], output: ['audio'] },
      },
    ],
    agents: {
      entry: 'front_desk',
      items: [
        {
          id: 'front_desk',
          name: 'Front desk',
          kind: 'router',
          instructions: { role: starter.instructions },
          tools: starter.tools.map((t) => t.id),
          handoffs: [],
        },
      ],
    },
    tools: starter.tools.map((t) => ({ ...t })),
    post_call: {
      summary: { enabled: true },
      recording: { audio: false, transcript: true },
      redact_pii: true,
      artifacts: [
        { kind: 'transcript', sink: { type: 'file', directory: 'transcripts' } },
        { kind: 'metrics', sink: { type: 'file', directory: 'metrics' } },
      ],
    },
    observability: {
      store_transcripts: true,
      retention_days: 30,
      session_log: { enabled: true, directory: 'sessions', detail: 'events', retention_days: 30 },
    },
  };
}

/**
 * Normalizes raw config loaded from server or fixtures into a format
 * safe for UI editors, preserving both backend schema structures and UI helpers.
 */
export function normalizeConfig(raw: Partial<AgentConfig> | null | undefined): AgentConfig {
  const c = (raw ?? {}) as Record<string, any>;

  const defaultLang = c.defaults?.language ?? { primary: 'en', speaks: ['en'] };
  const rawSharedRules = Array.isArray(c.persona?.shared_rules)
    ? c.persona.shared_rules
    : Array.isArray(c.persona?.style_rules)
    ? c.persona.style_rules
    : [];

  const rawRulesStr =
    typeof c.persona?.rules === 'string'
      ? c.persona.rules
      : rawSharedRules.length > 0
      ? rawSharedRules.join('\n')
      : '';

  const hasRecordingNotice = Boolean(
    c.persona?.recording_notice ?? c.persona?.disclosures?.recording_notice
  );

  const ttsVoice =
    c.defaults?.models?.tts?.voice ??
    c.defaults?.models?.tts?.voice_id ??
    'maya';

  const ttsVoiceId =
    c.defaults?.models?.tts?.voice_id ??
    c.defaults?.models?.tts?.voice ??
    'maya';

  const ttsModel =
    c.defaults?.models?.tts?.model ??
    (c.defaults?.models?.tts?.provider === 'elevenlabs' ? 'eleven_flash_v2_5' : 'sonic-3');

  const retentionDays =
    c.observability?.session_log?.retention_days ??
    c.observability?.retention_days ??
    90;

  return {
    ...c,
    schema_version: c.schema_version ?? '1.1',
    meta: {
      id: c.meta?.id ?? '',
      name: c.meta?.name ?? '',
      version: c.meta?.version ?? '1.0.0',
      status: c.meta?.status ?? 'draft',
      description: c.meta?.description ?? '',
      ...(c.meta ?? {}),
    },
    persona: {
      name: c.persona?.name ?? '',
      company: c.persona?.company ?? '',
      tone: c.persona?.tone ?? 'neutral',
      rules: rawRulesStr,
      recording_notice: hasRecordingNotice,
      ...(c.persona ?? {}),
    },
    defaults: {
      language: defaultLang,
      conversation: {
        inactivity_timeout_s:
          c.defaults?.conversation?.inactivity?.timeout_s ??
          c.defaults?.conversation?.inactivity_timeout_s ??
          20,
        allow_interruptions: c.defaults?.conversation?.allow_interruptions ?? true,
        ...(c.defaults?.conversation ?? {}),
      },
      ...(c.defaults ?? {}),
      models: {
        llm: {
          provider: 'openai',
          model: 'gpt-4.1-mini',
          ...(c.defaults?.models?.llm ?? {}),
        },
        stt: {
          provider: 'deepgram',
          model: 'nova-3',
          ...(c.defaults?.models?.stt ?? {}),
        },
        tts: {
          provider: 'cartesia',
          voice: ttsVoice,
          voice_id: ttsVoiceId,
          model: ttsModel,
          ...(c.defaults?.models?.tts ?? {}),
        },
        ...(c.defaults?.models ?? {}),
      },
    },
    channels: Array.isArray(c.channels) ? c.channels : [],
    agents: {
      entry: c.agents?.entry ?? c.agents?.items?.[0]?.id ?? 'main',
      items: Array.isArray(c.agents?.items) ? c.agents.items : [],
      ...(c.agents ?? {}),
    },
    tools: Array.isArray(c.tools) ? c.tools : [],
    post_call: {
      summary:
        c.post_call?.summary !== undefined
          ? typeof c.post_call.summary === 'object'
            ? c.post_call.summary
            : { enabled: Boolean(c.post_call.summary) }
          : { enabled: true },
      recording:
        c.post_call?.recording !== undefined
          ? typeof c.post_call.recording === 'object'
            ? c.post_call.recording
            : { audio: Boolean(c.post_call.recording), transcript: true }
          : { audio: false, transcript: true },
      redact_pii: Boolean(c.post_call?.redaction?.enabled ?? c.post_call?.redact_pii),
      ...(c.post_call ?? {}),
    },
    observability: {
      retention_days: retentionDays,
      store_transcripts: c.observability?.store_transcripts ?? true,
      session_log: c.observability?.session_log ?? {
        enabled: true,
        directory: 'sessions',
        detail: 'events',
        retention_days: retentionDays,
      },
      ...(c.observability ?? {}),
    },
    runtime: {
      engine: c.runtime?.engine ?? 'livekit-agents',
      provider_mode: c.runtime?.provider_mode ?? (c.runtime?.mode === 'inference' ? 'inference' : 'plugins'),
      mode: c.runtime?.mode ?? c.runtime?.provider_mode ?? 'plugins',
      timezone: c.runtime?.timezone ?? 'UTC',
      ...(c.runtime ?? {}),
    },
  };
}

/**
 * Sanitizes and formats an AgentConfig to guarantee 100% compliance
 * with backend schema 1.1 / 1.2 before validate/saveDraft/publish calls.
 */
export function toServerConfig(raw: AgentConfig | Partial<AgentConfig> | null | undefined): AgentConfig {
  if (!raw) return raw as unknown as AgentConfig;
  const config = JSON.parse(JSON.stringify(raw)) as Record<string, any>;

  config.schema_version = config.schema_version || '1.1';

  // 1. Meta
  if (config.meta) {
    config.meta.status = config.meta.status || 'draft';
    config.meta.version = config.meta.version || '1.0.0';
    config.meta.name = config.meta.name || config.meta.id || 'Agent';
    config.meta.id = config.meta.id || 'agent';
  }

  // 2. Persona
  if (config.persona) {
    if (config.persona.rules !== undefined) {
      if (
        typeof config.persona.rules === 'string' &&
        config.persona.rules.trim() &&
        (!config.persona.shared_rules || config.persona.shared_rules.length === 0)
      ) {
        config.persona.shared_rules = [config.persona.rules.trim()];
      }
      delete config.persona.rules;
    }
    if (config.persona.recording_notice !== undefined) {
      if (config.persona.recording_notice) {
        config.persona.disclosures = {
          ...(config.persona.disclosures || {}),
          recording_notice:
            typeof config.persona.disclosures?.recording_notice === 'string'
              ? config.persona.disclosures.recording_notice
              : 'This call may be recorded.',
        };
      }
      delete config.persona.recording_notice;
    }
  }

  // 3. Defaults
  if (config.defaults) {
    if (typeof config.defaults.language === 'string') {
      const code = config.defaults.language;
      config.defaults.language = { primary: code, speaks: [code] };
    }
    if (config.defaults.models?.tts) {
      const tts = config.defaults.models.tts;
      if (tts.voice && !tts.voice_id) {
        tts.voice_id = tts.voice;
      }
      if (!tts.model) {
        tts.model = tts.provider === 'elevenlabs' ? 'eleven_flash_v2_5' : 'sonic-3';
      }
      delete tts.voice;
    }
    if (config.defaults.conversation) {
      const conv = config.defaults.conversation;
      if (conv.inactivity_timeout_s !== undefined && !conv.inactivity) {
        conv.inactivity = {
          enabled: true,
          clock: 'auto',
          timeout_s: Number(conv.inactivity_timeout_s) || 20,
          max_nudges: 1,
          nudges: [{ type: 'say', text: 'Hello, are you still there?' }],
          on_exhausted: {
            do: [
              { type: 'say', text: 'Goodbye!' },
              { type: 'end_call' },
            ],
          },
        };
      }
      delete conv.inactivity_timeout_s;
      delete conv.allow_interruptions;
    }
  }

  // 4. Channels
  if (Array.isArray(config.channels)) {
    config.channels = config.channels.map((ch: any) => ({
      ...ch,
      modalities:
        ch.modalities ||
        (ch.type === 'web_chat' ? { input: ['text'], output: ['text'] } : { input: ['audio'], output: ['audio'] }),
      greeting: typeof ch.greeting === 'string' ? { say: ch.greeting } : (ch.greeting || { say: 'Hello!' }),
    }));
  }

  // 5. Agents
  if (config.agents?.items && Array.isArray(config.agents.items)) {
    config.agents.items = config.agents.items.map((ag: any) => ({
      ...ag,
      kind: ag.kind || 'router',
      instructions:
        typeof ag.instructions === 'string' ? { role: ag.instructions } : (ag.instructions || { role: 'Be helpful.' }),
    }));
  }

  // 6. Post-call
  if (config.post_call) {
    if (typeof config.post_call.summary === 'boolean') {
      config.post_call.summary = { enabled: config.post_call.summary };
    }
    if (typeof config.post_call.recording === 'boolean') {
      config.post_call.recording = { audio: config.post_call.recording, transcript: true };
    }
    if (config.post_call.redact_pii !== undefined) {
      if (config.post_call.redact_pii) {
        config.schema_version = '1.2';
        if (!config.post_call.redaction) {
          config.post_call.redaction = {
            enabled: true,
            entities: ['card_number', 'phone_number', 'email'],
          };
        }
      }
      delete config.post_call.redact_pii;
    }
    if (config.post_call.redaction?.enabled) {
      config.schema_version = '1.2';
      if (!config.post_call.redaction.entities || config.post_call.redaction.entities.length === 0) {
        config.post_call.redaction.entities = ['card_number', 'phone_number', 'email'];
      }
    }
  }

  // 7. Observability
  if (config.observability) {
    if (config.observability.retention_days !== undefined) {
      config.observability.session_log = {
        enabled: true,
        directory: 'sessions',
        detail: 'events',
        retention_days: Number(config.observability.retention_days) || 30,
        ...(config.observability.session_log || {}),
      };
      delete config.observability.retention_days;
    }
    delete config.observability.store_transcripts;
  }

  // 8. Runtime
  if (config.runtime) {
    config.runtime.engine = config.runtime.engine || 'livekit-agents';
    config.runtime.provider_mode =
      config.runtime.provider_mode || (config.runtime.mode === 'inference' ? 'inference' : 'plugins');
    delete config.runtime.mode;
  }

  return config as AgentConfig;
}