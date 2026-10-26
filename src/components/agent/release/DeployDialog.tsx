import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from '../../ui/Toast';
import { CircleCheckIcon, LoaderCircleIcon, ShieldAlertIcon, TriangleAlertIcon } from 'lucide-react';
import type { Agent, EnvironmentName } from '../../../types/studio';
import { useStudio } from '../../../contexts/StudioContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { currentDeployments, environments, envLabel, missingSecrets } from '../../../utils/agentStatus';
import { validateConfig } from '../../../utils/validate';
import { useVersionConfig } from '../../../hooks/useVersionConfig';
import { cn, easeOut, inputClass } from '../../../utils/styles';

interface DeployDialogProps {
  open: boolean;
  onClose: () => void;
  agent: Agent;
  initialEnv?: EnvironmentName;
  initialVersion?: string;
}

interface CheckRow {
  ok: boolean;
  title: string;
  detail?: string;
}

export function DeployDialog({ open, onClose, agent, initialEnv, initialVersion }: DeployDialogProps) {
  const { deploy } = useStudio();
  const { can } = useAuth();
  const [env, setEnv] = useState<EnvironmentName>('development');
  const [version, setVersion] = useState('');
  const [note, setNote] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deploymentId, setDeploymentId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEnv(initialEnv ?? 'development');
    setVersion(initialVersion ?? agent.versions[0]?.version ?? '');
    setNote('');
    setConfirmText('');
    setDeploymentId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const deployment = deploymentId ? agent.deployments.find((d) => d.id === deploymentId) : undefined;

  useEffect(() => {
    if (deployment?.status === 'active') toast.success(`${deployment.version} is live in ${envLabel(deployment.environment)}`);
  }, [deployment?.status, deployment?.version, deployment?.environment]);

  const v = agent.versions.find((x) => x.version === version);
  const versionConfig = useVersionConfig(agent, v?.version);
  const vConfig = versionConfig.config;
  const report = vConfig ? validateConfig(vConfig) : null;
  const missing = report ? missingSecrets(report.secrets_required) : [];
  const current = currentDeployments(agent)[env];
  const isProd = env === 'production';
  const allowed = isProd ? can('deploy_production') : can('deploy');
  const alreadyLive = current?.version === version;
  const confirmOk = !isProd || confirmText.trim() === agent.id;

  const checks: CheckRow[] = report && vConfig ?
  [
  missing.length ?
  { ok: false, title: `${missing.length} ${missing.length === 1 ? 'secret is' : 'secrets are'} missing on the server`, detail: `${missing.join(', ')} — calls that need them will fail. This is advice, not a blocker.` } :
  { ok: true, title: 'All secrets found on the server', detail: report.secrets_required.join(', ') },
  report.unsupported.length ?
  { ok: false, title: 'Uses features that aren’t available yet', detail: report.unsupported.map((u) => `${u.feature} (${u.where})`).join('; ') } :
  { ok: true, title: 'Everything in this version can run' },
  vConfig.post_call?.recording && !vConfig.persona?.recording_notice ?
  { ok: false, title: 'Calls are recorded but callers aren’t told', detail: 'Turn on the recording notice unless you are sure it isn’t required.' } :
  { ok: true, title: vConfig.persona?.recording_notice ? 'Callers are told they may be recorded' : 'Calls aren’t recorded' }] :

  [];

  const handleDeploy = () => {
    if (!v || !allowed || !confirmOk || alreadyLive) return;
    const dep = deploy(agent.id, version, env, note.trim());
    setDeploymentId(dep.id);
  };

  if (deployment) {
    const active = deployment.status === 'active';
    return (
      <Dialog open={open} onClose={onClose} title={active ? 'Deployed' : `Deploying ${deployment.version} to ${envLabel(deployment.environment)}`} footer={<Button variant={active ? 'primary' : 'secondary'} onClick={onClose}>{active ? 'Done' : 'Close — keep it running'}</Button>}>
        <motion.div key={deployment.status} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: easeOut }} className="flex gap-3">
          {active ? <CircleCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden /> : <LoaderCircleIcon className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-info" aria-hidden />}
          <div aria-live="polite">
            <p className="text-sm font-medium text-ink">
              {active ? `${deployment.version} is live in ${envLabel(deployment.environment)}.` : 'Pending'}
            </p>
            <p className="mt-1 text-sm text-muted">
              {active ?
              deployment.previous_version ?
              `If anything looks wrong, roll back to ${deployment.previous_version} from Release in two clicks.` :
              'This is the first version in this environment.' :
              deployment.previous_version ?
              `${deployment.previous_version} keeps serving callers until this is active.` :
              'Nothing is serving this environment until this is active.'}
            </p>
          </div>
        </motion.div>
      </Dialog>);

  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Deploy a version"
      description="Puts a frozen version in front of callers in one environment."
      footer={
      <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={isProd ? 'danger' : 'primary'} onClick={handleDeploy} disabled={!v || !allowed || !confirmOk || alreadyLive}>
            Deploy {version} to {envLabel(env)}
          </Button>
        </>
      }>
      
      {agent.versions.length === 0 ?
      <p className="text-sm text-muted">Publish a version first — only frozen versions can be deployed.</p> :

      <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <fieldset>
              <legend className="text-sm font-medium text-ink">Environment</legend>
              <div role="radiogroup" className="mt-2 grid grid-cols-3 gap-2">
                {environments.map((e) => {
                const active = e === env;
                const live = currentDeployments(agent)[e];
                return (
                  <button
                    key={e}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setEnv(e);
                      setConfirmText('');
                    }}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left transition-[border-color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                      active ? 'border-accent bg-accent-soft/60 ring-1 ring-accent' : 'border-line hover:border-line-strong'
                    )}>
                    
                      <span className="block text-sm font-medium text-ink">{envLabel(e)}</span>
                      <span className="block font-mono text-xs text-muted">{live ? live.version : 'empty'}</span>
                    </button>);

              })}
              </div>
            </fieldset>
            <label className="block">
              <span className="text-sm font-medium text-ink">Version</span>
              <select className={cn(inputClass, 'mt-2 font-mono')} value={version} onChange={(e) => setVersion(e.target.value)}>
                {agent.versions.map((x) => <option key={x.version} value={x.version}>{x.version}</option>)}
              </select>
            </label>
          </div>

          <p className="text-[13px] text-ink-soft">
            {alreadyLive ?
          `${version} is already live in ${envLabel(env)}.` :
          current ?
          `Replaces ${current.version} in ${envLabel(env)}. ${current.version} keeps serving until the new version is active.` :
          `First deployment to ${envLabel(env)}.`}
          </p>

          <section aria-labelledby="preflight">
            <h3 id="preflight" className="text-sm font-medium text-ink">Preflight checks</h3>
            <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
              {checks.map((c) =>
            <li key={c.title} className="flex gap-2.5 px-3 py-2.5">
                  {c.ok ? <CircleCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> : <TriangleAlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />}
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">{c.title}</p>
                    {c.detail && <p className="break-words text-xs text-muted">{c.detail}</p>}
                  </div>
                </li>
            )}
            </ul>
          </section>

          <label className="block">
            <span className="text-sm font-medium text-ink">Note <span className="font-normal text-muted">(optional)</span></span>
            <input className={cn(inputClass, 'mt-1.5')} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What’s in this release?" />
          </label>

          {isProd &&
        <div className="rounded-lg border border-danger/25 bg-danger-soft/50 p-4">
              {allowed ?
          <>
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    <ShieldAlertIcon className="h-4 w-4 text-danger" aria-hidden />
                    This changes what real callers hear.
                  </p>
                  <label htmlFor="prod-confirm" className="mt-2 block text-[13px] text-ink-soft">
                    Type <code className="rounded bg-surface px-1 font-mono text-ink">{agent.id}</code> to confirm.
                  </label>
                  <input id="prod-confirm" className={cn(inputClass, 'mt-1.5 font-mono')} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" spellCheck={false} />
                </> :

          <p className="flex items-center gap-2 text-sm text-ink">
                  <ShieldAlertIcon className="h-4 w-4 text-danger" aria-hidden />
                  Only admins can deploy to Production. Ask an admin to promote this version.
                </p>
          }
            </div>
        }
        </div>
      }
    </Dialog>);

}