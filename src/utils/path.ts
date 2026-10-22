import type { Path } from '../types/studio';

type Indexable = Record<string | number, unknown>;

export function getAt(obj: unknown, path: Path): unknown {
  return path.reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') return undefined;
    return (acc as Indexable)[key];
  }, obj);
}

export function setAt<T>(obj: T, path: Path, value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path;
  const source = (obj ?? (typeof head === 'number' ? [] : {})) as unknown;
  const copy = (Array.isArray(source) ? [...source] : { ...(source as Indexable) }) as Indexable;
  copy[head] = setAt(copy[head], rest, value);
  return copy as unknown as T;
}

export const pathKey = (path: Path): string => path.join('.');

export const parsePath = (key: string): Path => key.split('.').map((k) => /^\d+$/.test(k) ? Number(k) : k);

export const fieldId = (path: Path | string): string => `field-${typeof path === 'string' ? path : pathKey(path)}`;