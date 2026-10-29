import React from 'react';
import { BotIcon, LandmarkIcon } from 'lucide-react';
import { useStudio } from '../../../contexts/StudioContext';
import { usesGateway } from '../../../models/bankingTools';
import type { AgentConfig } from '../../../types/studio';

interface AgentSelectorProps {
  currentAgentId: string;
  onSelect: (agentId: string) => void;
  className?: string;
  label?: string;
}

export function AgentSelector({ currentAgentId, onSelect, className, label = 'Agent:' }: AgentSelectorProps) {
  const { agents } = useStudio();

  const isBankingAgent = (id: string, config: unknown) =>
    id === 'voice-test' || id.includes('banking') || usesGateway(config as AgentConfig | null | undefined);

  const bankingAgents = agents.filter((a) => isBankingAgent(a.id, a.draft?.config));
  const standardAgents = agents.filter((a) => !isBankingAgent(a.id, a.draft?.config));

  // If the current agent is not yet in the list (e.g. initial load), ensure it can still be displayed
  const currentAgent = agents.find((a) => a.id === currentAgentId);
  const currentIsBanking = isBankingAgent(currentAgentId, currentAgent?.draft?.config);

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
      {label && (
        <label htmlFor="test-stage-agent-select" className="text-xs font-medium text-muted flex items-center gap-1">
          {currentIsBanking ? <LandmarkIcon className="h-3 w-3 text-accent" aria-hidden /> : <BotIcon className="h-3 w-3 text-muted" aria-hidden />}
          <span>{label}</span>
        </label>
      )}
      <select
        id="test-stage-agent-select"
        aria-label="Select Agent for Conversation"
        value={currentAgentId}
        onChange={(e) => onSelect(e.target.value)}
        className="h-7 rounded-md border border-line bg-surface px-2 text-xs font-medium text-ink shadow-sm transition hover:border-line-strong focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
      >
        {bankingAgents.length > 0 && (
          <optgroup label="Banking AI Agents">
            {bankingAgents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id === 'voice-test' ? 'Weave Demo Bank (Banking AI)' : a.name || a.id}
              </option>
            ))}
          </optgroup>
        )}
        {standardAgents.length > 0 && (
          <optgroup label="Configured Agents">
            {standardAgents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name || a.id}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
