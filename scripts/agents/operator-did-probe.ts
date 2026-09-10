/**
 * scripts/agents/operator-did-probe.ts — the morning "operator did" probe (Rio, E35, 2026-09-10).
 *
 * The operator's out-of-band actions (a Vercel env var, a Patreon tier edit, a functions.php change)
 * show up in no feed the team reads, so the digest kept asking for things already done (2 repeated
 * asks on 09-09: the SMTP vars and the $3 perk line). This probe observes the three places the
 * operator acts, diffs them against yesterday's snapshot, and prints a "since yesterday" block the
 * digest can quote to thank rather than nag. Read-only everywhere; no secret value is ever read.
 *
 *   (1) Vercel Production env var NAMES — `vercel env ls production --cwd $MHM_OPERATOR_TREE`
 *       (the worktrees are not linked to the Vercel project; the operator tree is). Names only —
 *       the CLI never prints values, and every line of output passes through redact() anyway.
 *   (2) Patreon tiers — `GET /campaigns/{id}?include=tiers` via scripts/_patreon-auth.ts patreonGet():
 *       title, amount, published, patron_count, edited_at, and whether the description carries the
 *       Q4 step-1 perk line and the E30 welcome-note phrase. Patreon exposes NO per-tier welcome-note
 *       field in API v2 (tier attributes end at title/url/user_limit), so the welcome note is reported
 *       as "not observable via API"; campaign.thanks_msg and tier.description are checked instead.
 *   (3) functions.php critical markers — exit code of scripts/agents/check-blog-sidebar.sh (not reimplemented).
 *   (4) Delta vs the previous reports/funnel/operator-did-<date>.json (first run: everything is "new").
 *
 * Exit codes: 0 = observed and nothing failed · 2 = at least one section could not be observed
 * (vercel not logged in, no Patreon token, network) · 1 = a real failure (blog markers missing on
 * production, or the probe itself crashed). One summary line is appended to logs/operator-did.log
 * on every path, so "did not run" is never silent.
 *
 * Usage:
 *   npx tsx scripts/agents/operator-did-probe.ts [--date YYYY-MM-DD] [--baseline <json>] [--out-dir reports/funnel]
 *                                                 [--no-vercel] [--no-patreon] [--no-blog]
 * Env: MHM_OPERATOR_TREE (default /Users/eputnam/java_projects/MHMFinds), PATREON_* in .env.local.
 */
import { config as loadDotenv } from 'dotenv';
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  containsMarker,
  diffEnvNames,
  diffSnapshots,
  dollars,
  exitCodeFor,
  normaliseText,
  parseVercelEnvNames,
  redact,
  summaryLine,
  tiersFromCampaign,
  WHY_IT_MATTERS,
  WELCOME_NOTE_MARKER,
  PERK_LINE_MARKER,
  type CampaignResponse,
  type Delta,
  type Snapshot,
} from './operator-did-probe-lib';

loadDotenv({ path: '.env.local' });

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const opt = (name: string): string | null => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};

const TODAY = opt('--date') ?? new Date().toISOString().slice(0, 10);
const OUT_DIR = opt('--out-dir') ?? join('reports', 'funnel');
const LOG_FILE = join('logs', 'operator-did.log');
const OPERATOR_TREE = process.env.MHM_OPERATOR_TREE ?? '/Users/eputnam/java_projects/MHMFinds';
const CAMPAIGN = process.env.PATREON_CAMPAIGN_ID ?? '13460416';
const WELCOME_NOTE_DRAFT = 'reports/funnel/drafts/patreon-welcome-note-2026-09-09.md';

const say = (s: string) => console.log(redact(s));

