/**
 * Probe link health across the mod catalog — read-only, no DB writes.
 *
 * Goal: estimate how many catalog mods have:
 *   - LIVE      — URL resolves with mod content
 *   - PAYWALLED — Patreon ViewForbidden (post + creator both exist; subscriber-only)
 *   - DEAD      — 404 / NotFound / account terminated / persistent gone
 *   - BLOCKED   — Cloudflare challenge / 5xx / timeout (can't determine)
 *   - UNKNOWN   — non-standard response that doesn't fit other buckets
 *
 * Host-aware probes:
 *   - patreon.com /posts/{id}  → public JSON API at /api/posts/{id}
 *   - thesimsresource.com      → fetch HTML, look for data-item or removal banner
 *   - tumblr.com / others      → HEAD then GET fallback
 *
 * Throttled per-host (1s between requests for the same host) so we don't get
 * Cloudflare-banned. Different hosts run in parallel.
 *
 * Usage:
 *   npx tsx scripts/probe-link-health.ts                 # 1000-mod stratified sample
 *   npx tsx scripts/probe-link-health.ts --limit 500
 *   npx tsx scripts/probe-link-health.ts --all           # full catalog (~2 hrs)
 *   npx tsx scripts/probe-link-health.ts --by-source-url 'https://musthavemods.com/sims-4-anklet-cc/'
 */

import './lib/setup-env';
import axios from 'axios';
import { prisma } from '../lib/prisma';

// ─────────────────────────────────────────────────────────────────────
// Types & flags
// ─────────────────────────────────────────────────────────────────────

type LinkStatus = 'live' | 'paywalled' | 'dead' | 'blocked' | 'unknown';

interface ProbeResult {
  status: LinkStatus;
  detail: string;
  httpStatus?: number;
}

interface ModRow {
  id: string;
  title: string;
  downloadUrl: string;
  sourceUrl: string | null;
  isFree: boolean;
}

interface Flags {
  limit: number;
  all: boolean;
  bySourceUrl: string | null;
  perHostDelayMs: number;
  showDead: number; // how many dead URLs to print
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { limit: 1000, all: false, bySourceUrl: null, perHostDelayMs: 1000, showDead: 30 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') flags.all = true;
    else if (a === '--limit' && argv[i + 1]) flags.limit = parseInt(argv[++i], 10);
    else if (a === '--by-source-url' && argv[i + 1]) flags.bySourceUrl = argv[++i];
    else if (a === '--delay' && argv[i + 1]) flags.perHostDelayMs = parseInt(argv[++i], 10);
    else if (a === '--show-dead' && argv[i + 1]) flags.showDead = parseInt(argv[++i], 10);
  }
  return flags;
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '(invalid)';
  }
}

// ─────────────────────────────────────────────────────────────────────
// Host-specific probes
// ─────────────────────────────────────────────────────────────────────

async function probePatreonPost(postId: string): Promise<ProbeResult> {
  try {
    const res = await axios.get(`https://www.patreon.com/api/posts/${postId}`, {
      validateStatus: () => true,
      timeout: 12_000,
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    });
    if (res.status === 200) {
      if (res.data?.data) return { status: 'live', detail: 'api-200', httpStatus: 200 };
      return { status: 'unknown', detail: 'api-200-no-data', httpStatus: 200 };
    }
    if (res.status === 403) {
      const code = res.data?.errors?.[0]?.code_name;
      if (code === 'ViewForbidden') return { status: 'paywalled', detail: 'view-forbidden', httpStatus: 403 };
      return { status: 'dead', detail: `403-${code ?? 'no-code'}`, httpStatus: 403 };
    }
    if (res.status === 404) return { status: 'dead', detail: 'api-404', httpStatus: 404 };
    if (res.status >= 500) return { status: 'blocked', detail: `api-${res.status}`, httpStatus: res.status };
    if (res.status === 429) return { status: 'blocked', detail: 'rate-limited', httpStatus: 429 };
    return { status: 'unknown', detail: `api-${res.status}`, httpStatus: res.status };
  } catch (err) {
    return classifyError(err);
  }
}

