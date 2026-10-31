import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  addDays,
  assessPipe,
  classifyAffiliateSurface,
  GA4_LEG,
  ga4LegLines,
  parseImpactProgramRows,
  PIPE_RULE,
  renderPipeReadMd,
  summarizeGa4AffiliateClicks,
  type Ga4AffiliateRow,
  type PipeInput,
} from '../../scripts/agents/affiliate-pipe-lib';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const NOW = new Date('2026-10-01T11:00:00Z');

/**
 * Real Impact `partner_performance_by_program` body for 2026-07-01→2026-09-28
 * (pulled 2026-10-01). Every value is a string; money carries 18 decimals.
 * These six campaigns sum to the "133 Impact clicks" E134 quotes; GTPLAYER-US
 * is the 9-of-110 pre-fix pipe.
 */
const IMPACT_PREFIX_BODY = {
  Records: [
    { Campaign: 'Redbubble Affiliate Partner Program', campaign_id: '11754', Imps: '0', Clicks: '61', Actions: '0', Sale_Amount: '0.000000000000000000' },
    { Campaign: 'Canva', campaign_id: '10068', Imps: '0', Clicks: '18', Actions: '0', Sale_Amount: '0.000000000000000000' },
    { Campaign: 'Envato', campaign_id: '4662', Imps: '0', Clicks: '18', Actions: '0', Sale_Amount: '0.000000000000000000' },
    { Campaign: 'Logitech G - US, Canada & Mexico', campaign_id: '11355', Imps: '0', Clicks: '15', Actions: '0', Sale_Amount: '0.000000000000000000' },
    { Campaign: 'CapCut Affiliate Program', campaign_id: '22474', Imps: '0', Clicks: '12', Actions: '0', Sale_Amount: '0.000000000000000000' },
    { Campaign: 'GTPLAYER-US', campaign_id: '18111', Imps: '0', Clicks: '9', Actions: '0', Sale_Amount: '0.000000000000000000' },
    { Campaign: 'oyrosy.com', campaign_id: '32511', Imps: '0', Clicks: '0', Actions: '0', Sale_Amount: '0.000000000000000000' },
  ],
};

function input(over: Partial<PipeInput> = {}): PipeInput {
  return {
    windowStart: '2026-09-29',
    windowEnd: '2026-09-30',
    onSiteByPartner: { gtracing: 2 },
    onSiteRepaired: 2,
    impactRows: parseImpactProgramRows({ Records: [{ Campaign: 'GTPLAYER-US', campaign_id: '18111', Clicks: '2', Actions: '0', Sale_Amount: '0' }] }),
    onSitePerDay: 1,
    now: NOW,
    ...over,
  };
}

describe('affiliate-pipe-lib · parseImpactProgramRows', () => {
  it('normalizes the real by-program body (strings → numbers) and reproduces the E134 baseline', () => {
    const rows = parseImpactProgramRows(IMPACT_PREFIX_BODY);
    expect(rows).toHaveLength(7);
    expect(rows.reduce((s, r) => s + r.clicks, 0)).toBe(133);
    const gt = rows.find((r) => r.campaignId === PIPE_RULE.campaignId)!;
    expect(gt).toMatchObject({ campaign: 'GTPLAYER-US', clicks: 9, actions: 0, saleAmount: 0 });
    expect(gt.clicks).toBe(PIPE_RULE.preFix.recorded);
  });

  it('tolerates a malformed body (no Records, null rows) without throwing', () => {
    expect(parseImpactProgramRows(null)).toEqual([]);
    expect(parseImpactProgramRows({})).toEqual([]);
    expect(parseImpactProgramRows({ Records: [null, { Clicks: 'x' }] })).toEqual([
      { campaignId: '', campaign: '', clicks: 0, actions: 0, saleAmount: 0 },
      { campaignId: '', campaign: '', clicks: 0, actions: 0, saleAmount: 0 },
    ]);
  });
});

