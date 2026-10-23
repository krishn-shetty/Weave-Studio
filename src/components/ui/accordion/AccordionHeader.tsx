import React from 'react';
import { ChevronDownIcon, GripVerticalIcon } from 'lucide-react';
import { useAccordion, useAccordionItem } from './AccordionContext';
import { Tooltip } from '../Tooltip';
import { cn } from '../../../utils/styles';
import type { AccordionHeaderProps } from './types';

export function AccordionHeader({
  id: explicitId,
  title,
  subtitle,
  badge,
  icon,
  actions,
  showDragHandle = true,
  showMoveControls: _showMoveControls,
  tooltipText,
  isFirst: _explicitIsFirst,
  isLast: _explicitIsLast,
  onMoveUp: _explicitOnMoveUp,
  onMoveDown: _explicitOnMoveDown,
  className,
  children,
}: AccordionHeaderProps) {
  const { enableReordering, enableDragAndDrop } = useAccordion();
  const item = useAccordionItem();

  const id = explicitId ?? item.id;
  const isExpanded = item.isExpanded;

  return (
    <div
      className={cn(
        'group flex min-h-[56px] w-full items-center justify-between gap-3 px-4 py-3 sm:px-5 transition-colors select-none',
        'hover:bg-subtle/50 cursor-pointer',
        isExpanded ? 'bg-subtle/30' : 'bg-surface',
        className
      )}
      onClick={item.toggle}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-controls={`accordion-content-${id}`}
      id={`accordion-header-${id}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          item.toggle();
        }
      }}
    >
      {/* Left side: Dedicated Drag handle, icon, title, subtitle */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
        {enableReordering && enableDragAndDrop && showDragHandle && (
          <Tooltip content="Drag to reorder section (Arrow Up/Down)" position="top">
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => {
                e.stopPropagation();
                item.setCanDrag(true);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                item.setCanDrag(true);
              }}
              onMouseEnter={() => item.setCanDrag(true)}
              onMouseLeave={() => {
                if (!item.isDragging) item.setCanDrag(false);
              }}
              onMouseUp={() => item.setCanDrag(false)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopPropagation();
                  item.onKeyboardMove('up');
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  e.stopPropagation();
                  item.onKeyboardMove('down');
                }
              }}
              role="button"
              tabIndex={0}
              className="cursor-grab active:cursor-grabbing p-1.5 text-muted/60 hover:text-ink hover:bg-subtle rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-label="Drag handle to reorder section. Press arrow up or down to move."
            >
              <GripVerticalIcon className="h-4 w-4" />
            </div>
          </Tooltip>
        )}

        {icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-subtle text-ink">
            {icon}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip
              content={tooltipText || (isExpanded ? 'Click to collapse' : 'Click to expand')}
              position="top"
              disabled={!tooltipText}
            >
              <span className="text-sm font-semibold tracking-tight text-ink truncate">
                {title}
              </span>
            </Tooltip>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <div className="text-xs text-muted truncate mt-0.5">{subtitle}</div>
          )}
        </div>
      </div>

      {/* Right side: custom children or actions, and expand chevron */}
      <div
        className="flex items-center gap-2.5 sm:gap-3 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        {actions && (
          <div className="flex items-center gap-1.5">{actions}</div>
        )}

        <Tooltip
          content={isExpanded ? 'Collapse section' : 'Expand section'}
          position="top"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              item.toggle();
            }}
            className="p-1 rounded-lg text-muted hover:text-ink hover:bg-subtle transition-colors"
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
          >
            <ChevronDownIcon
              className={cn(
                'h-4 w-4 transition-transform duration-200 text-muted group-hover:text-ink',
                isExpanded && 'rotate-180 text-accent'
              )}
            />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
