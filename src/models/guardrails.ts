// Guardrails in plain words, for the top of the Guardrails page: the topics it keeps to, the limits on a call, and the
// moments it hands over or ends the call by itself. Each reads its part of `guardrails` (GET /schema) and writes it
// back; a part left empty is taken out, so nothing is written that was not chosen. Pure: no React, no network.
import type { AgentConfig } from '../types/studio';

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const list = <T = unknown,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const strings = (v: unknown) => list(v).filter((s): s is string => typeof s === 'string' && s.trim() !== '');
const tidy = (items: unknown) => Array.from(new Set(strings(items).map((s) => s.trim())));

/** A line it says: the text itself, or '' for a reference to a fixed line (sayRef names it). */
export const sayText = (say: unknown) => (typeof say === 'string' ? say : '');
export const sayRef = (say: unknown) => (isObj(say) && typeof say.message === 'string' ? say.message : '');

function edit(config: AgentConfig, change: (g: Json, next: AgentConfig) => void): AgentConfig {
  const next = clone(config ?? {});
  const g = (isObj(next.guardrails) ? next.guardrails : {}) as Json;
  next.guardrails = g;
  change(g, next);
  ['topics', 'limits'].forEach((part) => {
    if (isObj(g[part]) && Object.keys(g[part] as Json).length === 0) delete g[part];
  });
  ['escalation', 'input', 'output'].forEach((part) => {
    if (Array.isArray(g[part]) && (g[part] as unknown[]).length === 0) delete g[part];
  });
  if (Object.keys(g).length === 0) delete next.guardrails;
  return next;
}

// ---- topics -------------------------------------------------------------------------------------------------------------------------------
export interface OffTopic {
  strikes: number;
  then: string;
  say: string;
  sayRef: string;
}

export function topicsOf(config: AgentConfig): { allowed: string[]; blocked: string[]; offTopic: OffTopic | null } {
  const t = (isObj(config?.guardrails?.topics) ? config.guardrails.topics : {}) as Json;
  const off = isObj(t.on_off_topic) ? t.on_off_topic : null;
  return {
    allowed: tidy(t.allowed),
    blocked: tidy(t.blocked),
    offTopic: off ? { strikes: Number(off.max_strikes) || 1, then: typeof off.then === 'string' ? off.then : '', say: sayText(off.say), sayRef: sayRef(off.say) } : null,
  };
}

export function setTopics(config: AgentConfig, which: 'allowed' | 'blocked', items: string[]): AgentConfig {
  return edit(config, (g) => {
    const topics = { ...(isObj(g.topics) ? g.topics : {}) } as Json;
    const clean = tidy(items);
    if (clean.length) topics[which] = clean;
    else delete topics[which];
    g.topics = topics;
  });
}

/**
 * After `strikes` off-topic tries it runs the tool `then` (ending the call, passing to a person...), saying `say` first.
 * null takes the rule away. A new rule with no tool is not written (the schema needs one); one made by hand without a
 * tool is kept until a tool is chosen. What it says is kept as typed.
 */
export function setOffTopic(config: AgentConfig, value: Partial<OffTopic> | null): AgentConfig {
  return edit(config, (g) => {
    const topics = { ...(isObj(g.topics) ? g.topics : {}) } as Json;
    const had = isObj(topics.on_off_topic) ? (topics.on_off_topic as Json) : null;
    if (!value || (!value.then && !had)) delete topics.on_off_topic;
    else {
      const rule: Json = { ...(had ?? {}), max_strikes: Math.max(1, Math.round(Number(value.strikes) || 1)) };
      if (value.then) rule.then = value.then;
      const say = String(value.say ?? '');
      if (say.trim()) rule.say = say;
      else if (value.sayRef) rule.say = { message: value.sayRef };
      else delete rule.say;
      topics.on_off_topic = rule;
    }
    g.topics = topics;
  });
}

