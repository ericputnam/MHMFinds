/**
 * Approve pending creator submissions behind a proof-of-ownership gate
 * (Nova, E304, 2026-10-31). Tier 0 code; the apply is a Tier 1 catalog
 * write under autonomy.md: dry run first, frozen plan on main, 24 h veto,
 * then apply, read-back, rollback.
 *
 *   npx tsx scripts/agents/approve-submissions.ts --ids=a,b          # dry run: CurseForge lookup + print + write frozen plan
 *   npx tsx scripts/agents/approve-submissions.ts                    # dry run over every pending submission
 *   npx tsx scripts/agents/approve-submissions.ts --ids=a,b --apply  # write only plan rows whose live re-plan still agrees
 *   npx tsx scripts/agents/approve-submissions.ts --rollback         # delete the mods this plan created, re-open the submissions
 *
 * Writes exactly what the admin approve route writes (one builder,
 * lib/submissionApprovalProfile.ts newModDataFromSubmission; the E183
 * pending profile via planApprovalProfile), plus `reviewedBy =
 * "script:approve-submissions"` so the row is distinguishable from a human
 * click. Only `source-verified` rows are ever written (see the lib).
 *
 * The plan file is the rollback artifact; land it on `main` before --apply.
 * Prints no email address. Exit codes: 0 ok, 1 refused, 2 could-not-run.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
if (process.env.DIRECT_DATABASE_URL && /^prisma(\+postgres)?:\/\//.test(process.env.DATABASE_URL ?? '')) {
  process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
}

import { Prisma, PrismaClient } from '@prisma/client';
import { isPendingHandle } from '../../lib/creatorClaim';
import { creatorKey } from '../../lib/creatorSlug';
import { MIN_MODS_FOR_PAGE } from '../../lib/creators';
import { newModDataFromSubmission } from '../../lib/submissionApprovalProfile';
import { resolveIngestContentType } from '../../lib/services/contentTypeDetector';
import { rehostModImages } from '../../lib/services/imageUploader';
import {
  CURSEFORGE_SIMS4_GAME_ID,
  MAX_APPROVE_ROWS,
  curseforgeSlug,
  emailVerifiedVia,
  parseIds,
  planApprovals,
  shouldWritePlan,
  stillApplicable,
  unknownFlags,
  writable,
  type Decision,
  type SourceLookup,
  type SubmissionRow,
  type WritableDecision,
} from './approve-submissions-lib';

const PROJECT_DIR = process.env.MHM_PROJECT_DIR ?? resolve(__dirname, '..', '..');
const PLAN_PATH = resolve(PROJECT_DIR, 'reports/funnel/triage/approve-submissions-2026-10-31.json');
const REVIEWED_BY = 'script:approve-submissions';
const LOOKUP_TIMEOUT_MS = 15_000;

interface AppliedRow {
  submissionId: string;
  modId: string;
  profileId: string | null;
  profileCreated: boolean;
  contentType: string | null;
}

interface PlanFile {
  experiment: string;
  written: string;
  change: string;
  gameId: number;
  rows: WritableDecision[];
  skipped: Decision[];
  applied: AppliedRow[];
}

async function readRows(prisma: PrismaClient, ids: string[] | null): Promise<SubmissionRow[]> {
  const subs = await prisma.modSubmission.findMany({
    where: ids ? { id: { in: ids } } : { status: 'pending' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      status: true,
      isEdit: true,
      userId: true,
      author: true,
      modName: true,
      description: true,
      modUrl: true,
      downloadUrl: true,
      createdAt: true,
      user: {
        select: {
          isAdmin: true,
          displayName: true,
          username: true,
          emailVerified: true,
          accounts: { select: { provider: true } },
          creatorProfile: { select: { id: true } },
        },
      },
    },
  });
  return subs.map((s) => ({
    submissionId: s.id,
    status: s.status,
    isEdit: s.isEdit,
    userId: s.userId,
    submitterIsAdmin: s.user?.isAdmin === true,
    existingProfileId: s.user?.creatorProfile?.id ?? null,
    author: s.author,
    displayName: s.user?.displayName ?? null,
    username: s.user?.username ?? null,
    modName: s.modName,
    description: s.description,
    modUrl: s.modUrl,
    downloadUrl: s.downloadUrl,
    createdAt: s.createdAt.toISOString(),
    emailVerifiedVia: emailVerifiedVia({
      emailVerified: s.user?.emailVerified ?? null,
      providers: (s.user?.accounts ?? []).map((a) => a.provider),
    }),
  }));
}

/** One CurseForge API call per distinct slug; the key is read from the env and never printed. */
async function lookupSources(rows: SubmissionRow[]): Promise<Map<string, SourceLookup>> {
  const out = new Map<string, SourceLookup>();
  const key = process.env.CURSEFORGE_API_KEY;
  const bySlug = new Map<string, SourceLookup>();
  for (const row of rows) {
    const slug = curseforgeSlug(row.downloadUrl ?? row.modUrl);
    if (!slug) {
      out.set(row.submissionId, { kind: 'unchecked' });
      continue;
    }
    if (!bySlug.has(slug)) {
      if (!key) {
        bySlug.set(slug, { kind: 'unreachable', detail: 'CURSEFORGE_API_KEY unset' });
      } else {
        bySlug.set(slug, await lookupSlug(slug, key));
      }
    }
    out.set(row.submissionId, bySlug.get(slug) as SourceLookup);
  }
  return out;
}

