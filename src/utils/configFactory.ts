import type { AgentConfig } from '../types/studio';
import type { Starter } from '../data/starters';

interface StarterInput {
  company: string;
  starter: Starter;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * A new agent's draft: the minimal draft the server made for it (POST /bots), with the starter's own content laid on
 * top: who it is, what it says first, what it does and its tools. Nothing else is added, so models, runtime and every
 * other setting stay what the server chose.
 */
export function applyStarter(base: AgentConfig, { company, starter }: StarterInput): AgentConfig {
  const config = clone(base);
  const greeting = starter.greeting.replace('{company}', company).replace('{persona}', starter.personaName);

  config.persona = {
    ...config.persona,
    name: starter.personaName,
    tone: starter.tone,
    ...(company.trim() ? { company: company.trim() } : {}),
    ...(starter.rules ? { style_rules: [starter.rules] } : {}),
  };
  if (starter.summary && !config.meta?.description) config.meta = { ...config.meta, description: starter.summary };

  config.channels = (config.channels ?? []).map((ch) => ({ ...ch, greeting: { ...ch.greeting, say: greeting } }));

  const items = config.agents?.items ?? [];
  const entryIndex = Math.max(0, items.findIndex((a) => a.id === config.agents?.entry));
  if (items[entryIndex]) {
    const entry = items[entryIndex];
    items[entryIndex] = {
      ...entry,
      instructions: { ...entry.instructions, role: starter.instructions },
      tools: Array.from(new Set([...(entry.tools ?? []), ...starter.tools.map((t) => t.id)])),
    };
    config.agents = { ...config.agents, items };
  }
  if (starter.tools.length) {
    const have = new Set((config.tools ?? []).map((t) => t.id));
    config.tools = [...(config.tools ?? []), ...starter.tools.filter((t) => !have.has(t.id)).map((t) => ({ ...t }))];
  }
  return config;
}
