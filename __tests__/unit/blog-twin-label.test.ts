import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import { SIMS4_COLLECTIONS } from '@/lib/collections';
import { blogTwinLabel, blogTwinLinkText } from '@/lib/seo/blogTwinLabel';

/**
 * E367 (Pip, 2026-11-07): every hub linked its WordPress twin with the same
 * anchor, "Full article on the blog →". The anchor now names the twin, from
 * its own slug. A scanner over the registry, not a list of cases, so a new
 * hub with a blogUrl is checked the day it ships.
 */

const ROOT = path.resolve(__dirname, '../..');
const withTwin = SIMS4_COLLECTIONS.filter((c) => !!c.blogUrl);

describe('blog twin anchor text (E367)', () => {
  it('finds the hubs it checks (vacuity guard)', () => {
    expect(withTwin.length).toBeGreaterThanOrEqual(30);
  });

  it('every hub twin gets a descriptive anchor, never the generic fallback', () => {
    const texts = new Set<string>();
    for (const c of withTwin) {
      const label = blogTwinLabel(c.blogUrl!);
      expect(label, `${c.slug} ${c.blogUrl}`).toMatch(/^Sims 4 \S/);
      expect(label.split(' ').length, `${c.slug} ${c.blogUrl}`).toBeGreaterThanOrEqual(3);
      const text = blogTwinLinkText(c.blogUrl!);
      expect(text).not.toBe('Full article on the blog →');
      texts.add(text);
    }
    // 34 hubs and 34 distinct twins: no two hubs may share one anchor.
    expect(texts.size).toBe(withTwin.length);
  });

  it('cases the tokens a slug cannot carry', () => {
    expect(blogTwinLabel('/sims-4-skin-overlay/')).toBe('Sims 4 Skin Overlay');
    expect(blogTwinLabel('/sims-4-gshade-presets/')).toBe('Sims 4 GShade Presets');
    expect(blogTwinLabel('/sims-4-cas-poses/')).toBe('Sims 4 CAS Poses');
    expect(blogTwinLabel('/sims-4-y2k-cc/')).toBe('Sims 4 Y2K CC');
    expect(blogTwinLabel('/sims-4-mods-for-realistic-relationships/')).toBe(
      'Sims 4 Mods for Realistic Relationships',
    );
  });

  it('falls back to the old text for anything that is not a one-segment path', () => {
    for (const bad of ['', '/games/sims-4/hair-cc/', 'https://musthavemods.com/x/', '/no-slash']) {
      expect(blogTwinLabel(bad)).toBe('');
      expect(blogTwinLinkText(bad)).toBe('Full article on the blog →');
    }
  });

  it('the hub page renders the helper, not the old literal', () => {
    const page = fs.readFileSync(path.join(ROOT, 'app/games/[game]/[topic]/CollectionPageClient.tsx'), 'utf-8');
    const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(code).toContain('blogTwinLinkText(collection.blogUrl)');
    expect(code).not.toContain('Full article on the blog');
  });
});
