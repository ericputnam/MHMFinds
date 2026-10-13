/**
 * One-click weekly-email opt-in for signed-in visitors on /mods/[id]
 * (Cass, E198, 2026-10-13).
 *
 * Why this surface: email adds ride account adds. 84 of the 116 subscribers
 * on 10-13 came from the sign-up form's opt-in (E86, credentials sign-ups
 * only, 46% tick rate). The Patreon OAuth half of new accounts (41 of 90 in
 * the 7 days to 10-04) never sees that form, and the ~1,880 accounts that
 * predate it were asked once by email (E54 re-permission: 2 of 387, KILLED)
 * and never on the site. E173 asks the OAuth cohort once, on /go, only when
 * `?patreon=connected` is on the URL (16 viewers in its first 2 days). This
 * module asks every signed-in, not-yet-subscribed visitor on the largest
 * Next.js surface (/mods/* 13,670 sessions 09-29→10-12), once, with the same
 * one-click component — the session's own address, nothing typed, nothing
 * sent on view.
 *
 * What makes it "once": the site has no per-user "is subscribed" read (a GET
 * would need a cache nonce, #219), so the visitor's answer is remembered in
 * localStorage under `MEMBER_OPTIN_STORAGE_KEY` — `subscribed`, `already`
 * (the address was on the list) or `dismissed` ("Not now"). A remembered
 * answer hides the offer; nothing is read before mount, so SSR and first
 * paint never show it to a visitor who answered.
 *
 * Consent: identical to E173 — the button label says what they get, the copy
 * names the address, and the POST carries only the session's own address with
 * this surface's own `source`.
 */

/** `waitlist.source` for rows this surface creates (scoreboard attribution). */
export const MEMBER_OPTIN_SOURCE = 'mod-detail-optin';

/** GA4 events. `newsletter_signup` is the shared conversion; the view is ours. */
export const MEMBER_OPTIN_EVENTS = {
  /** The offer rendered for a signed-in visitor with no remembered answer (denominator). */
  view: 'member_optin_view',
  /** A NEW waitlist row was created (never fired for an existing address). */
  signup: 'newsletter_signup',
} as const;

/** localStorage key holding the visitor's remembered answer. */
export const MEMBER_OPTIN_STORAGE_KEY = 'mhm_member_optin';

export type MemberOptInMemory = 'subscribed' | 'already' | 'dismissed';

const MEMORY_VALUES: readonly string[] = ['subscribed', 'already', 'dismissed'];

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Minimal Storage shape so the helpers are testable without a window. */
export interface MemoryStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Read the remembered answer. Returns `null` when nothing valid is stored or
 * the store throws (private mode, quota). Never throws.
 */
export function readMemberOptInMemory(store: MemoryStore | null | undefined): MemberOptInMemory | null {
  try {
    const raw = store?.getItem(MEMBER_OPTIN_STORAGE_KEY);
    return raw !== null && raw !== undefined && MEMORY_VALUES.includes(raw) ? (raw as MemberOptInMemory) : null;
  } catch {
    return null;
  }
}

/** Remember the answer. Swallows storage errors: forgetting is the worst case. */
export function rememberMemberOptIn(store: MemoryStore | null | undefined, value: MemberOptInMemory): void {
  try {
    store?.setItem(MEMBER_OPTIN_STORAGE_KEY, value);
  } catch {
    /* storage unavailable — the offer may show again next visit; never an error */
  }
}

export interface MemberOptInVisibility {
  /** next-auth `useSession().status`. */
  sessionStatus: 'authenticated' | 'unauthenticated' | 'loading';
  /** `session.user.email`, if any. */
  email: string | null | undefined;
  /**
   * The remembered answer: `null` = none; `undefined` = storage not read yet
   * (before mount) — treated as "don't show" so first paint never guesses.
   */
  remembered: MemberOptInMemory | null | undefined;
}

/**
 * Show the offer only to a signed-in visitor with a usable address whose
 * storage has been read and holds no answer. Signed-out, loading, address-less
 * and already-answered visitors never see it.
 */
export function shouldShowMemberOptIn(v: MemberOptInVisibility): boolean {
  return (
    v.remembered === null &&
    v.sessionStatus === 'authenticated' &&
    typeof v.email === 'string' &&
    EMAIL_SHAPE.test(v.email.trim())
  );
}
