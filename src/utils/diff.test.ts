import { describe, expect, it } from 'vitest';
import { diffConfigs } from './diff';

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
