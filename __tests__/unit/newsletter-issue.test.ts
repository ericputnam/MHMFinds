/**
 * Newsletter issue template tests (Cass, 2026-09-13, E44)
 *
 * Offline. Guards the operator's design rules for the site-styled issue
 * ("I HATE gradients or AI looking things" — 2026-09-12) at the source level
 * and in the rendered output, plus the compliance invariants the template
 * must keep so `sendBulk`'s guards still pass: per-recipient unsubscribe link
 * in the body, CAN-SPAM postal address in the body, no hidden preheader.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: { notificationLog: { create: vi.fn() } },
  default: { notificationLog: { create: vi.fn() } },
}));

import {
  ALLOWED_IMAGE_HOSTS,
  ISSUE_01,
  formatCount,
  isAllowedImageUrl,
  renderIssue,
  renderIssueHtml,
  type IssueData,
} from '@/lib/services/newsletterIssue';
import { previewBulkSend, sendBulk } from '@/lib/services/bulkMailer';

const ROOT = join(__dirname, '..', '..');
const readSource = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
/** Source with block and line comments removed, so the rules are checked against code, not prose. */
const readCode = (rel: string) =>
  readSource(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const CTX = {
  unsubscribeUrl: 'https://musthavemods.com/api/unsubscribe/?e=abc&t=def',
  postalAddress: 'MustHaveMods, PO Box 1, Town, ST 00000',
};

// Emoji and pictographs; the template must contain none (operator rule).
// ES5-safe (no `u` flag): surrogate pairs cover U+1F000–U+1FAFF; BMP ranges cover misc symbols.
const EMOJI_RE = /[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2600-\u27BF]|\uFE0F/;

describe('design rules the operator set (source level)', () => {
  const src = readCode('lib/services/newsletterIssue.ts');

  it('has no gradients anywhere', () => {
    expect(src).not.toMatch(/linear-gradient|radial-gradient|conic-gradient/i);
  });

  it('has no glow: no box-shadow, text-shadow or filter blur', () => {
    expect(src).not.toMatch(/box-shadow|text-shadow|filter\s*:\s*blur|backdrop-filter/i);
  });

  it('has no pill buttons: every border-radius is at most 4px', () => {
    const radii = Array.from(src.matchAll(/border-radius\s*:\s*([0-9.]+)(px|em|rem|%)/gi));
    expect(radii.length).toBeGreaterThan(0);
    for (const [, n, unit] of radii) {
      expect(unit).toBe('px');
      expect(Number(n)).toBeLessThanOrEqual(4);
    }
    expect(src).not.toMatch(/border-radius\s*:\s*(999|9999|50%)/);
  });

  it('has no emoji', () => {
    expect(EMOJI_RE.test(src)).toBe(false);
  });

  it('has no hidden preheader (SpamAssassin FONT_INVIS_MSGID cost 2.5 points on 09-08)', () => {
    expect(src).not.toMatch(/display\s*:\s*none/i);
    expect(src).not.toMatch(/max-height\s*:\s*0/i);
    expect(src).not.toMatch(/preheader/i);
  });

  it('never hardcodes a postal address — it comes from the render context', () => {
    expect(src).not.toMatch(/\bLLC\b|PO Box|Purcellville|\bSte\b/);
    expect(src).not.toMatch(/process\.env/);
  });

  it('is pure: no network, no DB, no env reads', () => {
    expect(src).not.toMatch(/@\/lib\/prisma|from '\.\.\/prisma'|fetch\(|process\.env/);
  });
});

describe('renderIssue output', () => {
  const { subject, html, text } = renderIssue(ISSUE_01, CTX);

  it('renders the unsubscribe link raw (bulkMailer checks a raw includes; real URLs carry &) and the postal address', () => {
    expect(html).toContain(CTX.unsubscribeUrl);
    expect(html).toContain('href="' + CTX.unsubscribeUrl + '"');
    expect(text).toContain(CTX.unsubscribeUrl);
    expect(html).toContain(CTX.postalAddress);
    expect(text).toContain(CTX.postalAddress);
    expect(subject.length).toBeGreaterThan(10);
  });

  it('omits the postal line when the address is empty, and never fakes one', () => {
    const out = renderIssue(ISSUE_01, { ...CTX, postalAddress: '' });
    expect(out.html).not.toMatch(/\[[^\]]*address[^\]]*\]/i);
    expect(out.text).not.toMatch(/\[[^\]]*address[^\]]*\]/i);
    expect(out.html).toContain('Unsubscribe');
  });

  it('is under Gmail’s 102 KB clip and uses a table layout with role="presentation"', () => {
    expect(Buffer.byteLength(html, 'utf8')).toBeLessThan(100 * 1024);
    expect(html).toMatch(/<table role="presentation"/);
    expect(html).not.toMatch(/<style/i);
  });

  it('gives every image alt text and loads only from our hosts over https', () => {
    const imgs = Array.from(html.matchAll(/<img\b[^>]*>/g)).map((m) => m[0]);
    expect(imgs.length).toBe(ISSUE_01.posts.length + ISSUE_01.saved.length);
    for (const tag of imgs) {
      expect(tag).toMatch(/\balt="[^"]+"/);
      const src = tag.match(/\bsrc="([^"]+)"/)?.[1] ?? '';
      expect(isAllowedImageUrl(src)).toBe(true);
    }
  });

  it('uses WP resized variants so total image weight stays small', () => {
    expect(ISSUE_01.posts[0].image).toMatch(/-768x512\.(jpg|jpeg|png)$/);
    for (const p of ISSUE_01.posts.slice(1)) expect(p.image).toMatch(/-300x200\.(jpg|jpeg|png)$/);
    for (const m of ISSUE_01.saved) expect(m.image).toMatch(/-150x150\.(jpg|jpeg|png)$/);
  });

  it('numbers the list from 02 and shows the issue number and date', () => {
    expect(html).toContain('01 &nbsp;&middot;&nbsp; New this week');
    expect(html).toContain('>02<');
    expect(html).toContain(`>0${ISSUE_01.posts.length}<`);
    expect(html).toContain('Issue 01 &nbsp;&middot;&nbsp; September 14, 2026');
  });

  it('has exactly one solid button and no gradients, glow or emoji in the output', () => {
    expect(html).not.toMatch(/gradient|box-shadow|text-shadow/i);
    expect(EMOJI_RE.test(html)).toBe(false);
    expect(EMOJI_RE.test(text)).toBe(false);
    const buttons = html.match(/background:#EC4899;color:#ffffff/g) ?? [];
    expect(buttons.length).toBe(1);
  });

  it('escapes HTML in data', () => {
    const issue: IssueData = { ...ISSUE_01, intro: 'a <b> & "c"' };
    const out = renderIssueHtml(issue, CTX);
    expect(out).toContain('a &lt;b&gt; &amp; &quot;c&quot;');
    expect(out).not.toContain('a <b> &');
  });

  it('formats counts with US separators regardless of locale', () => {
    expect(formatCount(16409)).toBe('16,409');
    expect(formatCount(922)).toBe('922');
    expect(formatCount(1234567)).toBe('1,234,567');
    expect(html).toContain('16,409');
  });

  it('refuses an image from any other host, and a missing unsubscribe link', () => {
    const bad: IssueData = {
      ...ISSUE_01,
      posts: [{ ...ISSUE_01.posts[0], image: 'https://example.com/x-768x512.jpg' }, ...ISSUE_01.posts.slice(1)],
    };
    expect(() => renderIssueHtml(bad, CTX)).toThrow(/example\.com|must be an https URL/);
    expect(() => renderIssueHtml(ISSUE_01, { ...CTX, unsubscribeUrl: '' })).toThrow(/unsubscribeUrl/);
    expect(ALLOWED_IMAGE_HOSTS).toEqual(['blog.musthavemods.com', 'musthavemods.com']);
    expect(isAllowedImageUrl('http://blog.musthavemods.com/a.jpg')).toBe(false);
  });
});

