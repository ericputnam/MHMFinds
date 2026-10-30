/**
 * E268 (2026-10-25): hand-written meta overrides for the seven gameplay-mod
 * pages whose first-person blog snippet ran 0.82% CTR at positions 8–14.
 *
 * Red on pre-fix origin/main by construction: lib/seo/modMetaOverrides.ts
 * does not exist there and modMetaDescription ignores `id`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MOD_META_OVERRIDES, modMetaOverride } from '@/lib/seo/modMetaOverrides';
import { META_DESCRIPTION_MAX, SITE_NAME, modMetaDescription, modPageTitle } from '@/lib/seo/modMeta';

const ids = Object.keys(MOD_META_OVERRIDES);

describe('MOD_META_OVERRIDES', () => {
  it('has the seven measured pages and nothing templated', () => {
    expect(ids).toHaveLength(7);
    const descriptions = ids.map((id) => MOD_META_OVERRIDES[id].description);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('every id is a cuid and every description fits the snippet window as a full sentence', () => {
    for (const id of ids) {
      expect(id, id).toMatch(/^c[a-z0-9]{24}$/);
      const { title, description } = MOD_META_OVERRIDES[id];
      expect(description.length, id).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
      expect(description.length, id).toBeGreaterThanOrEqual(100);
      expect(description, id).toMatch(/[.!]$/);
      expect(description, id).not.toContain('…');
      expect(description, id).not.toMatch(/\s{2}/);
      if (title) {
        expect(title, id).toMatch(new RegExp(` \\| ${SITE_NAME}$`));
        expect(title.length, id).toBeLessThanOrEqual(65);
      }
    }
  });

  it('no description is the first-person blog opener it replaces', () => {
    for (const id of ids) {
      expect(MOD_META_OVERRIDES[id].description, id).not.toMatch(/^I /);
    }
  });
});

describe('modMetaDescription / modPageTitle honour an override by id', () => {
  const messy = 'cmijql8fw0034ox8oaadxjlsu';
  const lapKiss = 'cmttzir9d00cqoxfeqpi3tlrc';

  it('returns the override description when the id has one', () => {
    const out = modMetaDescription({
      id: messy,
      title: 'Messy Relationships Mod for Sims 4',
      shortDescription: 'I love playing relationship storylines, but they’re always filled with romantic getaways and happy endings.',
    });
    expect(out).toBe(MOD_META_OVERRIDES[messy].description);
  });

  it('leaves every other mod on the rule', () => {
    expect(modMetaDescription({ id: 'cnotanoverrideid0000000000', title: 'x', shortDescription: 'A cool mod' })).toBe('A cool mod');
    expect(modMetaDescription({ title: 'x', shortDescription: 'A cool mod' })).toBe('A cool mod');
  });

  it('uses an override title when given, else the rule-built title', () => {
    expect(modPageTitle({ id: lapKiss, title: 'Intimate Lap Kiss', contentType: 'poses' })).toBe(
      'Intimate Lap Kiss Mod for Sims 4 | MustHaveMods',
    );
    // Messy Relationships has no title override: the E83 rule still applies.
    expect(modPageTitle({ id: messy, title: 'Messy Relationships Mod for Sims 4', contentType: 'gameplay-mod' })).toBe(
      'Messy Relationships Mod for Sims 4 | MustHaveMods',
    );
    expect(modMetaOverride(undefined)).toBeUndefined();
    expect(modMetaOverride(null)).toBeUndefined();
  });
});

describe('app/mods/[id]/page.tsx passes the id into the meta helpers', () => {
  const source = readFileSync(join(process.cwd(), 'app/mods/[id]/page.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('selects id in generateMetadata and hands the whole row to the helpers', () => {
    expect(source).toMatch(/id:\s*true/);
    expect(source).toMatch(/modMetaDescription\(mod\)/);
    expect(source).toMatch(/modPageTitle\(mod\)/);
  });
});
