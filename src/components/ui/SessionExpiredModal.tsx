import React from 'react';
import { toast } from 'sonner';
import { AlertTriangleIcon, CheckCircle2Icon, LoaderCircleIcon, LockIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Dialog } from './Dialog';
import { Button } from './Button';

export function SessionExpiredModal() {
  const { sessionExpired, reauthenticate, signingIn } = useAuth();

  if (!sessionExpired) return null;

  const handleReauth = async () => {
    await reauthenticate();
    toast.success('Session re-authenticated', {
      description: 'Your unsaved edits and working draft have been safely restored.'
    });
  };

  const handleBlockedClose = () => {
    // Block dismissal until re-authenticated
  };

  return (
    <Dialog
      open={sessionExpired}
      onClose={handleBlockedClose}
      title="Session Expired"
      description="Your company SSO session has timed out. Re-authenticate to continue."
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-xs text-muted flex items-center gap-1.5">
            <CheckCircle2Icon className="h-3.5 w-3.5 text-success" />
            Unsaved draft edits preserved
          </span>
          <Button variant="primary" onClick={handleReauth} disabled={signingIn}>
            {signingIn ? (
              <>
                <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden />
                Re-authenticating…
              </>
            ) : (
              <>
                <LockIcon className="h-4 w-4" aria-hidden />
                Continue with company SSO
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft/30 p-4 text-xs text-ink-soft">
          <AlertTriangleIcon className="h-5 w-5 shrink-0 text-warning mt-0.5" />
          <div>
            <p className="font-semibold text-ink">Inactivity Timeout (FR-01)</p>
            <p className="mt-1 leading-relaxed">
              To protect company data and customer call records, credentials expire periodically.
              Your working configuration draft has been held safely in local memory.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted leading-relaxed">
          Clicking continue will refresh your SSO session token via the gateway.
          You will immediately resume editing right where you left off.
        </p>
      </div>
    </Dialog>
  );
}
