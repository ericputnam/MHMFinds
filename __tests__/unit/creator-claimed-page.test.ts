/**
 * Claimed creators get a page below MIN_MODS_FOR_PAGE (creator onboarding,
 * 2026-10-18). doree claimed /creator/dor-e/ with 1 catalog mod, was
 * promoted, and still hit a 404 because every page needed 5 mods.
 */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

vi.mock('../../lib/prisma', () => ({ prisma: {}, default: {} }));

import { MIN_MODS_FOR_PAGE, creatorPageGate } from '../../lib/creators';

const ROOT = path.resolve(__dirname, '../..');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const read = (p: string) => stripComments(readFileSync(path.join(ROOT, p), 'utf8'));

describe('creatorPageGate', () => {
  it('unclaimed creators keep the MIN_MODS_FOR_PAGE rule', () => {
    expect(creatorPageGate(MIN_MODS_FOR_PAGE - 1, false)).toEqual({ render: false, indexable: false });
    expect(creatorPageGate(MIN_MODS_FOR_PAGE, false)).toEqual({ render: true, indexable: true });
  });

  it('a claimed creator gets a noindex page from their first mod', () => {
    expect(creatorPageGate(1, true)).toEqual({ render: true, indexable: false });
    expect(creatorPageGate(MIN_MODS_FOR_PAGE - 1, true)).toEqual({ render: true, indexable: false });
  });

  it('a claimed creator becomes indexable at MIN_MODS_FOR_PAGE', () => {
    expect(creatorPageGate(MIN_MODS_FOR_PAGE, true)).toEqual({ render: true, indexable: true });
  });

  it('no mods means no page, claimed or not', () => {
    expect(creatorPageGate(0, true).render).toBe(false);
    expect(creatorPageGate(0, false).render).toBe(false);
  });
});

describe('getCreatorPageData wiring', () => {
  const src = read('lib/creators.ts');

  it('only a verified real-account profile counts as claimed (placeholders do not)', () => {
    expect(src).toMatch(/claimed\s*=\s*Boolean\(profile && pageProfile\?\.isVerified\)/);
  });

  it('a claimed page also includes mods linked by creatorId', () => {
    expect(src).toMatch(/creatorId:\s*profile!\.id/);
  });

  it('the sitemap population (listCreators) still requires MIN_MODS_FOR_PAGE', () => {
    expect(src).toMatch(/HAVING SUM\(n\) >= \$\{MIN_MODS_FOR_PAGE\}/);
  });
});

describe('creator page metadata', () => {
  it('sets noindex when the page is not indexable', () => {
    const page = read('app/creator/[slug]/page.tsx');
    expect(page).toMatch(/data\.indexable \? \{\} : \{ robots: \{ index: false, follow: true \} \}/);
  });
});

describe('admin claims list', () => {
  const page = read('app/admin/creator-claims/page.tsx');

  it('fetches uncached and drops a reviewed claim immediately', () => {
    expect(page).toMatch(/fetch\('\/api\/admin\/creator-claims\/', \{ cache: 'no-store' \}\)/);
    expect(page).toMatch(/setClaims\(\(prev\) => prev\.filter\(\(c\) => c\.id !== claim\.id\)\)/);
  });
});
