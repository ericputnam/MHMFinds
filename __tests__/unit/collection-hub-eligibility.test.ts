import { describe, expect, it } from 'vitest';

import {
  ADULT_TITLE_RE,
  DEFAULT_RULE,
  GAMEPLAY_ADULT_WATCHLIST,
  OFF_TYPE_FAMILIES,
  OFF_TYPE_RE,
  formatGrade,
  formatRule,
  gradeHub,
  type HubRow,
} from '../../scripts/agents/collection-hub-eligibility-lib';

function row(i: number, title: string, extra: Partial<HubRow> = {}): HubRow {
  return { id: `id${i}`, title, contentType: 'gameplay-mod', isNSFW: false, downloadCount: 1000 - i, ...extra };
}

const CLEAN_30: HubRow[] = Array.from({ length: 30 }, (_, i) =>
  row(i, ['MC Command Center', 'UI Cheats Extension', 'Slice of Life', 'Better Exceptions', 'Meaningful Stories'][i % 5] + ` v${i}`),
);

describe('collection-hub-eligibility (E238)', () => {
  it('passes a clean facet with >= minRows SFW rows', () => {
    const g = gradeHub(CLEAN_30, 511, { family: 'gameplay', watchlist: GAMEPLAY_ADULT_WATCHLIST });
    expect(g.eligible).toBe(true);
    expect(g.reasons).toEqual([]);
    expect(g.topAudited).toBe(30);
  });

  it('fails on a watchlist id in the top N even when the title is innocuous', () => {
    const top = [row(0, 'Cuddle and Bath', { id: GAMEPLAY_ADULT_WATCHLIST[7].id }), ...CLEAN_30.slice(1)];
    const g = gradeHub(top, 511, { family: 'gameplay', watchlist: GAMEPLAY_ADULT_WATCHLIST });
    expect(g.eligible).toBe(false);
    expect(g.adultInTop).toEqual([{ id: GAMEPLAY_ADULT_WATCHLIST[7].id, title: 'Cuddle and Bath', via: 'watchlist' }]);
  });

  it('fails on an adult title word with no watchlist (title leg)', () => {
    const top = [row(0, 'WickedWhims 190'), ...CLEAN_30.slice(1)];
    const g = gradeHub(top, 511, { family: 'gameplay' });
    expect(g.eligible).toBe(false);
    expect(g.adultInTop[0]?.via).toBe('title');
  });

  it('a watchlist row that has dropped out of the top N (flagged NSFW) no longer fails the grade', () => {
    // The post-pass state: the page's where excludes isNSFW rows, so the
    // watchlist id is simply absent from `top`.
    const g = gradeHub(CLEAN_30, 503, { family: 'gameplay', watchlist: GAMEPLAY_ADULT_WATCHLIST });
    expect(g.eligible).toBe(true);
  });

  it('fails on an off-type title and names the word', () => {
    const top = [row(0, 'Sponge Bob Summer Dress'), ...CLEAN_30.slice(1)];
    const g = gradeHub(top, 511, { family: 'gameplay' });
    expect(g.eligible).toBe(false);
    expect(g.offTypeInTop).toEqual([{ id: 'id0', title: 'Sponge Bob Summer Dress', word: 'Dress' }]);
  });

  it('fails below minRows, with the exact fraction at the boundary passing', () => {
    expect(gradeHub(CLEAN_30, 19, { family: 'gameplay' }).eligible).toBe(false);
    expect(gradeHub(CLEAN_30, 20, { family: 'gameplay' }).eligible).toBe(true);
  });

  it('only audits the top N', () => {
    const top = [...CLEAN_30, row(99, 'WickedWhims late')];
    expect(gradeHub(top, 511, { family: 'gameplay' }).eligible).toBe(true);
    expect(gradeHub(top, 511, { family: 'gameplay', rule: { minRows: 20, topN: 31 } }).eligible).toBe(false);
  });

  it('watchlist is the 8 ids from playbooks/sage.md 2026-10-18 and every label trips ADULT_TITLE_RE', () => {
    expect(GAMEPLAY_ADULT_WATCHLIST).toHaveLength(8);
    expect(new Set(GAMEPLAY_ADULT_WATCHLIST.map((w) => w.id)).size).toBe(8);
    for (const w of GAMEPLAY_ADULT_WATCHLIST) expect(w.id).toMatch(/^c[a-z0-9]{24}$/);
    // Labels that the regex is expected to catch on their own; "Cuddle and
    // Bath" is the one the id list exists for — its title is innocuous.
    const byTitle = GAMEPLAY_ADULT_WATCHLIST.filter((w) => ADULT_TITLE_RE.test(w.label)).map((w) => w.label);
    expect(byTitle).toEqual(['MC WooHoo', 'Wicked Whims', 'Prostitution Mod', 'Ho* It Up', 'Breast Slider', 'Basemental', 'Wonderful Whims']);
  });

  it('ADULT_TITLE_RE does not fire on clean gameplay titles', () => {
    for (const t of ['MC Command Center', 'UI Cheats Extension', 'Slice of Life', 'Better Exceptions', 'Meaningful Stories', 'Whimsical Garden Set'])
      expect(ADULT_TITLE_RE.test(t), t).toBe(false);
  });

  it('OFF_TYPE_RE.gameplay flags CAS/object/lot words and leaves gameplay alone', () => {
    for (const t of ['Long Wavy Hair', 'Modern Villa', 'Kitchen Clutter Set', 'CAS Pose Pack'])
      expect(OFF_TYPE_RE.gameplay.test(t), t).toBe(true);
    for (const t of CLEAN_30.map((r) => r.title)) expect(OFF_TYPE_RE.gameplay.test(t), t).toBe(false);
  });

  // ── E252 (2026-10-21): a probe that did not look returns INCONCLUSIVE,
  //    never a verdict. The 10-21 read of lot+residential printed ELIGIBLE
  //    with no family while 18 of its first 48 rows were not lots.
  it('no family → leg (c) ungraded → INCONCLUSIVE, never eligible, and the reason names the flag', () => {
    const g = gradeHub(CLEAN_30, 511);
    expect(g.offTypeGraded).toBe(false);
    expect(g.eligible).toBe(false);
    expect(g.verdict).toBe('INCONCLUSIVE');
    expect(g.reasons).toHaveLength(1);
    expect(g.reasons[0]).toContain('--family=');
    for (const f of OFF_TYPE_FAMILIES) expect(g.reasons[0]).toContain(f);
    const out = formatGrade(g);
    expect(out).toContain('VERDICT: INCONCLUSIVE');
    expect(out).toContain('NOT GRADED');
    expect(out).not.toContain('VERDICT: ELIGIBLE');
    expect(formatRule(DEFAULT_RULE, undefined)).toContain('at most INCONCLUSIVE');
  });

  it('no family but a failed leg (a) or (b) is still NOT ELIGIBLE, not INCONCLUSIVE', () => {
    expect(gradeHub(CLEAN_30, 19).verdict).toBe('NOT ELIGIBLE');
    expect(gradeHub([row(0, 'WickedWhims 190'), ...CLEAN_30.slice(1)], 511).verdict).toBe('NOT ELIGIBLE');
  });

  it('a graded family that passes every leg reads ELIGIBLE with offTypeGraded=true', () => {
    const g = gradeHub(CLEAN_30, 511, { family: 'gameplay' });
    expect(g.offTypeGraded).toBe(true);
    expect(g.verdict).toBe('ELIGIBLE');
    expect(g.eligible).toBe(true);
  });

  it('OFF_TYPE_FAMILIES lists every OFF_TYPE_RE key and includes gameplay and lots', () => {
    expect([...OFF_TYPE_FAMILIES].sort()).toEqual(Object.keys(OFF_TYPE_RE).sort());
    expect(OFF_TYPE_FAMILIES).toContain('gameplay');
    expect(OFF_TYPE_FAMILIES).toContain('lots');
  });

  it('OFF_TYPE_RE.gameplay: "Nail Technician" (career) is on-type; CAS nail titles still flag', () => {
    expect(OFF_TYPE_RE.gameplay.test('Nail Technician')).toBe(false);
    expect(OFF_TYPE_RE.gameplay.test('Functional Nail Salon')).toBe(false);
    for (const t of ['Coffin Nails N01', 'Nail Polish Set 02', 'Chrome Nail Art', 'Sims 4 Nail CC Pack', 'Winter Nail Collection'])
      expect(OFF_TYPE_RE.gameplay.test(t), t).toBe(true);
  });

  // The 10-21 prod read, lot+residential+commercial+community, top 48 by
  // downloads (playbooks/sage.md 2026-10-21). 30 real lots, 18 not.
  const LOTS_TOP48_REAL: string[] = [
    'MM Family House 36', 'Ava Modern House', 'MM Modern House 123', 'Quant House', 'MM Modern House 155',
    'Modern Family House', 'Rivelin Lake', 'The Farmhouse Simmer', 'Victoria Road 63', 'Luma House',
    'Barbie Pool Mansion', 'Y2k Millennium Villa', 'Rujirada Modern House', 'Winter Log Mansion', 'Dockside Retreat',
    'Suburban Family House', 'MM Modern House 145', 'Pumpkin Farm Sims 4', 'Tainted Souls Manor', 'Goth Family House',
    'Eco Starter House', 'Modern Luxury House 59', 'Small Apartments', 'Modern Xylon', 'MM Modern Villa 20',
    'Modern Luxury Villa', 'Copperdale High School', 'Torendi Penthouse', 'Beach Mansion', 'MM Castle On Peak',
    // Rejected words must keep these real lots on-type too.
    'Gibbi Point Family Home (No CC)', 'Kiss of Autumn', 'Tokyo Bar + Restaurant Multi-functional Lot',
    'Ranch 5-Bedroom with In-Law Suite House', 'Mushroom Fairy House', 'Haunted Starter Home',
  ];
  const LOTS_TOP48_OFF: string[] = [
    'Love Island Challenge', 'Wash’n Wear Essentials', 'Swifty Sways Infant Swing', 'Better Build/Buy', 'Hello Kitty Set',
    'Adult Jobs for Teens', 'Aesthetic Gaming Set Up', 'The Sims 4 Cats & Dogs', 'Gaming PC Setup Collection',
    'Functional Pacifier', 'All-World Save File with Mods', 'Grunge Brick Walls', 'Basic Set 07',
    'Sims 4 Active Doggy Daycare Career', 'Lotta Kidsroom Part. 2', 'Lot Traits Pack',
  ];
  const LOTS_TOP48_KNOWN_MISSES = ['Kiss and Grind', 'Eva'];

  it('OFF_TYPE_RE.lots flags 16 of the 18 non-lots in the 10-21 top 48 and none of the real lots', () => {
    expect(LOTS_TOP48_REAL.length).toBeGreaterThanOrEqual(30);
    for (const t of LOTS_TOP48_REAL) expect(OFF_TYPE_RE.lots.test(t), t).toBe(false);
    for (const t of LOTS_TOP48_OFF) expect(OFF_TYPE_RE.lots.test(t), t).toBe(true);
    expect(LOTS_TOP48_OFF).toHaveLength(16);
    // Documented, not silently tolerated: these two need a hand grade.
    for (const t of LOTS_TOP48_KNOWN_MISSES) expect(OFF_TYPE_RE.lots.test(t), t).toBe(false);
  });

  it('OFF_TYPE_RE.lots grades the 10-21 lots grid NOT ELIGIBLE with every hit naming its word', () => {
    const top = [...LOTS_TOP48_REAL.slice(0, 30), ...LOTS_TOP48_OFF].map((t, i) => row(i, t, { contentType: 'residential' }));
    const g = gradeHub(top, 959, { family: 'lots', rule: { minRows: 20, topN: 48 } });
    expect(g.verdict).toBe('NOT ELIGIBLE');
    expect(g.offTypeInTop).toHaveLength(16);
    for (const o of g.offTypeInTop) expect(o.word.length).toBeGreaterThan(0);
  });

  it('prints the rule before the reading, with the default thresholds', () => {
    const rule = formatRule(DEFAULT_RULE, 'gameplay');
    expect(rule.startsWith('RULE (printed before the read)')).toBe(true);
    expect(rule).toContain('>= 20');
    expect(rule).toContain('top 30');
    const g = gradeHub([row(0, 'WickedWhims')], 5, { family: 'gameplay' });
    const out = formatGrade(g);
    expect(out).toContain('VERDICT: NOT ELIGIBLE');
    expect(out).toContain('SFW rows 5 < 20');
  });
});