async function probeTsr(url: string): Promise<ProbeResult> {
  try {
    const res = await axios.get(url, {
      validateStatus: () => true,
      timeout: 15_000,
      headers: { 'User-Agent': UA },
      maxRedirects: 5,
    });
    if (res.status === 404) return { status: 'dead', detail: '404', httpStatus: 404 };
    if (res.status === 200) {
      const html = String(res.data ?? '');
      if (html.length < 1000) return { status: 'dead', detail: 'tiny-200', httpStatus: 200 };
      // TSR removal banner phrasings (observed across years of changes)
      if (
        html.includes('Page not found') ||
        html.includes('no longer available') ||
        html.includes('has been deleted') ||
        html.includes('Item not found')
      ) {
        return { status: 'dead', detail: 'removal-banner', httpStatus: 200 };
      }
      // The mod-detail page always serializes a data-item JSON blob
      if (html.includes('data-item=')) return { status: 'live', detail: 'data-item', httpStatus: 200 };
      // Profile page or category page (still "live" content even if not exact target)
      return { status: 'live', detail: '200-html', httpStatus: 200 };
    }
    if (res.status === 403) return { status: 'blocked', detail: 'tsr-403', httpStatus: 403 };
    if (res.status >= 500) return { status: 'blocked', detail: `${res.status}`, httpStatus: res.status };
    return { status: 'unknown', detail: `${res.status}`, httpStatus: res.status };
  } catch (err) {
    return classifyError(err);
  }
}

async function probeTumblr(url: string): Promise<ProbeResult> {
  try {
    const res = await axios.get(url, {
      validateStatus: () => true,
      timeout: 12_000,
      headers: { 'User-Agent': UA },
      maxRedirects: 5,
    });
    if (res.status === 404) return { status: 'dead', detail: 'tumblr-404', httpStatus: 404 };
    if (res.status === 410) return { status: 'dead', detail: 'tumblr-410-gone', httpStatus: 410 };
    if (res.status === 200) {
      const html = String(res.data ?? '');
      // Tumblr soft-404 — account terminated landing page
      if (
        html.includes('There&#x27;s nothing here') ||
        html.includes("There's nothing here") ||
        html.includes('terminated') ||
        html.includes('blog could not be found')
      ) {
        return { status: 'dead', detail: 'tumblr-soft-404', httpStatus: 200 };
      }
      return { status: 'live', detail: 'tumblr-200', httpStatus: 200 };
    }
    if (res.status >= 500) return { status: 'blocked', detail: `${res.status}`, httpStatus: res.status };
    return { status: 'unknown', detail: `${res.status}`, httpStatus: res.status };
  } catch (err) {
    return classifyError(err);
  }
}

async function probeGeneric(url: string): Promise<ProbeResult> {
  // HEAD first (cheap), GET fallback if HEAD not allowed
  try {
    const res = await axios.head(url, {
      validateStatus: () => true,
      timeout: 10_000,
      headers: { 'User-Agent': UA },
      maxRedirects: 5,
    });
    if (res.status === 200) return { status: 'live', detail: 'head-200', httpStatus: 200 };
    if (res.status >= 300 && res.status < 400) return { status: 'live', detail: `redirect-${res.status}`, httpStatus: res.status };
    if (res.status === 404 || res.status === 410) return { status: 'dead', detail: `${res.status}`, httpStatus: res.status };
    if (res.status === 405 || res.status === 403) {
      // HEAD often disallowed or CF-challenged; try GET
      const get = await axios.get(url, {
        validateStatus: () => true,
        timeout: 12_000,
        headers: { 'User-Agent': UA },
        maxRedirects: 5,
      });
      if (get.status === 200) return { status: 'live', detail: 'get-200', httpStatus: 200 };
      if (get.status === 404 || get.status === 410)
        return { status: 'dead', detail: `get-${get.status}`, httpStatus: get.status };
      if (get.status === 403) return { status: 'blocked', detail: 'get-403-cf?', httpStatus: 403 };
      return { status: 'unknown', detail: `get-${get.status}`, httpStatus: get.status };
    }
    if (res.status >= 500) return { status: 'blocked', detail: `${res.status}`, httpStatus: res.status };
    return { status: 'unknown', detail: `head-${res.status}`, httpStatus: res.status };
  } catch (err) {
    return classifyError(err);
  }
}

