import React, { useEffect, useState } from 'react';
import { BookOpenIcon, ExternalLinkIcon, HelpCircleIcon, KeyboardIcon, SparklesIcon } from 'lucide-react';
import { Dialog } from './Dialog';
import { Button } from './Button';

interface HelpShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export function HelpShortcutsModal({ open, onClose }: HelpShortcutsModalProps) {
  const [tab, setTab] = useState<'shortcuts' | 'whatsnew' | 'docs'>('shortcuts');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Weave Studio Help & Shortcuts"
      description="Quick reference for keyboard workflows, new features, and technical documentation."
      footer={
        <Button variant="primary" onClick={onClose}>
          Got it
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-line gap-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setTab('shortcuts')}
            className={`pb-2 transition-colors border-b-2 flex items-center gap-1.5 ${tab === 'shortcuts'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-muted hover:text-ink'
              }`}
          >
            <KeyboardIcon className="h-3.5 w-3.5" />
            Keyboard shortcuts
          </button>
          <button
            type="button"
            onClick={() => setTab('whatsnew')}
            className={`pb-2 transition-colors border-b-2 flex items-center gap-1.5 ${tab === 'whatsnew'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-muted hover:text-ink'
              }`}
          >
            <SparklesIcon className="h-3.5 w-3.5" />
            What’s new in v2.0
          </button>
          <button
            type="button"
            onClick={() => setTab('docs')}
            className={`pb-2 transition-colors border-b-2 flex items-center gap-1.5 ${tab === 'docs'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-muted hover:text-ink'
              }`}
          >
            <BookOpenIcon className="h-3.5 w-3.5" />
            Guides & Runbooks
          </button>
        </div>

        {tab === 'shortcuts' && (
          <div className="space-y-3">
            <p className="text-xs text-muted">Use these keys anywhere in the studio for rapid navigation.</p>
            <div className="divide-y divide-line rounded-lg border border-line bg-surface text-xs">
              {[
                { key: 'Ctrl + K  /  ⌘K', label: 'Command palette', desc: 'Jump to any agent, page, or configuration field' },
                { key: 'Ctrl + S  /  ⌘S', label: 'Save draft', desc: 'Trigger manual autosave checkpoint immediately' },
                { key: 'Ctrl + Z  /  ⌘Z', label: 'Undo edit', desc: 'Revert last change in the configuration draft' },
                { key: 'Ctrl + Y  /  ⌘⇧Z', label: 'Redo edit', desc: 'Re-apply reverted modification' },
                { key: '1, 2, 3, 4', label: 'Stage switches', desc: 'Jump directly to Build, Test, Release, or Monitor' },
                { key: '?', label: 'Help & shortcuts', desc: 'Open this help dialog from any page' },
              ].map((item) => (
                <div key={item.label} className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-ink">{item.label}</span>
                    <p className="text-[11px] text-muted">{item.desc}</p>
                  </div>
                  <kbd className="rounded bg-subtle px-2 py-1 font-mono text-[11px] font-semibold text-ink border border-line">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'whatsnew' && (
          <div className="space-y-3 text-xs">
            <div className="rounded-lg border border-accent/20 bg-accent-soft/30 p-3">
              <span className="font-semibold text-accent">Weave Studio v2.0 (Final Release · 22 Oct 2026)</span>
              <p className="mt-1 text-ink-soft">
                Full 36-endpoint API contract coverage, enterprise security architecture, and modern authoring ergonomics.
              </p>
            </div>
            <ul className="space-y-2 text-ink-soft">
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <span><strong>Vector Knowledge Search:</strong> Index documents into vector stores, view passages, and test similarity score thresholds.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <span><strong>Automated Scenarios:</strong> Scripted repeatability tests with mock HTTP CRM endpoints, state checks, and assertion traces.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <span><strong>Visual Call Flow Canvas:</strong> High-level diagram linking inbound channels to agent personas and attached tools.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <span><strong>In-Context AI Drafting & Assistant:</strong> Describe desired agents in plain English and propose fixes for validation errors.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <span><strong>First-Run Checklist:</strong> Guided 4-step onboarding journey (Create, Test, Publish, Deploy).</span>
              </li>
            </ul>
          </div>
        )}

        {tab === 'docs' && (
          <div className="space-y-2.5 text-xs">
            {[
              { title: 'Product Requirements Document (PRD v2.0)', desc: 'Complete 27-section specification by Owner Shetty', href: '#' },
              { title: 'API Contract & Endpoint Coverage Matrix', desc: 'All 37 backend endpoints mapped to screens and status codes', href: '#' },
              { title: 'Architecture & Threat Model (BFF / OIDC)', desc: 'Zero browser secret exposure and role matrix enforcement', href: '#' },
              { title: 'Operations & Production Rollback Runbook', desc: 'Steps for instant deployment switchback and disaster recovery', href: '#' },
            ].map((doc) => (
              <div key={doc.title} className="p-3 rounded-lg border border-line bg-surface hover:bg-subtle transition-colors flex items-center justify-between">
                <div>
                  <p className="font-semibold text-ink">{doc.title}</p>
                  <p className="text-muted text-[11px]">{doc.desc}</p>
                </div>
                <span className="text-accent flex items-center gap-1 font-medium text-[11px]">
                  View <ExternalLinkIcon className="h-3 w-3" />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}
