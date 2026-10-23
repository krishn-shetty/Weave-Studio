import React, { useState, useCallback, useMemo } from 'react';
import { AccordionContext } from './AccordionContext';
import { AccordionPagination } from './AccordionPagination';
import { cn } from '../../../utils/styles';
import type { AccordionProps } from './types';

export function Accordion<T = any>({
  items,
  getId,
  onReorder,
  onReorderById,
  allowMultiple = true,
  expandedIds: controlledExpandedIds,
  defaultExpandedIds = [],
  onExpandedChange,
  enableReordering = true,
  enableDragAndDrop = true,
  pagination,
  className,
  children,
}: AccordionProps<T>) {
  const [internalExpandedIds, setInternalExpandedIds] = useState<string[]>(defaultExpandedIds);

  const isControlled = controlledExpandedIds !== undefined;
  const expandedIds = isControlled ? controlledExpandedIds : internalExpandedIds;

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'top' | 'bottom' | null>(null);

  const setExpanded = useCallback(
    (newIds: string[]) => {
      if (!isControlled) {
        setInternalExpandedIds(newIds);
      }
      onExpandedChange?.(newIds);
    },
    [isControlled, onExpandedChange]
  );

  const isExpanded = useCallback(
    (id: string) => expandedIds.includes(id),
    [expandedIds]
  );

  const toggleExpand = useCallback(
    (id: string) => {
      if (allowMultiple) {
        const next = expandedIds.includes(id)
          ? expandedIds.filter((x) => x !== id)
          : [...expandedIds, id];
        setExpanded(next);
      } else {
        const next = expandedIds.includes(id) ? [] : [id];
        setExpanded(next);
      }
    },
    [allowMultiple, expandedIds, setExpanded]
  );

  const expandAll = useCallback(
    (ids: string[]) => {
      setExpanded(Array.from(new Set([...expandedIds, ...ids])));
    },
    [expandedIds, setExpanded]
  );

  const collapseAll = useCallback(() => {
    setExpanded([]);
  }, [setExpanded]);

  const defaultGetId = useCallback(
    (item: any, idx: number): string => {
      if (getId) return getId(item);
      if (item && typeof item === 'object') {
        if (item.id) return String(item.id);
        if (item.agent?.id) return String(item.agent.id);
      }
      return String(idx);
    },
    [getId]
  );

  const handleReorderById = useCallback(
    (sourceId: string, targetId: string, position: 'top' | 'bottom') => {
      if (sourceId === targetId) return;

      if (onReorderById) {
        onReorderById(sourceId, targetId, position);
        return;
      }

      if (!items || !onReorder) return;

      const sourceIdx = items.findIndex((it, i) => defaultGetId(it, i) === sourceId);
      const targetIdx = items.findIndex((it, i) => defaultGetId(it, i) === targetId);

      if (sourceIdx === -1 || targetIdx === -1) return;

      const next = [...items];
      const [moved] = next.splice(sourceIdx, 1);

      let insertIdx = next.findIndex((it, i) => defaultGetId(it, i) === targetId);
      if (position === 'bottom') {
        insertIdx += 1;
      }
      next.splice(insertIdx, 0, moved);
      onReorder(next);
    },
    [defaultGetId, items, onReorder, onReorderById]
  );

  const handleKeyboardReorder = useCallback(
    (id: string, direction: 'up' | 'down') => {
      if (!items) return;
      const currentIdx = items.findIndex((it, i) => defaultGetId(it, i) === id);
      if (currentIdx === -1) return;

      const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
      if (targetIdx < 0 || targetIdx >= items.length) return;

      const targetId = defaultGetId(items[targetIdx], targetIdx);
      if (onReorderById) {
        onReorderById(id, targetId, direction === 'up' ? 'top' : 'bottom');
      } else if (onReorder) {
        const next = [...items];
        const [moved] = next.splice(currentIdx, 1);
        next.splice(targetIdx, 0, moved);
        onReorder(next);
      }
    },
    [defaultGetId, items, onReorder, onReorderById]
  );

  const contextValue = useMemo(
    () => ({
      expandedIds,
      toggleExpand,
      isExpanded,
      expandAll,
      collapseAll,
      enableReordering: Boolean(enableReordering && (onReorder || onReorderById)),
      enableDragAndDrop: Boolean(enableDragAndDrop && enableReordering && (onReorder || onReorderById)),
      onReorderById: handleReorderById,
      onKeyboardReorder: handleKeyboardReorder,
      draggedId,
      setDraggedId,
      dragOverId,
      setDragOverId,
      dragPosition,
      setDragPosition,
    }),
    [
      expandedIds,
      toggleExpand,
      isExpanded,
      expandAll,
      collapseAll,
      enableReordering,
      enableDragAndDrop,
      onReorder,
      onReorderById,
      handleReorderById,
      handleKeyboardReorder,
      draggedId,
      dragOverId,
      dragPosition,
    ]
  );

  return (
    <AccordionContext.Provider value={contextValue}>
      <div className={cn('w-full space-y-3', className)}>
        {children}

        {pagination && pagination.totalItems > 0 && (
          <AccordionPagination {...pagination} />
        )}
      </div>
    </AccordionContext.Provider>
  );
}
