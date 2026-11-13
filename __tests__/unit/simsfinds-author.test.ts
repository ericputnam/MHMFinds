import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { SIMSFINDS_HOSTS, simsfindsAuthorFromHtml, simsfindsDownloadId } from '../../lib/services/simsfindsAuthor';
import {
  MAX_SIMSFINDS_BACKFILL_ROWS,
  parsePlanName,
  planRow,
  rollbackable,
  stillApplicable,
  targetDownloadId,
  unknownFlags,
  type SimsfindsRow,
  type SimsfindsSetDecision,
} from '../../scripts/agents/simsfinds-author-backfill-lib';

// Trimmed from real pages fetched 2026-11-13 (downloads/320196 by-creator, downloads/319108 re-upload).
const ld = (o: unknown) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
const byCreator = (author: unknown, flag = '1') =>
  `<div id="download" data-creator-id="722961" data-item-id="320196"></div>` +
  ld({ '@type': 'BreadcrumbList' }) +
  ld({ '@type': 'CreativeWork', name: 'Future Fit', author }) +
  `<sfpdata name="page:extra" data-bycreator="${flag}"></sfpdata>`;

describe('simsfindsDownloadId', () => {
  it('accepts /downloads/<id>/ on the exact hosts only', () => {
    expect(simsfindsDownloadId('https://www.simsfinds.com/downloads/320196/future-fit-sims4')).toBe('320196');
    expect(simsfindsDownloadId('https://simsfinds.com/downloads/224435/x?recommended=1')).toBe('224435');
    expect(simsfindsDownloadId('https://www.simsfinds.com.evil.example/downloads/1/x')).toBeNull();
    expect(simsfindsDownloadId('https://evilsimsfinds.com/downloads/1/x')).toBeNull();
    expect(simsfindsDownloadId('https://www.simsfinds.com/creators/abc')).toBeNull();
    expect(simsfindsDownloadId('ftp://www.simsfinds.com/downloads/1/x')).toBeNull();
    expect(simsfindsDownloadId('not a url')).toBeNull();
    expect(simsfindsDownloadId(null)).toBeNull();
    expect(SIMSFINDS_HOSTS.has('www.simsfinds.com')).toBe(true);
  });
});

describe('simsfindsAuthorFromHtml', () => {
  it('returns the single JSON-LD Person on a by-creator page', () => {
    expect(simsfindsAuthorFromHtml(byCreator({ '@type': 'Person', name: 'polygoncouture' }))).toEqual({ kind: 'found', author: 'polygoncouture' });
  });
  it('refuses a re-upload even if an author is present', () => {
    expect(simsfindsAuthorFromHtml(byCreator({ '@type': 'Person', name: 'uploader' }, '0'))).toEqual({ kind: 'skip', reason: 'not-by-creator' });
  });
  it('refuses a page with no by-creator flag at all', () => {
    expect(simsfindsAuthorFromHtml(ld({ author: { name: 'x' } }))).toEqual({ kind: 'skip', reason: 'not-by-creator' });
  });
  it('never reads the "-by-<name>-" URL/title text', () => {
    const html = `<title>Bluff Tongue Piercings by pralinesims</title>` + `<sfpdata data-bycreator="1"></sfpdata>` + ld({ '@type': 'Offer' });
    expect(simsfindsAuthorFromHtml(html)).toEqual({ kind: 'skip', reason: 'no-author' });
  });
  it('skips two distinct authors, folds case-only duplicates', () => {
    expect(simsfindsAuthorFromHtml(byCreator([{ name: 'a1' }, { name: 'b2' }]))).toEqual({ kind: 'skip', reason: 'multi-author' });
    expect(simsfindsAuthorFromHtml(byCreator({ name: 'RedHeadSims' }) + ld({ author: { name: 'redheadsims' } })).kind).toBe('found');
  });
  it('skips a platform or junk name', () => {
    expect(simsfindsAuthorFromHtml(byCreator({ name: 'Simsfinds' }))).toEqual({ kind: 'skip', reason: 'author-unusable' });
  });
  it('survives malformed JSON-LD', () => {
    const html = `<sfpdata data-bycreator="1"></sfpdata><script type="application/ld+json">{oops</script>` + ld({ author: { name: 'lumysims' } });
    expect(simsfindsAuthorFromHtml(html)).toEqual({ kind: 'found', author: 'lumysims' });
  });
});

