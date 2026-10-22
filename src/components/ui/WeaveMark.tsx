export function WeaveMark({ className = 'h-7 w-7' }: { className?: string }) {
  return <img src="/assets/icon.png" alt="Weave Studio" className={className} draggable={false} />;
}