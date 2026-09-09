/**
 * scripts/agents/patreon-churn-read.ts — where the Patreon paid base leaks, from the Members API.
 *
 * The 2026-09-08 relaunch decision (operator queue Q4) found 47 active vs 225 former patrons and a
 * 1.8-month median tenure. This script turns that into the numbers a retention move needs:
 *   1. cancel cohort by tenure month (how many charges a former patron paid before leaving)
 *   2. first-30-day retention: of patrons who started ≥60 days ago, the share still paying after
 *      their first cycle (a 2nd successful charge, or still active)
 *   3. joins / cancels / net per calendar month for the last 12 months
 *   4. involuntary churn (declined_patron) separately — that is dunning, not a perk problem
 *   5. the live tier ladder (title, price, published, patron_count, edited_at) so the Q4 step-1
 *      dashboard edits can be verified from the API rather than the public page
 *   6. (unless --no-db) Account.provider='patreon' rows and how many of them are currently paid
 *
 * It prints aggregates only — never an email, name, or id — and ends with the decision rule it
 * was written to inform. Read-only; nothing is written to Patreon or the database.
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/agents/patreon-churn-read.ts dotenv_config_path=.env.local [--no-db] [--md <path>] [--json <path>]
 * Needs PATREON_* creator tokens in .env.local (see scripts/_patreon-auth.ts) and, without --no-db, DATABASE_URL.
 */
import { writeFileSync } from 'node:fs';
import { patreonGet } from '../_patreon-auth';

const CAMPAIGN = process.env.PATREON_CAMPAIGN_ID ?? '13460416';
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const opt = (name: string): string | null => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};
const NO_DB = flag('--no-db');
const MD_OUT = opt('--md');
const JSON_OUT = opt('--json');
const NOW = new Date();
const DAY = 86400000;

interface MemberAttrs {
  patron_status: 'active_patron' | 'former_patron' | 'declined_patron' | null;
  pledge_relationship_start: string | null;
  last_charge_date: string | null;
  last_charge_status: string | null;
  next_charge_date: string | null;
  currently_entitled_amount_cents: number;
  lifetime_support_cents: number;
  email: string | null;
}

interface TierAttrs {
  title: string;
  amount_cents: number;
  published: boolean;
  patron_count: number;
  edited_at: string | null;
}

const MEMBER_FIELDS =
  'patron_status,pledge_relationship_start,last_charge_date,last_charge_status,next_charge_date,currently_entitled_amount_cents,lifetime_support_cents,email';

async function fetchMembers(): Promise<MemberAttrs[]> {
  let url: string | null =
    `https://www.patreon.com/api/oauth2/v2/campaigns/${CAMPAIGN}/members` +
    `?fields%5Bmember%5D=${MEMBER_FIELDS}&page%5Bcount%5D=500`;
  const out: MemberAttrs[] = [];
  while (url) {
    const j: { data?: Array<{ attributes: MemberAttrs }>; links?: { next?: string } } = await patreonGet(url);
    out.push(...(j.data ?? []).map((d) => d.attributes));
    url = j.links?.next ?? null;
  }
  return out;
}

async function fetchTiers(): Promise<TierAttrs[]> {
  const j: { included?: Array<{ type: string; attributes: TierAttrs }> } = await patreonGet(
    `https://www.patreon.com/api/oauth2/v2/campaigns/${CAMPAIGN}` +
      `?include=tiers&fields%5Btier%5D=title,amount_cents,published,patron_count,edited_at`
  );
  return (j.included ?? []).filter((x) => x.type === 'tier').map((x) => x.attributes);
}