const row = (over: Partial<SimsfindsRow> = {}): SimsfindsRow => ({
  id: 'm1',
  title: 'Future Fit',
  author: 'Simsfinds',
  downloadUrl: 'https://www.simsfinds.com/downloads/320196/future-fit-sims4',
  ...over,
});

describe('planRow', () => {
  it('sets only unusable-author Simsfinds rows', () => {
    expect(planRow(row(), { kind: 'found', author: 'polygoncouture' })).toMatchObject({ action: 'set', prior: 'Simsfinds', next: 'polygoncouture', downloadId: '320196' });
    expect(planRow(row({ author: null }), { kind: 'found', author: 'x1x' })).toMatchObject({ action: 'set', prior: null });
    expect(planRow(row({ author: 'Real Creator' }), { kind: 'found', author: 'x' })).toMatchObject({ action: 'skip', reason: 'has-author' });
    expect(planRow(row({ downloadUrl: 'https://simfileshare.net/download/1/' }), undefined)).toMatchObject({ action: 'skip', reason: 'not-simsfinds' });
    expect(planRow(row(), { kind: 'unreachable', detail: 'HTTP 503' })).toMatchObject({ action: 'skip', reason: 'unreachable' });
    expect(planRow(row(), { kind: 'skip', reason: 'not-by-creator' })).toMatchObject({ action: 'skip', reason: 'not-by-creator' });
    expect(targetDownloadId(row({ author: 'Real Creator' }))).toBeNull();
    expect(targetDownloadId(row())).toBe('320196');
  });
});

describe('apply / rollback guards', () => {
  const d: SimsfindsSetDecision = { id: 'm1', action: 'set', downloadId: '1', prior: 'Simsfinds', next: 'polygoncouture', title: 't' };
  it('applies only where the live author still equals the prior', () => {
    expect(stillApplicable([d], new Map([['m1', 'Simsfinds']])).apply).toHaveLength(1);
    expect(stillApplicable([d], new Map([['m1', 'Hand Fixed']])).drifted).toEqual(['m1']);
    expect(stillApplicable([d], new Map()).drifted).toEqual(['m1']);
  });
  it('rolls back only rows still holding what we wrote', () => {
    expect(rollbackable([d], new Map([['m1', 'polygoncouture']]))).toHaveLength(1);
    expect(rollbackable([d], new Map([['m1', 'Someone Else']]))).toHaveLength(0);
  });
  it('plan name is a dated basename; unknown flags refused; cap within Tier 0', () => {
    expect(parsePlanName(['--plan=simsfinds-authors-2026-11-13.json'])).toBe('simsfinds-authors-2026-11-13.json');
    expect(parsePlanName(['--plan=../x.json'])).toBe('');
    expect(parsePlanName([])).toBeNull();
    expect(unknownFlags(['--apply', '--aply', '--plan=x'])).toEqual(['--aply']);
    expect(MAX_SIMSFINDS_BACKFILL_ROWS).toBeLessThanOrEqual(5000);
  });
});

describe('ingest wiring (mhmScraper)', () => {
  // Strip comments first: the comments name the patterns on purpose.
  const src = readFileSync(resolve(__dirname, '../../lib/services/mhmScraper.ts'), 'utf8')
    // Whole-line comments only: a string like 'image/webp,*/*;q=0.8' would fool a naive block-comment strip.
    .replace(/^\s*\/\*[\s\S]*?\*\/\s*$/gm, '')
    .replace(/^\s*(\/\/|\*).*$/gm, '');
  it('scrapes Simsfinds pages through the shared extractor', () => {
    expect(src).toMatch(/simsfindsAuthorFromHtml\(response\.data\)/);
  });
  it('never takes "Simsfinds" from the URL host', () => {
    const urlFn = src.slice(src.indexOf('private extractAuthorFromUrl'), src.indexOf('private titleCase'));
    const sf = urlFn.indexOf('SIMSFINDS_HOSTS.has(hostname)');
    const generic = urlFn.indexOf("hostname.split('.')[0]");
    expect(sf).toBeGreaterThan(-1);
    expect(sf).toBeLessThan(generic);
  });
});
