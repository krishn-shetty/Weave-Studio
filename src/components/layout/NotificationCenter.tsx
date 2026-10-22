import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon, CheckCheckIcon, CheckCircle2Icon, ExternalLinkIcon, InfoIcon, ShieldAlertIcon, Trash2Icon, XIcon } from 'lucide-react';
import { useStudio } from '../../contexts/StudioContext';
import { timeAgo } from '../../utils/format';
import { cn } from '../../utils/styles';
import type { JobNotification } from '../../types/studio';

export function NotificationCenter() {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead, clearNotifications } = useStudio();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const getIcon = (type: JobNotification['type'], status: JobNotification['status']) => {
    if (status === 'failed') return <ShieldAlertIcon className="h-4 w-4 text-danger shrink-0 mt-0.5" />;
    if (type === 'deploy') return <CheckCircle2Icon className="h-4 w-4 text-success shrink-0 mt-0.5" />;
    if (type === 'knowledge') return <InfoIcon className="h-4 w-4 text-accent shrink-0 mt-0.5" />;
    if (type === 'test') return <CheckCircle2Icon className="h-4 w-4 text-info shrink-0 mt-0.5" />;
    return <InfoIcon className="h-4 w-4 text-muted shrink-0 mt-0.5" />;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        title="Job Notifications & Alerts"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
      >
        <BellIcon className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white shadow-sm animate-in zoom-in-50">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 sm:w-96 rounded-xl border border-line bg-surface shadow-xl animate-in fade-in-50 slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="flex items-center gap-1 text-[11px] font-medium text-muted hover:text-ink"
                    title="Mark all as read"
                  >
                    <CheckCheckIcon className="h-3 w-3" />
                    Read all
                  </button>
                  <button
                    type="button"
                    onClick={clearNotifications}
                    className="p-1 text-muted hover:text-danger rounded"
                    title="Clear all"
                  >
                    <Trash2Icon className="h-3 w-3" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 text-muted hover:text-ink rounded"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-line">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted">
                No recent notifications or background job updates.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markNotificationRead(n.id)}
                  className={cn(
                    'p-3.5 transition-colors cursor-pointer flex gap-3 text-left',
                    n.read ? 'bg-surface hover:bg-subtle/50' : 'bg-accent-soft/30 hover:bg-accent-soft/50'
                  )}
                >
                  {getIcon(n.type, n.status)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-xs font-medium', n.read ? 'text-ink-soft' : 'text-ink font-semibold')}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-muted shrink-0">{timeAgo(n.timestamp)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-soft line-clamp-2">{n.description}</p>
                    {n.link && (
                      <Link
                        to={n.link}
                        onClick={() => setOpen(false)}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                      >
                        View details
                        <ExternalLinkIcon className="h-2.5 w-2.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
