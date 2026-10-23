import React, { useEffect, useMemo, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import type { DraftEditor } from '../../../hooks/useDraftEditor';
import { settingGroups, settingsCatalog, type SettingGroupId } from '../../../data/settingsCatalog';
import { useStudio } from '../../../contexts/StudioContext';
import { SettingField } from './SettingField';
import { ChannelsEditor } from './ChannelsEditor';
import { AgentRolesEditor } from './AgentRolesEditor';
import { ToolsEditor } from './ToolsEditor';
import { Toggle } from '../../ui/Toggle';
import { StatusChip } from '../../ui/StatusChip';
import { Tooltip } from '../../ui/Tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
} from '../../ui/accordion';
import { issuesAt } from '../../../utils/validate';
import { cn, inputClass } from '../../../utils/styles';

interface DetailedViewProps {
  editor: DraftEditor;
  initialGroup: SettingGroupId | null;
  onOpenJson: () => void;
}

const collectionRoot = { tools: 'tools', agents: 'agents', channels: 'channels' } as const;

export function DetailedView({ editor, initialGroup, onOpenJson }: DetailedViewProps) {
  const { technicalNames, setTechnicalNames } = useStudio();
  const [query, setQuery] = useState('');
  const { config, validation, update, canEdit } = editor;

  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>(() =>
    settingGroups.map((g) => g.id)
  );

  useEffect(() => {
    if (!initialGroup) return;
    setExpandedGroupIds((prev) => Array.from(new Set([...prev, initialGroup])));
    const t = window.setTimeout(() => document.getElementById(`group-${initialGroup}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
    return () => window.clearTimeout(t);
  }, [initialGroup]);

  const needle = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
    settingsCatalog.filter(
      (s) => !needle || s.label.toLowerCase().includes(needle) || s.help.toLowerCase().includes(needle) || s.path.toLowerCase().includes(needle)
    ),
    [needle]
  );

  if (!config || !validation) return null;
  const disabled = !canEdit;

  const groups = settingGroups.
  map((g) => {
    const fields = matches.filter((s) => s.group === g.id);
    const showCollection = !!g.collection && (!needle || g.label.toLowerCase().includes(needle) || g.collection.includes(needle));
    return { group: g, fields, showCollection };
  }).
  filter((g) => g.fields.length > 0 || g.showCollection);

  const groupErrorCount = (id: SettingGroupId) => {
    const g = settingGroups.find((x) => x.id === id);
    const fieldPaths = settingsCatalog.filter((s) => s.group === id).map((s) => s.path);
    const fromFields = fieldPaths.reduce((n, p) => n + issuesAt(validation.errors, p).length, 0);
    const fromCollection = g?.collection ? issuesAt(validation.errors, collectionRoot[g.collection]).length : 0;
    return fromFields + fromCollection;
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="Setting groups" className="hidden lg:block">
        <ul className="sticky top-44 space-y-0.5">
          {settingGroups.map((g) => {
            const count = groupErrorCount(g.id);
            return (
              <li key={g.id}>
                <a
                  href={`#group-${g.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setQuery('');
                    setExpandedGroupIds((prev) => Array.from(new Set([...prev, g.id])));
                    window.setTimeout(() => document.getElementById(`group-${g.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
                  }}
                  className="flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-ink-soft transition-colors duration-150 hover:bg-subtle hover:text-ink">
                  
                  {g.label}
                  {count > 0 && <span className="rounded-full bg-danger-soft px-1.5 text-xs font-medium text-danger">{count}</span>}
                </a>
              </li>);

          })}
        </ul>
      </nav>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative min-w-[240px] flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input type="search" aria-label="Search settings" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search every setting, e.g. “silence” or “voice”" className={cn(inputClass, 'pl-9')} />
          </div>
          <label className="flex items-center gap-2 text-[13px] text-ink-soft">
            <Toggle checked={technicalNames} onChange={setTechnicalNames} label="Show technical names" />
            Technical names
          </label>
        </div>

        {groups.length === 0 && <p className="py-12 text-center text-sm text-muted">No settings match “{query}”.</p>}

        <div className="mt-4">
          <Accordion
            expandedIds={expandedGroupIds}
            onExpandedChange={setExpandedGroupIds}
            enableReordering={false}
          >
            {groups.map(({ group, fields, showCollection }, idx) => {
              const count = groupErrorCount(group.id);
              return (
                <div key={group.id} id={`group-${group.id}`} className="scroll-mt-44 mb-3">
                  <AccordionItem id={group.id} index={idx}>
                    <AccordionHeader
                      id={group.id}
                      title={group.label}
                      subtitle={group.description}
                      badge={
                        <div className="flex items-center gap-1.5">
                          {group.id === 'engine' && <StatusChip>Expert</StatusChip>}
                          {count > 0 && (
                            <StatusChip tone="danger" dot>
                              {count} {count === 1 ? 'issue' : 'issues'}
                            </StatusChip>
                          )}
                        </div>
                      }
                      showDragHandle={false}
                    />
                    <AccordionContent>
                      <div className="space-y-5">
                        {fields.map((def) => (
                          <SettingField
                            key={def.path}
                            def={def}
                            config={config}
                            errors={validation.errors}
                            warnings={validation.warnings}
                            technical={technicalNames}
                            disabled={disabled}
                            update={update}
                          />
                        ))}
                        {showCollection && group.collection === 'channels' && (
                          <ChannelsEditor
                            config={config}
                            errors={validation.errors}
                            disabled={disabled}
                            technical={technicalNames}
                            update={update}
                          />
                        )}
                        {showCollection && group.collection === 'agents' && (
                          <AgentRolesEditor
                            config={config}
                            errors={validation.errors}
                            warnings={validation.warnings}
                            disabled={disabled}
                            technical={technicalNames}
                            update={update}
                          />
                        )}
                        {showCollection && group.collection === 'tools' && (
                          <ToolsEditor
                            config={config}
                            disabled={disabled}
                            update={update}
                            onOpenJson={onOpenJson}
                          />
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </div>
              );
            })}
          </Accordion>
        </div>
      </div>
    </div>);

}