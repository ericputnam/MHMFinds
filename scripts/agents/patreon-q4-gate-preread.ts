/**
 * scripts/agents/patreon-q4-gate-preread.ts — E69 (Rio, 2026-09-20).
 *
 * Read-only pre-read of the Q4 gate (operator-queue Q4, decided 2026-09-08,
 * read 2026-09-22). Prints the gate's two inputs, the decision the rule as
 * written would produce today, and — the question nobody had answered —
 * WHO the Patreon-linked site accounts are: each `Account.provider='patreon'`
 * row is looked up by Patreon user id in the campaign's full member list and
 * counted as active / free / former / declined / not-in-campaign.
 *
 * Sources: Patreon Members API (creator token, `include=user`) and the
 * production DB (`Account`, `User`). Aggregates only: no email, name, id or
 * token is ever printed; every error message goes through `redactError()`.
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/agents/patreon-q4-gate-preread.ts dotenv_config_path=.env.local \
 *     [--out reports/funnel/patreon-q4-gate-preread-YYYY-MM-DD.md] [--no-write] [--anchor <ISO>|rename]
 *
 * `--anchor` (E108, 2026-09-25) re-reads the same rule from a different start:
 * `--anchor rename` is `RENAME_WATCH.anchor` (the operator's overnight tier
 * renames); any ISO date is accepted. Only "since anchor" inputs move — the
 * connected leg, the 7-day counts and the classification do not depend on it.
 *
 * Degraded mornings (E125, 2026-09-27): the two sources are settled
 * independently. If one fails (deadline, HTTP error, truncated page walk, 0
 * rows) the reachable half is still printed, the missing leg reads UNKNOWN,
 * the file is written with a `-partial` suffix and the exit code is 2. The
 * Members API walk is bounded to PREREAD_ATTEMPTS × PREREAD_DEADLINE_MS
 * (≤ 120 s); the DB read to one PREREAD_DEADLINE_MS.
 *
 * Exit 0 = full report · 2 = partial report (one source degraded; a finding,
 * never a verdict) · 1 = both sources failed / bad arguments.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { redactError } from './operator-did-probe-lib';
import {
  Q4_GATE,
  RENAME_WATCH,
  classifyLinkedAccounts,
  formatPaidByAmount,
  gradeSources,
  q4GateDecision,
  summarizePatreonMembers,
  type LinkedPatreonAccount,
  type PatreonMemberAttrs,
  type SourceStatus,
} from './patreon-members-lib';

const args = process.argv.slice(2);
const argValue = (flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const NO_WRITE = args.includes('--no-write');
const TODAY = new Date().toISOString().slice(0, 10);

/** Per-attempt wall clock for one source. Two attempts on the Members API → ≤ 120 s in total. */
const PREREAD_DEADLINE_MS = 60_000;
const PREREAD_ATTEMPTS = 2;
/** ~500 rows/page; the campaign is ~5,900 rows (12 pages). Hitting the cap means the walk is incomplete. */
const MEMBERS_PAGE_CAP = 50;

/** `--anchor rename` → RENAME_WATCH.anchor; an ISO string is used as given; absent → Q4_GATE.anchor. Anything unparseable is a hard error, never a silent default. */
export function resolveAnchor(raw: string | undefined): { anchor: string; isRename: boolean } {
  if (raw === undefined) return { anchor: Q4_GATE.anchor, isRename: false };
  if (raw === 'rename') return { anchor: RENAME_WATCH.anchor, isRename: true };
  if (Number.isNaN(new Date(raw).getTime())) throw new Error(`--anchor "${raw}" is not an ISO date (or "rename")`);
  return { anchor: new Date(raw).toISOString(), isRename: raw === RENAME_WATCH.anchor };
}
const ANCHOR = (() => {
  try {
    return resolveAnchor(argValue('--anchor'));
  } catch (e) {
    console.error('[q4-gate-preread] failed:', redactError(String((e as Error)?.message ?? e)));
    process.exit(1);
  }
})();
const OUT =
  argValue('--out') ??
  join('reports', 'funnel', ANCHOR.isRename ? `patreon-rename-watch-${TODAY}.md` : `patreon-q4-gate-preread-${TODAY}.md`);