/** The tools that can end things, by name: ending the conversation and passing to a person first. */
export function endingTools(config: AgentConfig): { id: string; label: string; builtin: string }[] {
  const tools = list<Json>(config?.tools).filter((t) => isObj(t) && typeof t.id === 'string' && t.id);
  const rank = (t: Json) => (t.builtin === 'end_call' ? 0 : t.builtin === 'transfer_or_callback' ? 1 : 2);
  const label = (t: Json) => (t.builtin === 'end_call' ? 'End the conversation' : t.builtin === 'transfer_or_callback' ? 'Pass them to a person' : `Run “${String(t.id).replace(/[_-]+/g, ' ')}”`);
  return [...tools].sort((a, b) => rank(a) - rank(b)).map((t) => ({ id: String(t.id), label: label(t), builtin: String(t.builtin ?? '') }));
}

// ---- limits -------------------------------------------------------------------------------------------------------------------------------
export type LimitKey = 'max_call_duration_s' | 'max_silence_s' | 'max_tool_calls_per_call' | 'max_handoffs_per_call';
export const LIMITS: { key: LimitKey; label: string; unit: string; help: string; toInput: (v: number | undefined) => number | ''; fromInput: (v: string) => number }[] = [
  { key: 'max_call_duration_s', label: 'Longest call', unit: 'minutes', help: 'The call ends this long after it starts.', toInput: (s) => (s ? Math.round((s / 60) * 10) / 10 : ''), fromInput: (m) => Math.max(30, Math.round(Number(m) * 60)) },
  { key: 'max_silence_s', label: 'Longest silence', unit: 'seconds', help: 'It ends the call when the caller has said nothing for this long, whatever the nudges.', toInput: (s) => s ?? '', fromInput: (v) => Math.max(1, Math.round(Number(v))) },
  { key: 'max_tool_calls_per_call', label: 'Most tool uses in one call', unit: '', help: 'Lookups, hand-overs and other tools together. The call ends at the next one.', toInput: (v) => v ?? '', fromInput: (v) => Math.max(1, Math.round(Number(v))) },
  { key: 'max_handoffs_per_call', label: 'Most moves between agents in one call', unit: '', help: 'Only when several agents share the work. The call ends instead of moving again.', toInput: (v) => v ?? '', fromInput: (v) => Math.max(1, Math.round(Number(v))) },
];

export function limitsOf(config: AgentConfig): { values: Partial<Record<LimitKey, number>>; say: string; sayRef: string } {
  const l = (isObj(config?.guardrails?.limits) ? config.guardrails.limits : {}) as Json;
  const values: Partial<Record<LimitKey, number>> = {};
  LIMITS.forEach(({ key }) => {
    if (l[key] !== null && l[key] !== '' && l[key] !== undefined && Number.isFinite(Number(l[key]))) values[key] = Number(l[key]);
  });
  return { values, say: sayText(l.say), sayRef: sayRef(l.say) };
}

/** A limit as typed: '' takes it away; anything else becomes a whole number within what the schema allows. */
export function setLimit(config: AgentConfig, key: LimitKey, typed: string): AgentConfig {
  const limit = LIMITS.find((l) => l.key === key);
  if (!limit) return config;
  return edit(config, (g) => {
    const limits = { ...(isObj(g.limits) ? g.limits : {}) } as Json;
    const text = String(typed ?? '').trim();
    if (!text || !Number.isFinite(Number(text)) || Number(text) <= 0) delete limits[key];
    else limits[key] = limit.fromInput(text);
    g.limits = limits;
  });
}

/** What it says when a limit ends the call, kept as typed; nothing but spaces takes it away. */
export function setLimitSay(config: AgentConfig, text: string): AgentConfig {
  return edit(config, (g) => {
    const limits = { ...(isObj(g.limits) ? g.limits : {}) } as Json;
    if (String(text ?? '').trim()) limits.say = String(text);
    else delete limits.say;
    g.limits = limits;
  });
}

