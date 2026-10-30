/**
 * scripts/agents/revenue-guardrail.ts — the revenue circuit breaker (Rule 2).
 *
 * "If your change significantly hurts RPM and revenue we go under as a business.
 *  You can't allow for that, and if it happens you need to fix it quickly."
 *
 * Every morning (and on demand) this compares the last finalized Mediavine day —
 * and the last 3 days — against the same weekdays of the previous 4 weeks, so a
 * Sunday is judged against Sundays. It classifies the state, lists every
 * production change in the 72h before the drop, and names the deployment to roll
 * back to. run-funnel-daily.sh acts on `action` before Quinn even starts.
 *
 *   green        nothing to do
 *   yellow       revenue 3-day < 90% of expected → watch, no new Tier 1 merges today
 *   red-rpm      RPM collapsed (site/ads broke) → ROLL BACK the newest deploy in the window, restore functions.php if the blog check fails
 *   red-traffic  sessions collapsed with RPM intact (Pinterest/Google) → Pip/Sage incident, no rollback
 *   red-health   Mediavine health check reports a problem → Rio incident
 *
 * Usage: npx tsx scripts/agents/revenue-guardrail.ts [--json out.json] [--md out.md] [--quiet]
 * Exit: 0 green/yellow, 2 red, 3 could not evaluate.
 */
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { listDeploymentsPaged, classifyWindow, decideAction, coverageLine, boundLine, ROLLBACK_BOUNDS, sessionsExSegment, sessionsExSegmentLine, exSegmentRpm, exSegmentRpmLine, segmentDimensionFilter, type ExSegmentRpm, type VercelDeployment, type VercelPage, type Coverage, type InWindow, type Status, type Action, type RollbackFacts, type SessionsByDate, type SessionsExSegment } from './revenue-guardrail-lib';

const args = process.argv.slice(2);
const arg = (k: string): string | undefined => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const QUIET = args.includes('--quiet');

function iso(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function daysAgo(n: number): string { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); }
function shift(isoDay: string, n: number): string { const [y, m, d] = isoDay.split('-').map(Number); const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() + n); return iso(dt); }
const money = (n: number) => `$${n.toFixed(2)}`;
const pct = (a: number, b: number) => (b ? `${((a / b - 1) * 100).toFixed(1)}%` : 'n/a');
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

interface Row { date: string; revenue: number; sessions: number; rpm: number; }
interface Change { kind: 'vercel' | 'commit' | 'functions.php'; at: string; ref: string; text: string; url?: string; }
interface Verdict {
  status: Status; action: Action; actionDetail: string | null;
  vercelCoverage: Coverage & { line: string; inWindow: InWindow };
  /** E169-b: the facts the rollback bound was judged on, the bound itself, and the one-line verdict. */
  rollbackBound: RollbackFacts & { maxInWindowDeploys: number; maxTargetAgeHours: number; line: string };
  day: string; expectedDay: Row; actualDay: Row;
  window3: { actualRevenue: number; expectedRevenue: number; actualRpm: number; expectedRpm: number; actualSessions: number; expectedSessions: number };
  /** Set only when action is `rollback` — the runner acts on this field. */
  rollbackTo: string | null;
  /** The newest READY production deploy before the window, whatever the action — what a manual rollback would target. */
  rollbackCandidate: string | null;
  changes: Change[]; health: Record<string, unknown>; reasons: string[];
  /** E227: the judged day's sessions ex the Singapore Direct segment (GA4 basis). null = GA4 could not run; never a verdict input. */
  sessionsExSegment: SessionsExSegment | null;
  sessionsExSegmentLine: string;
  /** E271: Mediavine revenue ÷ GA4 ex-segment sessions, day vs controls, with the mix-alone prediction and a mix/rate read. Informational. */
  sessionsExSegmentRpm: ExSegmentRpm | null;
  sessionsExSegmentRpmLine: string;
}