const CAMPAIGN = process.env.PATREON_CAMPAIGN_ID ?? '13460416';

/** Race a promise against a deadline. The loser is not cancelled — `main()` exits the process explicitly so a hung fetch cannot keep it alive. */
function withDeadline<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} exceeded the ${ms} ms deadline`)), ms);
  });
  return Promise.race([p, deadline]).finally(() => clearTimeout(timer));
}

async function fetchMembersOnce(): Promise<PatreonMemberAttrs[]> {
  const { patreonGet, nextPageTimeoutMs, PATREON_WALK_BUDGET_MS } = await import('../_patreon-auth');
  // Bounded walk (E139): each page ≤ PATREON_PAGE_TIMEOUT_MS, whole walk ≤ PATREON_WALK_BUDGET_MS.
  const walkDeadline = Date.now() + PATREON_WALK_BUDGET_MS;
  const members: PatreonMemberAttrs[] = [];
  let url: string | null =
    `https://www.patreon.com/api/oauth2/v2/campaigns/${CAMPAIGN}/members?fields%5Bmember%5D=patron_status,pledge_relationship_start,last_charge_date,currently_entitled_amount_cents,email&include=user&page%5Bcount%5D=500`;
  let pages = 0;
  while (url && pages < MEMBERS_PAGE_CAP) {
    const j: {
      data?: Array<{ attributes: PatreonMemberAttrs; relationships?: { user?: { data?: { id?: string } | null } } }>;
      links?: { next?: string };
    } = await patreonGet(url, { signal: AbortSignal.timeout(nextPageTimeoutMs(walkDeadline, pages)) });
    // `include=user` puts the Patreon user id on the relationship; the
    // `included` user objects are never read (no user fields requested).
    members.push(...(j.data ?? []).map((d) => ({ ...d.attributes, patreonUserId: d.relationships?.user?.data?.id ?? null })));
    url = j.links?.next ?? null;
    pages += 1;
  }
  // A capped walk with `links.next` still set is a truncated sample: unknown, never a count.
  if (url) throw new Error(`Members API walk truncated at the ${MEMBERS_PAGE_CAP}-page cap with links.next unexhausted (${members.length} rows so far)`);
  return members;
}

async function fetchMembers(): Promise<PatreonMemberAttrs[]> {
  let last: unknown;
  for (let attempt = 1; attempt <= PREREAD_ATTEMPTS; attempt += 1) {
    try {
      return await withDeadline(fetchMembersOnce(), PREREAD_DEADLINE_MS, `Members API attempt ${attempt}/${PREREAD_ATTEMPTS}`);
    } catch (e) {
      last = e;
      console.error(`[q4-gate-preread] members attempt ${attempt}/${PREREAD_ATTEMPTS} failed: ${redactError(String((e as Error)?.message ?? e))}`);
    }
  }
  throw last;
}

interface LinkedRow extends LinkedPatreonAccount {
  userCreatedDay: string;
  /** the user has a credentials login as well as Patreon (linked an existing account) */
  hasCredentials: boolean;
  isPremium: boolean;
}

async function fetchLinkedOnce(): Promise<LinkedRow[]> {
  const { prisma } = await import('../../lib/prisma');
  try {
    const rows = await prisma.account.findMany({
      where: { provider: 'patreon' },
      select: {
        providerAccountId: true,
        user: { select: { email: true, createdAt: true, isPremium: true, accounts: { select: { provider: true } } } },
      },
    });
    return rows.map((a) => ({
      providerAccountId: a.providerAccountId,
      email: a.user.email,
      userCreatedDay: a.user.createdAt.toISOString().slice(0, 10),
      hasCredentials: a.user.accounts.some((x) => x.provider === 'credentials'),
      isPremium: a.user.isPremium,
    }));
  } finally {
    await prisma.$disconnect();
  }
}

