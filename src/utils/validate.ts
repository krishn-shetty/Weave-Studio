// Plain-language readers and labels for a config. The checks themselves are the server's (POST /validate, see
// serverValidation.ts): the studio no longer keeps its own list of what makes a config valid.
import type { AgentConfig, ChannelType, Issue, Path } from '../types/studio';
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