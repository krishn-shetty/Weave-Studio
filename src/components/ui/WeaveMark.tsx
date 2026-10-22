import React from 'react';

export function WeaveMark({ className = 'h-7 w-7' }: {className?: string;}) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden>
      <rect width="28" height="28" rx="7" fill="rgb(var(--accent))" />
      <path d="M6 10c3 0 3 4 6 4s3-4 6-4 3 4 4 4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M6 16c3 0 3 4 6 4s3-4 6-4 3 4 4 4" stroke="white" strokeOpacity="0.6" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>);

}