describe('affiliate-pipe-lib · assessPipe (three-state, exact share)', () => {
  it('pre-fix fixture reads LEAKY: 9 of 110 is 8.2 %, far under the 50 % floor', () => {
    const r = assessPipe(
      input({
        windowStart: '2026-07-01',
        windowEnd: '2026-09-28',
        onSiteByPartner: { gtracing: PIPE_RULE.preFix.onSite, 'envato-elements': 26 },
        onSiteRepaired: 0,
        impactRows: parseImpactProgramRows(IMPACT_PREFIX_BODY),
        onSitePerDay: 1.2,
      }),
    );
    expect(r.status).toBe('leaky');
    expect(r.onSitePartner).toBe(110);
    expect(r.onSiteTotal).toBe(136);
    expect(r.recorded).toBe(9);
    expect(r.recordedShare).toBe(0.0818);
    expect(r.killClockStartsOn).toBeNull();
    expect(r.reason).toMatch(/repair did not take/);
  });

  it('today (2 on-site, 2 recorded) is NOT-YET — the share is not applied under 10 clicks, and the pace is printed', () => {
    const r = assessPipe(input());
    expect(r.status).toBe('not-yet');
    expect(r.recordedShare).toBe(1);
    expect(r.clicksToReadable).toBe(8);
    expect(r.daysToReadable).toBe(8);
    expect(r.reason).toMatch(/8 more ≈ 8 day\(s\) at 1\/day/);
    expect(r.killClockStartsOn).toBeNull();
  });

  it('no on-site clicks yet → not-yet with no pace (never divides by 0)', () => {
    const r = assessPipe(input({ onSiteByPartner: {}, onSiteRepaired: 0, onSitePerDay: 0 }));
    expect(r.status).toBe('not-yet');
    expect(r.daysToReadable).toBeNull();
    expect(r.recordedShare).toBeNull();
  });

  it('exactly 5 of 10 passes the 50 % floor (exact fraction, not the rounded print value) and starts the KILL clock', () => {
    const r = assessPipe(
      input({
        onSiteByPartner: { gtracing: 10 },
        onSiteRepaired: 10,
        impactRows: parseImpactProgramRows({ Records: [{ Campaign: 'GTPLAYER-US', campaign_id: '18111', Clicks: '5', Actions: '0' }] }),
      }),
    );
    expect(r.status).toBe('confirmed');
    expect(r.killClockStartsOn).toBe('2026-10-01');
    expect(r.killReadOn).toBe(addDays('2026-10-01', PIPE_RULE.killAfterDays));
    expect(r.killReadOn).toBe('2026-10-31');
  });

  // E199 (2026-10-13): the 10-12 run printed kill_read=2026-11-11, the 10-13
  // run 2026-11-12 — the clock re-anchored to the run date. Red pre-fix: the
  // first two cases below (no `confirmedOn` field existed; startsOn = today).
  const CONFIRMED = parseImpactProgramRows({ Records: [{ Campaign: 'GTPLAYER-US', campaign_id: '18111', Clicks: '6', Actions: '0' }] });
  const confirmedInput = (over: Partial<PipeInput> = {}) =>
    input({ onSiteByPartner: { gtracing: 10 }, onSiteRepaired: 10, impactRows: CONFIRMED, ...over });

  it('a later run anchors the KILL clock on the first confirmation, not on the run date', () => {
    const r = assessPipe(confirmedInput({ now: new Date('2026-10-13T11:00:00Z'), confirmedOn: '2026-10-12' }));
    expect(r.status).toBe('confirmed');
    expect(r.killClockStartsOn).toBe('2026-10-12');
    expect(r.killReadOn).toBe('2026-11-11');
    const again = assessPipe(confirmedInput({ now: new Date('2026-10-20T11:00:00Z'), confirmedOn: '2026-10-12' }));
    expect(again.killReadOn).toBe(r.killReadOn);
  });

  it('the entrypoint passes PIPE_RULE.confirmedOn and the frozen constant reproduces the E134 read date', () => {
    const r = assessPipe(confirmedInput({ now: new Date('2026-10-13T11:00:00Z'), confirmedOn: PIPE_RULE.confirmedOn }));
    expect(r.killReadOn).toBe(PIPE_RULE.readOn);
    const entry = stripComments(read('scripts/agents/affiliate-pipe-read.ts'));
    expect(entry).toMatch(/confirmedOn:\s*PIPE_RULE\.confirmedOn/);
  });

  it('a confirmedOn after `now` is a typo — the clock falls back to today, never starts in the future', () => {
    const r = assessPipe(confirmedInput({ now: new Date('2026-10-13T11:00:00Z'), confirmedOn: '2026-10-20' }));
    expect(r.killClockStartsOn).toBe('2026-10-13');
    const unset = assessPipe(confirmedInput({ now: new Date('2026-10-13T11:00:00Z'), confirmedOn: null }));
    expect(unset.killClockStartsOn).toBe('2026-10-13');
  });

  it('4 of 10 is leaky', () => {
    const r = assessPipe(
      input({
        onSiteByPartner: { gtracing: 10 },
        impactRows: parseImpactProgramRows({ Records: [{ Campaign: 'GTPLAYER-US', campaign_id: '18111', Clicks: '4', Actions: '0' }] }),
      }),
    );
    expect(r.status).toBe('leaky');
    expect(r.killClockStartsOn).toBeNull();
  });

  it('an Impact body with no 18111 row is a real 0 on the Impact leg, not unknown', () => {
    const r = assessPipe(
      input({
        onSiteByPartner: { gtracing: 12 },
        impactRows: parseImpactProgramRows({ Records: [{ Campaign: 'Canva', campaign_id: '10068', Clicks: '3', Actions: '0' }] }),
      }),
    );
    expect(r.status).toBe('leaky');
    expect(r.recorded).toBe(0);
    expect(r.recordedShare).toBe(0);
  });

  it('an unreachable Impact leg is UNKNOWN even with plenty of on-site clicks — never a verdict', () => {
    const r = assessPipe(input({ onSiteByPartner: { gtracing: 50 }, impactRows: null, impactError: 'Impact report timed out after 30 s' }));
    expect(r.status).toBe('unknown');
    expect(r.recorded).toBeNull();
    expect(r.actions).toBeNull();
    expect(r.recordedShare).toBeNull();
    expect(r.killClockStartsOn).toBeNull();
    expect(r.reason).toMatch(/no verdict/);
  });
});

