import type { AgentConfig, ChannelType, Issue, Path, UnsupportedFeature, ValidationReport } from '../types/studio';
import { connectionSecrets, llmProviders, sttProviders, ttsProviders, type ProviderOption } from '../data/providers';
import { settingsCatalog } from '../data/settingsCatalog';
import { pathKey } from './path';

const channelLabels: Record<ChannelType, string> = {
  web_chat: 'Web chat',
  web_voice: 'Web voice',
  sip_voice: 'Phone',
  whatsapp: 'WhatsApp',
  sms: 'Text message',
  email: 'Email',
  custom: 'Custom channel'
};
export const channelLabel = (type: ChannelType): string => channelLabels[type] ?? type;

const findProvider = (list: ProviderOption[], id: string | undefined) => list.find((p) => p.id === id);

export function getGreetingText(greeting: unknown): string {
  if (typeof greeting === 'string') return greeting;
  if (greeting && typeof greeting === 'object') {
    const g = greeting as Record<string, unknown>;
    if (typeof g.say === 'string') return g.say;
    if (typeof g.text === 'string') return g.text;
    if (typeof g.message === 'string') return g.message;
  }
  return '';
}

export function getInstructionsText(instructions: unknown): string {
  if (typeof instructions === 'string') return instructions;
  if (instructions && typeof instructions === 'object') {
    const ins = instructions as Record<string, unknown>;
    if (typeof ins.role === 'string') return ins.role;
    if (typeof ins.text === 'string') return ins.text;
    if (typeof ins.system === 'string') return ins.system;
  }
  return '';
}

