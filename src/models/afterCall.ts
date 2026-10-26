// After the call in plain words: a summary of each call, questions answered about each call, what is recorded (and what
// callers are told about it), and the sensitive details hidden in what is kept. Each reads its part (GET /schema paths)
// and writes it back; a part left empty is taken out. A setting the config does not set is null ("the server's
// default"), never guessed. The kinds of detail come from the server (GET /redaction/entities). Pure.
import type { AgentConfig, UnsupportedFeature } from '../types/studio';

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const list = <T = unknown,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const str = (v: unknown) => (typeof v === 'string' ? v : '');

function edit(config: AgentConfig, change: (pc: Json, next: AgentConfig) => void): AgentConfig {
  const next = clone(config ?? {});
  const pc = (isObj(next.post_call) ? next.post_call : {}) as Json;
  next.post_call = pc;
  change(pc, next);
  ['summary', 'recording', 'redaction'].forEach((part) => {
    if (isObj(pc[part]) && Object.keys(pc[part] as Json).length === 0) delete pc[part];
  });
  if (Array.isArray(pc.analysis) && (pc.analysis as unknown[]).length === 0) delete pc.analysis;
  if (Object.keys(pc).length === 0) delete next.post_call;
  return next;
}

export type AnswerKind = 'boolean' | 'enum' | 'number' | 'string';
export const ANSWER_KINDS: [AnswerKind, string][] = [
  ['boolean', 'Yes or no'],
  ['enum', 'One of a list'],
  ['number', 'A number'],
  ['string', 'In a few words'],
];
export const QUESTION_IDEAS: { question: string; type: AnswerKind; values?: string[] }[] = [
  { question: 'Was the caller’s problem solved?', type: 'boolean' },
  { question: 'Why did they get in touch?', type: 'enum', values: ['A question', 'A problem', 'A booking', 'A complaint', 'Something else'] },
  { question: 'How did the caller feel at the end?', type: 'enum', values: ['Happy', 'Neutral', 'Unhappy'] },
];

export interface Question {
  /** Its place in post_call.analysis (what the setters take). */
  index: number;
  id: string;
  question: string;
  type: AnswerKind | '';
  values: string[];
}

export interface AfterCall {
  summary: { on: boolean | null; prompt: string };
  questions: Question[];
  recording: { audio: boolean | null; transcript: boolean | null; days: number | null };
  log: { on: boolean | null; days: number | null };
  notice: string;
  redaction: { on: boolean; entities: string[] };
}

export function afterCallOf(config: AgentConfig): AfterCall {
  const pc = (isObj(config?.post_call) ? config.post_call : {}) as Json;
  const bool = (v: unknown) => (v === true ? true : v === false ? false : null);
  const kinds = ANSWER_KINDS.map(([id]) => id as string);
  const summary = (isObj(pc.summary) ? pc.summary : {}) as Json;
  const recording = (isObj(pc.recording) ? pc.recording : {}) as Json;
  const redaction = isObj(pc.redaction) ? (pc.redaction as Json) : null;
  const log = (isObj(config?.observability?.session_log) ? config.observability.session_log : {}) as Json;
  return {
    summary: { on: bool(summary.enabled), prompt: str(summary.prompt) },
    questions: list<Json>(pc.analysis)
      .map((q, index) => ({ q, index }))
      .filter(({ q }) => isObj(q))
      .map(({ q, index }) => ({ index, id: str(q.id), question: str(q.question), type: kinds.includes(String(q.type)) ? (q.type as AnswerKind) : '', values: list(q.values).filter((v): v is string => typeof v === 'string') })),
    recording: { audio: bool(recording.audio), transcript: bool(recording.transcript), days: Number(recording.retention_days) > 0 ? Number(recording.retention_days) : null },
    log: { on: bool(log.enabled), days: Number(log.retention_days) > 0 ? Number(log.retention_days) : null },
    notice: str(config?.persona?.disclosures?.recording_notice),
    // on once post_call.redaction is there and not switched off (enabled defaults to true inside it)
    redaction: { on: !!redaction && redaction.enabled !== false, entities: list(redaction?.entities).filter((e): e is string => typeof e === 'string') },
  };
}