// E227 — GA4 sessions by day, site and segment, for the judged day and its same-weekday controls.
// Read-only, bounded (30 s per report), and any failure is returned as a reason string: the sessions
// line then prints "unavailable" and the status rules (Mediavine numbers) are untouched.
// `googleCredentialsPath` is the same 8 lines as in direct-bot-read.ts / funnel-scoreboard.ts — a shared
// helper is an Ops item (SD-11), not a Rio change.
const GA4_PROPERTY = process.env.GA4_PROPERTY_ID ?? '437117335';
const GA4_REPORT_TIMEOUT_MS = 30_000;
function googleCredentialsPath(): string | undefined {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  try {
    const cfg = JSON.parse(readFileSync(join(homedir(), '.claude.json'), 'utf8'));
    return cfg?.mcpServers?.['google-analytics']?.env?.GOOGLE_APPLICATION_CREDENTIALS ?? cfg?.mcpServers?.gsc?.env?.GOOGLE_APPLICATION_CREDENTIALS;
  } catch { return undefined; }
}
async function pullGa4Sessions(start: string, end: string): Promise<{ site: SessionsByDate; segment: SessionsByDate } | { unavailable: string }> {
  try {
    const keyFilename = googleCredentialsPath();
    if (!keyFilename) return { unavailable: 'GA4 could-not-run: no service-account credentials' };
    const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
    const client = new BetaAnalyticsDataClient({ keyFilename });
    const property = `properties/${GA4_PROPERTY}`;
    const daily = async (dimensionFilter?: Record<string, unknown>): Promise<SessionsByDate> => {
      const [res] = await client.runReport(
        { property, dateRanges: [{ startDate: start, endDate: end }], dimensions: [{ name: 'date' }], metrics: [{ name: 'sessions' }], ...(dimensionFilter ? { dimensionFilter: dimensionFilter as never } : {}), limit: 400 },
        { timeout: GA4_REPORT_TIMEOUT_MS },
      );
      const out: SessionsByDate = {};
      for (const row of res.rows ?? []) {
        const raw = row.dimensionValues?.[0]?.value ?? '';
        const key = /^\d{8}$/.test(raw) ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
        if (key) out[key] = Number(row.metricValues?.[0]?.value ?? 0);
      }
      return out;
    };
    const site = await daily();
    const segment = await daily(segmentDimensionFilter());
    return { site, segment };
  } catch (e) {
    return { unavailable: `GA4 could-not-run: ${String((e as Error)?.message ?? e).replace(/[A-Za-z0-9_-]{40,}/g, '[redacted]').slice(0, 120)}` };
  }
}

async function pull(): Promise<{ rows: Row[]; health: Record<string, unknown> }> {
  const { loadConfig } = await import('../mcp-mediavine/config.js');
  const { client } = loadConfig();
  const res = await client.earnings(daysAgo(36), daysAgo(1));
  const rows: Row[] = (res.earnings ?? []).map((r) => ({
    date: String(r.date).slice(0, 10).replace(/\//g, '-'),
    revenue: Number(r.revenue) || 0, sessions: Number(r.sessions) || 0, rpm: Number(r.session_rpm) || 0,
  })).sort((a, b) => a.date.localeCompare(b.date));
  const hc = ((await client.healthCheckStatus()) as { health_check?: Record<string, unknown> }).health_check ?? {};
  const health = { ...hc }; for (const k of ['site_id', 'created_at', 'updated_at']) delete health[k];
  return { rows, health };
}

// Each `vercel ls` call returns one 20-row page; the window routinely holds 100+ deploys, so we page
// (E169). Budget: per-call 60 s, whole listing 240 s — past that, coverage is TRUNCATED (UNKNOWN).
const VERCEL_LIST_BUDGET_MS = 240_000;
function fetchVercelPage(cwd: string, deadline: number) {
  return (next: number | null): VercelPage => {
    if (Date.now() > deadline) throw new Error(`time budget ${VERCEL_LIST_BUDGET_MS / 1000}s spent`);
    const cmd = `vercel ls --format json --yes${next !== null ? ` --next ${Math.floor(next)}` : ''}`;
    const out = execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60000 });
    const j = JSON.parse(out) as { deployments?: VercelDeployment[]; pagination?: { next?: number | null } };
    return { deployments: j.deployments ?? [], next: j.pagination?.next ?? null };
  };
}

