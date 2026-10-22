import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LoaderCircleIcon, LockIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { WeaveMark } from '../components/ui/WeaveMark';

const journey = [
{ label: 'Build', text: 'Start from a starter, edit in plain words or raw JSON.' },
{ label: 'Test', text: 'Talk to your draft before anyone else does.' },
{ label: 'Release', text: 'Freeze versions, deploy with checks, roll back in two clicks.' },
{ label: 'Monitor', text: 'Read calls and watch health after every release.' }];


export function SignIn() {
  const { user, signIn, signingIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as {from?: string;} | null)?.from ?? '/';

  if (user) return <Navigate to={from} replace />;

  const handleSignIn = async () => {
    await signIn();
    navigate(from, { replace: true });
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
            {journey.map((s) =>
            <li key={s.label}>
                <p className="text-sm font-semibold text-ink">{s.label}</p>
                <p className="text-sm text-muted">{s.text}</p>
              </li>
            )}
          </ol>
        </section>

        <section className="rounded-xl border border-line bg-surface p-8 shadow-panel" aria-labelledby="signin-title">
          <h2 id="signin-title" className="text-lg font-semibold text-ink">
            Sign in
          </h2>
          <p className="mt-1 text-sm text-muted">Use your Northwind work account.</p>
          <Button variant="primary" className="mt-6 h-10 w-full" onClick={handleSignIn} disabled={signingIn}>
            {signingIn ?
            <>
                <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden />
                Redirecting to your company sign-in…
              </> :

            'Continue with company SSO'
            }
          </Button>
          <div className="mt-6 flex gap-2.5 rounded-lg bg-subtle p-3 text-[13px] leading-relaxed text-ink-soft">
            <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
            <p>
              You’ll be sent to your identity provider. Your role comes from there. Studio never stores passwords, tokens or API keys in your browser.
            </p>
          </div>
        </section>
      </div>
    </div>);

}