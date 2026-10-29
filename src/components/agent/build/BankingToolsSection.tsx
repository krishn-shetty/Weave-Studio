import React, { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { LandmarkIcon, LoaderCircleIcon, RefreshCwIcon } from 'lucide-react';
import { gateway, GatewayError } from '../../../api/gateway';
import type { GatewayHealth, GeneratedAgentConfig } from '../../../api/gatewayTypes';
import { applyGatewayConfig, GATEWAY_URL_CONSTANT, usesGateway, type GatewayConfigChange } from '../../../models/bankingTools';
import type { AgentConfig } from '../../../types/studio';
import { Button } from '../../ui/Button';
import { StatusChip } from '../../ui/StatusChip';
import { cn, inputClass } from '../../../utils/styles';

/**
 * Adds the banking gateway's tools to the draft, or refreshes them, from the gateway's own generated config (never
 * hand-copied JSON). The change goes through the draft editor as one undo step and is validated by the server like
 * any edit. Nothing is saved, published or deployed here.
 */
export function BankingToolsSection({ config, disabled, replaceConfig }: { config: AgentConfig; disabled: boolean; replaceConfig?: (next: AgentConfig) => void }) {
  const id = useId();
  const [health, setHealth] = useState<GatewayHealth | null>(null);
  const [healthError, setHealthError] = useState<GatewayError | null>(null);
  const [url, setUrl] = useState<string>(() => String((config.constants as Record<string, unknown> | undefined)?.[GATEWAY_URL_CONSTANT] ?? ''));
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<{ change: GatewayConfigChange; generated: GeneratedAgentConfig } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wired = usesGateway(config);

  useEffect(() => {
    const controller = new AbortController();
    gateway
      .health(controller.signal)
      .then(setHealth)
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setHealthError(e instanceof GatewayError ? e : null);
      });
    return () => controller.abort();
  }, []);

  const apply = async () => {
    if (!replaceConfig) return;
    setWorking(true);
    setError(null);
    setResult(null);
    try {
      const generated = await gateway.agentConfig();
      const change = applyGatewayConfig(config, generated, url.trim() || undefined);
      if (change.ok && change.changed) replaceConfig(change.config);
      setResult({ change, generated });
    } catch (e) {
      setError(e instanceof GatewayError ? e.message : 'The banking gateway did not answer.');
    } finally {
      setWorking(false);
    }
  };

  const notConfigured = healthError?.kind === 'not_configured';
  const readOnly = disabled || !replaceConfig;
  // Most agents have nothing to do with banking: without a gateway, say nothing unless this draft already uses one.
  if (notConfigured && !wired) return null;

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${id}-title`} className="flex items-center gap-2 text-sm font-semibold text-ink">
          <LandmarkIcon className="h-4 w-4 text-muted" aria-hidden />
          Banking gateway tools
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {wired && <StatusChip tone="accent">In this draft</StatusChip>}
          {health && <StatusChip tone={health.hosts === 'mock' ? 'warning' : 'info'}>{health.hosts === 'mock' ? 'Gateway on mock bank systems' : 'Gateway reachable'}</StatusChip>}
          {health && !health.policy_approved && <StatusChip>Rules not yet approved</StatusChip>}
        </div>
      </div>
      <p className="mt-1 text-[13px] text-ink-soft">
        Sign-in, balances, cheques, rates and appointments run in the bank&apos;s gateway, which enforces verification, entitlements and confirmations in code. These tools let the agent call it.{' '}
        <Link to="/banking?tab=tools" className="text-accent hover:underline">
          See every banking tool
        </Link>
      </p>

      {notConfigured ? (
        <p className="mt-3 rounded-md bg-subtle px-3 py-2 text-[13px] text-ink-soft">
          No banking gateway is set up for this Studio. Set <code className="font-mono">BANKING_GATEWAY_URL</code> and <code className="font-mono">BANKING_GATEWAY_TOKEN</code> for the Studio server (see .env.example).
        </p>
      ) : healthError ? (
        <p className="mt-3 text-[13px] text-danger" role="alert">
          {healthError.message}
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          <label htmlFor={`${id}-url`} className="block text-[13px] font-medium text-ink">
            Gateway address the agent runtime uses
          </label>
          <p id={`${id}-url-hint`} className="text-[12px] text-muted">
            Stored as the constant <code className="font-mono">{GATEWAY_URL_CONSTANT}</code>. It must be reachable from the runtime, not just from this computer.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              id={`${id}-url`}
              type="url"
              value={url}
              disabled={readOnly || working}
              aria-describedby={`${id}-url-hint`}
              placeholder="https://"
              onChange={(e) => setUrl(e.target.value)}
              className={cn(inputClass, 'min-w-[220px] flex-1')}
            />
            <Button variant="primary" onClick={apply} disabled={readOnly || working || !health}>
              {working ? <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden /> : <RefreshCwIcon className="h-3.5 w-3.5" aria-hidden />}
              {wired ? 'Refresh banking tools' : 'Add banking tools'}
            </Button>
          </div>
          {readOnly && <p className="text-[12px] text-muted">You can view this draft but not change it.</p>}
        </div>
      )}

      {error && (
        <p className="mt-3 text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}
      {result && <ChangeReport change={result.change} generated={result.generated} />}
    </section>
  );
}

function ChangeReport({ change, generated }: { change: GatewayConfigChange; generated: GeneratedAgentConfig }) {
  if (!change.ok) {
    return (
      <div role="alert" className="mt-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-[13px]">
        <p className="font-medium text-ink">Nothing was changed.</p>
        <ul className="mt-1 list-inside list-disc text-ink-soft">
          {change.conflicts.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
    );
  }
  const counts = [
    change.added.length && `${change.added.length} added`,
    change.updated.length && `${change.updated.length} updated`,
    change.removed.length && `${change.removed.length} removed`,
    change.unchanged.length && `${change.unchanged.length} already up to date`,
  ].filter(Boolean);
  return (
    <div role="status" className="mt-3 space-y-2 rounded-md border border-line bg-subtle px-3 py-2 text-[13px] text-ink-soft">
      <p className="font-medium text-ink">{change.changed ? `Draft updated: ${counts.join(', ')}.` : 'The draft already has the current banking tools. Nothing changed.'}</p>
      {change.changed && <p>Edited in your draft only (undo is available). Check the server&apos;s validation, then save when ready.</p>}
      {change.connectionKept && <p>The existing banking_gateway connection was kept as you set it.</p>}
      {change.rolesUpdated.length > 0 && <p>Tools assigned to: {change.rolesUpdated.join(', ')}.</p>}
      {change.rolesMissing.length > 0 && (
        <p>
          These specialist agents are not in the draft, so their banking tools are not assigned yet: <strong className="font-medium text-ink">{change.rolesMissing.join(', ')}</strong>. Add them under Agents, with
          instructions, then refresh.
        </p>
      )}
      {change.rolesOverLimit.length > 0 && <p className="text-warning">Over the 8-tool limit: {change.rolesOverLimit.join(', ')}.</p>}
      {generated.runtimeDependencies.length > 0 && (
        <div>
          <p className="font-medium text-ink">Not yet verified with the runtime</p>
          <ul className="mt-0.5 list-inside list-disc">
            {generated.runtimeDependencies.map((d) => (
              <li key={d.placeholder}>
                <code className="font-mono">{d.placeholder}</code> in {d.used_in}: needed for {d.needed_for}.
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