function recentChanges(sinceIso: string, untilIso: string, cwd: string): { changes: Change[]; rollbackTo: string | null; inWindow: InWindow; coverage: Coverage; facts: RollbackFacts } {
  const changes: Change[] = [];
  const sinceMs = new Date(`${sinceIso}T00:00:00`).getTime();
  const untilMs = new Date(`${untilIso}T00:00:00`).getTime(); // deploys after the judged day cannot have caused it; listed as unjudged
  const { deployments, coverage } = listDeploymentsPaged(fetchVercelPage(cwd, Date.now() + VERCEL_LIST_BUDGET_MS), sinceMs);
  const { inWindowDeps, afterDeps, inWindow, rollbackTo, facts } = classifyWindow(deployments, sinceMs, untilMs, coverage);
  for (const d of [...afterDeps, ...inWindowDeps].sort((a, b) => Number(b.createdAt) - Number(a.createdAt))) {
    const m = (d.meta ?? {}) as Record<string, string>;
    const unjudged = Number(d.createdAt) >= untilMs ? ' [after judged day — judged tomorrow]' : '';
    changes.push({ kind: 'vercel', at: new Date(Number(d.createdAt)).toISOString(), ref: (m.githubCommitSha ?? '').slice(0, 7), text: `${d.state} ${(m.githubCommitMessage ?? '').split('\n')[0].slice(0, 90)}${unjudged}`, url: `https://${d.url}` });
  }
  try {
    const log = execSync(`git log origin/main --since="${sinceIso}" --format='%h|%cI|%s'`, { cwd, encoding: 'utf8', timeout: 20000 }).trim();
    for (const l of log.split('\n').filter(Boolean)) { const [h, at, ...s] = l.split('|'); changes.push({ kind: 'commit', at, ref: h, text: s.join('|').slice(0, 90) }); }
    const fp = execSync(`git log origin/main --since="${sinceIso}" --format='%h|%cI|%s' -- staging/wordpress/kadence-child-prod/functions.php`, { cwd, encoding: 'utf8', timeout: 20000 }).trim();
    for (const l of fp.split('\n').filter(Boolean)) { const [h, at, ...s] = l.split('|'); changes.push({ kind: 'functions.php', at, ref: h, text: s.join('|').slice(0, 90) }); }
  } catch { /* offline: git changes unknown */ }
  return { changes, rollbackTo, inWindow, coverage, facts };
}

