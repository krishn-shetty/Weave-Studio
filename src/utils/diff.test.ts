import { describe, expect, it } from 'vitest';
import { diffConfigs, formatValue, groupChanges, meaningfulChanges } from './diff';

describe('diffConfigs', () => {
  it('finds nothing when the configs are equal', () => {
    expect(diffConfigs({ a: 1, b: [1, 2] }, { a: 1, b: [1, 2] })).toEqual([]);
  });

  it('reports added, removed and changed keys with their paths', () => {
    const changes = diffConfigs({ a: 1, gone: true }, { a: 2, added: 'x' });
    expect(changes).toEqual([
      { op: 'change', path: ['a'], before: 1, after: 2 },
      { op: 'remove', path: ['gone'], before: true },
      { op: 'add', path: ['added'], after: 'x' }
    ]);
  });

  it('matches list items by id instead of position', () => {
    const before = { tools: [{ id: 'lookup', url: 'a' }, { id: 'end' }] };
    const after = { tools: [{ id: 'end' }, { id: 'lookup', url: 'b' }, { id: 'transfer' }] };
    expect(diffConfigs(before, after)).toEqual([
      { op: 'change', path: ['tools', 'id=lookup', 'url'], before: 'a', after: 'b' },
      { op: 'add', path: ['tools', 'id=transfer'], after: { id: 'transfer' } }
    ]);
  });

  it('treats a list without ids as one value', () => {
    expect(diffConfigs({ l: [1, 2] }, { l: [2, 1] })).toEqual([{ op: 'change', path: ['l'], before: [1, 2], after: [2, 1] }]);
  });
});

describe('groupChanges', () => {
  it('groups by top-level section with plain labels', () => {
    const groups = groupChanges(diffConfigs({ persona: { name: 'A' }, tools: [] }, { persona: { name: 'B' }, tools: [{ id: 't' }] }));
    expect(groups.map((g) => [g.section, g.label, g.changes.length])).toEqual([
      ['persona', 'Personality', 1],
      ['tools', 'What it can do', 1]
    ]);
  });
});

describe('meaningfulChanges', () => {
  it('drops the version bookkeeping field', () => {
    const changes = diffConfigs({ meta: { version: '1' }, x: 1 }, { meta: { version: '2' }, x: 2 });
    expect(meaningfulChanges(changes).map((c) => c.path.join('.'))).toEqual(['x']);
  });
});

describe('formatValue', () => {
  it('writes values in plain words', () => {
    expect(formatValue(undefined)).toBe('—');
    expect(formatValue(true)).toBe('On');
    expect(formatValue('')).toBe('(empty)');
    expect(formatValue(3)).toBe('3');
  });
});
