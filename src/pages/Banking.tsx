import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LandmarkIcon } from 'lucide-react';
import { gateway } from '../api/gateway';
import type { ManifestTool } from '../api/gatewayTypes';
import { AssistantConsole } from '../components/banking/assistant/AssistantConsole';
import { RehearsalConsole } from '../components/banking/RehearsalConsole';
import { Segmented } from '../components/ui/Segmented';

export function Banking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'tools' ? 'tools' : 'assistant';
  const [tab, setTab] = useState<'assistant' | 'tools'>(initialTab);
  const [tools, setTools] = useState<ManifestTool[]>([]);

  useEffect(() => {
    gateway.manifest().then(setTools).catch(() => undefined);
  }, []);

  const handleTabChange = (next: 'assistant' | 'tools') => {
    setTab(next);
    setSearchParams(next === 'tools' ? { tab: 'tools' } : {});
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent" aria-hidden>
            <LandmarkIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-ink">Banking Studio</h1>
            <p className="text-xs text-muted">Virtual Banking Assistant rehearsal and Gateway Tools console</p>
          </div>
        </div>

        <Segmented
          size="sm"
          label="Banking mode"
          options={[
            { value: 'assistant', label: 'Virtual Assistant' },
            { value: 'tools', label: `Tool Runner (${tools.length || '32'})` },
          ]}
          value={tab}
          onChange={(v) => handleTabChange(v as 'assistant' | 'tools')}
        />
      </div>

      {tab === 'assistant' ? (
        <AssistantConsole />
      ) : (
        <RehearsalConsole tools={tools} />
      )}
    </div>
  );
}

