import type { AgentConfig } from '../types/studio';
import type { SettingDef } from '../data/settingsCatalog';
import { languages, llmProviders, sttProviders, ttsProviders, serverSecrets, type ProviderOption } from '../data/providers';

export interface SelectOption {
  value: string;
  label: string;
}

const toOptions = (list: ProviderOption[]): SelectOption[] => list.map((p) => ({ value: p.id, label: p.label }));
const modelsOf = (list: ProviderOption[], id: string | undefined): SelectOption[] =>
list.find((p) => p.id === id)?.models.map((m) => ({ value: m.id, label: m.note ? `${m.label} — ${m.note}` : m.label })) ?? [];

export function resolveOptions(def: SettingDef, config: AgentConfig): SelectOption[] {
  if (def.options) return def.options;
  switch (def.optionsFrom) {
    case 'languages':
      return languages.map((l) => ({ value: l.id, label: l.label }));
    case 'llm_providers':
      return toOptions(llmProviders);
    case 'llm_models':
      return modelsOf(llmProviders, config.defaults?.models?.llm?.provider);
    case 'stt_providers':
      return toOptions(sttProviders);
    case 'stt_models':
      return modelsOf(sttProviders, config.defaults?.models?.stt?.provider);
    case 'tts_providers':
      return toOptions(ttsProviders);
    case 'tts_voices':
      return modelsOf(ttsProviders, config.defaults?.models?.tts?.provider);
    case 'agents':
      return (config.agents?.items ?? []).map((a) => ({ value: a.id, label: a.name }));
    default:
      return [];
  }
}

// When a provider changes, its model/voice must change with it.
export const providerFollowUps: Record<string, {list: ProviderOption[];sibling: string;}> = {
  'defaults.models.llm.provider': { list: llmProviders, sibling: 'defaults.models.llm.model' },
  'defaults.models.stt.provider': { list: sttProviders, sibling: 'defaults.models.stt.model' },
  'defaults.models.tts.provider': { list: ttsProviders, sibling: 'defaults.models.tts.voice' }
};

export function missingProviderKey(pathKey: string, value: string): string | null {
  const follow = providerFollowUps[pathKey];
  if (!follow) return null;
  const provider = follow.list.find((p) => p.id === value);
  if (!provider || serverSecrets.includes(provider.secret)) return null;
  return provider.secret;
}