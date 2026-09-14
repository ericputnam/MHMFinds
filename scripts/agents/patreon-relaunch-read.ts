/**
 * scripts/agents/patreon-relaunch-read.ts — the read for the Patreon tier relaunch, step 1
 * (operator queue Q4, decided 2026-09-08). Answers three questions from the Patreon API and
 * our own database, nothing else:
 *   1. paid joins / cancellations since the change vs the pre-change run rate (Aug 2026: 17 joins, 16 cancels)
 *   2. how many paid patrons connected Patreon on musthavemods.com (Account.provider = 'patreon')
 *   3. how many of them the site now treats as premium (User.isPremium)
 *
 * Usage: npx tsx -r dotenv/config scripts/agents/patreon-relaunch-read.ts dotenv_config_path=.env.local [--since 2026-09-08]
 * Needs PATREON_* creator tokens in .env.local (see scripts/_patreon-auth.ts) and DATABASE_URL.
 */
import { patreonGet } from '../_patreon-auth';
import { prisma } from '../../lib/prisma';
import { summarizePatreonMembers } from './patreon-members-lib';

const CAMPAIGN = process.env.PATREON_CAMPAIGN_ID ?? '13460416';
const args = process.argv.slice(2);
const sinceArg = args[args.indexOf('--since') + 1];
const SINCE = new Date(args.includes('--since') && sinceArg ? sinceArg : '2026-09-08T00:00:00Z');

interface MemberAttrs {
  patron_status: string | null; pledge_relationship_start: string | null; last_charge_date: string | null;
  currently_entitled_amount_cents: number; email: string | null;
  /** `relationships.user.data.id` via `include=user` — same namespace as `Account.providerAccountId` (E50 join key). */
  patreonUserId: string | null;
}

async function members(): Promise<MemberAttrs[]> {
  let url: string | null = `https://www.patreon.com/api/oauth2/v2/campaigns/${CAMPAIGN}/members?fields%5Bmember%5D=patron_status,pledge_relationship_start,last_charge_date,currently_entitled_amount_cents,email&include=user&page%5Bcount%5D=500`;
  const out: MemberAttrs[] = [];
  while (url) {
    const j: {
      data?: Array<{ attributes: Omit<MemberAttrs, 'patreonUserId'>; relationships?: { user?: { data?: { id?: string } | null } } }>;
      links?: { next?: string };
    } = await patreonGet(url);
    out.push(...(j.data ?? []).map((d) => ({ ...d.attributes, patreonUserId: d.relationships?.user?.data?.id ?? null })));
    url = j.links?.next ?? null;
  }
  return out;
}

async function main() {
  const all = await members();
  const active = all.filter((m) => m.patron_status === 'active_patron');
  const former = all.filter((m) => m.patron_status === 'former_patron');
  const after = (d: string | null) => !!d && new Date(d) >= SINCE;
  const joinsSince = active.filter((m) => after(m.pledge_relationship_start)).length;
  // A former patron whose last successful charge is on/after SINCE cancelled inside the window.
  const cancelsSince = former.filter((m) => after(m.last_charge_date)).length;
  const byAmount: Record<string, number> = {};
  for (const m of active) { const k = `$${(m.currently_entitled_amount_cents / 100).toFixed(0)}`; byAmount[k] = (byAmount[k] ?? 0) + 1; }
  const gross = active.reduce((s, m) => s + m.currently_entitled_amount_cents, 0) / 100;

  const connected = await prisma.account.count({ where: { provider: 'patreon' } });
  const premium = await prisma.user.count({ where: { isPremium: true } });
  // Same join as the daily scoreboard (E50): Patreon user id first, email as the fallback.
  const linkedUsers = await prisma.account.findMany({ where: { provider: 'patreon' }, select: { providerAccountId: true, user: { select: { email: true } } } });
  const joined = summarizePatreonMembers(all, linkedUsers.map((a) => ({ providerAccountId: a.providerAccountId, email: a.user.email })));
  const paidAndConnected = joined.paidAndConnected;

  const days = Math.max(1, Math.round((Date.now() - SINCE.getTime()) / 86400000));
  console.log(`Patreon relaunch read — since ${SINCE.toISOString().slice(0, 10)} (${days} d)`);
  console.log(`paid patrons: ${active.length} (${Object.entries(byAmount).sort().map(([k, v]) => `${v}×${k}`).join(', ')}) · gross $${gross.toFixed(0)}/mo · free members ${all.length - active.length - former.length}`);
  console.log(`joins since: ${joinsSince} · cancels since: ${cancelsSince}  (Aug 2026 baseline: 17 joins / 16 cancels per month)`);
  console.log(`connected Patreon on site: ${connected} accounts · of which currently paid: ${paidAndConnected} (${active.length ? Math.round((100 * paidAndConnected) / active.length) : 0}% of paid; by Patreon id ${joined.paidAndConnectedById}, by email ${joined.paidAndConnectedByEmail}; ${joined.paidWithUserId} of ${active.length} paid rows carry a user id) · users flagged premium: ${premium}`);
  console.log(`decision rule (2026-09-22): proceed to renames + $10 tier only if joins ≥ baseline pace AND ≥ 1/3 of paid patrons connected; revert copy if cancels > 16/mo pace`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error('[relaunch-read] failed:', e?.message ?? e); process.exit(1); });
