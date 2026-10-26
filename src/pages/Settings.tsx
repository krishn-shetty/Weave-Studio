import React from 'react';
import { ShieldCheckIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStudio } from '../contexts/StudioContext';
import { useTheme } from '../contexts/ThemeContext';
import { Toggle } from '../components/ui/Toggle';
import { Segmented } from '../components/ui/Segmented';
import { StatusChip } from '../components/ui/StatusChip';

const roleText = {
  admin: 'Can edit, publish and deploy anywhere, including Production.',
  editor: 'Can edit, publish and deploy to Development and Staging.',
  viewer: 'Can look at agents and calls. Can’t change anything.'
} as const;

export function Settings() {
  const { user } = useAuth();
  const { technicalNames, setTechnicalNames } = useStudio();
  const { theme, setTheme, density, setDensity } = useTheme();
  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 lg:px-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings</h1>

      <section aria-labelledby="profile" className="mt-8 border-b border-line pb-8">
        <h2 id="profile" className="text-sm font-semibold text-ink">Your account</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
          <dt className="text-sm text-muted">Name</dt>
          <dd className="text-sm text-ink">{user.name}</dd>
          <dt className="text-sm text-muted">Email</dt>
          <dd className="text-sm text-ink">{user.email}</dd>
          <dt className="text-sm text-muted">Role</dt>
          <dd className="text-sm text-ink">
            <span className="font-medium capitalize">{user.role}</span> — {roleText[user.role]}
            <p className="mt-0.5 text-xs text-muted">Set by your company identity provider. Ask IT to change it.</p>
          </dd>
        </dl>
      </section>

      <section aria-labelledby="interface" className="mt-8 border-b border-line pb-8">
        <h2 id="interface" className="text-sm font-semibold text-ink">Interface</h2>
        <div className="mt-4 space-y-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-ink">Theme</p>
              <p className="text-[13px] text-muted">Select light mode, dark mode, or follow your system appearance.</p>
            </div>
            <Segmented
              label="Theme mode"
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
              value={theme}
              onChange={(v) => setTheme(v as any)}
            />
          </div>

          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-ink">Display density</p>
              <p className="text-[13px] text-muted">Compact density fits more information on screen by tightening spacing and table rows.</p>
            </div>
            <Segmented
              label="Density"
              options={[
                { value: 'comfortable', label: 'Comfortable' },
                { value: 'compact', label: 'Compact' },
              ]}
              value={density}
              onChange={(v) => setDensity(v as any)}
            />
          </div>

          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-ink">Technical names</p>
              <p className="text-[13px] text-muted">Show configuration keys like <code className="font-mono">persona.company</code> instead of plain labels in the Detailed view.</p>
            </div>
            <Toggle checked={technicalNames} onChange={setTechnicalNames} label="Technical names" />
          </div>
        </div>
      </section>

      <section aria-labelledby="security" className="mt-8">
        <h2 id="security" className="text-sm font-semibold text-ink">About your session</h2>
        <ul className="mt-4 space-y-2.5">
          {[
          'This is a temporary sign-in: your email or phone is sent to the API as your name, and no password is checked yet.',
          'API keys and secrets live only on the server-side gateway, never in your browser.',
          'Roles are not enforced by the server yet; until real sign-in arrives, everyone signed in here can edit, publish and deploy.',
          'Transcripts and prompts are always shown as plain text.'].
          map((t) =>
          <li key={t} className="flex gap-2.5 text-sm text-ink-soft">
              <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              {t}
            </li>
          )}
        </ul>
        <p className="mt-6 text-[13px] text-muted">Team members and sharing arrive in version 2.</p>
      </section>
    </div>);

}