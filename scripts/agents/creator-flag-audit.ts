/**
 * Creator-flag audit (Nova, E178, 2026-10-07). READ-ONLY, Tier 0.
 *
 *   npx tsx scripts/agents/creator-flag-audit.ts [--date=YYYY-MM-DD] [--ga4-portal="<text>"] [--stdout]
 *
 * Classifies every `User.isCreator = true` account into one bucket
 * (creator-flag-audit-lib.ts) and writes
 * reports/funnel/creator-flag-audit-<date>.md. Every query runs inside a
 * `SET TRANSACTION READ ONLY` transaction, so the database refuses a write
 * even if a later edit adds one. Prints no email, username or id — counts
 * only, plus public catalog author slugs for the catalog-author-match bucket.
 *
 * Exit codes: 0 ok, 2 could-not-run (env/DB error), 1 vacuity guard tripped
 * (0 flagged accounts read — the query or the join is broken, not the world).
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
if (process.env.DIRECT_DATABASE_URL && /^prisma(\+postgres)?:\/\//.test(process.env.DATABASE_URL ?? '')) {
  process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
}

import { PrismaClient } from '@prisma/client';
import { PLACEHOLDER_ACCOUNT_DOMAINS } from '../../lib/creatorClaim';
import {
  AGE_BANDS,
  BUCKETS,
  BUCKET_MEANING,
  bucketFor,
  catalogMatchMods,
  pct,
  summarize,
  type FlaggedAccount,
} from './creator-flag-audit-lib';

const PROJECT_DIR = process.env.MHM_PROJECT_DIR ?? resolve(__dirname, '..', '..');
const SLUG = (col: string) => `trim(both '-' from lower(regexp_replace(${col}, '[^A-Za-z0-9]+', '-', 'g')))`;

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

type Raw = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

async function main(): Promise<number> {
  const now = new Date();
  const date = arg('date') ?? now.toISOString().slice(0, 10);
  const prisma = new PrismaClient();
  try {
    const { flagged, months, cmp } = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const flagged = await tx.$queryRawUnsafe<Raw[]>(
        `WITH a AS (
           SELECT ${SLUG('m.author')} AS s, count(*)::int AS n FROM mods m WHERE m.author IS NOT NULL GROUP BY 1
         )
         SELECT u."createdAt" AS created_at, u."isAdmin" AS is_admin,
                (lower(split_part(u.email, '@', 2)) = ANY($1::text[])) AS placeholder,
                coalesce((SELECT array_agg(DISTINCT ac.provider ORDER BY ac.provider) FROM accounts ac WHERE ac."userId" = u.id), '{}') AS providers,
                EXISTS (SELECT 1 FROM creator_profiles c WHERE c."userId" = u.id) AS has_profile,
                (SELECT count(*)::int FROM mod_submissions s WHERE s."userId" = u.id) AS submissions,
                (SELECT count(*)::int FROM favorites f WHERE f."userId" = u.id) AS favorites,
                (SELECT count(*)::int FROM download_clicks d WHERE d."userId" = u.id) AS download_clicks,
                ${SLUG('u.username')} AS username_slug,
                ${SLUG(`coalesce(u."displayName", '')`)} AS display_slug,
                coalesce(ua.n, 0) AS username_mods,
                coalesce(da.n, 0) AS display_mods
           FROM users u
           LEFT JOIN a ua ON ua.s = ${SLUG('u.username')}
           LEFT JOIN a da ON da.s = ${SLUG(`coalesce(u."displayName", '')`)}
          WHERE u."isCreator" = true`,
        [...PLACEHOLDER_ACCOUNT_DOMAINS],
      );
      // Share of credentials (sign-up form) accounts that ticked "I'm a creator", by month.
      const months = await tx.$queryRawUnsafe<Raw[]>(
        `SELECT to_char(date_trunc('month', u."createdAt"), 'YYYY-MM') AS m,
                count(*)::int AS total, sum(u."isCreator"::int)::int AS creators
           FROM users u
          WHERE EXISTS (SELECT 1 FROM accounts ac WHERE ac."userId" = u.id AND ac.provider = 'credentials')
          GROUP BY 1 ORDER BY 1`,
      );
      // Control: form sign-ups WITHOUT the flag. If flagged accounts behave the same, the flag is noise.
      const cmp = await tx.$queryRawUnsafe<Raw[]>(
        `SELECT count(*)::int AS n,
                count(*) FILTER (WHERE EXISTS (SELECT 1 FROM favorites f WHERE f."userId" = u.id))::int AS fav,
                count(*) FILTER (WHERE EXISTS (SELECT 1 FROM download_clicks d WHERE d."userId" = u.id))::int AS dl,
                count(*) FILTER (WHERE EXISTS (SELECT 1 FROM mod_submissions s WHERE s."userId" = u.id))::int AS subs
           FROM users u
          WHERE u."isCreator" = false AND u."isAdmin" = false
            AND EXISTS (SELECT 1 FROM accounts ac WHERE ac."userId" = u.id AND ac.provider = 'credentials')`,
      );
      return { flagged, months, cmp };
    });

    const rows: FlaggedAccount[] = flagged.map((r) => ({
      createdAt: new Date(r.created_at as string),
      isAdmin: r.is_admin === true,
      placeholder: r.placeholder === true,
      providers: (r.providers as string[]) ?? [],
      hasCreatorProfile: r.has_profile === true,
      submissions: num(r.submissions),
      favorites: num(r.favorites),
      downloadClicks: num(r.download_clicks),
      usernameSlug: String(r.username_slug ?? ''),
      displayNameSlug: String(r.display_slug ?? ''),
      usernameSlugMods: num(r.username_mods),
      displayNameSlugMods: num(r.display_mods),
    }));
    if (rows.length === 0) {
      console.error('[creator-flag-audit] vacuity guard: 0 isCreator accounts read — refusing to write a report.');
      return 1;
    }

    const s = summarize(rows, now);
    const c = cmp[0] ?? {};
    const ctrlN = num(c.n);
    const matches = rows
      .filter((r) => bucketFor(r) === 'catalog-author-match')
      .map((r) => {
        const slug = r.usernameSlugMods >= r.displayNameSlugMods ? r.usernameSlug : r.displayNameSlug;
        return { slug, mods: catalogMatchMods(r), favorites: r.favorites, downloadClicks: r.downloadClicks };
      })
      .sort((x, y) => y.mods - x.mods);
    const formTotal = months.reduce((t, m) => t + num(m.total), 0);
    const formCreators = months.reduce((t, m) => t + num(m.creators), 0);
    const portal = arg('ga4-portal');

    const L: string[] = [];
    L.push(`# Creator-flag audit — ${date} (Nova, E178, Tier 0, read-only)`);
    L.push('');
    L.push(`Generated by \`scripts/agents/creator-flag-audit.ts\` at ${now.toISOString()}. Counts only; no email, username or id.`);
    L.push('');
    L.push(`**Population:** ${s.total} accounts with \`isCreator = true\` (${s.humans} humans after removing placeholders and admins).`);
    L.push('');
    L.push('## Buckets (exclusive, first match wins; sums to the population)');
    L.push('');
    L.push('| Bucket | Accounts | Share | Meaning |');
    L.push('|---|---:|---:|---|');
    for (const b of BUCKETS) L.push(`| ${b} | ${s.byBucket[b]} | ${pct(s.byBucket[b], s.total)} | ${BUCKET_MEANING[b]} |`);
    L.push('');
    L.push('## Signup source (Account.provider)');
    L.push('');
    L.push('| Source | Accounts |');
    L.push('|---|---:|');
    for (const [k, v] of Object.entries(s.bySource).sort((x, y) => y[1] - x[1])) L.push(`| ${k} | ${v} |`);
    L.push('');
    L.push('## Age of the human accounts');
    L.push('');
    L.push('| Age | Accounts |');
    L.push('|---|---:|');
    for (const a of AGE_BANDS) L.push(`| ${a} | ${s.byAge[a]} |`);
    L.push('');
    L.push('## Flagged vs unflagged form sign-ups (the control)');
    L.push('');
    L.push('| Cohort | Accounts | >=1 favorite | >=1 download click | >=1 submission |');
    L.push('|---|---:|---:|---:|---:|');
    const flaggedSubs = s.byBucket.submitted;
    L.push(`| isCreator, human | ${s.humans} | ${pct(s.humansWithFavorite, s.humans)} | ${pct(s.humansWithDownloadClick, s.humans)} | ${pct(flaggedSubs, s.humans)} |`);
    L.push(`| not isCreator, form sign-up | ${ctrlN} | ${pct(num(c.fav), ctrlN)} | ${pct(num(c.dl), ctrlN)} | ${pct(num(c.subs), ctrlN)} |`);
    L.push('');
    L.push(`Form sign-ups that ticked "I'm a creator": ${formCreators} of ${formTotal} (${pct(formCreators, formTotal)}).`);
    L.push('');
    L.push('| Month | Form sign-ups | Ticked creator | Share |');
    L.push('|---|---:|---:|---:|');
    for (const m of months) L.push(`| ${m.m} | ${num(m.total)} | ${num(m.creators)} | ${pct(num(m.creators), num(m.total))} |`);
    L.push('');
    L.push('## Catalog-author matches (public author slugs)');
    L.push('');
    if (matches.length === 0) L.push('None.');
    else {
      L.push('| Catalog author slug | Catalog mods | Favorites | Download clicks |');
      L.push('|---|---:|---:|---:|');
      for (const m of matches) L.push(`| ${m.slug} | ${m.mods} | ${m.favorites} | ${m.downloadClicks} |`);
      L.push('');
      L.push('A slug match is a lead, not an identity proof — confirm before any contact (outreach is Q23, Tier 2).');
    }
    if (portal) {
      L.push('');
      L.push('## Creator portal reach (GA4, read by hand)');
      L.push('');
      L.push(portal);
    }
    L.push('');

    const out = L.join('\n');
    if (process.argv.includes('--stdout')) {
      process.stdout.write(out);
    } else {
      const path = resolve(PROJECT_DIR, `reports/funnel/creator-flag-audit-${date}.md`);
      writeFileSync(path, out);
      console.log(`[creator-flag-audit] wrote ${path}`);
    }
    console.log(
      `[creator-flag-audit] total=${s.total} humans=${s.humans} ` +
        BUCKETS.map((b) => `${b}=${s.byBucket[b]}`).join(' '),
    );
    return 0;
  } catch (e) {
    console.error('[creator-flag-audit] could not run:', String(e).slice(0, 300));
    return 2;
  } finally {
    await prisma.$disconnect();
  }
}

main().then((code) => process.exit(code));
