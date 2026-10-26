import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LoaderCircleIcon, LockIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { WeaveMark } from '../components/ui/WeaveMark';

const journey = [
  { label: 'Build', text: 'Start from a starter, edit in plain words or raw JSON.' },
  { label: 'Test', text: 'Talk to your draft before anyone else does.' },
  { label: 'Release', text: 'Freeze versions, deploy with checks, roll back in two clicks.' },
  { label: 'Monitor', text: 'Read calls and watch health after every release.' },
];

export function SignIn() {
  const { user, signIn, signingIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [identifier, setIdentifier] = useState('shetty@weave.local');
  const [password, setPassword] = useState('••••••••••••');
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to={from} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim()) {
      setError('Enter your email or phone.');
      return;
    }
    const result = await signIn(identifier, password);
    if (result.ok) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Invalid credentials');
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-canvas px-6 py-12">
      <div className="grid w-full max-w-4xl items-center gap-12 md:grid-cols-[1fr_400px]">
        <section aria-labelledby="product-title">
          <div className="flex items-center gap-2.5">
            <WeaveMark className="h-9 w-9" />
            <span className="text-lg font-semibold tracking-tight text-ink">Weave Studio</span>
          </div>
          <h1 id="product-title" className="mt-8 max-w-md text-3xl font-semibold leading-tight tracking-tight text-ink">
            Build, test and run the agents that talk to your customers.
          </h1>
          <ol className="mt-8 space-y-4 border-l border-line pl-5">
            {journey.map((s) => (
              <li key={s.label}>
                <p className="text-sm font-semibold text-ink">{s.label}</p>
                <p className="text-sm text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-line bg-surface p-8 shadow-panel" aria-labelledby="signin-title">
          <h2 id="signin-title" className="text-lg font-semibold text-ink">
            Temporary sign-in
          </h2>
          <p className="mt-1 text-sm text-muted">
            Your email or phone is sent to the API as your name on saves and publishes. The password is not checked yet; a
            real sign-in will replace this.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="signin-id" className="block text-xs font-medium text-ink-soft">
                Email or phone
              </label>
              <input
                id="signin-id"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="name@company.com or +1234567890"
                className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div>
              <label htmlFor="signin-password" className="block text-xs font-medium text-ink-soft">
                Password
              </label>
              <input
                id="signin-password"
                name="current-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <Button type="submit" variant="primary" className="mt-2 h-10 w-full" disabled={signingIn}>
              {signingIn ? (
                <>
                  <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="mt-6 flex gap-2.5 rounded-lg bg-subtle p-3 text-[13px] leading-relaxed text-ink-soft">
            <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
            <p>
              Studio never exposes API keys or secrets in your browser. Requests are signed and authenticated on the server.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}