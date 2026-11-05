/**
 * Viewer denominator for every NewsletterSignup form (Cass, E341, 2026-11-05).
 *
 * B1 grades copy tests on "subscribers per 1k viewers of that surface", and
 * the shared typed-email form fired no view event, so footer / home-hero /
 * collection-page / creator-page / creator-hub had no denominator.
 *
 * What this protects:
 *   1. The view fires once, only when the form is >= half visible, with the
 *      surface's own `source` (the waitlist.source join key).
 *   2. Nothing is POSTed on view.
 *   3. Every <NewsletterSignup> call site passes a literal source, so each
 *      surface reads alone (scanner with a vacuity guard).
 *   4. The scoreboard pulls the event (guards the imported constant).
 *
 * Red against pre-E341 origin/main (3ac8328): `lib/capture/newsletterFormView`
 * does not exist, so the whole file fails at import; with only the lib added,
 * the origin/main component fails 5 of 9 (every view case + the ref check).
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import {
  NEWSLETTER_FORM_VIEW_EVENT,
  NEWSLETTER_FORM_VIEW_THRESHOLD,
  isFormViewed,
  subscribersPer1kViewers,
} from '../../lib/capture/newsletterFormView';
import { NewsletterSignup } from '../../components/NewsletterSignup';

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const stripComments = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

type ObserverCb = (entries: Array<{ isIntersecting: boolean; intersectionRatio: number }>) => void;
let observers: Array<{ cb: ObserverCb; disconnect: ReturnType<typeof vi.fn>; options?: IntersectionObserverInit }>;
let gtag: ReturnType<typeof vi.fn>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  observers = [];
  class FakeObserver {
    disconnect = vi.fn();
    constructor(cb: ObserverCb, options?: IntersectionObserverInit) {
      observers.push({ cb, disconnect: this.disconnect, options });
    }
    observe() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  gtag = vi.fn();
  (window as unknown as { gtag: unknown }).gtag = gtag;
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete (window as unknown as { gtag?: unknown }).gtag;
});

describe('isFormViewed / subscribersPer1kViewers', () => {
  it('needs an intersecting entry at or above the threshold', () => {
    expect(NEWSLETTER_FORM_VIEW_THRESHOLD).toBe(0.5);
    expect(isFormViewed([{ isIntersecting: true, intersectionRatio: 0.5 }])).toBe(true);
    expect(isFormViewed([{ isIntersecting: true, intersectionRatio: 0.49 }])).toBe(false);
    expect(isFormViewed([{ isIntersecting: false, intersectionRatio: 1 }])).toBe(false);
    expect(isFormViewed([])).toBe(false);
  });

  it('never divides by zero into a number', () => {
    expect(subscribersPer1kViewers(3, 1500)).toBe(2);
    expect(subscribersPer1kViewers(3, 0)).toBeNull();
    expect(subscribersPer1kViewers(null, 10)).toBeNull();
    expect(subscribersPer1kViewers(1, null)).toBeNull();
  });
});

describe('NewsletterSignup view event', () => {
  const viewCalls = () => gtag.mock.calls.filter((c) => c[1] === NEWSLETTER_FORM_VIEW_EVENT);

  for (const variant of ['default', 'strip'] as const) {
    it(`fires once, at >= half visible, with the source (${variant})`, () => {
      render(<NewsletterSignup source="collection-page" variant={variant} />);
      expect(observers).toHaveLength(1);
      expect(observers[0].options?.threshold).toBe(NEWSLETTER_FORM_VIEW_THRESHOLD);

      act(() => observers[0].cb([{ isIntersecting: true, intersectionRatio: 0.2 }]));
      expect(viewCalls()).toHaveLength(0);

      act(() => observers[0].cb([{ isIntersecting: true, intersectionRatio: 0.8 }]));
      act(() => observers[0].cb([{ isIntersecting: true, intersectionRatio: 1 }]));
      expect(viewCalls()).toEqual([['event', NEWSLETTER_FORM_VIEW_EVENT, { source: 'collection-page' }]]);
      expect(observers[0].disconnect).toHaveBeenCalled();
    });
  }

  it('sends nothing to the waitlist on view', () => {
    render(<NewsletterSignup source="footer" />);
    act(() => observers[0].cb([{ isIntersecting: true, intersectionRatio: 1 }]));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(gtag.mock.calls.some((c) => c[1] === 'newsletter_signup')).toBe(false);
  });

  it('defaults to the footer source', () => {
    render(<NewsletterSignup />);
    act(() => observers[0].cb([{ isIntersecting: true, intersectionRatio: 1 }]));
    expect(viewCalls()).toEqual([['event', NEWSLETTER_FORM_VIEW_EVENT, { source: 'footer' }]]);
  });
});

describe('call sites and scoreboard', () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(join(ROOT, dir))) {
      const rel = join(dir, name);
      if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
      else if (rel.endsWith('.tsx')) out.push(rel);
    }
    return out;
  }

  it('every <NewsletterSignup> passes its own source', () => {
    const sites: string[] = [];
    for (const rel of [...walk('app'), ...walk('components')]) {
      const src = stripComments(read(rel));
      const re = /<NewsletterSignup\b([^>]*)\/?>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        sites.push(rel);
        expect(m[1], `${rel} renders NewsletterSignup without a source`).toMatch(/\bsource=/);
      }
    }
    // Vacuity guard: 6 call sites on 11-05 (two footers, home, collection, creator, creator hub).
    expect(sites.length).toBeGreaterThanOrEqual(5);
  });

  it('the scoreboard pulls the view event', () => {
    const src = stripComments(read('scripts/agents/funnel-scoreboard.ts'));
    expect(src).toContain(`'${NEWSLETTER_FORM_VIEW_EVENT}'`);
  });

  it('the component observes the form only, never an ad anchor', () => {
    const src = stripComments(read('components/NewsletterSignup.tsx'));
    expect(src).not.toMatch(/mv-ads|secondary|mediavine/i);
    expect(src.match(/ref=\{formRef\}/g)).toHaveLength(2);
  });
});