// ---- handing over and ending, by itself ---------------------------------------------------------------------------------------------------
export type MomentId = 'frustrated_to_person' | 'asks_for_person' | 'abusive_end';
interface Moment {
  id: MomentId;
  label: string;
  text: string;
  needs: 'transfer' | '';
  keywords?: string[];
  make: (tool: string, keywords: string[]) => Json;
}
export const MOMENTS: Moment[] = [
  {
    id: 'frustrated_to_person',
    label: 'Pass a frustrated caller to a person',
    text: 'When someone sounds frustrated two turns in a row, it offers them a person.',
    needs: 'transfer',
    make: (tool) => ({ id: 'frustrated_to_person', when: { sentiment: 'frustrated', consecutive_turns: 2 }, action: 'tool', tool, say: 'I’m sorry this is taking a while. Let me get you to someone who can help.' }),
  },
  {
    id: 'asks_for_person',
    label: 'Pass people who ask for a manager or to complain',
    text: 'When the caller uses one of these words, it passes them to a person.',
    needs: 'transfer',
    keywords: ['manager', 'complaint', 'supervisor'],
    make: (tool, keywords) => ({ id: 'asks_for_person', when: { keywords }, action: 'tool', tool, say: 'Of course. Let me get you to a person.' }),
  },
  {
    id: 'abusive_end',
    label: 'End the call when someone is abusive',
    text: 'It says a short, polite goodbye and ends the call.',
    needs: '',
    make: () => ({ id: 'abusive_end', when: { sentiment: 'abusive' }, action: 'end_call', say: 'I’m going to end this call now. Please get in touch again when you’re ready. Goodbye.' }),
  },
];

const transferTool = (config: AgentConfig) => list<Json>(config?.tools).find((t) => isObj(t) && t.builtin === 'transfer_or_callback' && t.id)?.id as string | undefined;
// the server takes the ids of the checks and of these rules as one set
const checkHasId = (config: AgentConfig, id: string) => [...list<Json>(config?.guardrails?.input), ...list<Json>(config?.guardrails?.output)].some((c) => isObj(c) && c.id === id);

/** The switch a rule is, when it still does what the switch says (a rule changed by hand is not named as it). */
export function momentOf(rule: Json, config: AgentConfig): Moment | null {
  const moment = isObj(rule) ? MOMENTS.find((m) => m.id === rule.id) : undefined;
  if (!moment) return null;
  const words = strings((rule.when as Json | undefined)?.keywords);
  const made = moment.make(transferTool(config) || String(rule.tool ?? ''), words.length ? words : moment.keywords ?? []);
  return ruleWords(made, config) === ruleWords(rule, config) ? moment : null;
}

export interface MomentState {
  on: boolean;
  changed: string;
  keywords?: string[];
  possible: boolean;
  why: string;
}

export function momentsOf(config: AgentConfig): Record<MomentId, MomentState> {
  const rules = list<Json>(config?.guardrails?.escalation).filter(isObj);
  const transfer = transferTool(config);
  return Object.fromEntries(
    MOMENTS.map((m) => {
      const rule = rules.find((r) => r.id === m.id);
      const same = !!rule && momentOf(rule, config) === m;
      const clash = !rule && checkHasId(config, m.id);
      const possible = !clash && (m.needs !== 'transfer' || !!transfer);
      return [
        m.id,
        {
          on: !!rule,
          changed: rule && !same ? `Changed in the list below. ${ruleWords(rule, config)}.` : '',
          keywords: m.keywords ? (rule ? (same ? tidy((rule.when as Json).keywords) : []) : m.keywords) : undefined,
          possible,
          why: possible ? '' : clash ? `A check already has the id “${m.id}”. Rename it to switch this on.` : 'Switch on “Pass people to a person” on the Tools page first: this uses it.',
        },
      ];
    })
  ) as Record<MomentId, MomentState>;
}

