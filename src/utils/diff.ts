export interface Change {
  op: 'add' | 'remove' | 'change';
  path: string[];
  before?: unknown;
  after?: unknown;
}

export interface ChangeGroup {
  section: string;
  label: string;
  changes: Change[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function diffConfigs(a: unknown, b: unknown, path: string[] = []): Change[] {
  if (same(a, b)) return [];
  if (Array.isArray(a) && Array.isArray(b)) {
    const idList = [...a, ...b].length > 0 && [...a, ...b].every((x) => isObj(x) && typeof x.id === 'string');
    if (!idList) return [{ op: 'change', path, before: a, after: b }];
    const byId = (arr: unknown[]) => new Map(arr.map((x) => [String((x as Record<string, unknown>).id), x]));
    const ma = byId(a);
    const mb = byId(b);
    const out: Change[] = [];
    ma.forEach((val, id) => {
      if (!mb.has(id)) out.push({ op: 'remove', path: [...path, `id=${id}`], before: val });else
      out.push(...diffConfigs(val, mb.get(id), [...path, `id=${id}`]));
    });
    mb.forEach((val, id) => {
      if (!ma.has(id)) out.push({ op: 'add', path: [...path, `id=${id}`], after: val });
    });
    return out;
  }
  if (isObj(a) && isObj(b)) {
    const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
    return keys.flatMap((k) => {
      if (!(k in a)) return [{ op: 'add' as const, path: [...path, k], after: b[k] }];
      if (!(k in b)) return [{ op: 'remove' as const, path: [...path, k], before: a[k] }];
      return diffConfigs(a[k], b[k], [...path, k]);
    });
  }
  return [{ op: 'change', path, before: a, after: b }];
}

const sectionLabels: Record<string, string> = {
  meta: 'About this agent',
  persona: 'Personality',
  defaults: 'Voice, language and model',
  channels: 'Where it is available',
  agents: 'Roles and instructions',
  tools: 'What it can do',
  post_call: 'After the call',
  observability: 'Quality and records',
  runtime: 'Engine settings'
};

export function groupChanges(changes: Change[]): ChangeGroup[] {
  const map = new Map<string, Change[]>();
  changes.forEach((c) => {
    const s = c.path[0] ?? 'root';
    map.set(s, [...(map.get(s) ?? []), c]);
  });
  return Array.from(map.entries()).map(([section, list]) => ({
    section,
    label: sectionLabels[section] ?? section,
    changes: list
  }));
}

export function formatValue(v: unknown): string {
  if (v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'On' : 'Off';
  if (typeof v === 'string') return v === '' ? '(empty)' : v;
  if (typeof v === 'number') return String(v);
  return JSON.stringify(v);
}

export const meaningfulChanges = (changes: Change[]): Change[] => changes.filter((c) => c.path.join('.') !== 'meta.version');