describe('through bulkMailer', () => {
  const ORIGINAL_ENV = { ...process.env };
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'test-signing-key-not-a-real-secret';
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('passes the dry-run guards (unsubscribe link present, no placeholder)', async () => {
    const r = await previewBulkSend({
      recipients: ['preview@example.com'],
      site: 'https://musthavemods.com',
      postalAddress: CTX.postalAddress,
      build: ({ unsubscribeUrl }) =>
        renderIssue(ISSUE_01, { unsubscribeUrl, postalAddress: CTX.postalAddress }),
    });
    expect(r.attempted).toBe(1);
    expect(r.results[0].preview?.html).toContain('/api/unsubscribe/?');
    expect(r.results[0].headers['List-Unsubscribe']).toContain('/api/unsubscribe/?');
    expect(r.postalAddress).toBe(CTX.postalAddress);
  });

  it('is still refused by sendBulk on a real send when the postal address is missing from the body', async () => {
    process.env.SMTP_HOST = 'smtp.example.test';
    const send = vi.fn(async () => true);
    await expect(
      sendBulk({
        recipients: ['a@example.com'],
        dryRun: false,
        send,
        postalAddress: CTX.postalAddress,
        // Renders with an empty address on purpose: the library must catch it.
        build: ({ unsubscribeUrl }) => renderIssue(ISSUE_01, { unsubscribeUrl, postalAddress: '' }),
      })
    ).rejects.toThrow(/does not contain the postal address/);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('the shipped scripts use the template', () => {
  it('newsletter-send-test.ts renders issue #1 via renderIssue with the env postal address', () => {
    const src = readSource('scripts/agents/newsletter-send-test.ts');
    expect(src).toMatch(/renderIssue\(ISSUE_01,/);
    expect(src).toMatch(/resolvePostalAddress\(\)/);
    expect(src).not.toMatch(/function issueHtml\(/);
  });

  it('newsletter-preview.ts --out renders the same template', () => {
    const src = readSource('scripts/agents/newsletter-preview.ts');
    expect(src).toMatch(/renderIssue\(ISSUE_01,/);
    expect(src).toMatch(/--out/);
  });
});
