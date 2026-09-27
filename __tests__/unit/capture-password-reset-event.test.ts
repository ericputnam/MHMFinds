/**
 * GA4 `password_reset_complete` on /set-password/ success (Cass, E123).
 *
 * E39 (forgot/reset password) could not be graded: the reset token row is
 * deleted on consume and nothing fired in GA4, so a completed reset left no
 * trace. These guard that:
 *  - the helper fires exactly the exported event name, with no PII params,
 *  - it no-ops without gtag (SSR, ad blocker) and never throws,
 *  - the page calls it in the success branch only, before the done state.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

import {
  PASSWORD_RESET_COMPLETE_EVENT,
  trackPasswordResetComplete,
} from '@/lib/analytics/gtag';

const PAGE = 'app/set-password/page.tsx';
const read = (rel: string) => readFileSync(path.resolve(process.cwd(), rel), 'utf8');
// Comments in this repo quote the patterns they describe; strip before asserting.
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const g = globalThis as unknown as { window?: { gtag?: (...a: unknown[]) => void } };

afterEach(() => {
  delete g.window;
});

describe('trackPasswordResetComplete', () => {
  it('uses the event name the ideas-inbox item and the E39 read ask for', () => {
    expect(PASSWORD_RESET_COMPLETE_EVENT).toBe('password_reset_complete');
  });

  it('fires the exported event once, with no email, token or user id', () => {
    const gtag = vi.fn();
    g.window = { gtag };
    trackPasswordResetComplete();
    expect(gtag).toHaveBeenCalledTimes(1);
    const [kind, name, params] = gtag.mock.calls[0];
    expect(kind).toBe('event');
    expect(name).toBe(PASSWORD_RESET_COMPLETE_EVENT);
    expect(Object.keys(params as object)).toEqual(['method']);
    expect(JSON.stringify(params)).not.toMatch(/@|token|email|user/i);
  });

  it('no-ops during SSR and when gtag is missing', () => {
    expect(() => trackPasswordResetComplete()).not.toThrow();
    g.window = {};
    expect(() => trackPasswordResetComplete()).not.toThrow();
  });

  it('never throws when gtag itself throws', () => {
    g.window = {
      gtag: () => {
        throw new Error('blocked');
      },
    };
    expect(() => trackPasswordResetComplete()).not.toThrow();
  });
});

describe('/set-password/ page wiring', () => {
  const src = stripComments(read(PAGE));

  it('imports the helper from lib/analytics/gtag', () => {
    expect(src).toMatch(
      /import\s*\{[^}]*\btrackPasswordResetComplete\b[^}]*\}\s*from\s*'@\/lib\/analytics\/gtag'/
    );
  });

  it('calls it exactly once, inside the success branch, before setDone(true)', () => {
    const calls = src.match(/trackPasswordResetComplete\(\)/g) ?? [];
    expect(calls).toHaveLength(1);

    const success = src.indexOf('if (res.ok && data.success)');
    const elseBranch = src.indexOf('} else {', success);
    const call = src.indexOf('trackPasswordResetComplete()');
    const done = src.indexOf('setDone(true)', success);
    expect(success).toBeGreaterThan(-1);
    expect(call).toBeGreaterThan(success);
    expect(call).toBeLessThan(done);
    expect(call).toBeLessThan(elseBranch);
  });
});
