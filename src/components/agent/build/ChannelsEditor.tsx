import React from 'react';
import type { AgentConfig, ChannelType, Issue, Path } from '../../../types/studio';
import { Toggle } from '../../ui/Toggle';
import { StatusChip } from '../../ui/StatusChip';
import { fieldId } from '../../../utils/path';
import { channelLabel, issuesAt } from '../../../utils/validate';
import { cn, inputClass, inputErrorClass } from '../../../utils/styles';

interface ChannelsEditorProps {
  config: AgentConfig;
  errors: Issue[];
  disabled: boolean;
  technical?: boolean;
  update: (path: Path, value: unknown) => void;
}

const descriptions: Record<ChannelType, string> = {
  web_chat: 'A chat box on your website. Text in, text out.',
  web_voice: 'A talk button on your website. Uses the voice you picked.',
  phone: 'Callers ring a phone number. Needs a number set up by your admin.'
};

export function ChannelsEditor({ config, errors, disabled, technical, update }: ChannelsEditorProps) {
  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
      {(config.channels ?? []).map((ch, i) => {
        const greetingPath: Path = ['channels', i, 'greeting'];
        const error = issuesAt(errors, greetingPath)[0]?.message;
        return (
          <li key={ch.id} className="px-4 py-4">
            <div id={fieldId(['channels', i, 'enabled'])} className="flex items-start justify-between gap-4">
              <div>
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                  {technical ? <code className="font-mono text-[13px]">channels[{i}] · {ch.id}</code> : channelLabel(ch.type)}
                  {ch.type === 'phone' && <StatusChip>Number setup not in Studio yet</StatusChip>}
                </p>
                <p className="mt-0.5 text-[13px] text-muted">{descriptions[ch.type]}</p>
              </div>
              <Toggle checked={ch.enabled} onChange={(v) => update(['channels', i, 'enabled'], v)} label={`${channelLabel(ch.type)} on`} disabled={disabled} />
            </div>
            {ch.enabled &&
            <div id={fieldId(greetingPath)} className="mt-3 scroll-mt-28 rounded-md transition-[box-shadow] duration-200">
                <label htmlFor={`${fieldId(greetingPath)}-input`} className="text-[13px] font-medium text-ink-soft">
                  Greeting — the first thing callers hear
                </label>
                <textarea
                id={`${fieldId(greetingPath)}-input`}
                rows={2}
                value={ch.greeting}
                disabled={disabled}
                onChange={(e) => update(greetingPath, e.target.value)}
                className={cn(inputClass, 'mt-1.5 resize-y', error && inputErrorClass)} />
              
                {error && <p className="mt-1.5 text-[13px] text-danger" role="alert">{error}</p>}
              </div>
            }
          </li>);

      })}
    </ul>);

}