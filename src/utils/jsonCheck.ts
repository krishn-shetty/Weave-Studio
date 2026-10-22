export type JsonCheck =
{ok: true;value: unknown;} |
{ok: false;message: string;line: number | null;};

function lineAt(text: string, position: number): number {
  return text.slice(0, position).split('\n').length;
}

function findDuplicateKey(text: string): {key: string;line: number;} | null {
  const stack: {type: 'obj' | 'arr';keys: Set<string>;}[] = [];
  let line = 1;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\n') line++;
    if (ch === '"') {
      let j = i + 1;
      let s = '';
      while (j < text.length && text[j] !== '"') {
        if (text[j] === '\\') {
          s += text[j + 1] ?? '';
          j += 2;
          continue;
        }
        s += text[j];
        j++;
      }
      let k = j + 1;
      while (k < text.length && /\s/.test(text[k])) {
        if (text[k] === '\n') line++;
        k++;
      }
      const top = stack[stack.length - 1];
      if (text[k] === ':' && top?.type === 'obj') {
        if (top.keys.has(s)) return { key: s, line };
        top.keys.add(s);
      }
      i = k;
      continue;
    }
    if (ch === '{') stack.push({ type: 'obj', keys: new Set() });else
    if (ch === '[') stack.push({ type: 'arr', keys: new Set() });else
    if (ch === '}' || ch === ']') stack.pop();
    i++;
  }
  return null;
}

export function checkJson(text: string): JsonCheck {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { ok: false, message: 'The configuration must be a JSON object, starting with {.', line: 1 };
    }
    const dupe = findDuplicateKey(text);
    if (dupe) return { ok: false, message: `The key "${dupe.key}" appears twice in the same object. Only one would be kept.`, line: dupe.line };
    return { ok: true, value };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid JSON';
    const pos = /position (\d+)/.exec(msg);
    const lineMatch = /line (\d+)/.exec(msg);
    const line = pos ? lineAt(text, Number(pos[1])) : lineMatch ? Number(lineMatch[1]) : null;
    return { ok: false, message: msg.replace(/^JSON\.parse: /, ''), line };
  }
}