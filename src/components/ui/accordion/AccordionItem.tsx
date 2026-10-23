import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AccordionItemContext, useAccordion } from './AccordionContext';
import { cn } from '../../../utils/styles';
import type { AccordionItemProps } from './types';

export function AccordionItem({
  id,
  index = 0,
  isFirst = false,
  isLast = false,
  disabled = false,
  hasProblem = false,
  className,
  children,
}: AccordionItemProps) {
  const {
    isExpanded,
    toggleExpand,
    enableDragAndDrop,
    onKeyboardReorder,
    activeId,
  } = useAccordion();

  const expanded = isExpanded(id);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: !enableDragAndDrop,
  });

  const handleToggle = () => {
    if (disabled || isDragging || activeId) return;
    toggleExpand(id);
  };

  const handleKeyboardMove = (direction: 'up' | 'down') => {
    onKeyboardReorder?.(id, direction);
  };

  const isCurrentActive = activeId === id;

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    borderRadius: '12px',
    border: '1px solid var(--border)',
  };

  return (
    <AccordionItemContext.Provider
      value={{
        id,
        index,
        isFirst,
        isLast,
        isExpanded: expanded,
        toggle: handleToggle,
        isDragging: isCurrentActive || isDragging,
        dragHandleProps: enableDragAndDrop
          ? {
              ref: setActivatorNodeRef,
              ...attributes,
              ...listeners,
            }
          : undefined,
        onKeyboardMove: handleKeyboardMove,
      }}
    >
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'relative rounded-[12px] bg-surface transition-all duration-150',
          // Border and subtle shadow
          'shadow-sm',
          // Hover and focus states
          !isCurrentActive && 'hover:border-[var(--border-strong)] hover:shadow-md',
          expanded && 'border-[var(--border-strong)] shadow-sm',
          'focus-within:ring-2 focus-within:ring-accent/40 focus-within:border-accent',
          // Placeholder state while lifted card is in DragOverlay
          isCurrentActive && 'opacity-40 border-dashed border-accent/60 bg-subtle/30 pointer-events-none select-none',
          className
        )}
      >
        {hasProblem && (
          <div
            className="absolute left-0 top-0 bottom-0 w-[3px] bg-danger rounded-l-[11px] z-10 pointer-events-none"
            aria-hidden="true"
          />
        )}
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}