async function lookupSlug(slug: string, key: string): Promise<SourceLookup> {
  const url = `https://api.curseforge.com/v1/mods/search?gameId=${CURSEFORGE_SIMS4_GAME_ID}&slug=${encodeURIComponent(slug)}`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'x-api-key': key, Accept: 'application/json' }, signal: ctl.signal });
    if (!res.ok) return { kind: 'unreachable', detail: `HTTP ${res.status}` };
    const body = (await res.json()) as {
      data?: Array<{ id: number; slug: string; authors?: Array<{ name: string }>; downloadCount?: number; dateCreated?: string }>;
    };
    const hit = (body.data ?? []).find((m) => m.slug === slug);
    if (!hit) return { kind: 'not-found' };
    return {
      kind: 'found',
      projectId: hit.id,
      authors: (hit.authors ?? []).map((a) => a.name),
      downloads: hit.downloadCount ?? 0,
      created: (hit.dateCreated ?? '').slice(0, 10),
    };
  } catch (error) {
    return { kind: 'unreachable', detail: String((error as Error)?.message ?? error).slice(0, 80) };
  } finally {
    clearTimeout(timer);
  }
}

function readPlan(): PlanFile | null {
  if (!existsSync(PLAN_PATH)) return null;
  const parsed = JSON.parse(readFileSync(PLAN_PATH, 'utf8')) as Partial<PlanFile>;
  if (!Array.isArray(parsed?.rows)) return null;
  return { ...(parsed as PlanFile), applied: Array.isArray(parsed.applied) ? parsed.applied : [] };
}

function writePlan(plan: PlanFile): void {
  writeFileSync(PLAN_PATH, JSON.stringify(plan, null, 2) + '\n');
}