// ---- the summary -------------------------------------------------------------------------------------------------------------------------
export function setSummary(config: AgentConfig, { on, prompt }: { on?: boolean | null; prompt?: string }): AgentConfig {
  return edit(config, (pc) => {
    const summary = { ...(isObj(pc.summary) ? pc.summary : {}) } as Json;
    // Back to the server's default only when nothing else was chosen in it (the schema needs `enabled` while the part
    // is there, and setting it to off would not be the default).
    if (on === null) {
      if (Object.keys(summary).every((k) => k === 'enabled')) delete pc.summary;
      return;
    }
    if (on !== undefined) summary.enabled = !!on;
    if (prompt !== undefined && summary.enabled !== undefined) {
      if (String(prompt).trim()) summary.prompt = String(prompt);
      else delete summary.prompt;
    }
    pc.summary = summary;
  });
}

// ---- questions ------------------------------------------------------------------------------------------------------------------------------
const idFrom = (text: string, taken: string[]) => {
  const base = String(text ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^[^a-z]+/, '').slice(0, 40) || 'question';
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}_${n}`;
  return id;
};

/** A question's id is made once, from its words, and stays when the words change. */
export function addQuestion(config: AgentConfig, { question = '', type = 'boolean', values = [] }: { question?: string; type?: AnswerKind; values?: string[] } = {}): AgentConfig {
  return edit(config, (pc) => {
    const analysis = list<Json>(pc.analysis);
    const item: Json = { id: idFrom(question || 'question', analysis.map((q) => String(q?.id ?? '')).filter(Boolean)), type, question: String(question) };
    if (type === 'enum') item.values = values.length ? values : ['Yes', 'No'];
    pc.analysis = [...analysis, item];
  });
}

/** A list of answers to choose from stays only with "One of a list". */
export function setQuestion(config: AgentConfig, index: number, change: { question?: string; type?: AnswerKind; values?: string[] }): AgentConfig {
  return edit(config, (pc) => {
    const analysis = list<Json>(pc.analysis).map((q) => (isObj(q) ? { ...q } : q));
    const q = analysis[index];
    if (!isObj(q)) return;
    if (change.question !== undefined) q.question = String(change.question);
    if (change.type !== undefined) q.type = change.type;
    if (change.values !== undefined) q.values = change.values.map((v) => String(v).trim()).filter(Boolean);
    if (q.type === 'enum' && !list(q.values).length) q.values = ['Yes', 'No'];
    if (q.type !== 'enum') delete q.values;
    pc.analysis = analysis;
  });
}

export const removeQuestion = (config: AgentConfig, index: number): AgentConfig =>
  edit(config, (pc) => {
    pc.analysis = list(pc.analysis).filter((_, i) => i !== index);
  });

// ---- recording and the call log -------------------------------------------------------------------------------------------------------
/** days: whole days, one at least ('' or null: no limit set). null for audio/transcript: back to the server's default. */
export function setRecording(config: AgentConfig, change: { audio?: boolean | null; transcript?: boolean | null; days?: number | string | null }): AgentConfig {
  return edit(config, (pc) => {
    const recording = { ...(isObj(pc.recording) ? pc.recording : {}) } as Json;
    (['audio', 'transcript'] as const).forEach((k) => {
      if (change[k] === null) delete recording[k];
      else if (change[k] !== undefined) recording[k] = !!change[k];
    });
    if (change.days !== undefined) {
      const days = Number(change.days);
      if (change.days === '' || change.days === null || !Number.isFinite(days) || days <= 0) delete recording.retention_days;
      else recording.retention_days = Math.max(1, Math.round(days));
    }
    pc.recording = recording;
  });
}

export function setLog(config: AgentConfig, change: { on?: boolean | null; days?: number | string | null }): AgentConfig {
  const next = clone(config ?? {});
  const obs = (isObj(next.observability) ? next.observability : {}) as Json;
  const log = { ...(isObj(obs.session_log) ? obs.session_log : {}) } as Json;
  if (change.on === null) delete log.enabled;
  else if (change.on !== undefined) log.enabled = !!change.on;
  if (change.days !== undefined) {
    const days = Number(change.days);
    if (change.days === '' || change.days === null || !Number.isFinite(days) || days <= 0) delete log.retention_days;
    else log.retention_days = Math.max(1, Math.round(days));
  }
  if (Object.keys(log).length) obs.session_log = log;
  else delete obs.session_log;
  if (Object.keys(obs).length) next.observability = obs as AgentConfig['observability'];
  else delete next.observability;
  return next;
}

/** What callers hear first about the recording (persona.disclosures.recording_notice); empty takes it away. */
export function setNotice(config: AgentConfig, text: string): AgentConfig {
  const next = clone(config ?? {});
  const persona = { ...(isObj(next.persona) ? next.persona : {}) } as Json;
  const disclosures = { ...(isObj(persona.disclosures) ? persona.disclosures : {}) } as Json;
  if (String(text ?? '').trim()) disclosures.recording_notice = String(text);
  else delete disclosures.recording_notice;
  if (Object.keys(disclosures).length) persona.disclosures = disclosures;
  else delete persona.disclosures;
  if (Object.keys(persona).length) next.persona = persona as AgentConfig['persona'];
  else delete next.persona;
  return next;
}

// ---- hiding sensitive details -----------------------------------------------------------------------------------------------------------
/** The kinds the server recognises (GET /redaction/entities): { kind, how }. */
export interface Entity {
  kind: string;
  how: string;
}

const ENTITY_WORDS: Record<string, string> = {
  card_number: 'Card numbers',
  bank_account: 'Bank account numbers',
  national_id: 'ID numbers',
  phone_number: 'Phone numbers',
  email: 'Email addresses',
  date_of_birth: 'Dates of birth',
  otp: 'One-time codes',
  pin: 'PINs',
};
/** A kind in words; one the studio has no words for is shown as its own name, made readable. */
export const entityLabel = (kind: string) => ENTITY_WORDS[kind] ?? `${kind.charAt(0).toUpperCase()}${kind.slice(1).replace(/_/g, ' ')}`;

/** What the agent already handles that is worth hiding: card numbers, the kinds its personal-details checks look for, PINs it keeps sensitive. */
export function sensitiveEntities(config: AgentConfig): string[] {
  const out = new Set(['card_number']);
  (['input', 'output'] as const).forEach((side) =>
    list<Json>(config?.guardrails?.[side]).forEach((rule) => {
      if (isObj(rule) && rule.type === 'pii_detect') list(rule.entities).forEach((e) => typeof e === 'string' && out.add(e));
    })
  );
  Object.entries(isObj(config?.state?.variables) ? (config.state.variables as Json) : {}).forEach(([name, spec]) => {
    if (isObj(spec) && spec.sensitive === true && /pin/i.test(name)) out.add('pin');
  });
  return Array.from(out);
}

/**
 * Switched on from nothing, it starts with what the agent already handles (only kinds the server knows). On is written
 * as enabled: true; switched off with nothing else chosen, the part goes. Redaction is a schema 1.2 setting: a config
 * that says less is raised to 1.2 (every 1.1 config is a valid 1.2 one).
 */
export function setRedaction(config: AgentConfig, change: { on?: boolean; entities?: string[] }, known: string[]): AgentConfig {
  return edit(config, (pc, next) => {
    const was = isObj(pc.redaction) ? (pc.redaction as Json) : null;
    const on = change.on !== undefined ? !!change.on : !!was && was.enabled !== false;
    const redaction = { ...(was ?? {}) } as Json;
    if (change.on !== undefined) redaction.enabled = !!change.on;
    const first = sensitiveEntities(next).filter((k) => known.includes(k));
    if (change.on === true && change.entities === undefined && !list(redaction.entities).length && first.length) redaction.entities = known.filter((k) => first.includes(k));
    if (change.entities !== undefined) {
      const chosen = known.filter((k) => change.entities?.includes(k));
      if (chosen.length) redaction.entities = chosen;
      else delete redaction.entities;
    }
    if (on && Object.keys(redaction).length === 0) redaction.enabled = true;
    if (change.on === false && Object.keys(redaction).every((k) => k === 'enabled' || k === 'entities') && list(redaction.entities).join() === known.filter((k) => first.includes(k)).join())
      delete redaction.entities;
    if (redaction.enabled === false && Object.keys(redaction).length === 1) {
      delete pc.redaction;
      return;
    }
    pc.redaction = redaction;
    if (!(Number(next.schema_version) >= 1.2)) next.schema_version = '1.2';
  });
}

/** Which parts the server says it does not do yet (the validator's `unsupported`, matched by what each item names). */
export function notDoneYet(unsupported: UnsupportedFeature[] | undefined) {
  const says = (re: RegExp) => list<UnsupportedFeature>(unsupported).some((u) => re.test(`${u.where ?? ''} ${u.feature ?? ''}`));
  return {
    summary: says(/post_call\.summary|post-call summar/i),
    questions: says(/post_call\.analysis|post-call analysis/i),
    recording: says(/post_call\.recording|call recording/i),
    redaction: says(/post_call\.redaction|redaction/i),
  };
}

/** What is kept, in sentences a customer can read. Settings not set say the server decides. */
export function recordsInWords(a: AfterCall, unsupported?: UnsupportedFeature[]): string[] {
  const not = notDoneYet(unsupported);
  const lines: string[] = [];
  lines.push(a.log.on === false ? 'No log of each call is kept.' : a.log.on === true ? `A log of each call is kept${a.log.days ? ` for ${a.log.days} days` : ' until someone deletes it'}.` : 'Whether a log of each call is kept is the server’s default (on).');
  const kept = [a.recording.audio ? 'the audio' : '', a.recording.transcript ? 'the transcript' : ''].filter(Boolean);
  if (kept.length) lines.push(`${kept.join(' and ')} of each call ${kept.length > 1 ? 'are' : 'is'} kept${a.recording.days ? ` for ${a.recording.days} days` : ''}.${not.recording ? ' The server does not do this yet.' : ''}`.replace(/^t/, 'T'));
  else if (a.recording.audio === null && a.recording.transcript === null) lines.push('Recording audio and transcripts is the server’s default.');
  else lines.push('No audio or transcript is kept.');
  lines.push(a.notice ? `Callers first hear: “${a.notice}”` : 'Callers are not told about recording.');
  lines.push(a.redaction.on ? `${a.redaction.entities.length ? a.redaction.entities.map(entityLabel).join(', ') : 'Nothing chosen yet'} ${a.redaction.entities.length ? 'are' : 'is'} hidden in what is kept.${not.redaction ? ' The server does not do this yet.' : ''}` : 'Nothing is hidden in what is kept beyond values marked sensitive.');
  return lines;
}

/** The server's POST /preview/redaction answer, read tolerantly. */
export function readRedactionPreview(raw: unknown): { redacted: string; found: { kind: string; text: string }[]; appliesTo: string[]; modelSees: string } {
  const r = (isObj(raw) ? raw : {}) as Json;
  return {
    redacted: str(r.redacted),
    found: list<Json>(r.found).filter(isObj).map((f) => ({ kind: str(f.kind), text: str(f.text) })),
    appliesTo: list(r.applies_to).filter((x): x is string => typeof x === 'string'),
    modelSees: str(r.model_sees),
  };
}
