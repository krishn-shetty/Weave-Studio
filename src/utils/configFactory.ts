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
    meta: { id, name, version: '0.1.0', description: starter.summary },
    persona: {
      name: starter.personaName,
      company,
      tone: starter.tone,
      rules: starter.rules,
      recording_notice: true
    },
    defaults: {
      language: 'en-GB',
      models: {
        llm: { provider: 'openai', model: 'gpt-4.1-mini' },
        stt: { provider: 'deepgram', model: 'nova-3' },
        tts: { provider: 'cartesia', voice: 'maya' }
      },
      conversation: { inactivity_timeout_s: 20, allow_interruptions: true }
    },
    channels: [
    { id: 'web-chat', type: 'web_chat', enabled: true, greeting },
    { id: 'web-voice', type: 'web_voice', enabled: true, greeting },
    { id: 'phone', type: 'phone', enabled: false, greeting }],

    agents: {
      entry: 'front_desk',
      items: [
      {
        id: 'front_desk',
        name: 'Front desk',
        instructions: starter.instructions,
        tools: starter.tools.map((t) => t.id),
        handoffs: []
      }]

    },
    tools: starter.tools.map((t) => ({ ...t })),
    post_call: { summary: true, recording: false, redact_pii: true },
    observability: { retention_days: 30, store_transcripts: true },
    runtime: { mode: 'plugins', timezone: 'Europe/London' }
  };
}