import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  addDays,
  assessPipe,
  parseImpactProgramRows,
  PIPE_RULE,
  renderPipeReadMd,
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

describe('PIPE_RULE constants (frozen, imported — not restated)', () => {
  it('window starts on the first full day after the 09-28 22:37Z fix and the floor is 10 clicks / 50 %', () => {
    expect(PIPE_RULE.fixMergedAt).toBe('2026-09-28T22:37:00Z');
    expect(PIPE_RULE.windowStart).toBe('2026-09-29');
    expect(PIPE_RULE.minOnSiteClicks).toBe(10);
    expect(PIPE_RULE.minRecordedShare).toBe(0.5);
    expect(PIPE_RULE.killAfterDays).toBe(30);
    expect(PIPE_RULE.readOn).toBe('2026-10-12');
    expect(PIPE_RULE.preFix.recorded / PIPE_RULE.preFix.onSite).toBeLessThan(PIPE_RULE.minRecordedShare);
  });
});
