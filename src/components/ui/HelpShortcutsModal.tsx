import { Dialog } from './Dialog';
import { Button } from './Button';

interface HelpShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

// Only shortcuts that are wired up. Ctrl/⌘+S and stage keys are planned (Phase 3) and are added here when they work.
const shortcuts = [
  { key: 'Ctrl + K  /  ⌘K', label: 'Command palette', desc: 'Jump to any agent, page or setting' },
  { key: 'Ctrl + Z  /  ⌘Z', label: 'Undo', desc: 'Undo the last change to the draft (outside text fields)' },
  { key: 'Ctrl + Y  /  ⌘⇧Z', label: 'Redo', desc: 'Put back the change you undid (outside text fields)' },
  { key: '?', label: 'Help', desc: 'Open this list from any page' },
];

export function HelpShortcutsModal({ open, onClose }: HelpShortcutsModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      description="Keys that work anywhere in the Studio. Drafts save automatically about a second after you stop typing."
      footer={
        <Button variant="primary" onClick={onClose}>
          Got it
        </Button>
      }
    >
      <div className="divide-y divide-line rounded-lg border border-line bg-surface text-xs">
        {shortcuts.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 p-2.5">
            <div>
              <span className="font-semibold text-ink">{item.label}</span>
              <p className="text-[11px] text-muted">{item.desc}</p>
            </div>
            <kbd className="shrink-0 rounded border border-line bg-subtle px-2 py-1 font-mono text-[11px] font-semibold text-ink">{item.key}</kbd>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
