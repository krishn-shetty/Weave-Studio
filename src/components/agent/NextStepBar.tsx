import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import type { StageId } from '../../types/studio';
import { Button } from '../ui/Button';

interface NextStepBarProps {
  stage: StageId;
  agentId: string;
  onPublish: () => void;
}

const copy: Record<StageId, {text: string;cta: string;}> = {
  overview: { text: 'Start with what it should do and how it sounds.', cta: 'Next: Build it' },
  build: { text: 'Happy with the changes? Talk to your draft to check it behaves.', cta: 'Next: Test it' },
  test: { text: 'Behaving well? Freeze this draft as a version you can deploy.', cta: 'Next: Publish' },
  release: { text: 'Once a version is live, watch how real conversations go.', cta: 'Next: Monitor' },
  monitor: { text: 'Spotted something to fix? Improve the draft and go round again.', cta: 'Back to Build' }
};

export function NextStepBar({ stage, agentId, onPublish }: NextStepBarProps) {
  const navigate = useNavigate();
  const { text, cta } = copy[stage];
  const handle = () => {
    if (stage === 'overview') navigate(`/agents/${agentId}/build`);else
    if (stage === 'build') navigate(`/agents/${agentId}/test`);else
    if (stage === 'test') onPublish();else
    if (stage === 'release') navigate(`/agents/${agentId}/monitor`);else
    navigate(`/agents/${agentId}/build`);
  };
  return (
    <div className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4 lg:px-10">
        <p className="text-sm text-ink-soft">{text}</p>
        <Button variant="secondary" onClick={handle}>
          {cta}
          <ArrowRightIcon className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>);

}