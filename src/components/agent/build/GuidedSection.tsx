import React from 'react';
import { ArrowRightIcon } from 'lucide-react';

interface GuidedSectionProps {
  id: string;
  title: string;
  description: string;
  onMore?: () => void;
  children: React.ReactNode;
}

export function GuidedSection({ id, title, description, onMore, children }: GuidedSectionProps) {
  return (
    <section aria-labelledby={id} className="grid gap-6 border-b border-line py-8 first:pt-2 last:border-0 md:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 id={id} className="text-[15px] font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>
        {onMore &&
        <button
          type="button"
          onClick={onMore}
          className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
          
            More settings for this
            <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
          </button>
        }
      </div>
      <div className="min-w-0 space-y-5">{children}</div>
    </section>);

}