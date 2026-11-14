/**
 * E305 (Cass, 2026-10-31) — copy split-test on the post-Patreon-connect email
 * opt-in on /go (E173). 52 of the 102 accounts created 10-24→10-30 came from
 * Patreon OAuth and 1 of them is subscribed; this offer converted 3 of 77
 * viewers. The test isolates copy (offer quality, the B1 kill rule).
 *
 * What this protects:
 *   1. Assignment is stable per address (trim/case-insensitive) and splits a
 *      large sample close to 50/50 — an arm that never fires reads as a loss.
 *   2. Attribution: arm `a` keeps E173's source (the series does not break),
 *      arm `b` has its own, distinct from every other waitlist source.
 *   3. Truth: neither arm promises a weekly email (E184 → biweekly).
 *   4. The component renders the arm's copy and posts the arm's source on
 *      both the view and the conversion.
 *   5. GoClient passes the arm's source *and* copy together.
 *
 * Red against origin/main d6a86c59: the E305 exports do not exist, so the
 * import fails the whole file.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  CONNECT_OPTIN_ARM_SOURCE,
  CONNECT_OPTIN_COPY,
  PATREON_CONNECT_OPTIN_EVENTS,
  PATREON_CONNECT_OPTIN_SOURCE,
  assignConnectOptInArm,
} from '../../lib/capture/patreonConnectOptIn';
import { ConnectEmailOptIn } from '../../components/ConnectEmailOptIn';

const ROOT = join(__dirname, '..', '..');
const stripComments = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('assignConnectOptInArm', () => {
  it('is stable and ignores case and surrounding space', () => {
    const a = assignConnectOptInArm('Simmer@Example.com');
    expect(assignConnectOptInArm('simmer@example.com')).toBe(a);
    expect(assignConnectOptInArm('  simmer@example.com ')).toBe(a);
  });

  it('splits 2,000 synthetic addresses within 45–55% and uses both arms', () => {
    let b = 0;
    for (let i = 0; i < 2000; i++) if (assignConnectOptInArm(`user${i}@example.test`) === 'b') b++;
    expect(b).toBeGreaterThan(900);
    expect(b).toBeLessThan(1100);
  });
});

describe('arm attribution and copy', () => {
  it('arm a keeps the E173 source; arm b is its own', () => {
    expect(CONNECT_OPTIN_ARM_SOURCE.a).toBe(PATREON_CONNECT_OPTIN_SOURCE);
    expect(CONNECT_OPTIN_ARM_SOURCE.b).not.toBe(CONNECT_OPTIN_ARM_SOURCE.a);
    expect(CONNECT_OPTIN_ARM_SOURCE.b).toMatch(/^[a-z-]+$/);
    const existing = [
      'signup-optin', 'footer', 'go-interstitial', 'collection-page', 'home-hero',
      'sign-in', 're-permission', 'mod-detail', 'mod-detail-optin', 'creator-page', 'creator-hub',
    ];
    expect(existing).not.toContain(CONNECT_OPTIN_ARM_SOURCE.b);
  });

  it('the arms differ in copy, and neither promises a weekly email', () => {
    expect(CONNECT_OPTIN_COPY.b.button).not.toBe(CONNECT_OPTIN_COPY.a.button);
    expect(CONNECT_OPTIN_COPY.b.body).not.toBe(CONNECT_OPTIN_COPY.a.body);
    for (const arm of ['a', 'b'] as const) {
      const text = Object.values(CONNECT_OPTIN_COPY[arm]).join(' ');
      expect(text).not.toMatch(/once a week|every week|weekly/i);
    }
  });
});

describe('ConnectEmailOptIn with arm b', () => {
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

  it('renders b copy and posts b source on view and conversion', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    render(
      <ConnectEmailOptIn
        email="simmer@example.com"
        modId="m1"
        source={CONNECT_OPTIN_ARM_SOURCE.b}
        copy={CONNECT_OPTIN_COPY.b}
      />
    );
    expect(gtag).toHaveBeenCalledWith('event', PATREON_CONNECT_OPTIN_EVENTS.view, {
      source: CONNECT_OPTIN_ARM_SOURCE.b,
      mod_id: 'm1',
    });
    expect(screen.getByText(CONNECT_OPTIN_COPY.b.lead!)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: CONNECT_OPTIN_COPY.b.button }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(CONNECT_OPTIN_COPY.b.subscribed));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      email: 'simmer@example.com',
      source: CONNECT_OPTIN_ARM_SOURCE.b,
    });
    expect(gtag).toHaveBeenCalledWith('event', 'newsletter_signup', {
      source: CONNECT_OPTIN_ARM_SOURCE.b,
      mod_id: 'm1',
    });
  });
});

describe('GoClient — E305 wiring', () => {
  const src = stripComments(readFileSync(join(ROOT, 'app/go/[modId]/GoClient.tsx'), 'utf8'));
  it('assigns the arm from the session address and passes source and copy together', () => {
    expect(src).toMatch(/assignConnectOptInArm\(session\.user\.email\)/);
    const at = src.indexOf('<ConnectEmailOptIn');
    expect(at).toBeGreaterThan(0);
    const tag = src.slice(at, src.indexOf('/>', at));
    expect(tag).toContain('source={CONNECT_OPTIN_ARM_SOURCE[connectOptInArm]}');
    expect(tag).toContain('copy={CONNECT_OPTIN_COPY[connectOptInArm]}');
  });
});