export function validateConfig(config: AgentConfig): ValidationReport {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const secrets = new Set<string>();

  if (!config?.meta?.name?.trim()) errors.push({ path: ['meta', 'name'], message: 'Give the agent a name so your team can find it.' });
  if (config?.meta?.version && !/^\d+\.\d+\.\d+$/.test(config.meta.version)) {
    errors.push({ path: ['meta', 'version'], message: 'The version must look like 1.2.3.' });
  }
  if (!config?.persona?.company?.trim()) {
    // Only warn or skip if persona has a name
    if (!config?.persona?.name?.trim()) {
      errors.push({ path: ['persona', 'company'], message: 'Add the company or agent name.' });
    }
  }

  const channels = Array.isArray(config?.channels) ? config.channels : [];
  if (!channels.some((c) => c.enabled)) errors.push({ path: null, message: 'Turn on at least one channel, otherwise nobody can reach this agent.' });
  channels.forEach((c, i) => {
    const text = getGreetingText(c.greeting);
    if (c.enabled && !text.trim()) {
      errors.push({ path: ['channels', i, 'greeting'], message: `${channelLabel(c.type)} is on but has no greeting, so callers would hear silence.` });
    }
  });

  const items = Array.isArray(config?.agents?.items) ? config.agents.items : [];
  const ids = items.map((a) => a.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  Array.from(new Set(dupes)).forEach((id) => {
    errors.push({ path: null, message: `Two roles share the id '${id}'. Each role needs its own id.` });
  });
  if (config?.agents?.entry && !ids.includes(config.agents.entry)) {
    errors.push({ path: ['agents', 'entry'], message: `'${config?.agents?.entry ?? ''}' is not one of this agent’s roles. Pick who answers first.` });
  }

  const tools = Array.isArray(config?.tools) ? config.tools : [];
  const toolIds = tools.map((t) => t.id);
  const usedTools = new Set<string>();
  items.forEach((a, i) => {
    (a.tools ?? []).forEach((t, j) => {
      usedTools.add(t);
      if (!toolIds.includes(t)) {
        errors.push({ path: ['agents', 'items', i, 'tools', j], message: `'${t}' is not a declared tool. Add it under What it can do, or remove it from ${a.name}.` });
      }
    });
    const instrText = getInstructionsText(a.instructions);
    if (!instrText.trim()) {
      warnings.push({ path: ['agents', 'items', i, 'instructions'], message: `${a.name} has no instructions, so it relies on the shared rules only.` });
    }
  });
  tools.forEach((t) => {
    if (!usedTools.has(t.id)) warnings.push({ path: null, message: `Tool '${t.id}' is not used by any role.` });
    if (t.connection) secrets.add(connectionSecrets[t.connection] ?? `${t.connection.toUpperCase()}_API_TOKEN`);
  });

  const llm = config?.defaults?.models?.llm;
  if (!llm?.provider) {
    errors.push({ path: ['defaults', 'models', 'llm', 'provider'], message: 'Pick a supported language model provider.' });
  } else {
    const llmProvider = findProvider(llmProviders, llm.provider);
    secrets.add(llmProvider?.secret || (llm.provider === 'openai' ? 'OPENAI_API_KEY' : `${llm.provider.toUpperCase()}_API_KEY`));
    if (!llm.model?.trim()) {
      errors.push({ path: ['defaults', 'models', 'llm', 'model'], message: 'Provide a model ID.' });
    }
  }

  const usesAudio = channels.some((c) => c.enabled && c.type !== 'web_chat');
  if (usesAudio) {
    const stt = config?.defaults?.models?.stt;
    if (stt?.provider) {
      const sttProvider = findProvider(sttProviders, stt.provider);
      secrets.add(sttProvider?.secret || `${stt.provider.toUpperCase()}_API_KEY`);
    }
    const tts = config?.defaults?.models?.tts;
    if (tts?.provider) {
      const ttsProvider = findProvider(ttsProviders, tts.provider);
      secrets.add(ttsProvider?.secret || (tts.provider === 'elevenlabs' ? 'ELEVEN_API_KEY' : `${tts.provider.toUpperCase()}_API_KEY`));
    }
  }

  if (config?.post_call?.recording?.audio === true && !config?.persona?.disclosures?.recording_notice) {
    warnings.push({ path: ['persona', 'disclosures', 'recording_notice'], message: 'Calls are recorded but callers are not told. Many regions require a recording notice.' });
  }
  const retentionDays = config?.observability?.session_log?.retention_days ?? 0;
  if (retentionDays > 365) {
    warnings.push({ path: ['observability', 'session_log', 'retention_days'], message: 'Records are kept for more than a year. Check this matches your retention policy.' });
  }

  const valid = errors.length === 0;
  const unsupported: UnsupportedFeature[] = valid ?
  tools.flatMap((t, i) => t.type === 'mcp' ? [{ feature: 'MCP server tools', where: `tools[${i}] · ${t.id}` }] : []) :
  [];

  return { valid, errors, warnings, secrets_required: Array.from(secrets).sort(), unsupported };
}

export function describePath(path: Path, config: AgentConfig): string {
  const key = pathKey(path);
  const def = settingsCatalog.find((s) => s.path === key);
  if (def) return def.label;
  if (path[0] === 'channels' && typeof path[1] === 'number') {
    const ch = config.channels?.[path[1]];
    return ch ? `${channelLabel(ch.type)} › ${path[2] === 'greeting' ? 'Greeting' : String(path[2] ?? '')}` : key;
  }
  if (path[0] === 'agents' && path[1] === 'items' && typeof path[2] === 'number') {
    const a = config.agents?.items?.[path[2]];
    const field = path[3] === 'tools' ? 'Tools' : path[3] === 'instructions' ? 'Instructions' : String(path[3] ?? '');
    return `${a?.name ?? 'Role'} › ${field}`;
  }
  return key;
}

export function issuesAt(issues: Issue[], path: Path | string): Issue[] {
  const key = typeof path === 'string' ? path : pathKey(path);
  return issues.filter((i) => i.path && (pathKey(i.path) === key || pathKey(i.path).startsWith(`${key}.`)));
}