const d = (s: string | null): Date | null => (s ? new Date(s) : null);
const daysBetween = (a: Date, b: Date) => Math.max(0, (b.getTime() - a.getTime()) / DAY);
/** Number of monthly charges a pledge covered: the first charge is at day 0, then ~every 30 days. */
const cyclesPaid = (start: Date, lastCharge: Date) => Math.floor(daysBetween(start, lastCharge) / 30) + 1;
const ym = (x: Date) => `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`;
const pct = (n: number, den: number) => (den ? `${Math.round((100 * n) / den)}%` : 'n/a');
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const COHORT_LABELS = ['1 charge', '2 charges', '3 charges', '4–6 charges', '7–12 charges', '13+ charges'] as const;
function cohortIndex(cycles: number): number {
  if (cycles <= 1) return 0;
  if (cycles === 2) return 1;
  if (cycles === 3) return 2;
  if (cycles <= 6) return 3;
  if (cycles <= 12) return 4;
  return 5;
}

async function main() {
  const [all, tiers] = await Promise.all([fetchMembers(), fetchTiers()]);
  const active = all.filter((m) => m.patron_status === 'active_patron');
  const former = all.filter((m) => m.patron_status === 'former_patron');
  const declined = all.filter((m) => m.patron_status === 'declined_patron');
  const free = all.length - active.length - former.length - declined.length;
  const gross = active.reduce((s, m) => s + m.currently_entitled_amount_cents, 0) / 100;

  // --- 1. cancel cohort by tenure (former patrons with both dates) -------------------------------
  const formerDated = former
    .map((m) => ({ start: d(m.pledge_relationship_start), last: d(m.last_charge_date), lifetime: m.lifetime_support_cents }))
    .filter((m): m is { start: Date; last: Date; lifetime: number } => !!m.start && !!m.last && m.last >= m.start);
  const cohort = new Array<number>(COHORT_LABELS.length).fill(0);
  const formerCycles: number[] = [];
  for (const m of formerDated) {
    const c = cyclesPaid(m.start, m.last);
    formerCycles.push(c);
    cohort[cohortIndex(c)] += 1;
  }
  const formerUndated = former.length - formerDated.length;
  const oneCharge = cohort[0];
  const leTwo = cohort[0] + cohort[1];

  // --- 2. first-30-day retention ------------------------------------------------------------------
  // Eligible: any paying relationship (active, former, declined) that started ≥60 days ago, so a
  // second monthly charge had time to happen. Retained: a 2nd charge happened (former/declined with
  // ≥2 cycles) or the patron is still active.
  const cutoff = new Date(NOW.getTime() - 60 * DAY);
  let eligible = 0;
  let retained = 0;
  for (const m of all) {
    if (!m.patron_status || m.patron_status === null) continue;
    const start = d(m.pledge_relationship_start);
    if (!start || start > cutoff) continue;
    if (m.patron_status === 'active_patron') {
      eligible += 1;
      retained += 1;
      continue;
    }
    const last = d(m.last_charge_date);
    if (!last) continue;
    eligible += 1;
    if (cyclesPaid(start, last) >= 2) retained += 1;
  }

  // --- 3. joins / cancels per calendar month (last 12) --------------------------------------------
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const x = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() - i, 1));
    months.push(ym(x));
  }
  const joins: Record<string, number> = {};
  const cancels: Record<string, number> = {};
  for (const m of all) {
    if (!m.patron_status) continue; // free members have no pledge chain
    const start = d(m.pledge_relationship_start);
    if (start) joins[ym(start)] = (joins[ym(start)] ?? 0) + 1;
    if (m.patron_status === 'former_patron') {
      const last = d(m.last_charge_date);
      // A cancelled pledge stops after its last successful charge; count the cancel in the month
      // the *next* charge would have fallen (≈ last charge + 30d), which is when Patreon flips status.
      if (last) {
        const eff = new Date(last.getTime() + 30 * DAY);
        cancels[ym(eff)] = (cancels[ym(eff)] ?? 0) + 1;
      }
    }
  }

  // --- 4. active-base tenure + involuntary churn --------------------------------------------------
  const activeTenureMonths = active
    .map((m) => d(m.pledge_relationship_start))
    .filter((x): x is Date => !!x)
    .map((x) => daysBetween(x, NOW) / 30);
  const declinedAmount = declined.reduce((s, m) => s + (m.currently_entitled_amount_cents || 0), 0) / 100;
  const byAmount: Record<string, number> = {};
  for (const m of active) {
    const k = `$${(m.currently_entitled_amount_cents / 100).toFixed(0)}`;
    byAmount[k] = (byAmount[k] ?? 0) + 1;
  }

  // --- 6. site-side linkage (E24) ------------------------------------------------------------------
  let connected: number | null = null;
  let paidAndConnected: number | null = null;
  let premium: number | null = null;
  if (!NO_DB) {
    const { prisma } = await import('../../lib/prisma');
    try {
      connected = await prisma.account.count({ where: { provider: 'patreon' } });
      premium = await prisma.user.count({ where: { isPremium: true } });
      const activeEmails = new Set(active.map((m) => (m.email ?? '').toLowerCase()).filter(Boolean));
      const linked = await prisma.account.findMany({
        where: { provider: 'patreon' },
        select: { user: { select: { email: true } } },
      });
      paidAndConnected = linked.filter((a) => a.user.email && activeEmails.has(a.user.email.toLowerCase())).length;
    } finally {
      await prisma.$disconnect();
    }
  }

  // --- report ---------------------------------------------------------------------------------------
  const lines: string[] = [];
  const p = (s = '') => lines.push(s);
  const today = NOW.toISOString().slice(0, 10);
  p(`# Patreon churn read — ${today}`);
  p();
  p(`Source: Patreon API v2 members + campaign tiers (campaign ${CAMPAIGN}); ${NO_DB ? 'no DB' : 'production DB for site linkage'}. Aggregates only.`);
  p();
  p(`## Base`);
  p();
  p(`- paid (active_patron): **${active.length}** (${Object.entries(byAmount).sort().map(([k, v]) => `${v}×${k}`).join(', ')}) · gross **$${gross.toFixed(0)}/mo**`);
  p(`- former_patron: **${former.length}** · declined_patron: **${declined.length}** ($${declinedAmount.toFixed(0)}/mo stuck on failed cards) · free: ${free}`);
  p(`- active tenure: median **${median(activeTenureMonths).toFixed(1)} months** since pledge start (${activeTenureMonths.filter((x) => x < 1).length} active started <30 d ago)`);
  p();
  p(`## Cancel cohort by tenure (former patrons, n=${formerDated.length}${formerUndated ? `; ${formerUndated} without dates excluded` : ''})`);
  p();
  p(`| Charges paid before leaving | Patrons | Share |`);
  p(`|---|--:|--:|`);
  COHORT_LABELS.forEach((label, i) => p(`| ${label} | ${cohort[i]} | ${pct(cohort[i], formerDated.length)} |`));
  p();
  p(`- left after exactly one charge: **${oneCharge} (${pct(oneCharge, formerDated.length)})** · after ≤2 charges: **${leTwo} (${pct(leTwo, formerDated.length)})** · median charges before leaving: **${median(formerCycles)}**`);
  p();
  p(`## First-cycle retention`);
  p();
  p(`- of **${eligible}** paying relationships that started ≥60 days ago, **${retained} (${pct(retained, eligible)})** paid a second month or are still active → first-30-day churn **${pct(eligible - retained, eligible)}**`);
  p();
  p(`## Joins / cancels by month (last 12; cancel = month the next charge would have fallen)`);
  p();
  p(`| Month | Joins | Cancels | Net |`);
  p(`|---|--:|--:|--:|`);
  for (const m of months) {
    const j = joins[m] ?? 0;
    const c = cancels[m] ?? 0;
    p(`| ${m} | ${j} | ${c} | ${j - c >= 0 ? '+' : ''}${j - c} |`);
  }
  const last3 = months.slice(-4, -1); // three full months before the current one
  const j3 = last3.reduce((s, m) => s + (joins[m] ?? 0), 0);
  const c3 = last3.reduce((s, m) => s + (cancels[m] ?? 0), 0);
  p();
  p(`- trailing 3 full months (${last3[0]}→${last3[2]}): ${j3} joins, ${c3} cancels, net ${j3 - c3 >= 0 ? '+' : ''}${j3 - c3} → ${(j3 / 3).toFixed(1)} joins/mo vs ${(c3 / 3).toFixed(1)} cancels/mo`);
  p();
  p(`## Tier ladder (live, via API)`);
  p();
  p(`| Tier | Price | Published | Patrons | Last edited |`);
  p(`|---|--:|:-:|--:|---|`);
  for (const t of [...tiers].sort((a, b) => a.amount_cents - b.amount_cents)) {
    p(`| ${t.title.trim()} | $${(t.amount_cents / 100).toFixed(0)} | ${t.published ? 'yes' : 'no'} | ${t.patron_count} | ${(t.edited_at ?? '').slice(0, 16).replace('T', ' ')} |`);
  }
  p();
  if (!NO_DB) {
    p(`## Site linkage (E24)`);
    p();
    p(`- Account.provider='patreon': **${connected}** · of which currently paid: **${paidAndConnected}** (${pct(paidAndConnected ?? 0, active.length)} of paid) · User.isPremium: ${premium}`);
    p();
  }
  p(`## Decision inputs`);
  p();
  const leTwoShare = formerDated.length ? leTwo / formerDated.length : 0;
  const churn30 = eligible ? (eligible - retained) / eligible : 0;
  if (leTwoShare >= 0.5) {
    p(`- The leak is in the **first two cycles**: ${pct(leTwo, formerDated.length)} of all cancels paid at most twice (${pct(oneCharge, formerDated.length)} exactly once) and first-30-day churn is ${pct(eligible - retained, eligible)}. A perk that is only *described* on the tier page and never *delivered* between day 0 and day ~25 cannot hold these people. The touchpoint that has to exist is a **day-0 welcome that hands over the one self-serve perk (site countdown skip) with the exact steps**, then a day-20 "here is what you got this month" post before the second charge. Longer-tenure value (a monthly patron-only deliverable) is the second move, not the first.`);
  } else {
    p(`- Cancels are spread across tenure (≤2-charge share ${pct(leTwo, formerDated.length)}, first-30-day churn ${pct(eligible - retained, eligible)}): the problem is ongoing value, not onboarding. The touchpoint that has to exist is a **monthly patron-only deliverable** (exclusive lookbook / early mod) on a fixed day.`);
  }
  p(`- ${declined.length} declined patrons ($${declinedAmount.toFixed(0)}/mo) are involuntary: Patreon retries the card; a single "your payment failed — update card to keep the countdown skip" note is the only lever we hold.`);
  p(`- Read rule: re-run on 2026-09-22 and 2026-10-07. Keep the day-0 welcome if first-30-day churn for pledges started after the welcome goes live is ≥10 pts lower than the pre-welcome figure above, or ≥1/3 of new paid patrons connect Patreon on the site within 7 days.`);

  const md = lines.join('\n') + '\n';
  process.stdout.write(md);
  if (MD_OUT) writeFileSync(MD_OUT, md);
  if (JSON_OUT) {
    writeFileSync(
      JSON_OUT,
      JSON.stringify(
        {
          date: today,
          active: active.length,
          former: former.length,
          declined: declined.length,
          free,
          grossMonthly: gross,
          byAmount,
          activeTenureMedianMonths: median(activeTenureMonths),
          cancelCohort: Object.fromEntries(COHORT_LABELS.map((l, i) => [l, cohort[i]])),
          formerUndated,
          medianChargesBeforeLeaving: median(formerCycles),
          firstCycle: { eligible, retained, churn: churn30 },
          months: months.map((m) => ({ month: m, joins: joins[m] ?? 0, cancels: cancels[m] ?? 0 })),
          tiers,
          site: { connected, paidAndConnected, premium },
        },
        null,
        2
      )
    );
  }
}

main().catch((e) => {
  console.error('[patreon-churn-read] failed:', e?.message ?? e);
  process.exit(1);
});
