/**
 * Regression tests for contentTypeDetector — focused on the title-vs-
 * description precedence bug discovered while spot-checking the MHM
 * piercings post.
 *
 * Bug: descriptions naturally contain incidental high-priority words like
 * "brow ring slots", "compatible with body preset", "match different outfits"
 * — and the old detector returned on the first such match (eyebrows=110,
 * preset=97, full-body=35) before ever evaluating the title's clear jewelry
 * signal. Result: piercing mods showed up in the admin UI as Eyebrows /
 * Preset / Full Body.
 *
 * Fix: two-pass detection. Title hits at any priority beat description-only
 * hits at higher priority. Plus defensive negative keywords on eyebrows,
 * preset, and full-body so they bow out when piercing/jewelry vocabulary
 * appears anywhere in the text.
 */

import { describe, it, expect } from 'vitest';
import {
  detectContentType,
  detectContentTypeWithConfidence,
} from '@/lib/services/contentTypeDetector';

describe('contentTypeDetector — title beats description (regression)', () => {
  it('"Adam Piercing Set" → jewelry (title beats preset desc match)', () => {
    // Title clearly says Piercing. Description mentions "body preset",
    // "preset", "presets" because the post links to a body-preset article.
    // Without the fix, the preset rule (priority 97) won on description.
    const description =
      'The Adam Piercing Set is a detailed body piercing collection ' +
      'designed specifically for the ADAM body shape. RELATED POST: ' +
      '11 Must-Have Sims 4 Athletic Body Presets CC.';
    expect(detectContentType('Adam Piercing Set', description)).toBe('jewelry');
  });

  it('"Toni Nose Rings Set" → jewelry (title beats full-body desc match)', () => {
    const description =
      'Toni Nose Rings Set is a clean, minimal collection of nose jewelry. ' +
      'A range of metallic tones to match different outfits and moods.';
    expect(detectContentType('Toni Nose Rings Set', description)).toBe('jewelry');
  });

  it('"Third Eye Piercing" → jewelry (title beats eyebrows desc match)', () => {
    const description =
      'Third Eye Piercing is a unique forehead accessory that sits right ' +
      'at the center of your Sim\'s eyebrow line.';
    expect(detectContentType('Third Eye Piercing', description)).toBe('jewelry');
  });

  it('"Circle Of Life Set" → jewelry (description fallback via piercing keywords)', () => {
    // Title is vague ("Set"), so we rely on description. Pre-fix: eyebrows
    // grabbed the single "brow" hit (priority 110, single-desc-match for
    // priority>=80). Post-fix: piercing keyword on eyebrows acts as a
    // negative gate, and jewelry's expanded keyword list grabs ≥2 hits.
    const description =
      'Circle Of Life Set is a versatile collection of earplugs, tunnels, ' +
      'and hangers. These Sims 4 piercings are designed for teens to elders. ' +
      'The hangers are placed in brow ring slots and overlay pieces in ' +
      'nose ring slots for extra customization.';
    expect(detectContentType('Circle Of Life Set', description)).toBe('jewelry');
  });
});

describe('contentTypeDetector — title-vs-description precedence', () => {
  it('title hit at low priority beats description-only hit at high priority', () => {
    // 'piercing' is in jewelry (priority 30), 'preset' / 'outfits' are in
    // higher-priority rules. Title with 'piercing' alone should win.
    const r = detectContentTypeWithConfidence(
      'Mystery Piercing',
      'Designed to work with body preset and match your favorite outfits.',
    );
    expect(r.contentType).toBe('jewelry');
    expect(r.matchedKeywords).toContain('piercing');
    expect(r.reasoning).toMatch(/title/i);
  });

  it('higher-priority title hit still beats lower-priority title hit', () => {
    // Both eyebrows (110) and jewelry (30) match the title. Eyebrows wins
    // by priority — UNLESS a negative keyword disqualifies it. Here the
    // word "piercing" is ALSO in the title, which negative-gates eyebrows
    // → falls to jewelry.
    expect(detectContentType('Eyebrow Piercing Pack', '')).toBe('jewelry');
  });

  it('plain eyebrow mod with no piercing context still resolves to eyebrows', () => {
    // Make sure we didn't break legit eyebrow detection.
    expect(
      detectContentType('Soft Maxis Match Eyebrows', 'A new eyebrow set with 12 swatches.'),
    ).toBe('eyebrows');
  });

  it('plain body preset mod with no jewelry context still resolves to preset', () => {
    expect(
      detectContentType('Athletic Body Preset', 'A new body preset for athletic frames.'),
    ).toBe('preset');
  });

  it('plain outfit mod with no jewelry context still resolves to full-body', () => {
    expect(
      detectContentType('Sporty Outfit Set', 'A jumpsuit with matching accessories.'),
    ).toBe('full-body');
  });

  // Regression: full-body negative keywords used to include 'shoe', 'boots',
  // 'sneaker'. Outfit descriptions naturally mention companion shoes
  // ("pair with boots", "matching heels"), which disqualified the entire
  // full-body rule and let jewelry win on incidental description hits like
  // "studded wristbands" or "layered chokers". Removed those negatives —
  // two-pass detection (title-priority) handles real shoe mods.
  it('"Punk Rebels Jumpsuit" → full-body even when description names boots', () => {
    const description =
      'Bones and bold prints collide to bring you this statement Punk Rebels ' +
      'Jumpsuit. Style it with studded wristbands, layered chokers, and ' +
      'chunky boots for the full punk look.';
    expect(detectContentType('Punk Rebels Jumpsuit', description)).toBe('full-body');
  });

  it('"Dead Or Alive Outfits Set" → full-body even when description names shoes/jewelry', () => {
    const description =
      'Outfit Set with eight versions of outfits, shoes, bracelets, ' +
      'earrings, necklaces, and tights.';
    expect(detectContentType('Dead Or Alive Outfits Set 01', description)).toBe('full-body');
  });

  // Regression: full-body keyword list had 'overalls' (plural) only, so
  // "Cuffed Short Overall" missed the rule and the title's incidental
  // 'cuff' substring matched jewelry. Added 'overall' (singular).
  it('"Cuffed Short Overall" → full-body via singular "overall" keyword', () => {
    const description =
      'The Cuffed Short Overall is a cute dungaree outfit ideal for casual ' +
      'everyday wear with cuffed seams and a long-sleeved blouse.';
    expect(detectContentType('Cuffed Short Overall', description)).toBe('full-body');
  });
});

describe('contentTypeDetector — confidence + reasoning', () => {
  it('returns "title" reasoning when match comes from title', () => {
    const r = detectContentTypeWithConfidence('Nose Rings Pack', '');
    expect(r.confidence).not.toBe('low');
    expect(r.reasoning).toMatch(/title/i);
  });

  it('returns "description" reasoning when match only comes from description', () => {
    const r = detectContentTypeWithConfidence(
      'Mystery Pack',
      'A collection of piercings, nose rings, and septum jewelry.',
    );
    expect(r.contentType).toBe('jewelry');
    expect(r.reasoning).toMatch(/description/i);
  });
});
