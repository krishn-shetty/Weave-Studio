import React from 'react';
import { XIcon } from 'lucide-react';
import type { DraftEditor } from '../../../hooks/useDraftEditor';
import type { SettingGroupId } from '../../../data/settingsCatalog';
import type { Path, Tone } from '../../../types/studio';
import { GuidedSection } from './GuidedSection';
import { ChannelsEditor } from './ChannelsEditor';
import { toolTypeLabel } from './ToolsEditor';
import { Field } from '../../ui/Field';
import { Toggle } from '../../ui/Toggle';
import { Segmented } from '../../ui/Segmented';
import { StatusChip } from '../../ui/StatusChip';
import { languages, llmProviders, ttsProviders } from '../../../data/providers';
import { fieldId } from '../../../utils/path';
import { issuesAt } from '../../../utils/validate';
import { missingProviderKey } from '../../../utils/settingOptions';
import { cn, inputClass, inputErrorClass } from '../../../utils/styles';

interface GuidedViewProps {
  editor: DraftEditor;
  onMore: (group: SettingGroupId) => void;
}

const tones: {value: Tone;label: string;}[] = [
{ value: 'warm', label: 'Warm' },
{ value: 'neutral', label: 'Neutral' },
{ value: 'formal', label: 'Formal' },
{ value: 'upbeat', label: 'Upbeat' }];