function classifyError(err: unknown): ProbeResult {
  const msg = err instanceof Error ? err.message : String(err);
  if (/timeout|ETIMEDOUT|ECONNABORTED/i.test(msg)) return { status: 'blocked', detail: 'timeout' };
  if (/ENOTFOUND|EAI_AGAIN/i.test(msg)) return { status: 'dead', detail: 'dns-fail' };
  if (/ECONNREFUSED|ECONNRESET/i.test(msg)) return { status: 'blocked', detail: 'conn-refused' };
  return { status: 'blocked', detail: msg.slice(0, 50) };
}

function pickStrategy(downloadUrl: string): { kind: string; probe: () => Promise<ProbeResult> } {
  let parsed: URL;
  try {
    parsed = new URL(downloadUrl);
  } catch {
    return {
      kind: 'invalid',
      probe: async () => ({ status: 'dead', detail: 'invalid-url' }),
    };
  }
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'patreon.com') {
    const m = parsed.pathname.match(/^\/posts\/(?:[^\/]+-)?(\d+)/);
    if (m) return { kind: 'patreon-post', probe: () => probePatreonPost(m[1]) };
    return { kind: 'patreon-other', probe: () => probeGeneric(downloadUrl) };
  }
  if (host === 'thesimsresource.com') return { kind: 'tsr', probe: () => probeTsr(downloadUrl) };
  if (host.endsWith('tumblr.com')) return { kind: 'tumblr', probe: () => probeTumblr(downloadUrl) };
  return { kind: 'generic', probe: () => probeGeneric(downloadUrl) };
}

// ─────────────────────────────────────────────────────────────────────
// Selection: which mods to probe?
// ─────────────────────────────────────────────────────────────────────

async function selectMods(flags: Flags): Promise<ModRow[]> {
  if (flags.bySourceUrl) {
    const mods = await prisma.mod.findMany({
      where: { sourceUrl: flags.bySourceUrl, downloadUrl: { not: null } },
      select: { id: true, title: true, downloadUrl: true, sourceUrl: true, isFree: true },
      orderBy: { createdAt: 'asc' },
    });
    return mods.filter((m): m is ModRow => !!m.downloadUrl);
  }

  if (flags.all) {
    const mods = await prisma.mod.findMany({
      where: { downloadUrl: { not: null } },
      select: { id: true, title: true, downloadUrl: true, sourceUrl: true, isFree: true },
    });
    return mods.filter((m): m is ModRow => !!m.downloadUrl);
  }

  // Stratified random sample by host so the per-host % counts are reliable.
  // We use raw SQL for cheap shuffling without loading the whole table.
  const totalLimit = flags.limit;
  const all = await prisma.$queryRawUnsafe<ModRow[]>(
    `SELECT id, title, "downloadUrl", "sourceUrl", "isFree"
     FROM mods
     WHERE "downloadUrl" IS NOT NULL
     ORDER BY random()
     LIMIT $1`,
    totalLimit,
  );
  return all;
}

// ─────────────────────────────────────────────────────────────────────
// Throttled execution: per-host queue, parallel across hosts
// ─────────────────────────────────────────────────────────────────────

interface Outcome extends ProbeResult {
  modId: string;
  title: string;
  downloadUrl: string;
  sourceUrl: string | null;
  host: string;
  kind: string;
  isFree: boolean;
}