function fetchLinked(): Promise<LinkedRow[]> {
  return withDeadline(fetchLinkedOnce(), PREREAD_DEADLINE_MS, 'production DB (linked accounts)');
}

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((1000 * n) / d) / 10}%` : '—');
const yes = (b: boolean) => (b ? 'PASS' : 'FAIL');

interface Degraded {
  /** redacted error text when the Members API leg failed, else null */
  membersErr: string | null;
  /** redacted error text when the production DB leg failed, else null */
  linkedErr: string | null;
}

function render(members: PatreonMemberAttrs[] | null, linked: LinkedRow[] | null, now: Date, degraded: Degraded): string {
  const partial = degraded.membersErr !== null || degraded.linkedErr !== null;
  const lines: string[] = [];
  const anchorDay = ANCHOR.anchor.slice(0, 10);

  if (ANCHOR.isRename) {
    lines.push(`# Post-rename watch — ${now.toISOString().slice(0, 10)}${partial ? ' (PARTIAL)' : ''} (anchor ${ANCHOR.anchor}; reads ${RENAME_WATCH.readDate}, final ${RENAME_WATCH.finalReadDate})`);
    lines.push('');
    lines.push(`_Generated ${now.toISOString()} by \`scripts/agents/patreon-q4-gate-preread.ts --anchor rename\` (E108). Read-only; Patreon Members API + production DB; counts only. The operator renamed the paid tiers at the anchor while the Q4 gate read HOLD; this file applies the gate's own revert clause from the rename onward — it does not re-open the gate._`);
  } else {
    lines.push(`# Q4 gate pre-read — ${now.toISOString().slice(0, 10)}${partial ? ' (PARTIAL)' : ''} (gate reads ${Q4_GATE.readDate})`);
    lines.push('');
    lines.push(`_Generated ${now.toISOString()} by \`scripts/agents/patreon-q4-gate-preread.ts\` (E69). Read-only; Patreon Members API + production DB; counts only. The rule below was written on 2026-09-08 — this file applies it, it does not choose it._`);
  }
  if (partial) {
    lines.push('');
    if (degraded.membersErr !== null) lines.push(`> **PARTIAL READ (exit 2)** — the Patreon Members API leg failed: ${degraded.membersErr}. Paid, joins, cancels and the connected leg are **UNKNOWN** today; only the site-account counts below are real. Re-run when the API is back — this file is not a read.`);
    if (degraded.linkedErr !== null) lines.push(`> **PARTIAL READ (exit 2)** — the production DB leg failed: ${degraded.linkedErr}. The Members API numbers below are real; the connected leg is **UNKNOWN** today and no PASS/FAIL is printed for it. Re-run when the DB is back before grading the connected leg.`);
  }
  if (ANCHOR.anchor !== Q4_GATE.anchor && !ANCHOR.isRename) {
    lines.push('');
    lines.push(`_Anchor overridden to ${ANCHOR.anchor} (default ${Q4_GATE.anchor}); only the "since anchor" inputs differ from the default read._`);
  }
  lines.push('');
  lines.push('## The rule (verbatim, operator-queue Q4)');
  lines.push('');
  if (ANCHOR.isRename) {
    lines.push(`The renames already happened at the anchor, so only the gate's revert clause is live here: revert the tier copy if cancels > ${RENAME_WATCH.cancelsPerMonthMax}/mo pace since ${anchorDay}. Joins are watched against the ${RENAME_WATCH.joinsPerMonthFloor}/mo floor (a finding, not a revert). The $10 tier still waits on the connected leg (≥ 1/3 of paid patrons connected on site, Patreon-id join).`);
  } else {
    lines.push(`Proceed to renames + $10 tier only if paid joins ≥ ${Q4_GATE.joinsPerMonthMin}/mo pace since ${anchorDay} AND ≥ 1/3 of paid patrons connected on site (Patreon-id join); revert the perk copy if cancels > ${Q4_GATE.cancelsPerMonthMax}/mo pace.`);
  }
  lines.push('');
  lines.push('## Inputs today');
  lines.push('');

  if (members === null) {
    lines.push('_Unavailable — the Members API leg failed (see the banner). Paid patrons, joins, cancels and the connected share are UNKNOWN; nothing here may be graded._');
  } else {
    // With the DB leg missing the summary is computed against an empty linked list: every
    // Members-API number is still exact; only the connected counts are meaningless and are
    // printed as UNKNOWN instead.
    const s = summarizePatreonMembers(members, linked ?? [], { now, anchor: ANCHOR.anchor });
    const g = q4GateDecision({ now, anchor: ANCHOR.anchor, paid: s.paid, joinsSinceAnchor: s.joinsSinceAnchor, cancelsSinceAnchor: s.cancelsSinceAnchor, paidAndConnectedById: s.paidAndConnectedById });
    const connectedKnown = linked !== null;

    lines.push('| Input | Value | Leg |');
    lines.push('|---|--:|---|');
    lines.push(`| Paid patrons (API) | ${s.paid} (${formatPaidByAmount(s.paidByAmount)}) ≈ $${s.grossMonthlyUsd.toFixed(2)}/mo · free ${s.free} · former ${s.former} | |`);
    lines.push(`| Paid joins since ${anchorDay} | ${s.joinsSinceAnchor} in ${g.daysSinceAnchor} d → **${g.joinsPerMonthPace}/mo pace** (perk tier ${s.joinsSinceAnchorAtPerkTier}; 7d ${s.joins7d}) | joins ≥ ${Q4_GATE.joinsPerMonthMin}/mo: **${yes(g.joinsLeg)}** |`);
    if (connectedKnown) {
      lines.push(`| Paid-and-connected (id join) | **${s.paidAndConnectedById}** of ${s.paid} paid = ${pct(s.paidAndConnectedById, s.paid)} (by email ${s.paidAndConnectedByEmail}; ${s.paidWithUserId}/${s.paid} paid rows carry an id; ${s.linkedWithPatreonId}/${linked!.length} linked rows carry one) | ≥ 1/3 connected: **${yes(g.connectedLeg)}** |`);
    } else {
      lines.push(`| Paid-and-connected (id join) | **UNKNOWN** — production DB unavailable; ${s.paidWithUserId}/${s.paid} paid rows carry an id | ≥ 1/3 connected: **UNKNOWN** |`);
    }
    lines.push(`| Cancels since ${anchorDay} (last charge on/after anchor) | ${s.cancelsSinceAnchor} → ${g.cancelsPerMonthPace}/mo pace (7d ${s.cancels7d}) | cancels > ${Q4_GATE.cancelsPerMonthMax}/mo → revert copy: **${g.revertCopy ? 'YES' : 'no'}** |`);
    lines.push('');
    if (ANCHOR.isRename) {
      const tenDollar = connectedKnown
        ? g.connectedLeg ? 'connected leg PASSES' : 'still HOLD on the connected leg'
        : 'connected leg UNKNOWN today (DB leg missing)';
      lines.push(`**Revert the tier copy today: ${g.revertCopy ? 'YES' : 'no'}** (cancels ${g.cancelsPerMonthPace}/mo pace vs > ${RENAME_WATCH.cancelsPerMonthMax}) · joins ${g.joinsPerMonthPace}/mo pace vs floor ${RENAME_WATCH.joinsPerMonthFloor} (${g.joinsLeg ? 'holding' : 'below — a finding, not a revert'}; meaningless before ~D+3) · $10 tier: ${tenDollar}.`);
    } else if (connectedKnown) {
      lines.push(`**Decision the rule produces today: ${g.decision}**${g.decision === 'HOLD' ? ' — do not rename tiers or add the $10 tier on 09-22 unless the failing leg turns before the read.' : ''}`);
    } else {
      // Without the connected leg the rule can still settle two of its three outcomes:
      // REVERT_COPY needs only cancels; HOLD needs only a failing joins leg. PROCEED cannot be read.
      const partialDecision = g.revertCopy ? 'REVERT_COPY' : !g.joinsLeg ? 'HOLD (joins leg fails on its own)' : 'UNKNOWN — joins pass, connected leg unread';
      lines.push(`**Decision the rule produces today: ${partialDecision}**`);
    }
    lines.push('');
    lines.push(`- The cancels leg is a floor, not a count, until the 2026-10-01 charge run: Patreon bills most patrons on the 1st, so \`last_charge_date ≥ ${anchorDay}\` can only see people who joined after the anchor and left again. Re-read cancels after 10-01 before treating "revert copy: no" as final.`);
  }

  lines.push('');
  lines.push('## Why paid-and-connected is what it is: who the linked accounts are');
  lines.push('');
  if (linked === null) {
    lines.push('_Unavailable — the production DB leg failed (see the banner). Linked-account counts and their classification are UNKNOWN today._');
  } else {
    const byDay: Record<string, number> = {};
    let patreonOnly = 0;
    let premiumAmongLinked = 0;
    for (const r of linked) {
      byDay[r.userCreatedDay] = (byDay[r.userCreatedDay] ?? 0) + 1;
      if (!r.hasCredentials) patreonOnly += 1;
      if (r.isPremium) premiumAmongLinked += 1;
    }
    const linkedSinceAnchor = Object.entries(byDay).filter(([d]) => d >= anchorDay).reduce((a, [, n]) => a + n, 0);
    const dayLine = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([d, n]) => `${d.slice(5)}: ${n}`).join(' · ');

    if (members === null) {
      lines.push(`${linked.length} site accounts have a Patreon login. Their class (active / free / former / not in campaign) needs the member list, which is UNKNOWN today.`);
    } else {
      const cls = classifyLinkedAccounts(members, linked);
      const largest = (Object.entries({ free: cls.freeMember, 'not in campaign': cls.notInCampaign, former: cls.formerPatron, declined: cls.declinedPatron, active: cls.activePatron }) as Array<[string, number]>)
        .sort((a, b) => b[1] - a[1])[0];
      lines.push(`${cls.total} site accounts have a Patreon login. Each Patreon id looked up in the campaign's ${members.length} member rows:`);
      lines.push('');
      lines.push('| Class | Accounts | Share |');
      lines.push('|---|--:|--:|');
      lines.push(`| Active (paying) patron | ${cls.activePatron} | ${pct(cls.activePatron, cls.total)} |`);
      lines.push(`| Free member of the campaign | ${cls.freeMember} | ${pct(cls.freeMember, cls.total)} |`);
      lines.push(`| Former patron | ${cls.formerPatron} | ${pct(cls.formerPatron, cls.total)} |`);
      lines.push(`| Declined (payment failed) | ${cls.declinedPatron} | ${pct(cls.declinedPatron, cls.total)} |`);
      lines.push(`| Not in the campaign at all | ${cls.notInCampaign} | ${pct(cls.notInCampaign, cls.total)} |`);
      lines.push(`| No Patreon id stored | ${cls.noId} | ${pct(cls.noId, cls.total)} |`);
      lines.push('');
      lines.push(`- Largest class: **${largest[0]}** (${largest[1]} of ${cls.total}).`);
    }
    lines.push(`- ${patreonOnly} of ${linked.length} are Patreon-only site accounts (created by the Connect click itself — no credentials login); ${linked.length - patreonOnly} linked an existing account. ${linkedSinceAnchor} of ${linked.length} were created on/after ${anchorDay}; premium-flagged among them: ${premiumAmongLinked}.`);
    lines.push(`- Linked-account users by creation day: ${dayLine || '—'}.`);
  }
  lines.push('');
  lines.push('## How to read this');
  lines.push('');
  lines.push('- "Free member" dominating means the /go Connect link is doing exactly what E40 diagnosed: free followers connect, are told they are not a member, and the page offers them only the campaign landing page. That is a product gap on the post-connect state, not a Patreon-copy problem, and it is not fixed by renaming tiers.');
  lines.push('- "Not in campaign" dominating would mean Connect is reaching Patreon users who never followed us — the CTA is then a follow funnel, and the first ask should be the free follow, not a pledge.');
  lines.push('- "Active" ≥ 1/3 of paid is the only state in which the rule proceeds.');
  if (partial) lines.push('- A PARTIAL file is a finding, never a read: it exists so the reachable numbers are not lost, and it must be superseded by a full run (exit 0) before any leg is graded.');
  lines.push('');
  if (ANCHOR.isRename) {
    lines.push(`Re-run on ${RENAME_WATCH.readDate} and ${RENAME_WATCH.finalReadDate}: \`npx tsx -r dotenv/config scripts/agents/patreon-q4-gate-preread.ts dotenv_config_path=.env.local --anchor rename\`. Revert the tier copy only on the cancels leg (> ${RENAME_WATCH.cancelsPerMonthMax}/mo pace); joins < ${RENAME_WATCH.joinsPerMonthFloor}/mo pace is a finding for the digest, not a revert.`);
  } else {
    lines.push(`Re-run on ${Q4_GATE.readDate}: \`npx tsx -r dotenv/config scripts/agents/patreon-q4-gate-preread.ts dotenv_config_path=.env.local\`.`);
  }
  return lines.join('\n') + '\n';
}

