import React from "react";
import { motion } from "framer-motion";
import { BotIcon, CircleAlertIcon, ClipboardListIcon, CpuIcon, PlugIcon, PowerIcon, RadioIcon, UsersIcon, BoxIcon } from "lucide-react";
import { TraceEvent, TraceKind } from "../../../types/testConsole";
import { cn, easeOut } from "../../../utils/styles";
const icons: Record<TraceKind, BoxIcon> = {
  session: RadioIcon,
  agent: BotIcon,
  llm: CpuIcon,
  tool: PlugIcon,
  handoff: UsersIcon,
  form: ClipboardListIcon,
  end: PowerIcon,
  error: CircleAlertIcon
};
export function TracePanel({
  trace


}: {trace: TraceEvent[];}) {
  return <section aria-labelledby="trace-title" className="flex min-h-0 flex-col rounded-xl border border-line bg-surface">
      <div className="border-b border-line px-4 py-3">
        <h2 id="trace-title" className="text-sm font-semibold text-ink">Live trace</h2>
        <p className="text-xs text-muted">What the agent did behind each reply.</p>
      </div>
      {trace.length === 0 ? <p className="px-4 py-10 text-center text-[13px] text-muted">Start a conversation to see model calls, tools and forms here.</p> : <ol className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-2" aria-live="polite">
          {trace.map((e) => {
        const Icon = icons[e.kind];
        return <motion.li key={e.id} initial={{
          opacity: 0,
          y: 4
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.18,
          ease: easeOut
        }} className="flex gap-2.5 rounded-md px-2 py-2">
                <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', e.status === 'error' ? 'text-danger' : e.status === 'ok' ? 'text-success' : 'text-muted')} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={cn('text-[13px] font-medium', e.status === 'error' ? 'text-danger' : 'text-ink')}>{e.label}</p>
                    <span className="shrink-0 font-mono text-[11px] text-muted">+{(e.at_ms / 1000).toFixed(1)}s</span>
                  </div>
                  {e.detail && <p className="break-words font-mono text-[11px] leading-relaxed text-muted">{e.detail}</p>}
                </div>
              </motion.li>;
      })}
        </ol>}
    </section>;
}