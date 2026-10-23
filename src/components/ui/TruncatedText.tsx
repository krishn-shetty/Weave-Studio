import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../utils/styles';

export interface TruncatedTextProps {
  text?: string;
  as?: 'span' | 'div' | 'p';
  className?: string;
  children: React.ReactNode;
}

export function TruncatedText({
  text,
  as: Component = 'span',
  className,
  children,
}: TruncatedTextProps) {
  const [isTruncated, setIsTruncated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const textRef = useRef<HTMLElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayText = text ?? (typeof children === 'string' ? children : '');

  const checkTruncation = useCallback(() => {
    const el = textRef.current;
    if (!el) return false;
    const truncated = el.scrollWidth > el.clientWidth + 1;
    setIsTruncated(truncated);
    return truncated;
  }, []);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    checkTruncation();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        checkTruncation();
      });
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [checkTruncation]);

  const updateCoords = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const tooltipHeight = 28;
    const offset = 6;

    let targetTop = rect.top - tooltipHeight - offset;
    if (targetTop < 8) {
      targetTop = rect.bottom + offset;
    }

    const padding = 8;
    const left = Math.max(padding, Math.min(rect.left, window.innerWidth - 220));

    setCoords({ top: targetTop, left });
  }, []);

  const handleMouseEnter = () => {
    const truncated = checkTruncation();
    if (!truncated) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updateCoords();
      setIsOpen(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsOpen(false);
  };

  const handleFocus = () => {
    const truncated = checkTruncation();
    if (!truncated) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updateCoords();
      setIsOpen(true);
    }, 300);
  };

  const handleBlur = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => {
      updateCoords();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateCoords]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <>
      <Component
        ref={textRef as any}
        tabIndex={isTruncated ? 0 : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          'truncate block max-w-full',
          isTruncated && 'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-xs',
          className
        )}
      >
        {children}
      </Component>

      {isOpen && isTruncated && displayText && coords && typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              role="tooltip"
              style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
              }}
              className="pointer-events-none z-[9999] whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium bg-ink text-surface dark:bg-surface dark:text-ink border border-line-strong/40 shadow-xl"
            >
              {displayText}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