describe('affiliate-pipe-lib · renderPipeReadMd', () => {
  it('prints the pre-committed rule before any number, and the verdict line', () => {
    const md = renderPipeReadMd(assessPipe(input()));
    const ruleAt = md.indexOf('**Rule (pre-committed, E153)');
    const verdictAt = md.indexOf('## Verdict');
    expect(ruleAt).toBeGreaterThan(0);
    expect(verdictAt).toBeGreaterThan(ruleAt);
    expect(md).toContain('## Verdict: **NOT-YET**');
    expect(md).toContain('9/110 = 8.2 %');
    expect(md).toContain('| On-site clicks, `gtracing` | 2 |');
  });

  it('an unknown read prints COULD-NOT-RUN for the Impact leg and no campaign table', () => {
    const md = renderPipeReadMd(assessPipe(input({ impactRows: null, impactError: 'IMPACT_ACCOUNT_SID / IMPACT_AUTH_TOKEN not set' })));
    expect(md).toContain('## Verdict: **UNKNOWN**');
    expect(md).toContain('Impact leg: COULD-NOT-RUN');
    expect(md).not.toContain('## Impact by campaign');
  });

  it('a confirmed read names the KILL clock dates', () => {
    const md = renderPipeReadMd(
      assessPipe(
        input({
          onSiteByPartner: { gtracing: 10 },
          impactRows: parseImpactProgramRows({ Records: [{ Campaign: 'GTPLAYER-US', campaign_id: '18111', Clicks: '7', Actions: '1' }] }),
        }),
      ),
    );
    expect(md).toContain('## Verdict: **CONFIRMED**');
    expect(md).toContain('KILL clock: starts 2026-10-01, reads 2026-10-31');
  });
});