export function GuidedView({ editor, onMore }: GuidedViewProps) {
  const { config, validation, update, canEdit } = editor;
  if (!config || !validation) return null;
  const disabled = !canEdit;
  const err = (p: Path) => issuesAt(validation.errors, p)[0]?.message;
  const warn = (p: Path) => issuesAt(validation.warnings, p)[0]?.message;

  const entryIndex = Math.max(0, config.agents.items.findIndex((a) => a.id === config.agents.entry));
  const entry = config.agents.items[entryIndex];
  const toolsPath: Path = ['agents', 'items', entryIndex, 'tools'];
  const declared = config.tools ?? [];
  const undeclared = (entry?.tools ?? []).filter((t) => !declared.some((d) => d.id === t));

  const llmProvider = llmProviders.find((p) => p.id === config.defaults.models.llm.provider);
  const ttsProvider = ttsProviders.find((p) => p.id === config.defaults.models.tts.provider);
  const llmMissing = missingProviderKey('defaults.models.llm.provider', config.defaults.models.llm.provider);
  const ttsMissing = missingProviderKey('defaults.models.tts.provider', config.defaults.models.tts.provider);

  const setProvider = (kind: 'llm' | 'tts', id: string) => {
    const list = kind === 'llm' ? llmProviders : ttsProviders;
    update(['defaults', 'models', kind, 'provider'], id);
    const first = list.find((p) => p.id === id)?.models[0]?.id;
    if (first) update(['defaults', 'models', kind, kind === 'llm' ? 'model' : 'voice'], first);
  };

  return (
    <div>
      <GuidedSection id="g-personality" title="Personality and instructions" description="Who the agent is and what it should do. This shapes every reply." onMore={() => onMore('about')}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={fieldId('persona.company')} label="Company name" error={err(['persona', 'company'])}>
            <input id={`${fieldId('persona.company')}-input`} className={cn(inputClass, err(['persona', 'company']) && inputErrorClass)} value={config.persona.company} disabled={disabled} onChange={(e) => update(['persona', 'company'], e.target.value)} />
          </Field>
          <Field id={fieldId('persona.name')} label="Agent’s spoken name" help="What it calls itself.">
            <input id={`${fieldId('persona.name')}-input`} className={inputClass} value={config.persona.name} disabled={disabled} onChange={(e) => update(['persona', 'name'], e.target.value)} />
          </Field>
        </div>
        <Field id={fieldId('persona.tone')} label="Tone">
          <Segmented label="Tone" options={tones} value={config.persona.tone} onChange={(v) => !disabled && update(['persona', 'tone'], v)} />
        </Field>
        {entry &&
        <Field
          id={fieldId(['agents', 'items', entryIndex, 'instructions'])}
          label="Instructions"
          help="Plain language works best. Say what to help with, what to never do, and when to hand over."
          warning={warn(['agents', 'items', entryIndex, 'instructions'])}>
          
            <textarea
            id={`${fieldId(['agents', 'items', entryIndex, 'instructions'])}-input`}
            rows={5}
            className={cn(inputClass, 'resize-y leading-relaxed')}
            value={entry.instructions}
            disabled={disabled}
            onChange={(e) => update(['agents', 'items', entryIndex, 'instructions'], e.target.value)}
            placeholder="Help callers with bills and payments. Look up the account before answering anything specific." />
          
          </Field>
        }
      </GuidedSection>

      <GuidedSection id="g-voice" title="Voice and language" description="What callers hear on web voice and phone." onMore={() => onMore('talks')}>
        <Field id={fieldId('defaults.language')} label="Language">
          <select id={`${fieldId('defaults.language')}-input`} className={cn(inputClass, 'max-w-xs')} value={config.defaults.language} disabled={disabled} onChange={(e) => update(['defaults', 'language'], e.target.value)}>
            {languages.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </Field>
        <Field
          id={fieldId('defaults.models.tts.voice')}
          label="Voice"
          error={err(['defaults', 'models', 'tts'])}
          warning={ttsMissing ? `The server doesn’t have ${ttsMissing} yet. Voice calls will fail until an admin adds it.` : undefined}>
          
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[13px] text-muted">Provider</span>
            <Segmented size="sm" label="Voice provider" options={ttsProviders.map((p) => ({ value: p.id, label: p.label }))} value={config.defaults.models.tts.provider} onChange={(v) => !disabled && setProvider('tts', v)} />
          </div>
          <div role="radiogroup" aria-label="Voice" className="grid gap-2 sm:grid-cols-3">
            {(ttsProvider?.models ?? []).map((v, i) => {
              const active = config.defaults.models.tts.voice === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={disabled}
                  id={i === 0 ? `${fieldId('defaults.models.tts.voice')}-input` : undefined}
                  onClick={() => update(['defaults', 'models', 'tts', 'voice'], v.id)}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-left transition-[border-color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                    active ? 'border-accent bg-accent-soft/60 ring-1 ring-accent' : 'border-line hover:border-line-strong'
                  )}>
                  
                  <span className="block text-sm font-medium text-ink">{v.label}</span>
                  <span className="block text-xs text-muted">{v.note}</span>
                </button>);

            })}
          </div>
        </Field>
      </GuidedSection>

      <GuidedSection id="g-model" title="AI model" description="The model that decides what to say. Bigger is smarter, slower and costs more." onMore={() => onMore('behaves')}>
        <Field
          id={fieldId('defaults.models.llm.model')}
          label="Model"
          recommended="GPT-4.1 mini"
          error={err(['defaults', 'models', 'llm'])}
          warning={llmMissing ? `The server doesn’t have ${llmMissing} yet. Tests and calls will fail until an admin adds it.` : undefined}>
          
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[13px] text-muted">Provider</span>
            <Segmented size="sm" label="Model provider" options={llmProviders.map((p) => ({ value: p.id, label: p.label }))} value={config.defaults.models.llm.provider} onChange={(v) => !disabled && setProvider('llm', v)} />
          </div>
          <div role="radiogroup" aria-label="Model" className="divide-y divide-line rounded-lg border border-line">
            {(llmProvider?.models ?? []).map((m, i) => {
              const active = config.defaults.models.llm.model === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={disabled}
                  id={i === 0 ? `${fieldId('defaults.models.llm.model')}-input` : undefined}
                  onClick={() => update(['defaults', 'models', 'llm', 'model'], m.id)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40">
                  
                  <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', active ? 'border-accent' : 'border-line-strong')} aria-hidden>
                    {active && <span className="h-2 w-2 rounded-full bg-accent" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{m.label}</span>
                    <span className="block text-xs text-muted">{m.note}</span>
                  </span>
                </button>);

            })}
          </div>
        </Field>
      </GuidedSection>

      <GuidedSection id="g-tools" title="What it can do" description={`Actions ${entry?.name ?? 'the agent'} can take during a conversation.`} onMore={() => onMore('can_do')}>
        <div id={fieldId(toolsPath)} className="scroll-mt-28 rounded-md transition-[box-shadow] duration-200">
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {declared.map((tool) => {
              const on = entry?.tools.includes(tool.id) ?? false;
              return (
                <li key={tool.id} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                      {tool.description}
                      {tool.type === 'mcp' && <StatusChip tone="warning">Not available yet</StatusChip>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {toolTypeLabel[tool.type] ?? tool.type} · <code className="font-mono">{tool.id}</code>
                    </p>
                  </div>
                  <Toggle
                    checked={on}
                    disabled={disabled}
                    label={`${entry?.name} can use ${tool.id}`}
                    onChange={(v) => update(toolsPath, v ? [...(entry?.tools ?? []), tool.id] : (entry?.tools ?? []).filter((t) => t !== tool.id))} />
                  
                </li>);

            })}
            {undeclared.map((t) =>
            <li key={t} className="flex items-start justify-between gap-4 bg-danger-soft/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-danger">
                    <code className="font-mono">{t}</code> is used but doesn’t exist
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">Remove it, or declare the tool in the JSON view.</p>
                </div>
                <button
                type="button"
                disabled={disabled}
                onClick={() => update(toolsPath, (entry?.tools ?? []).filter((x) => x !== t))}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-medium text-danger transition-colors duration-150 hover:bg-danger/10">
                
                  <XIcon className="h-3.5 w-3.5" aria-hidden />
                  Remove
                </button>
              </li>
            )}
          </ul>
        </div>
      </GuidedSection>

      <GuidedSection id="g-channels" title="Where it is available" description="Turn on the places people can reach this agent, each with its own greeting." onMore={() => onMore('available')}>
        <ChannelsEditor config={config} errors={validation.errors} disabled={disabled} update={update} />
      </GuidedSection>

      <GuidedSection id="g-records" title="Call records" description="What’s kept after each conversation. Transcripts may contain personal data." onMore={() => onMore('after')}>
        <div className="space-y-4">
          {[
          { path: ['observability', 'store_transcripts'] as Path, label: 'Keep transcripts', help: 'Needed to review calls in Studio.', value: config.observability.store_transcripts },
          { path: ['post_call', 'recording'] as Path, label: 'Record audio', help: 'Keeps audio of phone and voice calls.', value: config.post_call.recording },
          { path: ['persona', 'recording_notice'] as Path, label: 'Tell callers they may be recorded', help: 'Required in many regions when recording.', value: config.persona.recording_notice }].
          map((row) =>
          <div key={row.path.join('.')} id={fieldId(row.path)} className="flex scroll-mt-28 items-start justify-between gap-6 rounded-md transition-[box-shadow] duration-200">
              <div>
                <p className="text-sm font-medium text-ink">{row.label}</p>
                <p className="mt-0.5 text-[13px] text-muted">{row.help}</p>
                {warn(row.path) && <p className="mt-1 text-[13px] text-warning">{warn(row.path)}</p>}
              </div>
              <Toggle id={`${fieldId(row.path)}-input`} checked={row.value} label={row.label} disabled={disabled} onChange={(v) => update(row.path, v)} />
            </div>
          )}
          <Field id={fieldId('observability.retention_days')} label="Keep records for" warning={warn(['observability', 'retention_days'])}>
            <select
              id={`${fieldId('observability.retention_days')}-input`}
              className={cn(inputClass, 'max-w-xs')}
              value={config.observability.retention_days}
              disabled={disabled}
              onChange={(e) => update(['observability', 'retention_days'], Number(e.target.value))}>
              
              {Array.from(new Set([7, 30, 90, 365, config.observability.retention_days])).sort((a, b) => a - b).map((d) =>
              <option key={d} value={d}>{d} days</option>
              )}
            </select>
          </Field>
        </div>
      </GuidedSection>
    </div>);

}