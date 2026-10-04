'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import {
  PATREON_CONNECT_OPTIN_ENDPOINT,
  PATREON_CONNECT_OPTIN_EVENTS,
  PATREON_CONNECT_OPTIN_SOURCE,
  interpretWaitlistResponse,
  type ConnectOptInResult,
} from '@/lib/capture/patreonConnectOptIn';

type Gtag = (...args: unknown[]) => void;
const gtag: Gtag = (...args) => {
  (window as unknown as { gtag?: Gtag }).gtag?.(...args);
};

interface ConnectEmailOptInProps {
  /** The signed-in visitor's own address (session.user.email). */
  email: string;
  /** For the GA4 event params only. */
  modId: string;
}

/**
 * One-click weekly-email opt-in shown on /go/[modId] to a visitor who just
 * came back from Patreon connect, signed in (Cass, E173). The Patreon OAuth
 * path creates an account without ever showing the sign-up form's opt-in
 * (E86), so this is the first time these accounts are asked.
 *
 * Inline, in normal flow, no dialog / fixed / sticky; the owner renders it
 * outside every ad anchor. Nothing is sent until the button is clicked.
 */
export function ConnectEmailOptIn({ email, modId }: ConnectEmailOptInProps) {
  const [state, setState] = useState<'idle' | 'pending' | ConnectOptInResult>('idle');
  const viewFired = useRef(false);

  useEffect(() => {
    if (viewFired.current) return;
    viewFired.current = true;
    gtag('event', PATREON_CONNECT_OPTIN_EVENTS.view, {
      source: PATREON_CONNECT_OPTIN_SOURCE,
      mod_id: modId,
    });
  }, [modId]);

  const handleOptIn = async () => {
    if (state === 'pending' || state === 'subscribed' || state === 'already') return;
    setState('pending');
    try {
      const res = await fetch(PATREON_CONNECT_OPTIN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: PATREON_CONNECT_OPTIN_SOURCE }),
      });
      const body = await res.json().catch(() => null);
      const result = interpretWaitlistResponse(res.ok, body);
      if (result === 'subscribed') {
        gtag('event', PATREON_CONNECT_OPTIN_EVENTS.signup, {
          source: PATREON_CONNECT_OPTIN_SOURCE,
          mod_id: modId,
        });
      }
      setState(result);
    } catch {
      setState('error');
    }
  };

  if (state === 'subscribed' || state === 'already') {
    return (
      <p
        className="mt-4 text-sm text-slate-300 text-center inline-flex items-center justify-center gap-2 w-full"
        data-capture={PATREON_CONNECT_OPTIN_SOURCE}
        role="status"
      >
        <CheckCircle2 size={16} className="text-sims-green flex-shrink-0" />
        {state === 'subscribed'
          ? "You're on the list. The best new Sims 4 CC finds, once a week."
          : "You're already on the list."}
      </p>
    );
  }

  return (
    <div
      className="mt-4 bg-slate-900/40 border border-slate-700 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 text-left"
      data-capture={PATREON_CONNECT_OPTIN_SOURCE}
    >
      <Mail size={18} className="text-sims-pink flex-shrink-0 hidden sm:block" />
      <p className="flex-1 min-w-0 text-sm text-slate-300">
        Get the best new Sims 4 CC finds by email, once a week.{' '}
        <span className="text-slate-500">
          Goes to <span className="text-slate-400 break-all">{email}</span>. Unsubscribe anytime.
        </span>
        {state === 'error' && (
          <span className="block text-xs text-red-400 mt-1">Something went wrong. Please try again.</span>
        )}
      </p>
      <button
        type="button"
        onClick={handleOptIn}
        disabled={state === 'pending'}
        aria-busy={state === 'pending'}
        className="px-4 py-2 bg-sims-pink hover:bg-sims-pink/80 disabled:opacity-60 text-white text-sm font-semibold rounded-md transition-colors whitespace-nowrap inline-flex items-center justify-center gap-2"
      >
        {state === 'pending' ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Adding...
          </>
        ) : (
          'Email me weekly'
        )}
      </button>
    </div>
  );
}

export default ConnectEmailOptIn;