describe('affiliate-pipe-read.ts · source guards', () => {
  const src = stripComments(read('scripts/agents/affiliate-pipe-read.ts'));

  it('bounds the Impact GET with AbortSignal.timeout and never uses a bare fetch', () => {
    expect(src).toMatch(/signal:\s*AbortSignal\.timeout\(IMPACT_TIMEOUT_MS\)/);
    const fetches = src.match(/\bfetch\(/g) ?? [];
    expect(fetches.length).toBe(1);
  });

  it('routes every printed or written string through redactError', () => {
    expect(src).toMatch(/const say = \(s: string\) => console\.log\(redactError\(s\)\)/);
    expect(src).toMatch(/writeFileSync\(outPath, redactError\(md\)\)/);
    expect(src).not.toMatch(/console\.(log|error)\((?!redact)/);
  });

  it('reads the Impact credentials from env only and never interpolates the token into output', () => {
    expect(src).toMatch(/process\.env\.IMPACT_AUTH_TOKEN/);
    // the token may appear only in the Basic-auth header construction
    const uses = src.match(/\btoken\b/g) ?? [];
    expect(uses.length).toBeLessThanOrEqual(4);
    expect(src).not.toMatch(/say\([^)]*token/);
  });

  it('pulls the DB leg read-only (no create/update/delete on affiliate tables)', () => {
    expect(src).not.toMatch(/\.(create|update|delete|upsert|createMany|updateMany|deleteMany)\(/);
  });
});

/**
 * E306 (2026-10-31). Real GA4 `affiliate_click` rows by date × pagePath,
 * 2026-10-24→2026-10-30 (Data API, property 437117335, pulled 10-31). The
 * 10-23→10-29 sum of these rows is 41 — the scoreboard's capture-events
 * line that morning — so the fixture is the production shape, not a sketch.
 * Grid clicks (`/`, `/games/sims-4/`) 9; blog block 44 over its 4 live days.
 */
const GA4_ROWS: Ga4AffiliateRow[] = [
  { date: '20261024', pagePath: '/', eventCount: 1 },
  { date: '20261026', pagePath: '/games/sims-4/', eventCount: 2 },
  { date: '20261026', pagePath: '/', eventCount: 1 },
  { date: '20261027', pagePath: '/new-sims-4-mods-2026/', eventCount: 2 },
  ...['/best-sims-4-realistic-mods/', '/sims-4-animations/', '/sims-4-castles/', '/sims-4-cc-furniture/', '/sims-4-elf-cc/', '/sims-4-off-the-grid-cc/', '/sims-4-pixie-cut-lookbook/', '/sims-4-pregnancy-mods/', '/sims-4-ranch-cc/', '/sims-4-short-hair-cc/', '/sims-4-social-media-mods/', '/sims-4-trait-mods/'].map((pagePath) => ({ date: '20261027', pagePath, eventCount: 1 })),
  { date: '20261028', pagePath: '/', eventCount: 3 },
  ...['/sims-4-braids-cc/', '/sims-4-eyebrows-cc/', '/sims-4-living-room-cc/', '/sims-4-plus-size-body-presets/', '/sims-4-witch-houses/'].map((pagePath) => ({ date: '20261028', pagePath, eventCount: 1 })),
  { date: '20261029', pagePath: '/best-sims-4-maxis-match-cc/', eventCount: 2 },
  { date: '20261029', pagePath: '/sims-4-hello-kitty-cc/', eventCount: 2 },
  { date: '20261029', pagePath: '/games/sims-4/', eventCount: 1 },
  ...['/sims-4-alpha-hair-lookbook/', '/sims-4-cc-furniture/', '/sims-4-custom-scenarios/', '/sims-4-lovestruck-cc/', '/sims-4-male-shorts-cc/', '/sims-4-punk-rock-lookbook/', '/sims-4-ranch-cc/', '/sims-4-urban-furniture-cc/', '/the-sims-4-very-veggie-challenge/', '/the-sims-4-vs-inzoi/'].map((pagePath) => ({ date: '20261029', pagePath, eventCount: 1 })),
  { date: '20261030', pagePath: '/sims-4-parenting-mods/', eventCount: 2 },
  { date: '20261030', pagePath: '/', eventCount: 1 },
  ...['/sims-4-alpha-hair-lookbook/', '/sims-4-career-mods/', '/sims-4-cc-furniture/', '/sims-4-eyes-cc/', '/sims-4-halloween-mods/', '/sims-4-holiday-mods/', '/sims-4-overrides/', '/sims-4-parenthood/', '/sims-4-princess-cc/'].map((pagePath) => ({ date: '20261030', pagePath, eventCount: 1 })),
];

describe('E306 · classifyAffiliateSurface — the grid is only `/` and `/games/*`', () => {
  it('home, the game hub and every collection page are grid; a WordPress post is the block', () => {
    expect(classifyAffiliateSurface('/')).toBe('grid');
    expect(classifyAffiliateSurface('/games/sims-4/')).toBe('grid');
    expect(classifyAffiliateSurface('/games/sims-4/wedding-cc/')).toBe('grid');
    expect(classifyAffiliateSurface('/?utm_source=pinterest')).toBe('grid');
    expect(classifyAffiliateSurface('/sims-4-cc-furniture/')).toBe('blog_pack_block');
    expect(classifyAffiliateSurface('/the-sims-4-vs-inzoi/')).toBe('blog_pack_block');
    // a post whose slug merely starts with "games" is not the hub
    expect(classifyAffiliateSurface('/gameshow-sims-4-mods/')).toBe('blog_pack_block');
  });
});

describe('E306 · summarizeGa4AffiliateClicks — two surfaces, two paces', () => {
  it('reproduces the 10-31 read: grid 9, block 44 on 36 paths over 4 live days = 11/day, and the scoreboard 41 on 10-23→10-29', () => {
    const leg = summarizeGa4AffiliateClicks(GA4_ROWS, '2026-10-24', '2026-10-30');
    expect(leg.grid).toBe(9);
    expect(leg.blogPackBlock).toBe(44);
    expect(leg.blockLiveDays).toBe(4);
    expect(leg.blockPerDay).toBe(11);
    expect(leg.blockByDay).toEqual({ '2026-10-27': 14, '2026-10-28': 5, '2026-10-29': 14, '2026-10-30': 11 });
    // 40 path-days, three paths repeat across days (cc-furniture ×3, ranch-cc ×2, alpha-hair ×2) → 36 distinct
    expect(leg.blockPaths).toBe(36);
    const scoreboard = summarizeGa4AffiliateClicks(GA4_ROWS, '2026-10-23', '2026-10-29');
    expect(scoreboard.grid + scoreboard.blogPackBlock).toBe(41);
  });

  it('a window that ends before the block was live prints no block pace (null, not 0/day)', () => {
    const leg = summarizeGa4AffiliateClicks(GA4_ROWS, '2026-10-24', '2026-10-26');
    expect(leg.grid).toBe(4);
    expect(leg.blogPackBlock).toBe(0);
    expect(leg.blockLiveDays).toBe(0);
    expect(leg.blockPerDay).toBeNull();
    expect(ga4LegLines(leg)[1]).toMatch(/not live in this window/);
  });

  it('accepts ISO dates too and drops rows outside the window', () => {
    const leg = summarizeGa4AffiliateClicks(
      [{ date: '2026-10-29', pagePath: '/sims-4-x/', eventCount: 3 }, { date: '2026-11-05', pagePath: '/sims-4-y/', eventCount: 9 }],
      '2026-10-27',
      '2026-10-30',
    );
    expect(leg.blogPackBlock).toBe(3);
  });
});

describe('E306 · the kill read prints Impact and the Amazon block as two lines; GA4 unavailable never writes a number', () => {
  it('assessPipe carries the leg without touching the verdict', () => {
    const withLeg = assessPipe(input({ ga4Rows: GA4_ROWS, windowStart: '2026-10-24', windowEnd: '2026-10-30' }));
    const without = assessPipe(input({ ga4Rows: null, ga4Error: 'GA4 could-not-run: no service-account credentials', windowStart: '2026-10-24', windowEnd: '2026-10-30' }));
    expect(withLeg.status).toBe(without.status);
    expect(withLeg.reason).toBe(without.reason);
    expect(withLeg.ga4Leg?.blogPackBlock).toBe(44);
    expect(without.ga4Leg).toBeNull();
    expect(without.ga4Error).toBe('GA4 could-not-run: no service-account credentials');
  });

  it('the report has a GA4 section with one grid line and one block line, after the Impact legs', () => {
    const md = renderPipeReadMd(assessPipe(input({ ga4Rows: GA4_ROWS, windowStart: '2026-10-24', windowEnd: '2026-10-30' })));
    const ga4At = md.indexOf('## GA4 `affiliate_click` by surface (E306');
    expect(ga4At).toBeGreaterThan(md.indexOf('| Impact actions'));
    expect(md).toContain('grid (`/` + `/games/*`, Impact-tracked partners): 9 click(s)');
    expect(md).toContain('blog Amazon pack block (#391, every other path): 44 click(s) on 36 post path(s) over 4 live day(s) = 11/day');
    expect(md).toContain('| 2026-10-29 | 14 |');
    // no dollar is ever printed for the block
    const blockLine = md.split('\n').find((l) => l.includes('blog Amazon pack block'))!;
    expect(blockLine).not.toMatch(/\$\d/);
  });

  it('GA4 unavailable → one line with the reason and no digits that look like a reading', () => {
    const lines = ga4LegLines(null, 'GA4 could-not-run: no service-account credentials');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^- GA4 `affiliate_click` by surface: unavailable — GA4 could-not-run: no service-account credentials$/);
    // "GA4" is the product name, not a reading; nothing else on the line may be a digit
    expect(lines[0].replace(/GA4/g, 'GA')).not.toMatch(/\d/);
    const md = renderPipeReadMd(assessPipe(input({ ga4Rows: null, ga4Error: 'GA4 could-not-run: timeout' })));
    expect(md).toContain('by surface: unavailable — GA4 could-not-run: timeout');
    expect(md).not.toContain('| Day | Block clicks |');
  });

  it('the status rules never read the GA4 leg (source guard, comments stripped)', () => {
    const lib = stripComments(read('scripts/agents/affiliate-pipe-lib.ts'));
    const assess = lib.slice(lib.indexOf('export function assessPipe'), lib.indexOf('const pct ='));
    const statusDecisions = assess.split('\n').filter((l) => /status: '/.test(l) || /^\s*if \(/.test(l));
    expect(statusDecisions.length).toBeGreaterThan(3);
    for (const l of statusDecisions) expect(l).not.toMatch(/ga4/i);
  });

  it('the entrypoint bounds the GA4 report, passes both GA4 fields, and the constants are frozen', () => {
    const src = stripComments(read('scripts/agents/affiliate-pipe-read.ts'));
    expect(src).toMatch(/\{ timeout: GA4_REPORT_TIMEOUT_MS \}/);
    expect(src).toMatch(/ga4Rows:\s*ga4\.rows/);
    expect(src).toMatch(/ga4Error:\s*ga4\.error/);
    expect(src).toMatch(/value: GA4_LEG\.event/);
    expect(GA4_LEG.event).toBe('affiliate_click');
    expect(GA4_LEG.blockLiveFrom).toBe('2026-10-27');
    expect(GA4_LEG.blockMinPerDay).toBe(5);
  });
});

describe('PIPE_RULE constants (frozen, imported — not restated)', () => {
  it('window starts on the first full day after the 09-28 22:37Z fix and the floor is 10 clicks / 50 %', () => {
    expect(PIPE_RULE.fixMergedAt).toBe('2026-09-28T22:37:00Z');
    expect(PIPE_RULE.windowStart).toBe('2026-09-29');
    expect(PIPE_RULE.minOnSiteClicks).toBe(10);
    expect(PIPE_RULE.minRecordedShare).toBe(0.5);
    expect(PIPE_RULE.killAfterDays).toBe(30);
    expect(PIPE_RULE.confirmedOn).toBe('2026-10-12');
    expect(PIPE_RULE.readOn).toBe('2026-11-11');
    expect(PIPE_RULE.readOn).toBe(addDays(PIPE_RULE.confirmedOn!, PIPE_RULE.killAfterDays));
    expect(PIPE_RULE.preFix.recorded / PIPE_RULE.preFix.onSite).toBeLessThan(PIPE_RULE.minRecordedShare);
  });
});