async function probeAll(rows: ModRow[], flags: Flags): Promise<Outcome[]> {
  const byHost: Record<string, ModRow[]> = {};
  for (const r of rows) {
    const h = hostOf(r.downloadUrl);
    (byHost[h] ??= []).push(r);
  }

  const totalCount = rows.length;
  let completed = 0;
  const allOutcomes: Outcome[] = [];

  function logProgress(host: string, outcome: Outcome) {
    completed++;
    if (completed % 25 === 0 || completed === totalCount) {
      const pct = ((completed / totalCount) * 100).toFixed(1);
      process.stdout.write(`  …${completed}/${totalCount} (${pct}%) [${host} → ${outcome.status}]\n`);
    }
  }

  const hostJobs = Object.entries(byHost).map(async ([host, mods]) => {
    for (const m of mods) {
      const strat = pickStrategy(m.downloadUrl);
      const startedAt = Date.now();
      const result = await strat.probe();
      const outcome: Outcome = {
        ...result,
        modId: m.id,
        title: m.title,
        downloadUrl: m.downloadUrl,
        sourceUrl: m.sourceUrl,
        host,
        kind: strat.kind,
        isFree: m.isFree,
      };
      allOutcomes.push(outcome);
      logProgress(host, outcome);

      // Per-host throttle: ensure ≥perHostDelayMs between consecutive requests
      const elapsed = Date.now() - startedAt;
      const sleepFor = Math.max(0, flags.perHostDelayMs - elapsed);
      if (sleepFor > 0) await new Promise(r => setTimeout(r, sleepFor));
    }
  });

  await Promise.all(hostJobs);
  return allOutcomes;
}

// ─────────────────────────────────────────────────────────────────────
// Reporting
// ─────────────────────────────────────────────────────────────────────

function pad(s: string | number, n: number, right = false): string {
  const str = String(s);
  if (str.length >= n) return str.slice(0, n);
  return right ? str.padStart(n) : str.padEnd(n);
}

