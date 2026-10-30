/**
 * One-click weekly-email opt-in for signed-in visitors on /mods/[id]
 * (Cass, E198, 2026-10-13).
 *
 * 84 of 116 subscribers came from the sign-up form's opt-in, which the Patreon
 * OAuth half of new accounts never sees and which pre-dates ~1,880 existing
 * accounts. E198 asks every signed-in, not-yet-answered visitor once on the
 * largest Next.js surface, with the E173 component carrying its own source.
 *
 * What this protects:
 *   1. Visibility: only a signed-in visitor with a usable session address AND
 *      storage read AND no remembered answer — never signed out, loading,
 *      pre-mount (`undefined`) or after subscribed / already / dismissed.
 *   2. Memory: the answer is remembered in localStorage and a remembered
 *      answer hides the offer; a throwing store is a no-op, never an error.
 *   3. Attribution: its own `source` (distinct from every waitlist source and
 *      capture ref, including E173's) and its own view event; the shared
 *      `newsletter_signup` fires only for a NEW row.
 *   4. The E173 instance is unchanged: default props keep its source, its
 *      view event, and render no dismiss button.
 *   5. Placement: ModDetailClient renders it exactly once, gated on the helper,
 *      as a sibling after SaveFindsOffer, before the in-content `.mv-ads`
 *      element and the aside — never inside either.
 *
 * Red against pre-E198 origin/main (55ccdfb): the module does not exist (the
 * import fails the file), the component ignores `source`/`onDismiss`, and
 * ModDetailClient has no wiring — every describe block fails there.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  MEMBER_OPTIN_EVENTS,
  MEMBER_OPTIN_SOURCE,
  MEMBER_OPTIN_MAX_VIEWS,
  MEMBER_OPTIN_STORAGE_KEY,
  MEMBER_OPTIN_VIEWS_KEY,
  readMemberOptInMemory,
  readMemberOptInViews,
  recordMemberOptInView,
  rememberMemberOptIn,
  shouldShowMemberOptIn,
} from '../../lib/capture/memberEmailOptIn';
import {
  PATREON_CONNECT_OPTIN_ENDPOINT,
  PATREON_CONNECT_OPTIN_EVENTS,
  PATREON_CONNECT_OPTIN_SOURCE,
} from '../../lib/capture/patreonConnectOptIn';
import { ConnectEmailOptIn } from '../../components/ConnectEmailOptIn';
import { GO_SAVE_SOURCE } from '../../app/go/[modId]/goSaveOffer';
import {
  MOD_DETAIL_FAVORITE_SOURCE,
  MOD_DETAIL_SAVE_SOURCE,
} from '../../lib/capture/modDetailFavorite';

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const stripComments = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const ADDR = 'simmer@example.com';

describe('shouldShowMemberOptIn', () => {
  it('shows for a signed-in visitor with an address, storage read, no answer', () => {
    expect(shouldShowMemberOptIn({ sessionStatus: 'authenticated', email: ADDR, remembered: null })).toBe(true);
  });

  it('never shows before storage is read, after any answer, signed out, loading, or without an address', () => {
    expect(shouldShowMemberOptIn({ sessionStatus: 'authenticated', email: ADDR, remembered: undefined })).toBe(false);
    expect(shouldShowMemberOptIn({ sessionStatus: 'authenticated', email: ADDR, remembered: 'subscribed' })).toBe(false);
    expect(shouldShowMemberOptIn({ sessionStatus: 'authenticated', email: ADDR, remembered: 'already' })).toBe(false);
    expect(shouldShowMemberOptIn({ sessionStatus: 'authenticated', email: ADDR, remembered: 'dismissed' })).toBe(false);
    expect(shouldShowMemberOptIn({ sessionStatus: 'unauthenticated', email: ADDR, remembered: null })).toBe(false);
    expect(shouldShowMemberOptIn({ sessionStatus: 'loading', email: ADDR, remembered: null })).toBe(false);
    expect(shouldShowMemberOptIn({ sessionStatus: 'authenticated', email: null, remembered: null })).toBe(false);
    expect(shouldShowMemberOptIn({ sessionStatus: 'authenticated', email: '', remembered: null })).toBe(false);
    expect(shouldShowMemberOptIn({ sessionStatus: 'authenticated', email: 'not-an-address', remembered: null })).toBe(false);
  });
});

describe('E287 view cap', () => {
  const mapStore = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
  };

  it('stops after MEMBER_OPTIN_MAX_VIEWS unanswered views (3), and an omitted count still shows', () => {
    expect(MEMBER_OPTIN_MAX_VIEWS).toBe(3);
    const base = { sessionStatus: 'authenticated' as const, email: ADDR, remembered: null };
    expect(shouldShowMemberOptIn(base)).toBe(true);
    for (let v = 0; v < MEMBER_OPTIN_MAX_VIEWS; v++) expect(shouldShowMemberOptIn({ ...base, views: v })).toBe(true);
    expect(shouldShowMemberOptIn({ ...base, views: MEMBER_OPTIN_MAX_VIEWS })).toBe(false);
    expect(shouldShowMemberOptIn({ ...base, views: 24 })).toBe(false);
  });

  it('counts views under its own key, separate from the answer key; bad or throwing stores read 0', () => {
    expect(MEMBER_OPTIN_VIEWS_KEY).not.toBe(MEMBER_OPTIN_STORAGE_KEY);
    const s = mapStore();
    expect(readMemberOptInViews(s)).toBe(0);
    recordMemberOptInView(s);
    recordMemberOptInView(s);
    expect(readMemberOptInViews(s)).toBe(2);
    expect(s.m.has(MEMBER_OPTIN_STORAGE_KEY)).toBe(false);
    s.setItem(MEMBER_OPTIN_VIEWS_KEY, 'junk');
    expect(readMemberOptInViews(s)).toBe(0);
    const throwing = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    expect(readMemberOptInViews(throwing)).toBe(0);
    expect(() => recordMemberOptInView(throwing)).not.toThrow();
    expect(readMemberOptInViews(null)).toBe(0);
  });

  it('ModDetailClient passes the stored count to the gate and records a view only while shown', () => {
    const src = readFileSync(join(process.cwd(), 'app/mods/[id]/ModDetailClient.tsx'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/readMemberOptInViews\(/);
    expect(src).toMatch(/views:\s*memberOptInViews/);
    expect(src).toMatch(/if \(showMemberOptIn\) recordMemberOptInView\(/);
  });
});

describe('memory helpers', () => {
  const store = () => {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
      setItem: (k: string, v: string) => void m.set(k, v),
      map: m,
    };
  };

  it('round-trips each answer under the one key and rejects anything else', () => {
    const s = store();
    expect(readMemberOptInMemory(s)).toBeNull();
    for (const v of ['subscribed', 'already', 'dismissed'] as const) {
      rememberMemberOptIn(s, v);
      expect(s.map.get(MEMBER_OPTIN_STORAGE_KEY)).toBe(v);
      expect(readMemberOptInMemory(s)).toBe(v);
    }
    s.map.set(MEMBER_OPTIN_STORAGE_KEY, 'garbage');
    expect(readMemberOptInMemory(s)).toBeNull();
  });

  it('a missing or throwing store reads null and writes nothing, without throwing', () => {
    expect(readMemberOptInMemory(null)).toBeNull();
    expect(readMemberOptInMemory(undefined)).toBeNull();
    expect(() => rememberMemberOptIn(null, 'dismissed')).not.toThrow();
    const throwing = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(readMemberOptInMemory(throwing)).toBeNull();
    expect(() => rememberMemberOptIn(throwing, 'subscribed')).not.toThrow();
  });
});

describe('attribution constants', () => {
  it('source is its own, distinct from every existing waitlist source and capture ref', () => {
    const existing = [
      'signup-optin', 'footer', 'go-interstitial', 'collection-page', 'home-hero',
      'sign-in', 're-permission', 'mod-detail', 'creator-page', 'creator-hub',
      GO_SAVE_SOURCE, MOD_DETAIL_SAVE_SOURCE, MOD_DETAIL_FAVORITE_SOURCE,
      PATREON_CONNECT_OPTIN_SOURCE,
    ];
    expect(existing).not.toContain(MEMBER_OPTIN_SOURCE);
    expect(MEMBER_OPTIN_SOURCE).toMatch(/^[a-z-]+$/);
  });

  it('view event is unique; the conversion is the shared newsletter_signup', () => {
    expect(MEMBER_OPTIN_EVENTS.signup).toBe('newsletter_signup');
    expect(MEMBER_OPTIN_EVENTS.view).toMatch(/^[a-z_]+$/);
    expect([
      'newsletter_signup', 'sign_up', 'favorite', 'patreon_post_connect_view',
      PATREON_CONNECT_OPTIN_EVENTS.view, 'signup_intent_view',
    ]).not.toContain(MEMBER_OPTIN_EVENTS.view);
  });
});

describe('ConnectEmailOptIn with the E198 props', () => {
  let gtag: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gtag = vi.fn();
    (window as unknown as { gtag: unknown }).gtag = gtag;
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    cleanup();
    delete (window as unknown as { gtag?: unknown }).gtag;
  });

  const renderMember = (extra: Partial<ComponentProps<typeof ConnectEmailOptIn>> = {}) =>
    render(
      <ConnectEmailOptIn
        email={ADDR}
        modId="m1"
        source={MEMBER_OPTIN_SOURCE}
        viewEvent={MEMBER_OPTIN_EVENTS.view}
        {...extra}
      />
    );

  it('sends nothing on render; fires only its own view event with its own source, once', () => {
    renderMember();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith('event', MEMBER_OPTIN_EVENTS.view, {
      source: MEMBER_OPTIN_SOURCE,
      mod_id: 'm1',
    });
    expect(screen.getByText(ADDR)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('one click posts the session address with the E198 source, fires newsletter_signup, reports the result', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    const onResult = vi.fn();
    renderMember({ onResult });
    fireEvent.click(screen.getByRole('button', { name: /email me weekly/i }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/on the list/i));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(PATREON_CONNECT_OPTIN_ENDPOINT);
    expect(JSON.parse(init.body)).toEqual({ email: ADDR, source: MEMBER_OPTIN_SOURCE });
    expect(gtag).toHaveBeenCalledWith('event', 'newsletter_signup', {
      source: MEMBER_OPTIN_SOURCE,
      mod_id: 'm1',
    });
    expect(onResult).toHaveBeenCalledWith('subscribed');
  });

  it('an address already on the list reports "already" and fires no conversion', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, alreadyExists: true }) });
    const onResult = vi.fn();
    renderMember({ onResult });
    fireEvent.click(screen.getByRole('button', { name: /email me weekly/i }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/already on the list/i));
    expect(onResult).toHaveBeenCalledWith('already');
    expect(gtag.mock.calls.filter((c) => c[1] === 'newsletter_signup')).toHaveLength(0);
  });

  it('an error reports nothing and keeps the button', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ success: false }) });
    const onResult = vi.fn();
    renderMember({ onResult });
    fireEvent.click(screen.getByRole('button', { name: /email me weekly/i }));
    await waitFor(() => expect(screen.getByText(/something went wrong/i)).toBeInTheDocument());
    expect(onResult).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /email me weekly/i })).toBeInTheDocument();
  });

  it('"Not now" calls onDismiss and sends nothing', () => {
    const onDismiss = vi.fn();
    renderMember({ onDismiss });
    fireEvent.click(screen.getByRole('button', { name: /not now/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(gtag.mock.calls.filter((c) => c[1] === 'newsletter_signup')).toHaveLength(0);
  });

  it('the E173 instance is unchanged: default source + view event, no dismiss button', () => {
    render(<ConnectEmailOptIn email={ADDR} modId="m1" />);
    expect(gtag).toHaveBeenCalledWith('event', PATREON_CONNECT_OPTIN_EVENTS.view, {
      source: PATREON_CONNECT_OPTIN_SOURCE,
      mod_id: 'm1',
    });
    expect(screen.queryByRole('button', { name: /not now/i })).toBeNull();
  });
});

describe('ModDetailClient — E198 wiring and placement', () => {
  const src = stripComments(read('app/mods/[id]/ModDetailClient.tsx'));

  it('imports the component, the visibility helper and the memory helpers (vacuity guard)', () => {
    expect(src).toMatch(/from ['"]@\/components\/ConnectEmailOptIn['"]/);
    expect(src).toContain('shouldShowMemberOptIn(');
    expect(src).toContain('readMemberOptInMemory(');
    expect(src).toContain('rememberMemberOptIn(');
  });

  it('renders it exactly once, gated on the helper, after SaveFindsOffer and before the first mv-ads element and the aside', () => {
    expect((src.match(/<ConnectEmailOptIn\b/g) ?? []).length).toBe(1);
    const optIn = src.indexOf('<ConnectEmailOptIn');
    const offer = src.indexOf('<SaveFindsOffer');
    // The first `.mv-ads` *element in JSX order* inside the main component, not the
    // InContentAd helper's own definition near the top of the file.
    const mainStart = src.indexOf('export default function ModDetailClient');
    const inContentAd = src.indexOf('<InContentAd', mainStart);
    const wrapper = src.indexOf('className="mv-ads space-y-6', mainStart);
    const aside = src.indexOf('<aside', mainStart);
    expect(offer).toBeGreaterThan(0);
    expect(optIn).toBeGreaterThan(offer);
    expect(inContentAd).toBeGreaterThan(0);
    expect(optIn).toBeLessThan(inContentAd);
    expect(optIn).toBeLessThan(wrapper);
    expect(optIn).toBeLessThan(aside);
    const gate = src.lastIndexOf('showMemberOptIn', optIn);
    expect(gate).toBeGreaterThan(0);
    expect(optIn - gate).toBeLessThan(160);
  });

  it('passes the session address and its own source; remembers every answer', () => {
    expect(src).toMatch(/<ConnectEmailOptIn\s+email=\{session\.user\.email\}/);
    expect(src).toMatch(/source=\{MEMBER_OPTIN_SOURCE\}/);
    expect(src).toMatch(/viewEvent=\{MEMBER_OPTIN_EVENTS\.view\}/);
    // Every answer goes through one callback that writes the store; "Not now" passes 'dismissed'.
    expect(src).toMatch(/rememberMemberOptIn\([^;]*\bvalue\)/);
    expect(src).toMatch(/onDismiss=\{\(\) => rememberMemberAnswer\('dismissed'\)\}/);
    expect(src).toMatch(/onResult=\{rememberMemberAnswer\}/);
  });

  it('reads storage only after mount (no first-paint guess) and never fires a request on view', () => {
    // The memory is read inside an effect, never during render.
    const effectRead = src.indexOf('readMemberOptInMemory(');
    const effectStart = src.lastIndexOf('useEffect(', effectRead);
    expect(effectStart).toBeGreaterThan(0);
    expect(effectRead - effectStart).toBeLessThan(300);
  });
});
