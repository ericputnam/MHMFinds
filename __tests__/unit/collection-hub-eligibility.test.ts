import { describe, expect, it } from 'vitest';

import {
  ADULT_TITLE_RE,
  DEFAULT_RULE,
  GAMEPLAY_ADULT_WATCHLIST,
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
    expect(gradeHub(CLEAN_30, 19).eligible).toBe(false);
    expect(gradeHub(CLEAN_30, 20).eligible).toBe(true);
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
