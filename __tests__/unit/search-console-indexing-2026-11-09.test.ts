/**
 * Search Console "New reasons prevent pages from being indexed" (2026-11-09):
 * Not found (404), Blocked due to access forbidden (403), Blocked due to
 * unauthorized request (401). Each assertion pins one cause found in the
 * report's example URLs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next-auth/jwt', () => ({ getToken: vi.fn() }));

function htmlResponse(body: string) {
  return new Response(`<html><head><title>t</title></head><body>${body}</body></html>`, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=UTF-8' },
  });
}

describe('robots.txt keeps crawlers off non-content WordPress URLs (403 / 401 / 404)', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    // The WordPress robots.txt is unreachable in production; the rules must
    // not depend on it.
    fetchMock.mockResolvedValue(new Response('not found', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  async function robots(): Promise<string> {
    const { GET } = await import('@/app/robots.txt/route');
    return (await GET()).text();
  }

  function group(content: string, agent: string): string[] {
    const blocks = content.split(/\n\s*\n/);
    const block = blocks.find((b) => b.split('\n')[0].trim() === `User-agent: ${agent}`);
    expect(block, `group for ${agent}`).toBeDefined();
    return block!.split('\n').map((l) => l.trim());
  }

  it.each(['*', 'GPTBot', 'Google-Extended'])('%s group disallows wp-admin, wp-json, patreon-flow and player assets', async (agent) => {
    const lines = group(await robots(), agent);
    for (const rule of [
      'Disallow: /wp-admin/',
      'Allow: /wp-admin/admin-ajax.php',
      'Disallow: /wp-json/',
      'Disallow: /patreon-flow/',
      'Disallow: /resource/video_files/',
      'Disallow: /assets/content/',
      'Disallow: /public/video/',
      'Disallow: /player?',
    ]) {
      expect(lines).toContain(rule);
    }
    // Content stays crawlable.
    expect(lines).toContain('Allow: /');
    expect(lines).not.toContain('Disallow: /');
  });

  it('still serves the parameter rules and the sitemap directive', async () => {
    const content = await robots();
    expect(content).toContain('Disallow: /*?creator=');
    expect(content).toContain('Sitemap: https://musthavemods.com/sitemap.xml');
  });
});

describe('middleware 308s URLs that 404d', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => htmlResponse('wp'));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['/home/', '/'],
    ['/category/', '/blog/'],
    ['/creator/gorillax3/', '/creator/gorilla-gorilla-gorilla/'],
  ])('%s → %s without touching WordPress', async (from, to) => {
    const { middleware } = await import('@/middleware');
    const res = await middleware(new NextRequest(`https://musthavemods.com${from}`));
    expect(res?.status).toBe(308);
    expect(new URL(res!.headers.get('location')!).pathname).toBe(to);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('leaves real category archives on the WordPress proxy', async () => {
    const { middleware } = await import('@/middleware');
    const res = await middleware(new NextRequest('https://musthavemods.com/category/sims-4-cc/'));
    expect(res?.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('proxied posts: links typed without https:// are made absolute', () => {
  const fetchMock = vi.fn();
  afterEach(() => vi.unstubAllGlobals());

  async function proxied(body: string): Promise<string> {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => htmlResponse(body));
    vi.stubGlobal('fetch', fetchMock);
    const { middleware } = await import('@/middleware');
    const res = await middleware(new NextRequest('https://musthavemods.com/gifts-for-gamer-boyfriend/'));
    return res!.text();
  }

  it('turns href="gtracing.sjv.io/MmdRkM" into an absolute https link', async () => {
    const html = await proxied(`<a href="gtracing.sjv.io/MmdRkM" rel="sponsored">Chair</a> <a href='www.example.com/x?y=1'>x</a>`);
    expect(html).toContain('href="https://gtracing.sjv.io/MmdRkM"');
    expect(html).toContain("href='https://www.example.com/x?y=1'");
  });

  it.each([
    'https://gtracing.sjv.io/MmdRkM',
    '/sims-4-cc/',
    '#top',
    '?s=hair',
    'mailto:a@b.co',
    'images/photo.jpg',
    'index.php/feed/',
    'page.html/',
    'NoNvme Studios',
  ])('leaves %s alone', async (href) => {
    const html = await proxied(`<a href="${href}">x</a>`);
    expect(html).toContain(`href="${href}"`);
  });
});
