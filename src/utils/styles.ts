import { twMerge } from 'tailwind-merge';

export function cn(...classes: (string | false | null | undefined)[]): string {
  return twMerge(classes.filter(Boolean).join(' '));
}

export const inputClass =
'w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted transition-[border-color,box-shadow] duration-150 ease-out focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted';

export const inputErrorClass = 'border-danger focus:border-danger focus:ring-danger/20';

export const easeOut = [0.23, 1, 0.32, 1] as const;