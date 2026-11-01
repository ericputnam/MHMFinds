'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import {
  PATREON_CONNECT_OPTIN_ENDPOINT,
  PATREON_CONNECT_OPTIN_EVENTS,
  PATREON_CONNECT_OPTIN_SOURCE,
  CONNECT_OPTIN_COPY,
  interpretWaitlistResponse,
  type ConnectOptInCopy,
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
  /**
   * `waitlist.source` for the row and `source` on both events. Defaults to
   * the E173 post-connect surface; E198 passes its own so each surface reads
   * alone on the scoreboard.
   */
  source?: string;
  /** GA4 view event name (denominator). Defaults to E173's. */
  viewEvent?: string;
  /** Called once the request settles with a non-error result (E198 remembers it). */
  onResult?: (result: Extract<ConnectOptInResult, 'subscribed' | 'already'>) => void;
  /**
   * When given, renders a "Not now" button that calls it (E198 remembers the
   * dismissal). The E173 instance passes nothing and renders no dismiss.
   */
  onDismiss?: () => void;
  /**
   * User-visible copy. Defaults to arm `a`; E305 passes the visitor's arm on
   * /go so each arm reads alone (its `source` comes with it).
   */
  copy?: ConnectOptInCopy;
}

/**
 * One-click weekly-email opt-in for a signed-in visitor (Cass, E173 on /go
 * after Patreon connect; E198 on /mods/[id] for every signed-in visitor with
 * no remembered answer). The Patreon OAuth path creates an account without
 * ever showing the sign-up form's opt-in (E86), so for that cohort this is
 * the first time they are asked.
 *
 * Inline, in normal flow, no dialog / fixed / sticky; the owner renders it
 * outside every ad anchor. Nothing is sent until the button is clicked.
 */
export function ConnectEmailOptIn({
  email,
  modId,
  source = PATREON_CONNECT_OPTIN_SOURCE,
  viewEvent = PATREON_CONNECT_OPTIN_EVENTS.view,
  onResult,
  onDismiss,
  copy = CONNECT_OPTIN_COPY.a,
}: ConnectEmailOptInProps) {
  const [state, setState] = useState<'idle' | 'pending' | ConnectOptInResult>('idle');
  const viewFired = useRef(false);

  useEffect(() => {
    if (viewFired.current) return;
    viewFired.current = true;
    gtag('event', viewEvent, {
      source,
      mod_id: modId,
    });
  }, [modId, source, viewEvent]);

  const handleOptIn = async () => {
    if (state === 'pending' || state === 'subscribed' || state === 'already') return;
    setState('pending');
    try {
      const res = await fetch(PATREON_CONNECT_OPTIN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      const body = await res.json().catch(() => null);
      const result = interpretWaitlistResponse(res.ok, body);
      if (result === 'subscribed') {
        gtag('event', PATREON_CONNECT_OPTIN_EVENTS.signup, {
          source,
          mod_id: modId,
        });
      }
      setState(result);
      if (result === 'subscribed' || result === 'already') onResult?.(result);
    } catch {
      setState('error');
    }
  };

  if (state === 'subscribed' || state === 'already') {
    return (
      <p
        className="mt-4 text-sm text-slate-300 text-center inline-flex items-center justify-center gap-2 w-full"
        data-capture={source}
        role="status"
      >
        <CheckCircle2 size={16} className="text-sims-green flex-shrink-0" />
        {state === 'subscribed'
          ? copy.subscribed
          : "You're already on the list."}
      </p>
    );
  }

  return (
    <div
      className="mt-4 bg-slate-900/40 border border-slate-700 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 text-left"
      data-capture={source}
    >
      <Mail size={18} className="text-sims-pink flex-shrink-0 hidden sm:block" />
      <p className="flex-1 min-w-0 text-sm text-slate-300">
        {copy.lead && <span className="block font-semibold text-white">{copy.lead}</span>}
        {copy.body}{' '}
        <span className="text-slate-500">
          Goes to <span className="text-slate-400 break-all">{email}</span>. Unsubscribe anytime.
        </span>
        {state === 'error' && (
          <span className="block text-xs text-red-400 mt-1">Something went wrong. Please try again.</span>
        )}
      </p>
      <div className="flex items-center gap-3">
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
            copy.button
          )}
        </button>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            disabled={state === 'pending'}
            className="text-sm text-slate-400 hover:text-white whitespace-nowrap"
          >
            Not now
          </button>
        )}
      </div>
    </div>
  );
}

export default ConnectEmailOptIn;