export function setMoment(config: AgentConfig, id: MomentId, on: boolean, { keywords }: { keywords?: string[] } = {}): AgentConfig {
  const moment = MOMENTS.find((m) => m.id === id);
  if (!moment) return config;
  const there = list<Json>(config?.guardrails?.escalation).some((r) => isObj(r) && r.id === id);
  if (on && (there || checkHasId(config, id))) return config;
  return edit(config, (g, next) => {
    const rules = list<Json>(g.escalation).filter((r) => !(isObj(r) && r.id === id));
    if (on) {
      const tool = transferTool(next);
      if (moment.needs === 'transfer' && !tool) return;
      rules.push(moment.make(tool ?? '', tidy(keywords?.length ? keywords : moment.keywords ?? [])));
    }
    g.escalation = rules;
  });
}

/** The words a switched-on rule listens for; the last word stays (a rule with none would never apply). */
export function setMomentWords(config: AgentConfig, id: MomentId, keywords: string[]): { config: AgentConfig; refused: string } {
  const words = tidy(keywords);
  if (!words.length) return { config, refused: 'It needs at least one word. To stop it, switch it off.' };
  const index = list<Json>(config?.guardrails?.escalation).findIndex((r) => isObj(r) && r.id === id);
  if (index < 0) return { config, refused: '' };
  return {
    config: edit(config, (g) => {
      g.escalation = list<Json>(g.escalation).map((r, i) => (i === index ? { ...r, when: { ...(isObj(r.when) ? r.when : {}), keywords: words } } : r));
    }),
    refused: '',
  };
}

const SENTIMENT: Record<string, string> = { frustrated: 'sounds frustrated', negative: 'is unhappy', abusive: 'is abusive' };
const words = (id: string) => {
  const t = String(id).replace(/[_-]+/g, ' ').trim();
  return t ? `${t[0].toUpperCase()}${t.slice(1)}` : '';
};

/** One rule in words: "When the caller sounds frustrated (2 turns in a row): pass them to a person". */
export function ruleWords(rule: Json, config: AgentConfig): string {
  if (!isObj(rule)) return '';
  const w = (isObj(rule.when) ? rule.when : {}) as Json;
  const parts: string[] = [];
  if (w.sentiment) parts.push(`the caller ${SENTIMENT[String(w.sentiment)] ?? w.sentiment}`);
  if (strings(w.keywords).length) parts.push(`they say ${strings(w.keywords).map((k) => `“${k}”`).join(' or ')}`);
  if (w.intent) parts.push(`they want to ${String(w.intent).replace(/[_-]+/g, ' ')}`);
  if (w.state) parts.push(`what it remembers as “${w.state}” matches`);
  let when = parts.length ? `When ${parts.join(' and ')}` : 'When its condition is met';
  if (Number(w.consecutive_turns) > 1) when += ` (${w.consecutive_turns} turns in a row)`;
  const tool = list<Json>(config?.tools).find((t) => isObj(t) && t.id === rule.tool);
  const agent = list<Json>(config?.agents?.items).find((a) => isObj(a) && a.id === rule.to);
  const then =
    rule.action === 'end_call'
      ? 'end the call'
      : rule.action === 'handoff'
        ? `pass them to ${typeof agent?.name === 'string' && agent.name ? agent.name : rule.to ? words(String(rule.to)) : 'another agent'}`
        : tool?.builtin === 'transfer_or_callback'
          ? 'pass them to a person'
          : tool?.builtin === 'end_call'
            ? 'end the call'
            : `run “${rule.tool ? words(String(rule.tool)) : 'a tool'}”`;
  return `${when}: ${then}`;
}

// ---- checks on what is said -----------------------------------------------------------------------------------------------------------------
const TRIGGER: Record<string, string> = { deflect: 'politely declines', redact_in_logs: 'hides it in the call log', rewrite: 'rewrites it', block: 'blocks it', end_call: 'ends the call' };
const ENFORCED: Record<string, string> = { code: 'Checked in code, every time.', both: 'Checked in code, and the agent is told too.', prompt: 'Told to the agent as advice: not checked.' };
const KIND: Record<string, string> = { prompt_injection: 'Attempts to change its instructions', pii_detect: 'Personal details', field_firewall: 'Values it must never repeat', regex_block: 'Words or patterns', statement: 'A rule it is told' };