// ---------------------------------------------------------------------------------------------
// (1) Vercel env var names
// ---------------------------------------------------------------------------------------------
function probeVercel(): Snapshot['env'] {
  const empty = { present: [], missing: [], optionalPresent: [], optionalMissing: [] };
  if (flag('--no-vercel')) return { status: 'could-not-run', note: '--no-vercel', ...empty };
  if (!existsSync(OPERATOR_TREE)) return { status: 'could-not-run', note: `operator tree not found: ${OPERATOR_TREE}`, ...empty };
  const r = spawnSync('vercel', ['env', 'ls', 'production', '--cwd', OPERATOR_TREE], { encoding: 'utf8', timeout: 60_000 });
  if (r.error) return { status: 'could-not-run', note: `vercel CLI: ${(r.error as NodeJS.ErrnoException).code ?? r.error.message}`, ...empty };
  const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  if (r.status !== 0) {
    const reason = /not logged in|no existing credentials|vercel login|log in/i.test(out)
      ? 'vercel not logged in'
      : `vercel exited ${r.status}: ${redact(out.trim().split('\n').slice(-1)[0] ?? '')}`;
    return { status: 'could-not-run', note: reason, ...empty };
  }
  const names = parseVercelEnvNames(out);
  if (names.length === 0) return { status: 'could-not-run', note: 'vercel env ls returned no names (output format changed?)', ...empty };
  const d = diffEnvNames(names);
  return { status: 'ok', present: d.present, missing: d.missing, optionalPresent: d.optionalPresent, optionalMissing: d.optionalMissing };
}

// ---------------------------------------------------------------------------------------------
// (2) Patreon tiers
// ---------------------------------------------------------------------------------------------
const TIER_FIELDS = 'title,amount_cents,published,patron_count,edited_at,description,published_at,unpublished_at';
const CHECKED_FIELDS = ['campaign.thanks_msg', 'tier.description'];

async function probePatreon(): Promise<Snapshot['patreon']> {
  const base = { tiers: [], welcomeNoteObservable: false as const, welcomeNoteCheckedFields: CHECKED_FIELDS };
  if (flag('--no-patreon')) return { status: 'could-not-run', note: '--no-patreon', ...base };
  const tok = process.env.PATREON_CREATOR_ACCESS_TOKEN;
  if (!tok || /^your[-_]/i.test(tok)) return { status: 'could-not-run', note: 'PATREON_CREATOR_ACCESS_TOKEN not set in .env.local', ...base };

  // Lazy import so a missing token never even loads the auth helper.
  const { patreonGet } = await import('../_patreon-auth');
  const url = (campaignFields: string | null) =>
    `https://www.patreon.com/api/oauth2/v2/campaigns/${CAMPAIGN}?include=tiers&fields%5Btier%5D=${TIER_FIELDS}` +
    (campaignFields ? `&fields%5Bcampaign%5D=${campaignFields}` : '');

  let body: CampaignResponse;
  let thanksChecked = true;
  try {
    body = await patreonGet(url('thanks_msg,patron_count'));
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (/Patreon API 4\d\d/.test(msg) && !/401|403/.test(msg)) {
      // Field-validation 400 — retry without the campaign fields, still read-only.
      thanksChecked = false;
      try {
        body = await patreonGet(url(null));
      } catch (e2) {
        return { status: 'could-not-run', note: `Patreon API: ${redact(String((e2 as Error)?.message ?? e2)).slice(0, 160)}`, ...base };
      }
    } else {
      return { status: 'could-not-run', note: `Patreon API: ${redact(msg).slice(0, 160)}`, ...base };
    }
  }

  const tiers = tiersFromCampaign(body);
  const thanks = body.data?.attributes?.thanks_msg;
  const thanksText = typeof thanks === 'string' ? thanks : '';
  const thanksMsgHasMarker = thanksChecked ? containsMarker(thanksText, WELCOME_NOTE_MARKER) : null;
  const thanksMsgLength = thanksChecked ? normaliseText(thanksText).length : null;
  return {
    status: 'ok',
    campaignId: CAMPAIGN,
    tiers,
    thanksMsgHasMarker,
    thanksMsgLength,
    welcomeNoteObservable: false,
    welcomeNoteCheckedFields: thanksChecked ? CHECKED_FIELDS : ['tier.description'],
    note: thanksChecked ? undefined : 'campaign fields rejected by the API; only tier.description checked',
  };
}

