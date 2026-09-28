import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SIMS4_COLLECTIONS, collectionHref, getCollectionsForGame } from '../../lib/collections';
import {
  AD_KINDS, classifyRender, pickCollectionPath, shouldRetryRender, type RenderFacts,
} from '../../scripts/agents/smoke-render-lib';

/**
 * E133: deploy-verify's smoke set had never rendered a `/games/sims-4/<slug>/` collection page. 2026-09-24
 * bedroom-cc served a 404 under a PASS ledger row; on 09-27 Rowan curled three by hand. The smoke now renders
 * one collection per run, rotated by UTC day across the LIVE registry (never a hand-written slug), graded on
 * the same Mediavine anchors as every other ad page, and a could-not-run reading on it stays INCONCLUSIVE (E111).
 */
const hrefs = getCollectionsForGame('sims-4').map(collectionHref);
const DAY = 86_400_000;
const src = readFileSync(join(__dirname, '../../scripts/agents/smoke-render.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''); // strip comments: they quote the patterns

describe('pickCollectionPath: one collection from the live registry', () => {
  it('the registry is not vacuous (≥ 20 sims-4 collections, every href canonical with a trailing slash)', () => {
    expect(hrefs.length).toBeGreaterThanOrEqual(20);
    expect(hrefs.length).toBe(SIMS4_COLLECTIONS.length);
    for (const h of hrefs) expect(h).toMatch(/^\/games\/sims-4\/[a-z0-9-]+\/$/);
  });
  it('always returns a path the registry has today', () => {
    for (let d = 0; d < 60; d++) expect(hrefs).toContain(pickCollectionPath(hrefs, new Date(Date.UTC(2026, 8, 28) + d * DAY)));
  });
  it('rotates: every collection is rendered within hrefs.length consecutive days', () => {
    const seen = new Set<string | null>();
    for (let d = 0; d < hrefs.length; d++) seen.add(pickCollectionPath(hrefs, new Date(Date.UTC(2026, 8, 28) + d * DAY)));
    expect(seen.size).toBe(hrefs.length);
  });
  it('is stable within a UTC day (morning check and after-merge verifies grade the same page)', () => {
    const a = pickCollectionPath(hrefs, new Date('2026-09-28T00:00:01Z'));
    expect(pickCollectionPath(hrefs, new Date('2026-09-28T23:59:59Z'))).toBe(a);
  });
  it('a renamed slug cannot leave it vacuous: it follows the list it is given; empty → null', () => {
    const renamed = ['/games/sims-4/renamed-cc/'];
    expect(pickCollectionPath(renamed, new Date())).toBe('/games/sims-4/renamed-cc/');
    expect(pickCollectionPath([], new Date())).toBeNull();
  });
});

describe('smoke-render.ts renders the collection and grades it as an ad page', () => {
  it('builds the target from the registry via collectionHref, not a literal slug', () => {
    expect(src).toMatch(/pickCollectionPath\(\s*getCollectionsForGame\('sims-4'\)\.map\(collectionHref\)\s*\)/);
    expect(src).toMatch(/kind:\s*'collection'/);
    for (const c of SIMS4_COLLECTIONS) expect(src).not.toContain(`/games/sims-4/${c.slug}`);
  });
  it('expectations() grades anchors by AD_KINDS, not a hand-written kind list', () => {
    expect(AD_KINDS.has('collection')).toBe(true);
    expect(src).toMatch(/const adPage = AD_KINDS\.has\(r\.kind\)/);
  });
});

describe('collection verdicts follow E111: positive evidence fails, could-not-run is inconclusive', () => {
  const base = { kind: 'collection' as const, appError: false, pageErrors: [] as string[], settledText: 1500 };
  const nav = ['navigation: page.goto: Timeout 45000ms exceeded.'];
  it('a 404 is positive evidence → fail', () => {
    const f: RenderFacts = { ...base, status: 404, ms: 900, textLength: 300, failures: ['HTTP 404', '.mv-ads in-content anchors missing'] };
    expect(classifyRender(f, { networkOk: true }).verdict).toBe('fail');
  });
  it('a fast, fully rendered 200 with no .mv-ads → fail', () => {
    const f: RenderFacts = { ...base, status: 200, ms: 8000, textLength: 4000, failures: ['.mv-ads in-content anchors missing'] };
    expect(classifyRender(f, { networkOk: true }).verdict).toBe('fail');
  });
  it('a navigation timeout is retried, and never fails while the network control is degraded or a direct fetch answers 200', () => {
    const f: RenderFacts = { ...base, status: null, ms: 71000, textLength: 0, pageErrors: nav, failures: ['HTTP no response (navigation: …)'] };
    expect(shouldRetryRender('collection', f.failures, f.pageErrors)).toBe(true);
    expect(classifyRender(f, { networkOk: false }).verdict).toBe('inconclusive');
    expect(classifyRender(f, { networkOk: true, probe: { status: 200, ms: 2500 } }).verdict).toBe('inconclusive');
  });
  it('a slow unsettled 200 is retried and inconclusive, not a rollback', () => {
    const f: RenderFacts = { ...base, status: 200, ms: 25000, textLength: 700, failures: ['.mv-ads in-content anchors missing'] };
    expect(shouldRetryRender('collection', f.failures, f.pageErrors, f)).toBe(true);
    expect(classifyRender(f, { networkOk: true }).verdict).toBe('inconclusive');
  });
});
