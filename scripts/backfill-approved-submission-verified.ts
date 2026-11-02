#!/usr/bin/env npx tsx
/**
 * E322 (Nova, 2026-11-02): publish mods that an approved submission created
 * with the column default `isVerified = false`.
 *
 * Why: `newModDataFromSubmission` (lib/submissionApprovalProfile.ts) never set
 * Mod.isVerified, so a scripted (E304) or dashboard approval wrote an
 * unpublished row. Every public reader selects `isVerified: true`
 * (sitemap-mods.xml, /api/mods, search, aiSearch, IndexNow), so the 7 Atino00
 * mods approved 2026-11-01 rendered on their creator page and nowhere else.
 * The builder now sets the flag; this script repairs the rows written before.
 *
 * Population (never a blanket update): mods that are the `approvedModId` of an
 * `approved`, non-edit ModSubmission AND still read isVerified=false. Approval
 * is the review, so exactly these rows should be published. Optional
 * `--author=<name>` narrows further. `--expect=<N>` makes the apply refuse
 * unless the population is exactly N (the dry run tells you N).
 *
 * Usage:
 *   npx tsx scripts/backfill-approved-submission-verified.ts                         # dry run
 *   npx tsx scripts/backfill-approved-submission-verified.ts --apply --expect=7
 *   npx tsx scripts/backfill-approved-submission-verified.ts --author=Atino00
 *
 * Rollback: set isVerified=false on the ids printed under CANDIDATES.
 */

// CRITICAL: Import setup-env FIRST to configure DATABASE_URL for scripts
import './lib/setup-env';

import { prisma } from '../lib/prisma';

const APPLY = process.argv.includes('--apply');
const AUTHOR = process.argv.find((a) => a.startsWith('--author='))?.slice('--author='.length) ?? null;
const EXPECT_RAW = process.argv.find((a) => a.startsWith('--expect='))?.slice('--expect='.length);
const EXPECT = EXPECT_RAW !== undefined ? Number(EXPECT_RAW) : null;

async function approvedModIds(): Promise<string[]> {
  const subs = await prisma.modSubmission.findMany({
    where: { status: 'approved', isEdit: false, approvedModId: { not: null } },
    select: { approvedModId: true },
  });
  return Array.from(new Set(subs.map((s) => s.approvedModId as string)));
}

async function main() {
  if (APPLY && (EXPECT === null || !Number.isInteger(EXPECT) || EXPECT < 1)) {
    console.error('REFUSED: --apply needs --expect=<N> (run the dry run first to read N).');
    process.exit(2);
  }

  const ids = await approvedModIds();
  if (ids.length === 0) {
    console.error('REFUSED: found 0 approved non-edit submissions — the read is wrong, not the catalog.');
    process.exit(2);
  }
  const before = await prisma.mod.groupBy({ by: ['isVerified'], where: { id: { in: ids } }, _count: true });
  const fmt = (g: typeof before) => g.map((r) => `${r.isVerified ? 'verified' : 'unverified'}=${r._count}`).join(' ');
  console.log(`approved-submission mods: ${ids.length} (${fmt(before)})`);

  const candidates = await prisma.mod.findMany({
    where: { id: { in: ids }, isVerified: false, ...(AUTHOR ? { author: AUTHOR } : {}) },
    select: { id: true, title: true, author: true, isNSFW: true, contentType: true },
    orderBy: { id: 'asc' },
  });
  console.log(`CANDIDATES (${candidates.length})${AUTHOR ? ` author=${AUTHOR}` : ''}:`);
  for (const m of candidates) {
    console.log(`  ${m.id}  ${m.author ?? '-'}  nsfw=${m.isNSFW}  type=${m.contentType ?? 'NULL'}  ${m.title.slice(0, 60)}`);
  }

  if (!APPLY) {
    console.log(`DRY RUN — nothing written. Apply with: --apply --expect=${candidates.length}${AUTHOR ? ` --author=${AUTHOR}` : ''}`);
    return;
  }
  if (candidates.length !== EXPECT) {
    console.error(`REFUSED: population is ${candidates.length}, --expect=${EXPECT}. Re-read the dry run.`);
    process.exit(2);
  }

  const res = await prisma.mod.updateMany({
    where: { id: { in: candidates.map((c) => c.id) }, isVerified: false },
    data: { isVerified: true },
  });
  console.log(`APPLIED: ${res.count} row(s) set isVerified=true`);

  // Read-back on the field the change alters, as a separate query.
  const after = await prisma.mod.count({ where: { id: { in: candidates.map((c) => c.id) }, isVerified: true } });
  const afterAll = await prisma.mod.groupBy({ by: ['isVerified'], where: { id: { in: ids } }, _count: true });
  console.log(`READ-BACK: ${after}/${candidates.length} candidates verified; approved-submission mods now ${fmt(afterAll)}`);
  if (after !== candidates.length) process.exit(1);
}

main()
  .catch((e) => {
    console.error('FAILED:', (e as Error)?.message ?? e);
    process.exit(2);
  })
  .finally(() => prisma.$disconnect());
