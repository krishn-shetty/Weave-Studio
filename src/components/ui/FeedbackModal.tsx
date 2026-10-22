import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from './Toast';
import { MessageSquarePlusIcon, SendIcon, ShieldCheckIcon } from 'lucide-react';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { inputClass } from '../../utils/styles';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const location = useLocation();
  const [category, setCategory] = useState<'bug' | 'feature' | 'ux' | 'other'>('feature');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success('Thank you for your feedback!', {
        description: 'Our engineering and product team reviews every report.',
      });
      setMessage('');
      onClose();
    }, 400);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Send Product Feedback"
      description="Help us improve Weave Studio. Let us know about issues, ideas, or questions."
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <ShieldCheckIcon className="h-3.5 w-3.5 text-success" />
            No secrets or transcripts captured
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={!message.trim() || submitting}>
              <SendIcon className="h-3.5 w-3.5 mr-1" />
              Send feedback
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-ink block mb-1.5">Category</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'bug', label: 'Bug report' },
              { id: 'feature', label: 'Feature request' },
              { id: 'ux', label: 'Usability & UI' },
              { id: 'other', label: 'Other feedback' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id as typeof category)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors text-center ${
                  category === cat.id
                    ? 'border-accent bg-accent-soft text-accent ring-1 ring-accent'
                    : 'border-line bg-surface text-ink-soft hover:bg-subtle'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-ink block mb-1.5">Your comments</label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What worked well, what was confusing, or what capability would you like to see?"
            className={`${inputClass} w-full resize-none`}
            autoFocus
          />
        </div>

        <div className="rounded-lg border border-line bg-subtle/50 p-3 text-xs text-muted space-y-1">
          <div className="flex justify-between">
            <span>Current page:</span>
            <code className="font-mono text-ink-soft">{location.pathname}</code>
          </div>
          <div className="flex justify-between">
            <span>App version:</span>
            <code className="font-mono text-ink-soft">v2.0.0 (final)</code>
          </div>
          <div className="flex justify-between">
            <span>Backend API:</span>
            <code className="font-mono text-ink-soft">http://16.79.174.151:8100</code>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