// ---------------------------------------------------------------------------------------------
// (3) functions.php markers
// ---------------------------------------------------------------------------------------------
function probeBlog(): Snapshot['blog'] {
  if (flag('--no-blog')) return { status: 'could-not-run', note: '--no-blog', exitCode: null };
  const script = join('scripts', 'agents', 'check-blog-sidebar.sh');
  if (!existsSync(script)) return { status: 'could-not-run', note: `${script} missing`, exitCode: null };
  const r = spawnSync('bash', [script, '--quiet'], { encoding: 'utf8', timeout: 120_000 });
  if (r.error) return { status: 'could-not-run', note: `spawn: ${r.error.message}`, exitCode: null };
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (r.status === 0) return { status: 'ok', exitCode: 0 };
  if (/HTTP 000/.test(out)) return { status: 'could-not-run', note: 'curl could not reach production (HTTP 000)', exitCode: r.status };
  const missing = out.split('\n').filter((l) => /\[FAIL\]/.test(l)).map((l) => l.trim()).join('; ');
  return { status: 'fail', note: redact(missing || `exit ${r.status}`), exitCode: r.status };
}

// ---------------------------------------------------------------------------------------------
// (4) baseline + report
// ---------------------------------------------------------------------------------------------
function loadBaseline(): Snapshot | null {
  const explicit = opt('--baseline');
  if (explicit) return JSON.parse(readFileSync(explicit, 'utf8')) as Snapshot;
  if (!existsSync(OUT_DIR)) return null;
  const files = readdirSync(OUT_DIR)
    .filter((f) => /^operator-did-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => f.slice('operator-did-'.length, -'.json'.length))
    .filter((d) => d < TODAY)
    .sort();
  if (files.length === 0) return null;
  return JSON.parse(readFileSync(join(OUT_DIR, `operator-did-${files[files.length - 1]}.json`), 'utf8')) as Snapshot;
}