/** A check in words: what it looks for, what it does when it finds it, and how it is enforced. */
export function checkWords(rule: Json): { what: string; then: string; how: string } {
  if (!isObj(rule)) return { what: '', then: '', how: '' };
  const action = String((rule.on_trigger as Json | undefined)?.action ?? '');
  const entities = strings(rule.entities).map((e) => e.replace(/_/g, ' '));
  return {
    what: `${KIND[String(rule.type)] ?? String(rule.type)}${entities.length ? `: ${entities.join(', ')}` : ''}`,
    then: rule.type === 'field_firewall' ? 'keeps them out' : rule.type === 'statement' ? '' : TRIGGER[action] ?? action,
    how: ENFORCED[String(rule.enforcement)] ?? '',
  };
}

/** The server's POST /preview/guardrails answer, read tolerantly (a missing part is left out, never an error). */
export interface GuardrailPreview {
  action: string;
  matched: { rule: string; kinds: string[]; found: string[] }[];
  says: string;
  modelSees: string;
  savedAs: string;
  notChecked: string[];
}
export function readGuardrailPreview(raw: unknown): GuardrailPreview {
  const r = (isObj(raw) ? raw : {}) as Json;
  return {
    action: typeof r.action === 'string' ? r.action : '',
    matched: list<Json>(r.matched).filter(isObj).map((m) => ({ rule: String(m.rule ?? ''), kinds: strings(m.kinds), found: list<Json>(m.found).map((f) => String(f?.text ?? '')).filter(Boolean) })),
    says: typeof r.says_instead === 'string' ? r.says_instead : '',
    modelSees: typeof r.model_sees === 'string' ? r.model_sees : '',
    savedAs: typeof r.saved_as === 'string' ? r.saved_as : '',
    notChecked: list(r.not_checked_in_code).map((x) => (isObj(x) ? String(x.id ?? x.rule ?? '') : String(x))).filter(Boolean),
  };
}

/** What a preview did, in words. */
export function previewWords(p: GuardrailPreview): string {
  if (!p.matched.length) return 'Nothing it checks for is in this line: the agent answers it as usual.';
  const what = p.matched.map((m) => `${m.rule}${m.kinds.length ? ` (${m.kinds.join(', ').replace(/_/g, ' ')})` : ''}`).join(', ');
  return `Found by ${what}. It ${TRIGGER[p.action] ?? p.action ?? 'acts'}.`;
}

// ---- a personal-details check on what the caller says -------------------------------------------------------------------------------------
const PII_ID = 'personal_details';

/** The switch's own check (input, pii_detect, id "personal_details"): on, and the kinds it looks for. */
export function personalDetailsOf(config: AgentConfig): { on: boolean; entities: string[] } {
  const rule = list<Json>(config?.guardrails?.input).find((r) => isObj(r) && r.id === PII_ID && r.type === 'pii_detect');
  return { on: !!rule, entities: strings(rule?.entities) };
}

/**
 * Switched on, it hides those kinds in what is saved while the agent still hears them (redact_in_logs, checked in code).
 * The kinds are the server's (GET /redaction/entities); the last one stays (the schema needs one).
 */
export function setPersonalDetails(config: AgentConfig, on: boolean, entities: string[]): AgentConfig {
  return edit(config, (g) => {
    const input = list<Json>(g.input).filter((r) => !(isObj(r) && r.id === PII_ID));
    const kinds = tidy(entities);
    if (on && kinds.length) {
      const had = list<Json>(config?.guardrails?.input).find((r) => isObj(r) && r.id === PII_ID);
      input.push({ ...(had ?? {}), id: PII_ID, type: 'pii_detect', entities: kinds, enforcement: had?.enforcement ?? 'code', on_trigger: had?.on_trigger ?? { action: 'redact_in_logs' } });
    } else if (on) return;
    g.input = input;
  });
}
