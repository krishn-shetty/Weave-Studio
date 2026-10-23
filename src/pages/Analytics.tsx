import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRightIcon,
  BarChart3Icon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  DownloadIcon,
  FileTextIcon,
  PhoneCallIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  TrendingUpIcon,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StatusChip } from '../components/ui/StatusChip';
import { cn } from '../utils/styles';

export function Analytics() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const isSettings = pathname.includes('/settings');
  const isQ4 = pathname.includes('/q4-reports');

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {isSettings ? 'Q4 Reports Settings' : isQ4 ? 'Q4 Performance Reports' : 'Analytics & Insights'}
            </h1>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
              Live Serving
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {isSettings
              ? 'Configure delivery schedules, aggregation rules, and threshold alerts for Q4 reports.'
              : 'Real-time telemetry, conversational analytics, and resolution metrics across your voice and chat agents.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Preset Navigation shortcuts to test breadcrumbs */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/analytics/q4-reports/settings')}
            className={cn(isSettings && 'border-accent text-accent')}
          >
            <SettingsIcon className="h-4 w-4" />
            <span>Q4 Settings</span>
          </Button>

          <Button
            variant={isQ4 && !isSettings ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => navigate('/analytics/q4-reports')}
          >
            <FileTextIcon className="h-4 w-4" />
            <span>Q4 Reports</span>
          </Button>

          <Button variant="secondary" size="sm">
            <DownloadIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Quick Navigation Tabs */}
      <div className="mt-6 flex border-b border-line gap-4 text-sm font-medium">
        <Link
          to="/analytics"
          className={cn(
            'pb-3 border-b-2 transition-colors',
            pathname === '/analytics'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-muted hover:text-ink'
          )}
        >
          Overview
        </Link>
        <Link
          to="/analytics/q4-reports"
          className={cn(
            'pb-3 border-b-2 transition-colors',
            pathname === '/analytics/q4-reports'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-muted hover:text-ink'
          )}
        >
          Q4 Reports
        </Link>
        <Link
          to="/analytics/q4-reports/settings"
          className={cn(
            'pb-3 border-b-2 transition-colors',
            isSettings
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-muted hover:text-ink'
          )}
        >
          Report Settings
        </Link>
      </div>

      {/* Settings View */}
      {isSettings ? (
        <div className="mt-6 space-y-6">
          <section className="rounded-xl border border-line bg-surface p-6 shadow-panel">
            <h2 className="text-base font-semibold text-ink">Q4 Digest & Notification Settings</h2>
            <p className="mt-1 text-xs text-muted">
              Adjust automated notification channels and thresholds for weekly executive summaries.
            </p>

            <div className="mt-5 space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-medium text-ink">Email Distribution Cadence</label>
                <select className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20">
                  <option>Weekly (Mondays at 09:00 UTC)</option>
                  <option>Bi-weekly</option>
                  <option>Monthly aggregate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink">Anomaly Threshold Trigger</label>
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="15"
                    defaultValue="5"
                    className="w-full accent-accent"
                  />
                  <span className="font-mono text-xs font-semibold text-ink">±5.0%</span>
                </div>
                <p className="mt-1 text-[11px] text-muted">Alerts team if call drop rate spikes over 5% in 1 hour.</p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => navigate('/analytics/q4-reports')}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm">
                  Save Q4 Settings
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : (
        /* Metrics & Overview Dashboard */
        <div className="mt-6 space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-line bg-surface p-5 shadow-panel">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-medium">Total Handled Calls</span>
                <PhoneCallIcon className="h-4 w-4 text-accent" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-ink">48,290</span>
                <span className="inline-flex items-center text-xs font-medium text-success">
                  <ArrowUpRightIcon className="h-3 w-3" /> +14.8%
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">vs. 42,060 in Q3 period</p>
            </div>

            <div className="rounded-xl border border-line bg-surface p-5 shadow-panel">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-medium">First-Turn Resolution</span>
                <CheckCircle2Icon className="h-4 w-4 text-success" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-ink">94.2%</span>
                <span className="inline-flex items-center text-xs font-medium text-success">
                  <ArrowUpRightIcon className="h-3 w-3" /> +2.4%
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">98.1% target exceeded</p>
            </div>

            <div className="rounded-xl border border-line bg-surface p-5 shadow-panel">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-medium">Avg Audio Latency</span>
                <ClockIcon className="h-4 w-4 text-info" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-ink">460ms</span>
                <span className="inline-flex items-center text-xs font-medium text-success">
                  -18ms
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">WebRTC voice streaming</p>
            </div>

            <div className="rounded-xl border border-line bg-surface p-5 shadow-panel">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-medium">Customer Sentiment</span>
                <SparklesIcon className="h-4 w-4 text-warning" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-ink">4.85 / 5</span>
                <span className="inline-flex items-center text-xs font-medium text-success">
                  <ArrowUpRightIcon className="h-3 w-3" /> +0.15
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">Based on 12,410 post-call ratings</p>
            </div>
          </div>

          {/* Report Breakdown */}
          <section className="rounded-xl border border-line bg-surface p-6 shadow-panel">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h2 className="text-base font-semibold text-ink">Q4 Intent & Resolution Distribution</h2>
                <p className="mt-0.5 text-xs text-muted">Top conversational categories resolved by autonomous agents</p>
              </div>
              <StatusChip tone="success" dot>Real-time Stream</StatusChip>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-line/60 bg-subtle/30 p-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-ink">Account & Billing</span>
                  <span className="font-mono text-muted">41%</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-subtle overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: '41%' }} />
                </div>
              </div>

              <div className="rounded-lg border border-line/60 bg-subtle/30 p-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-ink">Technical Support</span>
                  <span className="font-mono text-muted">36%</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-subtle overflow-hidden">
                  <div className="h-full bg-info rounded-full" style={{ width: '36%' }} />
                </div>
              </div>

              <div className="rounded-lg border border-line/60 bg-subtle/30 p-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-ink">Booking & Schedules</span>
                  <span className="font-mono text-muted">23%</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-subtle overflow-hidden">
                  <div className="h-full bg-success rounded-full" style={{ width: '23%' }} />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
