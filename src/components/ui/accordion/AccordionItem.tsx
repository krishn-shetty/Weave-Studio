import React, { useRef, useState } from 'react';
import { AccordionItemContext, useAccordion } from './AccordionContext';
import { cn } from '../../../utils/styles';
import type { AccordionItemProps } from './types';

export function AccordionItem({
  id,
  index = 0,
  isFirst = false,
  isLast = false,
  disabled = false,
  className,
  children,
}: AccordionItemProps) {
  const {
    isExpanded,
    toggleExpand,
    enableDragAndDrop,
    onReorderById,
    onKeyboardReorder,
    draggedId,
    setDraggedId,
    dragOverId,
    setDragOverId,
    dragPosition,
    setDragPosition,
  } = useAccordion();

  const itemRef = useRef<HTMLDivElement>(null);
  const [canDrag, setCanDrag] = useState(false);
  const justDraggedRef = useRef(false);
  const expanded = isExpanded(id);

  const handleToggle = () => {
    if (disabled || justDraggedRef.current) return;
    toggleExpand(id);
  };

  const handleKeyboardMove = (direction: 'up' | 'down') => {
    onKeyboardReorder?.(id, direction);
  };

  // Drag and drop handlers using stable IDs
  const handleDragStart = (e: React.DragEvent) => {
    if (!enableDragAndDrop) return;
    justDraggedRef.current = true;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!enableDragAndDrop || !draggedId || draggedId === id) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const pos = e.clientY < midpoint ? 'top' : 'bottom';
      setDragOverId(id);
      setDragPosition(pos);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!itemRef.current?.contains(e.relatedTarget as Node)) {
      if (dragOverId === id) {
        setDragOverId(null);
        setDragPosition(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!enableDragAndDrop || !draggedId || draggedId === id) {
      return;
    }
    e.preventDefault();
    const pos = dragPosition || 'bottom';
    onReorderById?.(draggedId, id, pos);

    setDraggedId(null);
    setDragOverId(null);
    setDragPosition(null);
    setCanDrag(false);

    // Prevent immediate click toggle
    justDraggedRef.current = true;
    window.setTimeout(() => {
      justDraggedRef.current = false;
    }, 150);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
    setDragPosition(null);
    setCanDrag(false);

    justDraggedRef.current = true;
    window.setTimeout(() => {
      justDraggedRef.current = false;
    }, 150);
  };

  const isBeingDragged = draggedId === id;
  const isTargetTop = dragOverId === id && dragPosition === 'top';
  const isTargetBottom = dragOverId === id && dragPosition === 'bottom';

  return (
    <AccordionItemContext.Provider
      value={{
        id,
        index,
        isFirst,
        isLast,
        isExpanded: expanded,
        toggle: handleToggle,
        canDrag,
        setCanDrag,
        isDragging: isBeingDragged,
        isDragOver: dragOverId === id,
        dragPosition,
        onKeyboardMove: handleKeyboardMove,
      }}
    >
      <div
        ref={itemRef}
        draggable={enableDragAndDrop && canDrag}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        className={cn(
          'relative rounded-xl border border-line bg-surface shadow-panel transition-all duration-150',
          isBeingDragged && 'bg-accent-soft/20 border-accent/60 shadow-md ring-2 ring-accent/30 opacity-70 scale-[0.995]',
          !isBeingDragged && 'hover:border-line-strong',
          expanded && 'border-line-strong/80',
          className
        )}
      >
        {/* Top Drop Indicator Bar */}
        {isTargetTop && (
          <div className="pointer-events-none absolute -top-1 left-1 right-1 h-1.5 bg-accent rounded-full z-40 shadow-sm animate-pulse" />
        )}

        {children}

        {/* Bottom Drop Indicator Bar */}
        {isTargetBottom && (
          <div className="pointer-events-none absolute -bottom-1 left-1 right-1 h-1.5 bg-accent rounded-full z-40 shadow-sm animate-pulse" />
        )}
      </div>
    </AccordionItemContext.Provider>
  );
}