async function main() {
  const cwd = process.cwd();
  const { rows, health } = await pull();
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const finalized = rows.filter((r) => r.revenue > 0 && r.sessions > 0);
  if (!finalized.length) throw new Error('no finalized Mediavine days in the last 36 days');
  const day = finalized[finalized.length - 1].date;
  const actualDay = byDate.get(day)!;
  const priorDays = [1, 2, 3, 4].map((k) => byDate.get(shift(day, -7 * k))).filter((r): r is Row => !!r && r.revenue > 0);
  if (priorDays.length < 2) throw new Error(`only ${priorDays.length} comparable prior weekdays for ${day}`);
  const expectedDay: Row = { date: 'expected', revenue: mean(priorDays.map((r) => r.revenue)), sessions: mean(priorDays.map((r) => r.sessions)), rpm: mean(priorDays.map((r) => r.rpm)) };
  const win = (end: string) => [0, 1, 2].map((i) => byDate.get(shift(end, -i))).filter((r): r is Row => !!r && r.revenue > 0);
  const a3 = win(day);
  const e3s = [1, 2, 3, 4].map((k) => win(shift(day, -7 * k))).filter((w) => w.length === 3);
  const sum = (w: Row[], f: keyof Row) => w.reduce((s, r) => s + Number(r[f]), 0);
  const window3 = {
    actualRevenue: sum(a3, 'revenue'), expectedRevenue: mean(e3s.map((w) => sum(w, 'revenue'))),
    actualSessions: sum(a3, 'sessions'), expectedSessions: mean(e3s.map((w) => sum(w, 'sessions'))),
    actualRpm: sum(a3, 'sessions') ? (sum(a3, 'revenue') / sum(a3, 'sessions')) * 1000 : 0,
    expectedRpm: mean(e3s.map((w) => (sum(w, 'sessions') ? (sum(w, 'revenue') / sum(w, 'sessions')) * 1000 : 0))),
  };
  const rRev = actualDay.revenue / expectedDay.revenue, rRpm = actualDay.rpm / expectedDay.rpm, rSess = actualDay.sessions / expectedDay.sessions;
  const r3Rev = window3.actualRevenue / window3.expectedRevenue, r3Rpm = window3.actualRpm / window3.expectedRpm;

  // E227: the same day and the same four same-weekday controls, on the GA4 basis, raw and ex the segment.
  // Informational — the status rules above are already decided and do not read this.
  const priorDayKeys = [1, 2, 3, 4].map((k) => shift(day, -7 * k));
  const ga4 = await pullGa4Sessions(shift(day, -28), day);
  const exSeg: SessionsExSegment | null = 'unavailable' in ga4 ? null : sessionsExSegment(day, priorDayKeys, ga4.site, ga4.segment);
  const exSegWhy = 'unavailable' in ga4 ? ga4.unavailable : exSeg ? null : `GA4 returned no row for ${day} or fewer than 2 same-weekday controls`;
  const exSegLine = sessionsExSegmentLine(exSeg, exSegWhy);
  // E271: the same subtraction applied to the rate. Mediavine revenue over GA4 ex-segment sessions, so a headline
  // RPM move that is only the segment's share moving reads "mix" in either direction. Informational, like exSeg.
  const exSegRpm = exSegmentRpm(exSeg, actualDay.revenue, expectedDay.revenue);
  const exSegRpmLine = exSegmentRpmLine(exSegRpm, exSegRpm ? null : exSegWhy ?? 'revenue or ex-segment sessions not positive');

  const reasons: string[] = [];
  let status: Status = 'green';
  const healthBad = Object.entries(health).filter(([k, v]) => k !== 'date' && v !== 'ok' && v !== true && v !== null);
  if (healthBad.length) { status = 'red-health'; reasons.push(`Mediavine health: ${healthBad.map(([k, v]) => `${k}=${String(v)}`).join(', ')}`); }
  if ((rRpm < 0.85 && rRev < 0.8) || (r3Rpm < 0.85 && r3Rev < 0.8)) {
    status = 'red-rpm';
    reasons.push(`RPM ${actualDay.rpm.toFixed(2)} vs expected ${expectedDay.rpm.toFixed(2)} (${pct(actualDay.rpm, expectedDay.rpm)}) on ${day}; revenue ${money(actualDay.revenue)} vs ${money(expectedDay.revenue)} (${pct(actualDay.revenue, expectedDay.revenue)}); 3-day revenue ${pct(window3.actualRevenue, window3.expectedRevenue)}, 3-day RPM ${pct(window3.actualRpm, window3.expectedRpm)}`);
  } else if (rRev < 0.75 && rSess < 0.8) {
    status = status === 'green' ? 'red-traffic' : status;
    reasons.push(`Sessions ${actualDay.sessions.toLocaleString()} vs expected ${Math.round(expectedDay.sessions).toLocaleString()} (${pct(actualDay.sessions, expectedDay.sessions)}) with RPM intact (${pct(actualDay.rpm, expectedDay.rpm)}) — a traffic problem, not a site problem`);
  } else if (rRev < 0.9 || r3Rev < 0.9) {
    status = status === 'green' ? 'yellow' : status;
    reasons.push(`Revenue ${money(actualDay.revenue)} on ${day} is ${pct(actualDay.revenue, expectedDay.revenue)} vs same weekday avg; 3-day ${pct(window3.actualRevenue, window3.expectedRevenue)}`);
  }
  if (status === 'green') reasons.push(`Revenue ${money(actualDay.revenue)} (${pct(actualDay.revenue, expectedDay.revenue)}), RPM ${actualDay.rpm.toFixed(2)} (${pct(actualDay.rpm, expectedDay.rpm)}), sessions ${pct(actualDay.sessions, expectedDay.sessions)} vs same weekday, prior 4 weeks · 3-day revenue ${pct(window3.actualRevenue, window3.expectedRevenue)}`);

  const since = shift(day, -3);
  const { changes, rollbackTo, inWindow, coverage, facts } = recentChanges(since, shift(day, 1), cwd);
  const covLine = coverageLine(coverage);
  const bLine = boundLine(facts, rollbackTo);
  // Never claim "no deploy in window" on a truncated list: inWindow is 'unknown' then, and unknown never rolls back.
  // E169-b: a known in-window deploy still only rolls back inside ROLLBACK_BOUNDS (one day of deploys, target ≤ 48 h).
  const { action, detail: actionDetail } = decideAction(status, inWindow, rollbackTo, facts);
  if (status !== 'green' && inWindow === 'unknown') reasons.push(`${covLine} — whether a deploy landed in the window is UNKNOWN`);
  if (status === 'red-rpm' && inWindow === 'yes' && rollbackTo && action !== 'rollback') {
    reasons.push(`rollback withheld — ${actionDetail}. The newest READY production deploy before the window is ${rollbackTo}; rolling back to it would revert every production deploy since ${since} (${facts.inWindowCount} deploys), which is not a single-bad-deploy hypothesis. Quinn: Rio reads the Mediavine side first; a manual rollback is Tier 1 (\`./scripts/agents/deploy-verify.sh --rollback --to <url>\`), or roll back one PR by reverting its commit.`);
  }

  const v: Verdict = {
    status, action, actionDetail, vercelCoverage: { ...coverage, line: covLine, inWindow },
    rollbackBound: { ...facts, maxInWindowDeploys: ROLLBACK_BOUNDS.maxInWindowDeploys, maxTargetAgeHours: ROLLBACK_BOUNDS.maxTargetAgeMs / 3_600_000, line: bLine },
    day, expectedDay, actualDay, window3, rollbackTo: action === 'rollback' ? rollbackTo : null, rollbackCandidate: rollbackTo, changes, health, reasons,
    sessionsExSegment: exSeg, sessionsExSegmentLine: exSegLine,
    sessionsExSegmentRpm: exSegRpm, sessionsExSegmentRpmLine: exSegRpmLine,
  };
  const icon = status === 'green' ? '🟢' : status === 'yellow' ? '🟡' : '🔴';
  const actionText = `${action}${actionDetail ? ` (${actionDetail})` : ''}`;
  let md = `# Revenue guardrail — ${daysAgo(0)} (last finalized day ${day})\n\n${icon} **${status.toUpperCase()}** → action: **${actionText}**${v.rollbackTo ? ` → ${v.rollbackTo}` : ''}\n\n${covLine} · deploy in window: ${inWindow}\n\n${bLine}\n\n`;
  for (const r of reasons) md += `- ${r}\n`;
  md += `\n| | ${day} | expected (same weekday, 4-wk avg) | Δ |\n|---|---|---|---|\n`;
  md += `| revenue | ${money(actualDay.revenue)} | ${money(expectedDay.revenue)} | ${pct(actualDay.revenue, expectedDay.revenue)} |\n`;
  md += `| session RPM | ${actualDay.rpm.toFixed(2)} | ${expectedDay.rpm.toFixed(2)} | ${pct(actualDay.rpm, expectedDay.rpm)} |\n`;
  md += `| sessions | ${actualDay.sessions.toLocaleString()} | ${Math.round(expectedDay.sessions).toLocaleString()} | ${pct(actualDay.sessions, expectedDay.sessions)} |\n`;
  if (exSeg) {
    md += `| sessions, GA4 raw | ${Math.round(exSeg.raw.actual).toLocaleString()} | ${Math.round(exSeg.raw.expected).toLocaleString()} | ${pct(exSeg.raw.actual, exSeg.raw.expected)} |\n`;
    md += `| **sessions ex ${exSeg.rule.country} ${exSeg.rule.source}** (${exSeg.rule.experiment}, GA4) | ${Math.round(exSeg.exSegment.actual).toLocaleString()} | ${Math.round(exSeg.exSegment.expected).toLocaleString()} | ${pct(exSeg.exSegment.actual, exSeg.exSegment.expected)} |\n`;
  }
  if (exSegRpm) {
    md += `| **ex-segment RPM** (E271; MV revenue ÷ GA4 ex-segment sessions) | ${exSegRpm.actual.toFixed(2)} | ${exSegRpm.expected.toFixed(2)} | ${pct(exSegRpm.actual, exSegRpm.expected)} → ${exSegRpm.read} |\n`;
  }
  md += `| 3-day revenue | ${money(window3.actualRevenue)} | ${money(window3.expectedRevenue)} | ${pct(window3.actualRevenue, window3.expectedRevenue)} |\n`;
  md += `| 3-day RPM | ${window3.actualRpm.toFixed(2)} | ${window3.expectedRpm.toFixed(2)} | ${pct(window3.actualRpm, window3.expectedRpm)} |\n`;
  md += `\n${exSegLine}\n\n${exSegRpmLine}\n`;
  md += `\nMediavine health: ${healthBad.length ? healthBad.map(([k, v]) => `${k}=${String(v)}`).join(', ') : 'all ok'}\n`;
  md += `\n## Production changes since ${shift(day, -3)} (72h before the judged day)\n\n`;
  md += changes.length ? changes.map((c) => `- ${c.kind} ${c.at.slice(0, 16)} \`${c.ref}\` ${c.text}${c.url ? ` — ${c.url}` : ''}`).join('\n') + '\n' : '- none\n';
  md += `\n## Rules\n\n- red-rpm + a Vercel deploy in the window + at most ${ROLLBACK_BOUNDS.maxInWindowDeploys} in-window production deploys + a READY target no more than ${ROLLBACK_BOUNDS.maxTargetAgeMs / 3_600_000} h before the window start → the runner rolls production back to that target, re-runs the smoke test, then Quinn investigates. Rolling back one harmless deploy is cheap; a day of broken ads is not.\n- red-rpm with a deploy in the window but OUTSIDE the bound (E169-b: more than a day's worth of deploys, or a target more than 48 h back) → no automatic rollback; the headline names the bound and the "rollback withheld" reason gives the candidate target. Rio reads the Mediavine side first (10-01 and 10-02 were both Mediavine-side at the quarter boundary); a manual rollback is Tier 1.\n- red-rpm with the window's deploys UNKNOWN (vercel coverage TRUNCATED) → no rollback; Quinn pages \`vercel ls --next <ms>\` by hand before anything else — never read it as "no deploy".\n- red-rpm with no deploy in the window (coverage COMPLETE) → run \`check-blog-sidebar.sh\`; if it fails, re-push functions.php from git (\`push-blog-functions-prod.sh --yes\`); otherwise Rio opens a Mediavine ticket and the digest leads with it.\n- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.\n- yellow → no Tier 1 merges today; Tier 0 continues.\n`;

  const jsonOut = arg('--json'), mdOut = arg('--md');
  if (jsonOut) { mkdirSync(dirname(jsonOut), { recursive: true }); writeFileSync(jsonOut, JSON.stringify(v, null, 2)); }
  if (mdOut) { mkdirSync(dirname(mdOut), { recursive: true }); writeFileSync(mdOut, md); }
  if (!QUIET) console.log(md);
  else console.log(`${icon} ${status} → ${actionText}${v.rollbackTo ? ` ${v.rollbackTo}` : ''} · ${reasons[0]} · ${covLine} · ${bLine} · ${exSegLine} · ${exSegRpmLine}`);
  process.exit(status.startsWith('red') ? 2 : 0);
}

main().catch((e) => { console.error('[guardrail] could not evaluate:', e?.message ?? e); process.exit(3); });
