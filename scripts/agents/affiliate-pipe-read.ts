/**
 * Affiliate pipe read — entrypoint (all network, DB and file writes live here).
 *
 *   npx tsx scripts/agents/affiliate-pipe-read.ts [--start YYYY-MM-DD] [--end YYYY-MM-DD]
 *        [--out reports/funnel/affiliate-pipe-read-<end>.md] [--json <path>]
 *
 * Defaults: start = PIPE_RULE.windowStart (2026-09-29, first full day after
 * the E134 repair merged), end = yesterday. Two legs, each bounded:
 *   - production DB (read-only): `AffiliateClick` rows in the window grouped
 *     by `AffiliateOffer.partner`, plus how many of the gtracing rows point at
 *     a repaired (validated + active) offer;
 *   - Impact `partner_performance_by_program` for the same dates, one GET
 *     with `AbortSignal.timeout`. Any failure on this leg makes the read
 *     `unknown` — it never becomes a verdict about the pipe.
 *
 * Exit codes (house 0/2/1): 0 = report written (any status, including
 * `unknown`); 2 = could not run (DB leg failed, bad range); 1 = crashed.
 * Error strings go through `redactError()` before they are printed or
 * written. Credentials are read from env and never printed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// Load `.env.local` (real DB + Impact credentials), overriding the bare `.env`
// that @prisma/client's own dotenv may already have loaded; scripts cannot use
// the Accelerate URL, so swap in the direct connection (same pattern as
// `affiliate-daily-pulse.ts`).
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
if (process.env.DIRECT_DATABASE_URL && /^prisma(\+postgres)?:\/\//.test(process.env.DATABASE_URL ?? '')) {
  process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
}

import { redactError } from './operator-did-probe-lib';
import {
  assessPipe,
  parseImpactProgramRows,
  PIPE_RULE,
  renderPipeReadMd,
  type ImpactProgramRow,
  type PipeRead,
} from './affiliate-pipe-lib';

const PROJECT_DIR = process.env.MHM_PROJECT_DIR ?? resolve(__dirname, '..', '..');
const IMPACT_API_BASE = 'https://api.impact.com';
export const IMPACT_TIMEOUT_MS = 30_000;

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
}
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const say = (s: string) => console.log(redactError(s));

interface OnSiteLeg {
  byPartner: Record<string, number>;
  repaired: number;
  perDay: number;
}

async function pullOnSite(start: string, end: string): Promise<OnSiteLeg> {
  const { prisma } = await import('../../lib/prisma');
  const gte = new Date(`${start}T00:00:00Z`);
  const lt = new Date(`${end}T00:00:00Z`);
  lt.setUTCDate(lt.getUTCDate() + 1);
  try {
    const rows = await prisma.affiliateClick.findMany({
      where: { clickedAt: { gte, lt } },
      select: { offer: { select: { partner: true, isActive: true, validationStatus: true } } },
    });
    const byPartner: Record<string, number> = {};
    let repaired = 0;
    for (const r of rows) {
      const partner = (r.offer?.partner ?? 'unknown').toLowerCase();
      byPartner[partner] = (byPartner[partner] ?? 0) + 1;
      if (partner === PIPE_RULE.partner && r.offer?.isActive && r.offer?.validationStatus === 'validated') repaired += 1;
    }
    const days = Math.max(1, Math.round((lt.getTime() - gte.getTime()) / 864e5));
    const partnerClicks = byPartner[PIPE_RULE.partner] ?? 0;
    return { byPartner, repaired, perDay: Math.round((partnerClicks / days) * 100) / 100 };
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

async function pullImpact(start: string, end: string): Promise<{ rows: ImpactProgramRow[] | null; error?: string }> {
  const sid = process.env.IMPACT_ACCOUNT_SID;
  const token = process.env.IMPACT_AUTH_TOKEN;
  if (!sid || !token) return { rows: null, error: 'IMPACT_ACCOUNT_SID / IMPACT_AUTH_TOKEN not set' };
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const url =
    `${IMPACT_API_BASE}/Mediapartners/${sid}/Reports/partner_performance_by_program?` +
    new URLSearchParams({ START_DATE: start, END_DATE: end, PageSize: '200' }).toString();
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(IMPACT_TIMEOUT_MS),
    });
    if (!res.ok) return { rows: null, error: `Impact report HTTP ${res.status}` };
    const body: unknown = await res.json();
    return { rows: parseImpactProgramRows(body) };
  } catch (e) {
    const name = (e as Error)?.name;
    return { rows: null, error: name === 'TimeoutError' ? `Impact report timed out after ${IMPACT_TIMEOUT_MS / 1000} s` : redactError((e as Error).message) };
  }
}

async function main(): Promise<number> {
  const start = arg('start') ?? PIPE_RULE.windowStart;
  const end = arg('end') ?? daysAgo(1);
  const outPath = arg('out') ?? join(PROJECT_DIR, 'reports', 'funnel', `affiliate-pipe-read-${end}.md`);
  const jsonPath = arg('json');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) {
    say(`COULD-NOT-RUN reason=bad-range start=${start} end=${end}`);
    return 2;
  }

  let onSite: OnSiteLeg;
  try {
    onSite = await pullOnSite(start, end);
  } catch (e) {
    say(`COULD-NOT-RUN reason=db ${redactError((e as Error).message)}`);
    return 2;
  }
  const impact = await pullImpact(start, end);

  const read: PipeRead = assessPipe({
    windowStart: start,
    windowEnd: end,
    onSiteByPartner: onSite.byPartner,
    onSiteRepaired: onSite.repaired,
    impactRows: impact.rows,
    impactError: impact.error,
    onSitePerDay: onSite.perDay,
    now: new Date(),
  });
  const md = renderPipeReadMd(read);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, redactError(md));
  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, redactError(JSON.stringify(read, null, 2)) + '\n');
  }
  say(
    `${read.status === 'unknown' ? 'UNKNOWN' : 'OK'} ${start}→${end} on_site_${PIPE_RULE.partner}=${read.onSitePartner} (repaired ${read.onSiteRepaired}, all partners ${read.onSiteTotal}) impact_clicks=${read.recorded ?? 'unknown'} impact_actions=${read.actions ?? 'unknown'} share=${read.recordedShare == null ? 'n/a' : (read.recordedShare * 100).toFixed(1) + '%'} status=${read.status}${read.killClockStartsOn ? ` kill_clock_starts=${read.killClockStartsOn} kill_read=${read.killReadOn}` : ''} out=${outPath}`,
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    say(`FAIL affiliate-pipe-read crashed: ${(e as Error).message}`);
    process.exit(1);
  });
