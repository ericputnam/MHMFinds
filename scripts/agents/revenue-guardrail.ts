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
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { listDeploymentsPaged, classifyWindow, decideAction, coverageLine, type VercelDeployment, type VercelPage, type Coverage, type InWindow, type Status, type Action } from './revenue-guardrail-lib';

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
  day: string; expectedDay: Row; actualDay: Row;
  window3: { actualRevenue: number; expectedRevenue: number; actualRpm: number; expectedRpm: number; actualSessions: number; expectedSessions: number };
  rollbackTo: string | null; changes: Change[]; health: Record<string, unknown>; reasons: string[];
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

function recentChanges(sinceIso: string, untilIso: string, cwd: string): { changes: Change[]; rollbackTo: string | null; inWindow: InWindow; coverage: Coverage } {
  const changes: Change[] = [];
  const sinceMs = new Date(`${sinceIso}T00:00:00`).getTime();
  const untilMs = new Date(`${untilIso}T00:00:00`).getTime(); // deploys after the judged day cannot have caused it; listed as unjudged
  const { deployments, coverage } = listDeploymentsPaged(fetchVercelPage(cwd, Date.now() + VERCEL_LIST_BUDGET_MS), sinceMs);
  const { inWindowDeps, afterDeps, inWindow, rollbackTo } = classifyWindow(deployments, sinceMs, untilMs, coverage);
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
  return { changes, rollbackTo, inWindow, coverage };
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

  const { changes, rollbackTo, inWindow, coverage } = recentChanges(shift(day, -3), shift(day, 1), cwd);
  const covLine = coverageLine(coverage);
  // Never claim "no deploy in window" on a truncated list: inWindow is 'unknown' then, and unknown never rolls back.
  const { action, detail: actionDetail } = decideAction(status, inWindow, rollbackTo);
  if (status !== 'green' && inWindow === 'unknown') reasons.push(`${covLine} — whether a deploy landed in the window is UNKNOWN`);

  const v: Verdict = { status, action, actionDetail, vercelCoverage: { ...coverage, line: covLine, inWindow }, day, expectedDay, actualDay, window3, rollbackTo: action === 'rollback' ? rollbackTo : null, changes, health, reasons };
  const icon = status === 'green' ? '🟢' : status === 'yellow' ? '🟡' : '🔴';
  const actionText = `${action}${actionDetail ? ` (${actionDetail})` : ''}`;
  let md = `# Revenue guardrail — ${daysAgo(0)} (last finalized day ${day})\n\n${icon} **${status.toUpperCase()}** → action: **${actionText}**${v.rollbackTo ? ` → ${v.rollbackTo}` : ''}\n\n${covLine} · deploy in window: ${inWindow}\n\n`;
  for (const r of reasons) md += `- ${r}\n`;
  md += `\n| | ${day} | expected (same weekday, 4-wk avg) | Δ |\n|---|---|---|---|\n`;
  md += `| revenue | ${money(actualDay.revenue)} | ${money(expectedDay.revenue)} | ${pct(actualDay.revenue, expectedDay.revenue)} |\n`;
  md += `| session RPM | ${actualDay.rpm.toFixed(2)} | ${expectedDay.rpm.toFixed(2)} | ${pct(actualDay.rpm, expectedDay.rpm)} |\n`;
  md += `| sessions | ${actualDay.sessions.toLocaleString()} | ${Math.round(expectedDay.sessions).toLocaleString()} | ${pct(actualDay.sessions, expectedDay.sessions)} |\n`;
  md += `| 3-day revenue | ${money(window3.actualRevenue)} | ${money(window3.expectedRevenue)} | ${pct(window3.actualRevenue, window3.expectedRevenue)} |\n`;
  md += `| 3-day RPM | ${window3.actualRpm.toFixed(2)} | ${window3.expectedRpm.toFixed(2)} | ${pct(window3.actualRpm, window3.expectedRpm)} |\n`;
  md += `\nMediavine health: ${healthBad.length ? healthBad.map(([k, v]) => `${k}=${String(v)}`).join(', ') : 'all ok'}\n`;
  md += `\n## Production changes since ${shift(day, -3)} (72h before the judged day)\n\n`;
  md += changes.length ? changes.map((c) => `- ${c.kind} ${c.at.slice(0, 16)} \`${c.ref}\` ${c.text}${c.url ? ` — ${c.url}` : ''}`).join('\n') + '\n' : '- none\n';
  md += `\n## Rules\n\n- red-rpm + a Vercel deploy in the window → the runner rolls production back to the last READY deployment before the window, re-runs the smoke test, then Quinn investigates. Rolling back a harmless deploy is cheap; a day of broken ads is not.\n- red-rpm with the window's deploys UNKNOWN (vercel coverage TRUNCATED) → no rollback; Quinn pages \`vercel ls --next <ms>\` by hand before anything else — never read it as "no deploy".\n- red-rpm with no deploy in the window (coverage COMPLETE) → run \`check-blog-sidebar.sh\`; if it fails, re-push functions.php from git (\`push-blog-functions-prod.sh --yes\`); otherwise Rio opens a Mediavine ticket and the digest leads with it.\n- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.\n- yellow → no Tier 1 merges today; Tier 0 continues.\n`;

  const jsonOut = arg('--json'), mdOut = arg('--md');
  if (jsonOut) { mkdirSync(dirname(jsonOut), { recursive: true }); writeFileSync(jsonOut, JSON.stringify(v, null, 2)); }
  if (mdOut) { mkdirSync(dirname(mdOut), { recursive: true }); writeFileSync(mdOut, md); }
  if (!QUIET) console.log(md);
  else console.log(`${icon} ${status} → ${actionText}${v.rollbackTo ? ` ${v.rollbackTo}` : ''} · ${reasons[0]} · ${covLine}`);
  process.exit(status.startsWith('red') ? 2 : 0);
}

main().catch((e) => { console.error('[guardrail] could not evaluate:', e?.message ?? e); process.exit(3); });