async function main() {
  const now = new Date();
  // Settle each source on its own: a degraded DB must not discard a reachable Members API pull (and vice versa).
  const [membersRes, linkedRes] = await Promise.allSettled([fetchMembers(), fetchLinked()]);
  // One line, capped: Prisma errors span several lines and would break the markdown banner.
  const reason = (r: PromiseSettledResult<unknown>): string | null =>
    r.status === 'rejected' ? redactError(String((r.reason as Error)?.message ?? r.reason)).replace(/\s+/g, ' ').trim().slice(0, 200) : null;

  let members: PatreonMemberAttrs[] | null = membersRes.status === 'fulfilled' ? membersRes.value : null;
  let membersErr = reason(membersRes);
  if (members !== null && members.length === 0) {
    // vacuity guard: an empty campaign is a failed source, not a zero read
    members = null;
    membersErr = 'Patreon Members API returned 0 rows — refusing to write an empty pre-read';
  }
  const linked: LinkedRow[] | null = linkedRes.status === 'fulfilled' ? linkedRes.value : null;
  const linkedErr = reason(linkedRes);

  const membersStatus: SourceStatus = members !== null ? { ok: true } : { ok: false, error: membersErr ?? 'unknown' };
  const linkedStatus: SourceStatus = linked !== null ? { ok: true } : { ok: false, error: linkedErr ?? 'unknown' };
  const grade = gradeSources(membersStatus, linkedStatus);
  if (grade.mode === 'none') throw new Error(`both sources failed — members: ${membersErr}; linked: ${linkedErr}`);

  const md = render(members, linked, now, { membersErr, linkedErr });
  process.stdout.write(md);
  if (!NO_WRITE) {
    const out = OUT.replace(/(\.md)?$/, `${grade.outSuffix}.md`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, md);
    console.log(`\n[q4-gate-preread] wrote ${out}`);
  }
  if (grade.exitCode === 2) {
    console.error(`[q4-gate-preread] PARTIAL (${grade.mode}) — exit 2: one source degraded; the report is a finding, not a read.`);
  }
  // Explicit exit: a fetch that lost its deadline race may still be pending and must not keep the process alive.
  process.exit(grade.exitCode);
}

main().catch((e) => {
  console.error('[q4-gate-preread] failed:', redactError(String(e?.message ?? e)));
  process.exit(1);
});
