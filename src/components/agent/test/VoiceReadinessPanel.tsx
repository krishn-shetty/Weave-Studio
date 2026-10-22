import React, { useEffect, useState } from 'react';
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  ExternalLinkIcon,
  HelpCircleIcon,
  LoaderCircleIcon,
  MicIcon,
  RadioIcon,
  RefreshCwIcon,
  XCircleIcon,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { StatusChip } from '../../ui/StatusChip';
import { api } from '../../../api/client';
import type { AgentConfig } from '../../../types/studio';
import type { ProvidersAnswer, ValidationReport } from '../../../api/types';

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

interface ReadinessCheck {
  id: string;
  title: string;
  status: 'pending' | 'pass' | 'fail' | 'warning';
  detail: string;
  fix?: string;
}

interface VoiceReadinessPanelProps {
  botId: string;
  config: AgentConfig;
  onReadyChange?: (ready: boolean) => void;
}

export function VoiceReadinessPanel({ botId, config, onReadyChange }: VoiceReadinessPanelProps) {
  const [running, setRunning] = useState(false);
  const [checks, setChecks] = useState<ReadinessCheck[]>([
    { id: 'health', title: '1. API server reachable', status: 'pending', detail: 'Checking GET /health…' },
    { id: 'validation', title: '2. Bot draft valid', status: 'pending', detail: 'Validating configuration…' },
    { id: 'providers', title: '3. Voice & model providers', status: 'pending', detail: 'Checking installed plugins and keys…' },
    { id: 'channel', title: '4. Web voice channel exists', status: 'pending', detail: 'Verifying channel.type == "web_voice"…' },
    { id: 'session', title: '5. LiveKit credentials & session', status: 'pending', detail: 'Testing POST /bots/{id}/sessions…' },
    { id: 'mic', title: '6. Microphone & audio permission', status: 'pending', detail: 'Checking browser media devices…' },
  ]);

  const runAllChecks = async () => {
    setRunning(true);
    const updated: ReadinessCheck[] = [];

    // 1. API reachable
    try {
      const health = await api.health();
      if (health.ok) {
        updated.push({ id: 'health', title: '1. API server reachable', status: 'pass', detail: 'API is healthy (HTTP 200 OK).' });
      } else {
        updated.push({ id: 'health', title: '1. API server reachable', status: 'fail', detail: 'Server returned non-ok health.', fix: 'Verify AGENT_BUILDER_URL.' });
      }
    } catch (e: any) {
      updated.push({ id: 'health', title: '1. API server reachable', status: 'fail', detail: e.message, fix: 'Check network connectivity to the API.' });
    }

    // 2. Draft valid
    try {
      const report: ValidationReport = await api.validate(config);
      if (report.valid) {
        updated.push({ id: 'validation', title: '2. Bot draft valid', status: 'pass', detail: 'Draft passes all schema and semantic checks with 0 errors.' });
      } else {
        const errorMsgs = report.errors.map((err) => err.message).join('; ');
        updated.push({ id: 'validation', title: '2. Bot draft valid', status: 'fail', detail: `${report.errors.length} errors: ${errorMsgs}`, fix: 'Fix listed errors in the Build tab.' });
      }
    } catch (e: any) {
      updated.push({ id: 'validation', title: '2. Bot draft valid', status: 'warning', detail: `Validation check: ${e.message}` });
    }

    // 3. Provider check
    try {
      const provAns: ProvidersAnswer = await api.providers();
      const tts = provAns.providers.find((p) => p.name === config.defaults?.models?.tts?.provider || p.name === 'elevenlabs');
      const stt = provAns.providers.find((p) => p.name === config.defaults?.models?.stt?.provider || p.name === 'openai');

      if (tts && tts.installed && tts.key_available) {
        updated.push({
          id: 'providers',
          title: '3. Voice & model providers',
          status: 'pass',
          detail: `TTS provider "${tts.name}" installed and key configured. STT "${stt?.name}" ready.`,
        });
      } else if (tts && tts.installed && !tts.key_available) {
        updated.push({
          id: 'providers',
          title: '3. Voice & model providers',
          status: 'warning',
          detail: `TTS provider "${tts.name}" installed but key is missing (${tts.default_secret}).`,
          fix: `Set ${tts.default_secret} in your server environment.`,
        });
      } else {
        updated.push({
          id: 'providers',
          title: '3. Voice & model providers',
          status: 'warning',
          detail: `TTS provider is not installed on this server.`,
          fix: 'Install the provider plugin on the server.',
        });
      }
    } catch (e: any) {
      updated.push({ id: 'providers', title: '3. Voice & model providers', status: 'warning', detail: e.message });
    }

    // 4. Channel check
    const webVoiceCh = config.channels?.find((c) => c.type === 'web_voice' && c.enabled);
    if (webVoiceCh) {
      updated.push({ id: 'channel', title: '4. Web voice channel exists', status: 'pass', detail: `Web voice channel "${webVoiceCh.id}" is enabled.` });
    } else {
      updated.push({
        id: 'channel',
        title: '4. Web voice channel exists',
        status: 'fail',
        detail: 'No enabled web_voice channel found in draft config.',
        fix: 'Enable a web voice channel in Build -> Where it is available.',
      });
    }

    // 5. Session check
    try {
      const sess = await api.startSession(botId, { ref: 'draft' });
      if (sess && sess.token && sess.livekit_url) {
        updated.push({
          id: 'session',
          title: '5. LiveKit credentials & session',
          status: 'pass',
          detail: `Session 201 Created. Room: ${sess.room}, host: ${sess.livekit_url.replace(/^wss?:\/\//, '')}.`,
        });
      } else {
        updated.push({ id: 'session', title: '5. LiveKit credentials & session', status: 'warning', detail: 'Session created with incomplete token payload.' });
      }
    } catch (e: any) {
      if (e.status === 503) {
        updated.push({
          id: 'session',
          title: '5. LiveKit credentials & session',
          status: 'fail',
          detail: '503: LiveKit credentials (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) missing on server.',
          fix: 'Set LiveKit environment variables on the server.',
        });
      } else if (e.status === 422) {
        updated.push({
          id: 'session',
          title: '5. LiveKit credentials & session',
          status: 'fail',
          detail: `422: ${e.message}`,
          fix: 'Ensure the bot has an enabled web voice channel.',
        });
      } else {
        updated.push({ id: 'session', title: '5. LiveKit credentials & session', status: 'warning', detail: e.message });
      }
    }

    // 6. Microphone permission
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        updated.push({ id: 'mic', title: '6. Microphone & audio permission', status: 'pass', detail: 'Microphone access granted.' });
      } catch {
        updated.push({
          id: 'mic',
          title: '6. Microphone & audio permission',
          status: 'warning',
          detail: 'Microphone permission prompt was denied or dismissed.',
          fix: 'Allow microphone access in browser settings.',
        });
      }
    } else {
      updated.push({ id: 'mic', title: '6. Microphone & audio permission', status: 'warning', detail: 'Media devices API not available.' });
    }

    setChecks(updated);
    setRunning(false);

    const allPassed = updated.every((c) => c.status === 'pass' || c.status === 'warning');
    onReadyChange?.(allPassed);
  };

  useEffect(() => {
    runAllChecks();
  }, [botId]);

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-panel">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <RadioIcon className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-ink">Voice Readiness Diagnostics</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={runAllChecks} disabled={running}>
          <RefreshCwIcon className={cn('h-3.5 w-3.5', running && 'animate-spin')} />
          Re-check
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {checks.map((chk) => (
          <div key={chk.id} className="rounded-lg border border-line bg-canvas p-3 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {chk.status === 'pass' ? (
                  <CheckCircle2Icon className="h-4 w-4 text-green-500 shrink-0" />
                ) : chk.status === 'fail' ? (
                  <XCircleIcon className="h-4 w-4 text-red-500 shrink-0" />
                ) : chk.status === 'warning' ? (
                  <CircleAlertIcon className="h-4 w-4 text-amber-500 shrink-0" />
                ) : (
                  <LoaderCircleIcon className="h-4 w-4 animate-spin text-muted shrink-0" />
                )}
                <span className="font-medium text-ink">{chk.title}</span>
              </div>
              <StatusChip
                tone={
                  chk.status === 'pass'
                    ? 'success'
                    : chk.status === 'fail'
                    ? 'danger'
                    : chk.status === 'warning'
                    ? 'warning'
                    : 'neutral'
                }
              >
                {chk.status}
              </StatusChip>
            </div>
            <p className="mt-1 text-ink-soft ml-6 leading-relaxed">{chk.detail}</p>
            {chk.fix && (
              <p className="mt-1.5 text-accent ml-6 font-medium">
                Fix: {chk.fix}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
