/**
 * E267 (2026-10-25): /creator/[slug] title + meta description name the
 * creator's real content types and top mods instead of one boilerplate.
 *
 * Run red first against pre-fix origin/main: the source guard (section 4)
 * fails there — the page still carries the "(N) | MustHaveMods" title and
 * the "hair, clothes, furniture, gameplay and more" description.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CONTENT_TYPE_LABELS,
  MAX_TYPES,
  TITLE_MAX,
  creatorMetaDescription,
  creatorPageTitle,
  creatorTypeLabels,
  isGameplayCreator,
  joinNatural,
} from '@/lib/seo/creatorMeta';
import { META_DESCRIPTION_MAX } from '@/lib/seo/modMeta';

// Mirrors the top-48 mix of a real shoe creator (Madlen, 100 mods) on 2026-10-25.
function madlen() {
  const mods = [
    { title: '8 Allure Shoes Set', contentType: 'shoes', isFree: false },
    { title: 'Snugg Puff Set', contentType: 'shoes', isFree: true },
    { title: '6 Vault Shoes Set', contentType: 'shoes', isFree: false },
    ...Array.from({ length: 23 }, (_, i) => ({ title: `Shoe ${i}`, contentType: 'shoes', isFree: true })),
    ...Array.from({ length: 7 }, (_, i) => ({ title: `Top ${i}`, contentType: 'tops', isFree: true })),
    ...Array.from({ length: 4 }, (_, i) => ({ title: `Outfit ${i}`, contentType: 'full-body', isFree: true })),
    ...Array.from({ length: 3 }, (_, i) => ({ title: `Dress ${i}`, contentType: 'dresses', isFree: true })),
    { title: 'Untyped', contentType: null, isFree: true },
  ];
  return { displayName: 'Madlen', totalMods: 100, mods };
}

describe('creatorTypeLabels', () => {
  it('orders labels by frequency and skips null / unlabelled types', () => {
    expect(creatorTypeLabels(madlen().mods)).toEqual(['shoes', 'tops', 'outfits']);
    expect(creatorTypeLabels([{ title: 'a', contentType: 'royals' }, { title: 'b', contentType: null }])).toEqual([]);
  });

  it('caps at MAX_TYPES', () => {
    const mods = ['hair', 'tops', 'shoes', 'dresses', 'nails'].map((t) => ({ title: t, contentType: t }));
    expect(creatorTypeLabels(mods)).toHaveLength(MAX_TYPES);
  });

  it('every label is a lower-case noun phrase with no hyphen leaking through', () => {
    for (const [type, label] of Object.entries(CONTENT_TYPE_LABELS)) {
      expect(label, type).not.toMatch(/-/);
      expect(label, type).toMatch(/^[A-Za-z][A-Za-z ]*$/);
    }
  });
});

describe('joinNatural', () => {
  it('reads like prose', () => {
    expect(joinNatural([])).toBe('');
    expect(joinNatural(['shoes'])).toBe('shoes');
    expect(joinNatural(['shoes', 'tops'])).toBe('shoes and tops');
    expect(joinNatural(['shoes', 'tops', 'dresses'])).toBe('shoes, tops and dresses');
  });
});

describe('isGameplayCreator', () => {
  it('is true only when gameplay types are the majority of typed mods', () => {
    expect(isGameplayCreator([{ title: 'a', contentType: 'gameplay-mod' }, { title: 'b', contentType: 'hair' }])).toBe(false);
    expect(isGameplayCreator([{ title: 'a', contentType: 'gameplay-mod' }, { title: 'b', contentType: 'script-mod' }, { title: 'c', contentType: 'hair' }])).toBe(true);
    expect(isGameplayCreator([{ title: 'a', contentType: null }])).toBe(false);
  });
});

describe('creatorPageTitle', () => {
  it('keeps the exact-match lead and names the top content types', () => {
    expect(creatorPageTitle(madlen())).toBe('Madlen Sims 4 CC & Mods — Shoes, Tops & Outfits | MustHaveMods');
  });

  it('never ends in a bare count', () => {
    expect(creatorPageTitle(madlen())).not.toMatch(/\(\d+\)/);
  });

  it('drops types from the right until it fits TITLE_MAX, never cutting the lead', () => {
    // Three types would be 73 chars, two would be 66; one fits.
    const input = { ...madlen(), displayName: 'A Long Creator Name' };
    const title = creatorPageTitle(input);
    expect(title.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(title).toBe('A Long Creator Name Sims 4 CC & Mods — Shoes | MustHaveMods');
    // When even the lead overflows it is still never cut.
    const veryLong = { ...madlen(), displayName: 'An Even Longer Creator Display Name That Fills It' };
    expect(creatorPageTitle(veryLong)).toBe('An Even Longer Creator Display Name That Fills It Sims 4 CC & Mods | MustHaveMods');
  });

  it('calls a gameplay creator "Sims 4 Mods"', () => {
    const mods = [
      { title: 'Messy Relationships Mod', contentType: 'gameplay-mod', isFree: true },
      { title: 'Holiday Drama Mod', contentType: 'gameplay-mod', isFree: true },
      { title: 'Advent Hair', contentType: 'hair', isFree: true },
    ];
    expect(creatorPageTitle({ displayName: 'elle', totalMods: 3, mods })).toBe('elle Sims 4 Mods — Gameplay Mods & Hair | MustHaveMods');
  });

  it('falls back to the plain lead when no mod has a labelled type', () => {
    expect(creatorPageTitle({ displayName: 'Nobody', totalMods: 5, mods: [{ title: 'x', contentType: null }] }))
      .toBe('Nobody Sims 4 CC & Mods | MustHaveMods');
  });
});

describe('creatorMetaDescription', () => {
  it('names the count, the real types and the most-downloaded mods', () => {
    // All three titles would run to 158 chars, so the third is dropped whole.
    expect(creatorMetaDescription(madlen())).toBe(
      "Madlen's Sims 4 CC: 100 shoes, tops and outfits, ranked by downloads — 8 Allure Shoes Set, Snugg Puff Set and more. Every download link checked.",
    );
    expect(creatorMetaDescription(madlen()).length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
    expect(creatorMetaDescription(madlen())).not.toContain('6 Vault');
  });

  it('says "free" only when every listed mod is free', () => {
    const all = madlen();
    expect(creatorMetaDescription(all)).not.toMatch(/\bfree\b/);
    const free = { ...all, mods: all.mods.map((m) => ({ ...m, isFree: true })) };
    expect(creatorMetaDescription(free)).toMatch(/100 free shoes, tops and outfits/);
  });

  it('drops mod titles from the right rather than cutting one mid-word', () => {
    const long = {
      displayName: 'Severinka_',
      totalMods: 98,
      mods: [
        { title: 'Changing Tables and Baby Decor', contentType: 'furniture', isFree: true },
        { title: 'Bokhai Bedroom for Sims with Matching Dresser and Nightstands', contentType: 'furniture', isFree: true },
        { title: 'Atreya Dining Room Pt.1', contentType: 'furniture', isFree: true },
        { title: 'Lamp', contentType: 'decor', isFree: true },
      ],
    };
    const d = creatorMetaDescription(long);
    expect(d.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
    expect(d).toContain('Changing Tables and Baby Decor and more.');
    expect(d).not.toContain('Bokhai');
    expect(d.endsWith('Every download link checked.')).toBe(true);
  });

  it('still ends cleanly when even one title will not fit', () => {
    const d = creatorMetaDescription({
      displayName: 'Someone With A Very Very Long Display Name Indeed',
      totalMods: 7,
      mods: [{ title: 'X'.repeat(120), contentType: 'hair', isFree: true }],
    });
    expect(d.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
    expect(d).not.toContain('XXXX');
  });

  it('handles a possessive for names ending in s and a creator with no typed mods', () => {
    expect(creatorMetaDescription({ displayName: 'Simsfinds', totalMods: 81, mods: [{ title: 'Arrow Sneakers', contentType: 'shoes', isFree: true }] }))
      .toMatch(/^Simsfinds' Sims 4 CC: 81 free shoes/);
    expect(creatorMetaDescription({ displayName: 'Nobody', totalMods: 5, mods: [{ title: 'Thing', contentType: null, isFree: false }] }))
      .toBe("Nobody's Sims 4 CC: 5 mods and custom content, ranked by downloads — Thing and more. Every download link checked.");
  });
});

describe('app/creator/[slug]/page.tsx uses the shared meta helpers', () => {
  const source = readFileSync(join(process.cwd(), 'app/creator/[slug]/page.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('imports creatorPageTitle and creatorMetaDescription', () => {
    expect(source).toMatch(/creatorPageTitle/);
    expect(source).toMatch(/creatorMetaDescription/);
    expect(source).toMatch(/lib\/seo\/creatorMeta/);
  });

  it('no longer carries the boilerplate title or description', () => {
    expect(source).not.toContain('(${data.totalMods}) | MustHaveMods');
    expect(source).not.toContain('hair, clothes, furniture, gameplay and more');
  });
});
