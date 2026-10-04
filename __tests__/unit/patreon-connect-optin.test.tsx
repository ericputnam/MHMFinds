/**
 * One-click weekly-email opt-in after Patreon connect on /go (Cass, E173,
 * 2026-10-04).
 *
 * Patreon OAuth created 66 of the 148 accounts since 09-23 and never showed
 * the sign-up form's opt-in (E86); 2 of those 66 are subscribed. E173 asks
 * once, with one click, when the visitor lands back on /go signed in.
 *
 * What this protects:
 *   1. Visibility: only a signed-in visitor carrying `?patreon=connected` and
 *      a usable session address — never signed out, never loading.
 *   2. Consent: nothing is sent on render; one click sends exactly the
 *      session's own address with this surface's own `source`.
 *   3. Attribution: `newsletter_signup` fires only for a NEW row, with the
 *      source; the source is distinct from every existing waitlist source.
 *   4. Placement: GoClient renders it once, before the `.mv-ads` wrapper
 *      opens (inside the mod card), never inside the wrapper or the aside;
 *      the component carries no ad-anchor token and no first-paint blocker.
 *
 * Red against pre-E173 origin/main (2491373): the module, the component and
 * the GoClient wiring do not exist, so every case fails there (the import of
 * `lib/capture/patreonConnectOptIn` alone fails the whole file).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  PATREON_CONNECT_OPTIN_ENDPOINT,
  PATREON_CONNECT_OPTIN_EVENTS,
  PATREON_CONNECT_OPTIN_SOURCE,
  interpretWaitlistResponse,
  shouldShowConnectOptIn,
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

describe('shouldShowConnectOptIn', () => {
  it('shows for a signed-in post-connect visitor with an address', () => {
    expect(
      shouldShowConnectOptIn({ postConnect: true, sessionStatus: 'authenticated', email: ADDR })
    ).toBe(true);
  });

  it('never shows without the marker, signed out, loading, or without a usable address', () => {
    expect(shouldShowConnectOptIn({ postConnect: false, sessionStatus: 'authenticated', email: ADDR })).toBe(false);
    expect(shouldShowConnectOptIn({ postConnect: true, sessionStatus: 'unauthenticated', email: ADDR })).toBe(false);
    expect(shouldShowConnectOptIn({ postConnect: true, sessionStatus: 'loading', email: ADDR })).toBe(false);
    expect(shouldShowConnectOptIn({ postConnect: true, sessionStatus: 'authenticated', email: null })).toBe(false);
    expect(shouldShowConnectOptIn({ postConnect: true, sessionStatus: 'authenticated', email: '' })).toBe(false);
    expect(shouldShowConnectOptIn({ postConnect: true, sessionStatus: 'authenticated', email: 'not-an-address' })).toBe(false);
  });
});

describe('interpretWaitlistResponse', () => {
  it('only a new row counts as subscribed', () => {
    expect(interpretWaitlistResponse(true, { success: true })).toBe('subscribed');
    expect(interpretWaitlistResponse(true, { success: true, alreadyExists: true })).toBe('already');
    expect(interpretWaitlistResponse(false, { success: false })).toBe('error');
    expect(interpretWaitlistResponse(true, null)).toBe('error');
    expect(interpretWaitlistResponse(true, { success: 'yes' })).toBe('error');
  });
});

describe('attribution constants', () => {
  it('source is its own, distinct from every existing waitlist source and capture ref', () => {
    const existing = [
      'signup-optin', 'footer', 'go-interstitial', 'collection-page', 'home-hero',
      'sign-in', 're-permission', 'mod-detail', 'creator-page', 'creator-hub',
      GO_SAVE_SOURCE, MOD_DETAIL_SAVE_SOURCE, MOD_DETAIL_FAVORITE_SOURCE,
    ];
    expect(existing).not.toContain(PATREON_CONNECT_OPTIN_SOURCE);
    expect(PATREON_CONNECT_OPTIN_SOURCE).toMatch(/^[a-z-]+$/);
  });

  it('view event is unique; the conversion is the shared newsletter_signup', () => {
    expect(PATREON_CONNECT_OPTIN_EVENTS.signup).toBe('newsletter_signup');
    expect(PATREON_CONNECT_OPTIN_EVENTS.view).toMatch(/^[a-z_]+$/);
    expect(['newsletter_signup', 'sign_up', 'favorite', 'patreon_post_connect_view']).not.toContain(
      PATREON_CONNECT_OPTIN_EVENTS.view
    );
  });

  it('posts to the trailing-slash waitlist endpoint', () => {
    expect(PATREON_CONNECT_OPTIN_ENDPOINT).toBe('/api/waitlist/');
  });
});

describe('ConnectEmailOptIn component', () => {
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

  it('sends nothing on render; fires only the view event, once', () => {
    render(<ConnectEmailOptIn email={ADDR} modId="m1" />);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith('event', PATREON_CONNECT_OPTIN_EVENTS.view, {
      source: PATREON_CONNECT_OPTIN_SOURCE,
      mod_id: 'm1',
    });
    expect(screen.getByText(ADDR)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('one click posts the session address with its source and fires newsletter_signup for a new row', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    render(<ConnectEmailOptIn email={ADDR} modId="m1" />);
    fireEvent.click(screen.getByRole('button', { name: /email me weekly/i }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/on the list/i));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(PATREON_CONNECT_OPTIN_ENDPOINT);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ email: ADDR, source: PATREON_CONNECT_OPTIN_SOURCE });
    expect(gtag).toHaveBeenCalledWith('event', 'newsletter_signup', {
      source: PATREON_CONNECT_OPTIN_SOURCE,
      mod_id: 'm1',
    });
  });

  it('an address already on the list does not fire the conversion', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, alreadyExists: true }) });
    render(<ConnectEmailOptIn email={ADDR} modId="m1" />);
    fireEvent.click(screen.getByRole('button', { name: /email me weekly/i }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/already on the list/i));
    expect(gtag.mock.calls.filter((c) => c[1] === 'newsletter_signup')).toHaveLength(0);
  });

  it('an error keeps the button and fires no conversion', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ success: false }) });
    render(<ConnectEmailOptIn email={ADDR} modId="m1" />);
    fireEvent.click(screen.getByRole('button', { name: /email me weekly/i }));
    await waitFor(() => expect(screen.getByText(/something went wrong/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /email me weekly/i })).toBeInTheDocument();
    expect(gtag.mock.calls.filter((c) => c[1] === 'newsletter_signup')).toHaveLength(0);
  });

  it('is inline in normal flow: no dialog, fixed or sticky, no ad-anchor token, no email input', () => {
    const src = stripComments(read('components/ConnectEmailOptIn.tsx'));
    expect(src.startsWith("'use client'")).toBe(true);
    expect(src).not.toMatch(/<dialog|role=["']dialog["']|position:\s*['"]?fixed/);
    expect(src).not.toMatch(/className=["'][^"']*\b(fixed|sticky)\b/);
    expect(src).not.toMatch(/\bmv-ads\b|mediavine|id=["']secondary["']/i);
    expect(src).not.toMatch(/type=["']email["']|type=["']checkbox["']/);
  });
});

describe('GoClient — E173 wiring and placement', () => {
  const src = stripComments(read('app/go/[modId]/GoClient.tsx'));

  it('imports the component and the visibility helper (vacuity guard)', () => {
    expect(src).toMatch(/from ['"]@\/components\/ConnectEmailOptIn['"]/);
    expect(src).toContain('shouldShowConnectOptIn(');
  });

  it('renders it exactly once, gated on the helper, before the mv-ads wrapper opens', () => {
    expect((src.match(/<ConnectEmailOptIn\b/g) ?? []).length).toBe(1);
    const optIn = src.indexOf('<ConnectEmailOptIn');
    const wrapperOpen = src.indexOf('className="mv-ads');
    const aside = src.indexOf('<aside');
    expect(wrapperOpen).toBeGreaterThan(0);
    expect(optIn).toBeGreaterThan(0);
    expect(optIn).toBeLessThan(wrapperOpen);
    expect(optIn).toBeLessThan(aside);
    const gate = src.lastIndexOf('showConnectOptIn', optIn);
    expect(gate).toBeGreaterThan(0);
    expect(optIn - gate).toBeLessThan(120);
  });

  it('passes the session address, never a typed or query value', () => {
    expect(src).toMatch(/<ConnectEmailOptIn\s+email=\{session\.user\.email\}/);
  });
});
