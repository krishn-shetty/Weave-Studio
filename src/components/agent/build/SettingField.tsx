import React from 'react';
import type { AgentConfig, Issue, Path } from '../../../types/studio';
import type { SettingDef } from '../../../data/settingsCatalog';
import { Field } from '../../ui/Field';
import { Toggle } from '../../ui/Toggle';
import { fieldId, getAt, parsePath } from '../../../utils/path';
import { getLanguageCode, issuesAt } from '../../../utils/validate';
import { missingProviderKey, providerFollowUps, resolveOptions } from '../../../utils/settingOptions';
import { useProviders } from '../../../hooks/useProviders';
import { cn, inputClass, inputErrorClass } from '../../../utils/styles';

interface SettingFieldProps {
  def: SettingDef;
  config: AgentConfig;
  errors: Issue[];
  warnings: Issue[];
  technical: boolean;
  disabled: boolean;
  update: (path: Path, value: unknown) => void;
}

const PROVIDER_SOURCES = ['llm_providers', 'stt_providers', 'tts_providers'];

export function SettingField({ def, config, errors, warnings, technical, disabled, update }: SettingFieldProps) {
  const { answer: providers, error: providersError } = useProviders();
  const path = parsePath(def.path);
  let value = getAt(config, path);
  if (def.path === 'post_call.recording' && typeof value === 'object' && value !== null) {
    value = (value as any).audio;
  } else if (def.path === 'post_call.summary' && typeof value === 'object' && value !== null) {
    value = (value as any).enabled;
  } else if (def.path === 'persona.recording_notice') {
    value = Boolean(config.persona?.disclosures?.recording_notice ?? config.persona?.recording_notice);
  } else if (def.path === 'defaults.models.tts.voice') {
    value = config.defaults?.models?.tts?.voice ?? config.defaults?.models?.tts?.voice_id;
  } else if (def.path === 'observability.retention_days') {
    value = config.observability?.session_log?.retention_days ?? config.observability?.retention_days ?? 90;
  } else if (def.path === 'runtime.mode') {
    value = config.runtime?.provider_mode ?? config.runtime?.mode ?? 'plugins';
  }

  const id = fieldId(def.path);
  const inputId = `${id}-input`;
  const error = issuesAt(errors, def.path)[0]?.message;
  const warnFromReport = issuesAt(warnings, def.path)[0]?.message;
  const missingKey = def.type === 'select' ? missingProviderKey(def.path, String(value ?? ''), providers) : null;
  const listUnavailable = providersError && def.optionsFrom && PROVIDER_SOURCES.includes(def.optionsFrom) ? `The provider list could not be loaded (${providersError}), so only the current choice is shown.` : undefined;
  const warning = warnFromReport ?? (missingKey ? `The server doesn’t have ${missingKey} yet. Tests and calls will fail until an admin adds it.` : listUnavailable);

  const onChange = (v: unknown) => {
    update(path, v);
    if (def.path === 'defaults.models.tts.voice') {
      update(['defaults', 'models', 'tts', 'voice_id'], v);
    } else if (def.path === 'post_call.recording') {
      if (typeof config.post_call?.recording === 'object') {
        update(['post_call', 'recording'], { ...config.post_call.recording, audio: Boolean(v) });
      } else {
        update(['post_call', 'recording'], { audio: Boolean(v), transcript: true });
      }
    } else if (def.path === 'post_call.summary') {
      if (typeof config.post_call?.summary === 'object') {
        update(['post_call', 'summary'], { ...config.post_call.summary, enabled: Boolean(v) });
      } else {
        update(['post_call', 'summary'], { enabled: Boolean(v) });
      }
    } else if (def.path === 'persona.recording_notice') {
      if (v) {
        update(['persona', 'disclosures'], {
          ...(config.persona?.disclosures || {}),
          recording_notice:
            typeof config.persona?.disclosures?.recording_notice === 'string'
              ? config.persona.disclosures.recording_notice
              : 'This call may be recorded.',
        });
      } else {
        const disc = { ...(config.persona?.disclosures || {}) };
        delete disc.recording_notice;
        update(['persona', 'disclosures'], disc);
      }
    } else if (def.path === 'observability.retention_days') {
      if (config.observability?.session_log) {
        update(['observability', 'session_log'], { ...config.observability.session_log, retention_days: Number(v) });
      }
    } else if (def.path === 'runtime.mode') {
      update(['runtime', 'provider_mode'], v);
    }

    const follow = providerFollowUps[def.path];
    if (follow) {
      const first = follow.first(String(v));
      if (first) {
        update(parsePath(follow.sibling), first);
        if (follow.sibling === 'defaults.models.tts.voice') {
          update(['defaults', 'models', 'tts', 'voice_id'], first);
        }
      }
    }
  };

  if (def.type === 'toggle') {
    return (
      <div id={id} className="flex scroll-mt-28 items-start justify-between gap-6 rounded-md py-1 transition-[box-shadow] duration-200">
        <div className="min-w-0">
          <p className={cn('text-sm font-medium text-ink', technical && 'font-mono text-[13px]')}>{technical ? def.path : def.label}</p>
          <p className="mt-0.5 text-[13px] text-muted">{technical ? `${def.label} — ${def.help}` : def.help}</p>
          {warning && <p className="mt-1 text-[13px] text-warning">{warning}</p>}
        </div>
        <Toggle id={inputId} checked={Boolean(value)} onChange={onChange} label={def.label} disabled={disabled} />
      </div>);

  }

  let control: React.ReactNode;
  const cls = cn(inputClass, error && inputErrorClass);
  if (def.type === 'textarea') {
    control = <textarea id={inputId} rows={4} className={cn(cls, 'resize-y leading-relaxed')} value={String(value ?? '')} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  } else if (def.type === 'number') {
    control =
    <div className="flex items-center gap-2">
        <input
        id={inputId}
        type="number"
        min={def.min}
        max={def.max}
        className={cn(cls, 'w-32')}
        value={typeof value === 'number' ? value : ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
      
        {def.unit && <span className="text-sm text-muted">{def.unit}</span>}
      </div>;

  } else if (def.type === 'select') {
    const options = resolveOptions(def, config, providers);
    const selectedVal = def.path === 'defaults.language' ? getLanguageCode(value) : String(value ?? '');
    const known = options.some((o) => o.value === selectedVal);
    control = (
      <select
        id={inputId}
        className={cls}
        value={selectedVal}
        disabled={disabled}
        onChange={(e) => {
          if (def.path === 'defaults.language' && typeof value === 'object' && value !== null) {
            onChange({ ...value, primary: e.target.value });
          } else {
            onChange(e.target.value);
          }
        }}
      >
        {!known && <option value={selectedVal}>{selectedVal} (not in the list)</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );

  } else {
    control = <input id={inputId} type="text" className={cn(cls, technical && def.level === 'expert' && 'font-mono')} value={String(value ?? '')} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  }

  return (
    <Field id={id} label={def.label} help={def.help} error={error} warning={warning} technicalName={def.path} showTechnical={technical}>
      {control}
    </Field>);

}