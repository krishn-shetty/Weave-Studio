import React from 'react';
import { SparklesIcon, InfoIcon } from 'lucide-react';

interface DemoDataBadgeProps {
  label?: string;
  detail?: string;
  className?: string;
}

export function DemoDataBadge({
  label = 'Demo Data',
  detail = 'Backend API is not available on this server. Displaying interactive preview data.',
  className = '',
}: DemoDataBadgeProps) {
  return (
    <span
      title={detail}
      className={`inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 ${className}`}
    >
      <SparklesIcon className="h-3 w-3 text-amber-500 shrink-0" aria-hidden />
      <span>{label}</span>
      <span className="text-[10px] opacity-75 font-normal hidden sm:inline">({detail})</span>
    </span>
  );
}
