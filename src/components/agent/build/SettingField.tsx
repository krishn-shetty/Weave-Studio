import React from 'react';
import type { AgentConfig, Issue, Path } from '../../../types/studio';
import type { SettingDef } from '../../../data/settingsCatalog';
import { Field } from '../../ui/Field';
import { Toggle } from '../../ui/Toggle';
import { fieldId, getAt, parsePath } from '../../../utils/path';
import { issuesAt } from '../../../utils/validate';
import { missingProviderKey, providerFollowUps, resolveOptions } from '../../../utils/settingOptions';
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

export function SettingField({ def, config, errors, warnings, technical, disabled, update }: SettingFieldProps) {
  const path = parsePath(def.path);
  const value = getAt(config, path);
  const id = fieldId(def.path);
  const inputId = `${id}-input`;
  const error = issuesAt(errors, def.path)[0]?.message;
  const warnFromReport = issuesAt(warnings, def.path)[0]?.message;
  const missingKey = def.type === 'select' ? missingProviderKey(def.path, String(value ?? '')) : null;
  const warning = warnFromReport ?? (missingKey ? `The server doesn’t have ${missingKey} yet. Tests and calls will fail until an admin adds it.` : undefined);

  const onChange = (v: unknown) => {
    update(path, v);
    const follow = providerFollowUps[def.path];
    if (follow) {
      const first = follow.list.find((p) => p.id === v)?.models[0]?.id;
      if (first) update(parsePath(follow.sibling), first);
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
    const options = resolveOptions(def, config);
    const known = options.some((o) => o.value === value);
    control =
    <select id={inputId} className={cls} value={String(value ?? '')} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {!known && <option value={String(value ?? '')}>{String(value ?? '')} (not supported)</option>}
        {options.map((o) =>
      <option key={o.value} value={o.value}>{o.label}</option>
      )}
      </select>;

  } else {
    control = <input id={inputId} type="text" className={cn(cls, technical && def.level === 'expert' && 'font-mono')} value={String(value ?? '')} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  }

  return (
    <Field id={id} label={def.label} help={def.help} error={error} warning={warning} technicalName={def.path} showTechnical={technical}>
      {control}
    </Field>);

}