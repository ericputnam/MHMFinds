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
 *     [--out reports/funnel/patreon-q4-gate-preread-YYYY-MM-DD.md] [--no-write]
 *
 * Exit 0 = report printed (and written unless --no-write), 1 = a source failed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { redactError } from './operator-did-probe-lib';
import {
  Q4_GATE,
  classifyLinkedAccounts,
  formatPaidByAmount,
  q4GateDecision,
  summarizePatreonMembers,
  type LinkedPatreonAccount,
  type PatreonMemberAttrs,
} from './patreon-members-lib';

const args = process.argv.slice(2);
const argValue = (flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const NO_WRITE = args.includes('--no-write');
const TODAY = new Date().toISOString().slice(0, 10);
const OUT = argValue('--out') ?? join('reports', 'funnel', `patreon-q4-gate-preread-${TODAY}.md`);
const CAMPAIGN = process.env.PATREON_CAMPAIGN_ID ?? '13460416';

async function fetchMembers(): Promise<PatreonMemberAttrs[]> {
  const { patreonGet } = await import('../_patreon-auth');
  const members: PatreonMemberAttrs[] = [];
  let url: string | null =
    `https://www.patreon.com/api/oauth2/v2/campaigns/${CAMPAIGN}/members?fields%5Bmember%5D=patron_status,pledge_relationship_start,last_charge_date,currently_entitled_amount_cents,email&include=user&page%5Bcount%5D=500`;
  let pages = 0;
  while (url && pages < 50) {
    const j: {
      data?: Array<{ attributes: PatreonMemberAttrs; relationships?: { user?: { data?: { id?: string } | null } } }>;
      links?: { next?: string };
    } = await patreonGet(url);
    // `include=user` puts the Patreon user id on the relationship; the
    // `included` user objects are never read (no user fields requested).
    members.push(...(j.data ?? []).map((d) => ({ ...d.attributes, patreonUserId: d.relationships?.user?.data?.id ?? null })));
    url = j.links?.next ?? null;
    pages += 1;
  }
  return members;
}

interface LinkedRow extends LinkedPatreonAccount {
  userCreatedDay: string;
  /** the user has a credentials login as well as Patreon (linked an existing account) */
  hasCredentials: boolean;
  isPremium: boolean;
}

async function fetchLinked(): Promise<LinkedRow[]> {
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

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((1000 * n) / d) / 10}%` : '—');
const yes = (b: boolean) => (b ? 'PASS' : 'FAIL');

function render(members: PatreonMemberAttrs[], linked: LinkedRow[], now: Date): string {
  const s = summarizePatreonMembers(members, linked, { now });
  const cls = classifyLinkedAccounts(members, linked);
  const g = q4GateDecision({ now, paid: s.paid, joinsSinceAnchor: s.joinsSinceAnchor, cancelsSinceAnchor: s.cancelsSinceAnchor, paidAndConnectedById: s.paidAndConnectedById });

  const byDay: Record<string, number> = {};
  let patreonOnly = 0;
  let premiumAmongLinked = 0;
  for (const r of linked) {
    byDay[r.userCreatedDay] = (byDay[r.userCreatedDay] ?? 0) + 1;
    if (!r.hasCredentials) patreonOnly += 1;
    if (r.isPremium) premiumAmongLinked += 1;
  }
  const anchorDay = Q4_GATE.anchor.slice(0, 10);
  const linkedSinceAnchor = Object.entries(byDay).filter(([d]) => d >= anchorDay).reduce((a, [, n]) => a + n, 0);
  const dayLine = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([d, n]) => `${d.slice(5)}: ${n}`).join(' · ');

  const largest = (Object.entries({ free: cls.freeMember, 'not in campaign': cls.notInCampaign, former: cls.formerPatron, declined: cls.declinedPatron, active: cls.activePatron }) as Array<[string, number]>)
    .sort((a, b) => b[1] - a[1])[0];

  const lines: string[] = [];
  lines.push(`# Q4 gate pre-read — ${now.toISOString().slice(0, 10)} (gate reads ${Q4_GATE.readDate})`);
  lines.push('');
  lines.push(`_Generated ${now.toISOString()} by \`scripts/agents/patreon-q4-gate-preread.ts\` (E69). Read-only; Patreon Members API + production DB; counts only. The rule below was written on 2026-09-08 — this file applies it, it does not choose it._`);
  lines.push('');
  lines.push('## The rule (verbatim, operator-queue Q4)');
  lines.push('');
  lines.push(`Proceed to renames + $10 tier only if paid joins ≥ ${Q4_GATE.joinsPerMonthMin}/mo pace since ${anchorDay} AND ≥ 1/3 of paid patrons connected on site (Patreon-id join); revert the perk copy if cancels > ${Q4_GATE.cancelsPerMonthMax}/mo pace.`);
  lines.push('');
  lines.push('## Inputs today');
  lines.push('');
  lines.push('| Input | Value | Leg |');
  lines.push('|---|--:|---|');
  lines.push(`| Paid patrons (API) | ${s.paid} (${formatPaidByAmount(s.paidByAmount)}) ≈ $${s.grossMonthlyUsd.toFixed(2)}/mo · free ${s.free} · former ${s.former} | |`);
  lines.push(`| Paid joins since ${anchorDay} | ${s.joinsSinceAnchor} in ${g.daysSinceAnchor} d → **${g.joinsPerMonthPace}/mo pace** (perk tier ${s.joinsSinceAnchorAtPerkTier}; 7d ${s.joins7d}) | joins ≥ ${Q4_GATE.joinsPerMonthMin}/mo: **${yes(g.joinsLeg)}** |`);
  lines.push(`| Paid-and-connected (id join) | **${s.paidAndConnectedById}** of ${s.paid} paid = ${pct(s.paidAndConnectedById, s.paid)} (by email ${s.paidAndConnectedByEmail}; ${s.paidWithUserId}/${s.paid} paid rows carry an id; ${s.linkedWithPatreonId}/${linked.length} linked rows carry one) | ≥ 1/3 connected: **${yes(g.connectedLeg)}** |`);
  lines.push(`| Cancels since ${anchorDay} (last charge on/after anchor) | ${s.cancelsSinceAnchor} → ${g.cancelsPerMonthPace}/mo pace (7d ${s.cancels7d}) | cancels > ${Q4_GATE.cancelsPerMonthMax}/mo → revert copy: **${g.revertCopy ? 'YES' : 'no'}** |`);
  lines.push('');
  lines.push(`**Decision the rule produces today: ${g.decision}**${g.decision === 'HOLD' ? ' — do not rename tiers or add the $10 tier on 09-22 unless the failing leg turns before the read.' : ''}`);
  lines.push('');
  lines.push(`- The cancels leg is a floor, not a count, until the 2026-10-01 charge run: Patreon bills most patrons on the 1st, so \`last_charge_date ≥ ${anchorDay}\` can only see people who joined after the anchor and left again. Re-read cancels after 10-01 before treating "revert copy: no" as final.`);
  lines.push('');
  lines.push('## Why paid-and-connected is what it is: who the linked accounts are');
  lines.push('');
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
  lines.push(`- ${patreonOnly} of ${cls.total} are Patreon-only site accounts (created by the Connect click itself — no credentials login); ${cls.total - patreonOnly} linked an existing account. ${linkedSinceAnchor} of ${cls.total} were created on/after ${anchorDay}; premium-flagged among them: ${premiumAmongLinked}.`);
  lines.push(`- Linked-account users by creation day: ${dayLine || '—'}.`);
  lines.push('');
  lines.push('## How to read this');
  lines.push('');
  lines.push('- "Free member" dominating means the /go Connect link is doing exactly what E40 diagnosed: free followers connect, are told they are not a member, and the page offers them only the campaign landing page. That is a product gap on the post-connect state, not a Patreon-copy problem, and it is not fixed by renaming tiers.');
  lines.push('- "Not in campaign" dominating would mean Connect is reaching Patreon users who never followed us — the CTA is then a follow funnel, and the first ask should be the free follow, not a pledge.');
  lines.push('- "Active" ≥ 1/3 of paid is the only state in which the rule proceeds.');
  lines.push('');
  lines.push(`Re-run on ${Q4_GATE.readDate}: \`npx tsx -r dotenv/config scripts/agents/patreon-q4-gate-preread.ts dotenv_config_path=.env.local\`.`);
  return lines.join('\n') + '\n';
}

async function main() {
  const now = new Date();
  const [members, linked] = await Promise.all([fetchMembers(), fetchLinked()]);
  if (members.length === 0) throw new Error('Patreon Members API returned 0 rows — refusing to write an empty pre-read');
  const md = render(members, linked, now);
  process.stdout.write(md);
  if (!NO_WRITE) {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, md);
    console.log(`\n[q4-gate-preread] wrote ${OUT}`);
  }
}

main().catch((e) => {
  console.error('[q4-gate-preread] failed:', redactError(String(e?.message ?? e)));
  process.exit(1);
});