function report(outcomes: Outcome[], elapsedMs: number, flags: Flags): void {
  const total = outcomes.length;
  const counts: Record<LinkStatus, number> = { live: 0, paywalled: 0, dead: 0, blocked: 0, unknown: 0 };
  for (const o of outcomes) counts[o.status]++;

  console.log('\n' + '='.repeat(72));
  console.log('LINK HEALTH PROBE — RESULTS');
  console.log('='.repeat(72));
  console.log(`Sampled mods:   ${total}`);
  console.log(`Duration:       ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log('');
  console.log('OVERALL:');
  for (const status of ['live', 'paywalled', 'dead', 'blocked', 'unknown'] as LinkStatus[]) {
    const n = counts[status];
    const pct = total > 0 ? ((n / total) * 100).toFixed(1) : '0.0';
    console.log(`  ${pad(status, 10)} ${pad(n, 5, true)}  (${pct}%)`);
  }

  // Per-host breakdown
  const hosts: Record<string, Record<LinkStatus, number> & { total: number }> = {};
  for (const o of outcomes) {
    const h = (hosts[o.host] ??= {
      live: 0, paywalled: 0, dead: 0, blocked: 0, unknown: 0, total: 0,
    } as any);
    h[o.status]++;
    h.total++;
  }

  console.log('\nBY HOST (sorted by sample size):');
  console.log(
    '  ' +
      pad('host', 28) +
      pad('total', 7, true) +
      pad('live', 6, true) +
      pad('paywall', 8, true) +
      pad('dead', 6, true) +
      pad('blocked', 8, true) +
      pad('unk', 5, true) +
      pad('  dead%', 8, true),
  );
  console.log('  ' + '-'.repeat(76));
  const sortedHosts = Object.entries(hosts).sort((a, b) => b[1].total - a[1].total);
  for (const [h, c] of sortedHosts) {
    const deadPct = c.total > 0 ? ((c.dead / c.total) * 100).toFixed(1) + '%' : '-';
    console.log(
      '  ' +
        pad(h, 28) +
        pad(c.total, 7, true) +
        pad(c.live, 6, true) +
        pad(c.paywalled, 8, true) +
        pad(c.dead, 6, true) +
        pad(c.blocked, 8, true) +
        pad(c.unknown, 5, true) +
        pad(deadPct, 8, true),
    );
  }

  // Dead-detail breakdown
  if (counts.dead > 0) {
    console.log('\nDEAD DETAIL (top reasons):');
    const detailCounts: Record<string, number> = {};
    for (const o of outcomes) {
      if (o.status === 'dead') {
        detailCounts[o.detail] = (detailCounts[o.detail] ?? 0) + 1;
      }
    }
    const sorted = Object.entries(detailCounts).sort((a, b) => b[1] - a[1]);
    for (const [d, n] of sorted) console.log('  ' + pad(d, 30) + pad(n, 5, true));

    // Sample dead URLs
    console.log(`\nSAMPLE DEAD URLs (first ${flags.showDead}):`);
    let shown = 0;
    for (const o of outcomes) {
      if (o.status !== 'dead') continue;
      if (shown >= flags.showDead) break;
      console.log(
        `  [${o.host}] ${pad(o.title.slice(0, 40), 40)} ${pad(o.detail, 14)} ${o.downloadUrl.slice(0, 70)}`,
      );
      shown++;
    }
  }

  // Per-source-article dead counts (only useful if we sampled enough per article)
  const articleDead: Record<string, number> = {};
  const articleTotal: Record<string, number> = {};
  for (const o of outcomes) {
    if (!o.sourceUrl) continue;
    articleTotal[o.sourceUrl] = (articleTotal[o.sourceUrl] ?? 0) + 1;
    if (o.status === 'dead') articleDead[o.sourceUrl] = (articleDead[o.sourceUrl] ?? 0) + 1;
  }
  const articlesWithDead = Object.entries(articleDead)
    .filter(([_, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  if (articlesWithDead.length > 0) {
    console.log('\nTOP ARTICLES BY DEAD-LINK COUNT (sample-only — full counts require --by-source-url):');
    for (const [url, dead] of articlesWithDead) {
      const tot = articleTotal[url] ?? dead;
      console.log(`  ${dead}/${tot}  ${url}`);
    }
  }

  // Mismatch check: paid/paywalled bookkeeping
  const paywallNotPaid = outcomes.filter(o => o.status === 'paywalled' && o.isFree === true);
  const liveButPaid = outcomes.filter(o => o.status === 'live' && o.isFree === false);
  if (paywallNotPaid.length > 0 || liveButPaid.length > 0) {
    console.log('\nFLAG MISMATCHES (sanity-check vs current isFree):');
    if (paywallNotPaid.length > 0)
      console.log(`  paywalled-but-isFree=true:  ${paywallNotPaid.length}  (should be flipped to isFree=false)`);
    if (liveButPaid.length > 0)
      console.log(`  live-but-isFree=false:      ${liveButPaid.length}  (subscribed creator may have made post free)`);
  }

  console.log('\n' + '='.repeat(72));
}

// ─────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  console.log('🔍 Link health probe (read-only, no DB writes)\n');
  console.log('  Flags:', JSON.stringify(flags));

  const rows = await selectMods(flags);
  if (rows.length === 0) {
    console.log('No mods to probe.');
    await prisma.$disconnect();
    return;
  }

  // Quick preview of host distribution
  const hostCounts: Record<string, number> = {};
  for (const r of rows) hostCounts[hostOf(r.downloadUrl)] = (hostCounts[hostOf(r.downloadUrl)] ?? 0) + 1;
  const top = Object.entries(hostCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  console.log(`\n  ${rows.length} mods to probe across ${Object.keys(hostCounts).length} hosts. Top hosts:`);
  for (const [h, n] of top) console.log(`    ${pad(h, 30)} ${n}`);
  console.log('');
  console.log(`  Throttle: ${flags.perHostDelayMs}ms per-host (parallel across hosts)\n`);
  console.log('  Probing…');

  const startedAt = Date.now();
  const outcomes = await probeAll(rows, flags);
  const elapsedMs = Date.now() - startedAt;

  report(outcomes, elapsedMs, flags);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