function describe(d: Decision): string {
  const ev = d.evidence;
  const src = ev
    ? `cf=${ev.curseforgeSlug ?? '-'} authors=[${ev.sourceAuthors.join(',')}] dl=${ev.sourceDownloads ?? '-'} created=${ev.sourceCreated ?? '-'} email=${ev.emailVerifiedVia}`
    : '';
  if (d.action === 'skip') return `skip (${d.reason}) ${src}`.trim();
  const prof = d.profile.kind === 'create' ? `create ${d.profile.handle}` : `link ${d.profile.profileId}`;
  return `APPROVE "${d.modName}" · profile ${prof} · ${src}`;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const bad = unknownFlags(argv);
  if (bad.length) {
    console.error(`REFUSED: unknown flag(s) ${bad.join(' ')}`);
    return 1;
  }
  const apply = argv.includes('--apply');
  const rollback = argv.includes('--rollback');
  const ids = parseIds(argv);
  if (ids && ids.length === 0) {
    console.error('REFUSED: --ids= is empty');
    return 1;
  }
  const prisma = new PrismaClient();
  try {
    if (rollback) {
      const plan = readPlan();
      if (!plan || plan.applied.length === 0) {
        console.error('REFUSED: no applied rows in the plan file to roll back');
        return 1;
      }
      for (const row of plan.applied) {
        const deleted = (await prisma.mod.deleteMany({ where: { id: row.modId } })).count;
        const reopened = (
          await prisma.modSubmission.updateMany({
            where: { id: row.submissionId, reviewedBy: REVIEWED_BY },
            data: { status: 'pending', approvedModId: null, reviewedAt: null, reviewedBy: null },
          })
        ).count;
        let profileDeleted = 0;
        if (row.profileCreated && row.profileId) {
          const left = await prisma.mod.count({ where: { creatorId: row.profileId } });
          if (left === 0) {
            const p = await prisma.creatorProfile.findUnique({ where: { id: row.profileId }, select: { handle: true, isVerified: true } });
            if (p && isPendingHandle(p.handle) && !p.isVerified) {
              profileDeleted = (await prisma.creatorProfile.deleteMany({ where: { id: row.profileId } })).count;
            }
          }
        }
        console.log(`  ${row.submissionId}: mod deleted ${deleted}, submission re-opened ${reopened}, pending profile deleted ${profileDeleted}`);
      }
      plan.applied = [];
      writePlan(plan);
      console.log(`ROLLBACK: done; plan.applied cleared in ${PLAN_PATH}`);
      return 0;
    }

    const live = await readRows(prisma, ids);
    if (live.length === 0) {
      console.error('REFUSED: read 0 submissions (vacuity guard)');
      return 1;
    }
    const lookups = await lookupSources(live);
    const decisions = planApprovals(live, lookups);

    if (!apply) {
      const rows = writable(decisions);
      console.log(`DRY RUN — no database writes. ${live.length} submission(s) read; ${rows.length} source-verified, ${decisions.length - rows.length} skipped`);
      const liveById = new Map(live.map((r) => [r.submissionId, r]));
      for (const d of decisions) {
        const r = liveById.get(d.submissionId);
        const ct = d.action === 'approve' && r ? ` · contentType=${resolveIngestContentType(r.modName, r.description, null) ?? 'NULL'}` : '';
        console.log(`  ${d.submissionId}  ${describe(d)}${ct}`);
      }
      for (const d of rows) {
        if (d.profile.kind !== 'create') continue;
        const clash = await prisma.creatorProfile.findUnique({ where: { handle: d.profile.handle }, select: { id: true } });
        if (clash) {
          console.error(`REFUSED: handle ${d.profile.handle} already exists`);
          return 1;
        }
      }
      // Would the author-string creator page clear MIN_MODS_FOR_PAGE after these land?
      const authors = new Map<string, number>();
      for (const d of rows) {
        const k = d.evidence.authorKey;
        authors.set(k, (authors.get(k) ?? 0) + 1);
      }
      for (const [k, n] of Array.from(authors.entries())) {
        const existing = await prisma.$queryRaw<Array<{ n: number }>>`
          SELECT COUNT(*)::int AS n FROM mods
          WHERE author IS NOT NULL AND "isNSFW" = false
            AND regexp_replace(lower(author), '[^a-z0-9]+', '', 'g') = ${k}`;
        const have = Number(existing[0]?.n ?? 0);
        console.log(`  creator page for key "${k}": ${have} existing + ${n} new = ${have + n} (page needs ≥${MIN_MODS_FOR_PAGE})`);
      }
      const existing = readPlan();
      if (!shouldWritePlan(existing ? existing.rows.length : null, argv.includes('--replace-plan'))) {
        console.log(`plan NOT written: ${PLAN_PATH} already holds ${existing?.rows.length} rows (the rollback artifact); pass --replace-plan to overwrite`);
        return 0;
      }
      writePlan({
        experiment: 'E304',
        written: new Date().toISOString().slice(0, 10),
        change: 'approve pending ModSubmission → create Mod (+contentType) + E183 pending CreatorProfile; only source-verified rows',
        gameId: CURSEFORGE_SIMS4_GAME_ID,
        rows,
        skipped: decisions.filter((d) => d.action === 'skip'),
        applied: [],
      });
      console.log(`plan written: ${PLAN_PATH}`);
      return 0;
    }

    const plan = readPlan();
    if (!plan || plan.rows.length === 0) {
      console.error('REFUSED: --apply needs the committed plan file (run the dry run, land it on main)');
      return 1;
    }
    if (plan.rows.length > MAX_APPROVE_ROWS) {
      console.error(`REFUSED: plan has ${plan.rows.length} rows > ${MAX_APPROVE_ROWS}`);
      return 1;
    }
    const frozen = ids ? plan.rows.filter((r) => ids.includes(r.submissionId)) : plan.rows;
    const { apply: rows, drifted } = stillApplicable(frozen, decisions);
    if (rows.some((r) => r.evidence.verdict !== 'source-verified')) {
      console.error('REFUSED: a plan row is not source-verified');
      return 1;
    }
    const alreadyApplied = new Set(plan.applied.map((a) => a.submissionId));
    let written = 0;
    for (const row of rows) {
      if (alreadyApplied.has(row.submissionId)) {
        console.log(`  ${row.submissionId}: already applied — skipped`);
        continue;
      }
      const sub = await prisma.modSubmission.findUnique({ where: { id: row.submissionId } });
      if (!sub || sub.status !== 'pending' || sub.isEdit) {
        console.log(`  ${row.submissionId}: no longer pending — skipped`);
        continue;
      }
      // Same best-effort rehost as the route (Patreon-hosted images only).
      const { thumbnail, images } = await rehostModImages({ thumbnail: sub.thumbnail, images: sub.images }).catch(() => ({
        thumbnail: sub.thumbnail,
        images: sub.images,
      }));
      try {
        const applied = await prisma.$transaction(async (tx) => {
          let profileId: string | null = null;
          let profileCreated = false;
          if (row.profile.kind === 'link') {
            profileId = row.profile.profileId;
          } else {
            const p = await tx.creatorProfile.create({
              data: { userId: row.userId, handle: row.profile.handle, isVerified: false },
              select: { id: true },
            });
            profileId = p.id;
            profileCreated = true;
          }
          const data = newModDataFromSubmission(sub, { thumbnail, images });
          const mod = await tx.mod.create({ data: { ...data, creatorId: profileId }, select: { id: true, contentType: true } });
          const upd = await tx.modSubmission.updateMany({
            where: { id: row.submissionId, status: 'pending' },
            data: { status: 'approved', reviewedAt: new Date(), reviewedBy: REVIEWED_BY, approvedModId: mod.id },
          });
          if (upd.count !== 1) throw new Error('submission changed meanwhile — transaction rolled back');
          return { submissionId: row.submissionId, modId: mod.id, profileId, profileCreated, contentType: mod.contentType } as AppliedRow;
        });
        plan.applied.push(applied);
        writePlan(plan); // the rollback artifact grows with every write
        written++;
        console.log(`  ${row.submissionId}: APPROVED → mod ${applied.modId} contentType=${applied.contentType ?? 'NULL'} profile=${applied.profileId ?? '-'}${applied.profileCreated ? ' (created)' : ''}`);
      } catch (error) {
        const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : '';
        console.error(`  ${row.submissionId}: FAILED ${code} ${String((error as Error)?.message ?? error).slice(0, 120)}`);
      }
    }
    console.log(`APPLIED: ${written} approved; ${drifted.length} plan row(s) skipped as drifted${drifted.length ? ` (${drifted.join(', ')})` : ''}`);

    // Read-back as separate queries on the fields the change alters.
    let ok = 0;
    const checked = plan.applied.filter((a) => rows.some((r) => r.submissionId === a.submissionId));
    for (const a of checked) {
      const mod = await prisma.mod.findUnique({ where: { id: a.modId }, select: { author: true, creatorId: true, contentType: true } });
      const sub = await prisma.modSubmission.findUnique({ where: { id: a.submissionId }, select: { status: true, approvedModId: true } });
      const good = !!mod && mod.creatorId === a.profileId && sub?.status === 'approved' && sub.approvedModId === a.modId;
      if (good) ok++;
      console.log(`  read-back ${a.modId}: ${good ? 'OK' : 'MISMATCH'} (author ${mod?.author ?? '-'}, contentType ${mod?.contentType ?? 'NULL'})`);
    }
    for (const k of Array.from(new Set(rows.map((r) => r.evidence.authorKey)))) {
      const n = await prisma.$queryRaw<Array<{ n: number }>>`
        SELECT COUNT(*)::int AS n FROM mods
        WHERE author IS NOT NULL AND "isNSFW" = false
          AND regexp_replace(lower(author), '[^a-z0-9]+', '', 'g') = ${k}`;
      const have = Number(n[0]?.n ?? 0);
      console.log(`  creator key "${k}": ${have} SFW mods → /creator/ page ${have >= MIN_MODS_FOR_PAGE ? 'LIVE' : 'below threshold'}`);
    }
    console.log(`READ-BACK: ${ok}/${checked.length}`);
    return ok === checked.length ? 0 : 1;
  } catch (error) {
    console.error('could not run:', String((error as Error)?.message ?? error).slice(0, 200));
    return 2;
  } finally {
    await prisma.$disconnect();
  }
}

main().then((code) => process.exit(code));
