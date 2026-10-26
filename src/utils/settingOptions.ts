import type { AgentConfig } from '../types/studio';
import type { ProvidersAnswer } from '../api/types';
import type { SettingDef } from '../data/settingsCatalog';
import { languages, llmProviders, sttProviders, type ProviderOption } from '../data/providers';
import { VOICE_CATALOG } from '../data/voiceCatalog';
import { missingProviderKey as providerKeyMissing, providersFor, voicesFor } from './providerOptions';

export interface SelectOption {
  value: string;
  label: string;
}

const modelsOf = (list: ProviderOption[], id: string | undefined): SelectOption[] =>
list.find((p) => p.id === id)?.models.map((m) => ({ value: m.id, label: m.note ? `${m.label} — ${m.note}` : m.label })) ?? [];

const providerOptions = (stage: 'llm' | 'stt' | 'tts', providers: ProvidersAnswer | null, current: string | undefined): SelectOption[] =>
providersFor(stage, providers, current).map((p) => ({
  value: p.value,
  label: p.unlisted ? `${p.label} (not reported by the server)` : p.keyAvailable === false ? `${p.label} (key not set on the server)` : p.label
}));

/** The first voice offered for a provider, used when the provider changes. */
export const firstVoiceOf = (provider: string): string | undefined => voicesFor(provider, VOICE_CATALOG)[0]?.voiceId;

export function resolveOptions(def: SettingDef, config: AgentConfig, providers: ProvidersAnswer | null): SelectOption[] {
  if (def.options) return def.options;
  const models = config.defaults?.models;
  switch (def.optionsFrom) {
    case 'languages':
      return languages.map((l) => ({ value: l.id, label: l.label }));
    case 'llm_providers':
      return providerOptions('llm', providers, models?.llm?.provider);
    case 'llm_models':
      return modelsOf(llmProviders, models?.llm?.provider);
    case 'stt_providers':
      return providerOptions('stt', providers, models?.stt?.provider);
    case 'stt_models':
      return modelsOf(sttProviders, models?.stt?.provider);
    case 'tts_providers':
      return providerOptions('tts', providers, models?.tts?.provider);
    case 'tts_voices':
      return voicesFor(models?.tts?.provider, VOICE_CATALOG).map((v) => ({ value: v.voiceId, label: `${v.name} — ${v.style}, ${v.language}` }));
    case 'agents':
      return (config.agents?.items ?? []).map((a) => ({ value: a.id, label: a.name }));
    default:
      return [];
  }
}

// When a provider changes, its model/voice must change with it.
export const providerFollowUps: Record<string, {first: (provider: string) => string | undefined;sibling: string;}> = {
  'defaults.models.llm.provider': { first: (p) => llmProviders.find((x) => x.id === p)?.models[0]?.id, sibling: 'defaults.models.llm.model' },
  'defaults.models.stt.provider': { first: (p) => sttProviders.find((x) => x.id === p)?.models[0]?.id, sibling: 'defaults.models.stt.model' },
  'defaults.models.tts.provider': { first: firstVoiceOf, sibling: 'defaults.models.tts.voice' }
};

/** The secret a provider setting needs when the server says it is not set, else null. */
export function missingProviderKey(pathKey: string, value: string, providers: ProvidersAnswer | null): string | null {
  if (!providerFollowUps[pathKey]) return null;
  return providerKeyMissing(value, providers);
}