function renderMd(s: Snapshot, prev: Snapshot | null, delta: Delta, code: number): string {
  const L: string[] = [];
  const verdict = code === 0 ? 'OK' : code === 2 ? 'COULD-NOT-RUN (partial)' : 'FAIL';
  L.push(`# Operator-did probe — ${s.date}`);
  L.push('');
  L.push(`**${verdict}** · generated ${s.generatedAt} · baseline: ${prev ? `${prev.date}${prev.reconstructed ? ' (reconstructed from documented observations, not a probe run)' : ''}` : 'none (first run)'}`);
  L.push('');
  L.push('Read-only. Names, titles and counts only — no env value, token, email or patron identity is read or printed.');
  L.push('');
  L.push('## Since yesterday');
  L.push('');
  for (const l of delta.lines) L.push(`- ${l}`);
  L.push('');
  L.push('## (1) Vercel Production env var names');
  L.push('');
  if (s.env.status === 'ok') {
    const total = s.env.present.length + s.env.missing.length;
    L.push(`- Required present: **${s.env.present.length}/${total}** — ${s.env.present.join(', ')}`);
    L.push(`- Required missing: **${s.env.missing.length}**${s.env.missing.length ? ' — ' + s.env.missing.map((n) => `\`${n}\``).join(', ') : ''}`);
    for (const n of s.env.missing) L.push(`  - \`${n}\`: ${WHY_IT_MATTERS[n] ?? ''}`);
    L.push(`- Optional (code default applies): present ${s.env.optionalPresent.length ? s.env.optionalPresent.join(', ') : 'none'}; absent ${s.env.optionalMissing.join(', ') || 'none'}`);
  } else {
    L.push(`- ${s.env.status}: ${s.env.note ?? ''}`);
  }
  L.push('');
  L.push(`## (2) Patreon tiers (campaign ${s.patreon.campaignId ?? CAMPAIGN})`);
  L.push('');
  if (s.patreon.status === 'ok') {
    L.push('| Tier | Price | Published | Patrons | Edited | Perk line | Welcome-note phrase in description |');
    L.push('|---|--:|:-:|--:|---|:-:|:-:|');
    for (const t of s.patreon.tiers) {
      L.push(`| ${t.title} | ${dollars(t.amount_cents)} | ${t.published ? 'yes' : 'no'} | ${t.patron_count} | ${t.edited_at ?? '—'} | ${t.descriptionHasPerk ? 'yes' : 'no'} | ${t.descriptionHasMarker ? 'yes' : 'no'} |`);
    }
    L.push('');
    L.push(`- Tier welcome note: **not observable via API** — Patreon API v2 tier attributes have no welcome-note field. Checked ${s.patreon.welcomeNoteCheckedFields.join(' and ')} for the phrase "${WELCOME_NOTE_MARKER}" (from \`${WELCOME_NOTE_DRAFT}\`): campaign.thanks_msg ${s.patreon.thanksMsgHasMarker === null || s.patreon.thanksMsgHasMarker === undefined ? 'not checked' : s.patreon.thanksMsgHasMarker ? 'contains it' : s.patreon.thanksMsgLength ? `is set (${s.patreon.thanksMsgLength} chars) but does not contain it` : 'is empty (no campaign thank-you message set)'}; tier descriptions ${s.patreon.tiers.some((t) => t.descriptionHasMarker) ? 'contain it' : 'do not contain it'}.`);
    L.push(`- Perk line ("${PERK_LINE_MARKER}") present on: ${s.patreon.tiers.filter((t) => t.descriptionHasPerk).map((t) => `${dollars(t.amount_cents)} ${t.title}`).join(', ') || 'no tier'}.`);
    if (s.patreon.note) L.push(`- Note: ${s.patreon.note}`);
  } else {
    L.push(`- ${s.patreon.status}: ${s.patreon.note ?? ''}`);
  }
  L.push('');
  L.push('## (3) functions.php critical markers (check-blog-sidebar.sh)');
  L.push('');
  L.push(`- ${s.blog.status}${s.blog.exitCode !== null ? ` (exit ${s.blog.exitCode})` : ''}${s.blog.note ? ` — ${s.blog.note}` : ''}`);
  L.push('');
  L.push('_Generated by scripts/agents/operator-did-probe.ts. Exit 0 ok · 2 could-not-run · 1 real failure. One line per run in logs/operator-did.log._');
  L.push('');
  return redact(L.join('\n'));
}

function appendLog(line: string) {
  try {
    mkdirSync('logs', { recursive: true });
    appendFileSync(LOG_FILE, line + '\n');
  } catch (e) {
    console.error(`[operator-did] could not append to ${LOG_FILE}: ${(e as Error).message}`);
  }
}

async function main() {
  const generatedAt = new Date().toISOString();
  const env = probeVercel();
  const patreon = await probePatreon();
  const blog = probeBlog();
  const snapshot: Snapshot = { date: TODAY, generatedAt, env, patreon, blog };
  const prev = loadBaseline();
  const delta = diffSnapshots(prev, snapshot);
  const code = exitCodeFor(snapshot);

  mkdirSync(OUT_DIR, { recursive: true });
  const jsonPath = join(OUT_DIR, `operator-did-${TODAY}.json`);
  const mdPath = join(OUT_DIR, `operator-did-${TODAY}.md`);
  writeFileSync(jsonPath, redact(JSON.stringify(snapshot, null, 2)) + '\n');
  const md = renderMd(snapshot, prev, delta, code);
  writeFileSync(mdPath, md);
  say(md);
  const line = summaryLine(snapshot, delta, code);
  appendLog(line);
  say(`[operator-did] ${line}`);
  say(`[operator-did] wrote ${mdPath} and ${jsonPath}`);
  process.exit(code);
}

main().catch((e) => {
  const msg = redact(String((e as Error)?.message ?? e));
  appendLog(`${new Date().toISOString()} FAIL probe crashed: ${msg.slice(0, 200)}`);
  console.error(`[operator-did] failed: ${msg}`);
  process.exit(1);
});
