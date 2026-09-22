/**
 * Q13 (Pip, 2026-09-21) — reports/funnel/drafts/host-split-301-2026-09-21.md
 *
 * 31.7% of Pinterest sessions land on blog.musthavemods.com instead of the
 * apex (−19.5% pageviews/session on matched paths). The fix is a BigScoots
 * 301 from blog.* to the apex for direct/bot visitors, exempting requests
 * that arrive via this middleware's own server-to-server fetch — otherwise
 * every proxied page starts 301-ing to the apex, which Vercel routes right
 * back into this middleware's WordPress catch-all, which fetches blog.*
 * again: an infinite loop, not a single retry.
 *
 * This suite asserts the exemption signal exists and is stable *before* the
 * BigScoots rule is applied, so the rule can be written against a fact, not
 * a guess: every proxied fetch to blog.* carries `X-MHM-Proxy: nextjs-edge`,
 * on every method, and `redirect: 'follow'` is still set (so legitimate
 * WordPress-internal redirects — e.g. a slug change — keep working once the
 * host-split rule correctly exempts this header).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest } from 'next/server';

vi.mock('next-auth/jwt', () => ({ getToken: vi.fn() }));

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('the WordPress proxy identifies itself to blog.musthavemods.com', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    // A fresh Response per call — a Response body can only be read once, and
    // proxyAndRewriteWordPress calls .text() on it.
    fetchMock.mockImplementation(
      async () =>
        new Response('<html><head></head><body>wp</body></html>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        })
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends X-MHM-Proxy on a GET to a proxied article path', async () => {
    const { middleware } = await import('@/middleware');
    await middleware(new NextRequest('https://musthavemods.com/sims-4-belly-piercing/'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [target, init] = fetchMock.mock.calls[0];
    expect(String(target)).toContain('blog.musthavemods.com');
    const headers = init?.headers as Record<string, string>;
    expect(headers['X-MHM-Proxy']).toBe('nextjs-edge');
  });

  it('sends X-MHM-Proxy on a HEAD request too (the host-split rule scopes to GET/HEAD)', async () => {
    const { middleware } = await import('@/middleware');
    await middleware(
      new NextRequest('https://musthavemods.com/sims-4-eyebrows-cc/', { method: 'HEAD' })
    );

    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['X-MHM-Proxy']).toBe('nextjs-edge');
  });

  it('sends X-MHM-Proxy on category/tag/author archive proxies', async () => {
    const { middleware } = await import('@/middleware');
    for (const path of ['/category/hair-cc/', '/tag/hair/', '/author/writer/']) {
      fetchMock.mockClear();
      await middleware(new NextRequest(`https://musthavemods.com${path}`));
      const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers['X-MHM-Proxy']).toBe('nextjs-edge');
    }
  });

  it('still follows redirects (WordPress-internal ones stay unaffected once the exemption is honoured)', async () => {
    const { middleware } = await import('@/middleware');
    await middleware(new NextRequest('https://musthavemods.com/sims-4-cc-finds-2/'));

    const init = fetchMock.mock.calls[0][1];
    expect(init?.redirect).toBe('follow');
  });

  it('the header name and value are stable constants a nginx/PHP rule can be written against', () => {
    const mw = read('middleware.ts');
    expect(mw).toMatch(/MHM_PROXY_HEADER = 'X-MHM-Proxy'/);
    expect(mw).toMatch(/MHM_PROXY_HEADER_VALUE = 'nextjs-edge'/);
  });
});
