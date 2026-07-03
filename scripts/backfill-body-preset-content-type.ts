#!/usr/bin/env npx tsx
/**
 * Backfill a dedicated `body-preset` contentType.
 *
 * Why: the `preset` contentType bucket (~246 mods) is dominated by GShade/ReShade
 * visual presets, with body/face CAS presets mixed in. A planned
 * /games/sims-4/body-presets/ collection page needs a clean facet — filtering by
 * keyword at query time would repeat the `__pregnancy_keyword__` workaround that
 * got /games/sims-4/pregnancy-mods/ deindexed as duplicate/thin content
 * (see reports/rpm-dip-mitigation-2026-07-02.md, Queued #3).
 *
 * What it does:
 *   1. Mods whose TITLE explicitly says "body preset(s)" → contentType 'body-preset'
 *      (high confidence), regardless of current contentType — unless the title also
 *      mentions gshade/reshade/shader (those stay visual presets).
 *   2. Mods currently typed 'preset' whose title/description indicate a CAS body/face
 *      preset without visual-preset markers → 'body-preset' (medium confidence,
 *      applied only with --include-medium).
 *   3. Everything gshade/reshade stays contentType 'preset' (that bucket becomes the
 *      natural facet for a future reshade-presets collection).
 *
 * Usage:
 *   npx tsx scripts/backfill-body-preset-content-type.ts                    # Dry run (preview)
 *   npx tsx scripts/backfill-body-preset-content-type.ts --apply            # Apply high-confidence fixes
 *   npx tsx scripts/backfill-body-preset-content-type.ts --apply --include-medium
 *   npx tsx scripts/backfill-body-preset-content-type.ts --verbose          # List every match
 */

// CRITICAL: Import setup-env FIRST to configure DATABASE_URL for scripts
import './lib/setup-env';

import { prisma } from '../lib/prisma';

const APPLY = process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');
const INCLUDE_MEDIUM = process.argv.includes('--include-medium');

const VISUAL_PRESET_RE = /\b(gshade|g-shade|reshade|re-shade|shader|lighting mod)\b/i;
const BODY_PRESET_TITLE_RE = /\bbody\s*presets?\b/i;
const CAS_PRESET_HINT_RE = /\b(face|nose|eye|lip|chin|jaw|cheek|sim|cas)\s*presets?\b/i;

interface Candidate {
  id: string;
  title: string;
  currentType: string | null;
  confidence: 'high' | 'medium';
  reason: string;
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}${INCLUDE_MEDIUM ? ' (+medium confidence)' : ''}\n`);

  // 1. Title explicitly says "body preset" — search across ALL contentTypes,
  //    since the original scraper classified many of these as hair/skin/full-body/null.
  const titleMatches = await prisma.mod.findMany({
    where: { title: { contains: 'body preset', mode: 'insensitive' } },
    select: { id: true, title: true, contentType: true, description: true },
  });

  // 2. Current 'preset' bucket — split body/CAS presets from visual presets.
  const presetBucket = await prisma.mod.findMany({
    where: { contentType: 'preset' },
    select: { id: true, title: true, contentType: true, description: true },
  });

  const candidates = new Map<string, Candidate>();

  for (const mod of titleMatches) {
    if (mod.contentType === 'body-preset') continue; // already migrated
    if (VISUAL_PRESET_RE.test(mod.title)) continue; // gshade "full body preview" edge cases
    if (BODY_PRESET_TITLE_RE.test(mod.title)) {
      candidates.set(mod.id, {
        id: mod.id,
        title: mod.title,
        currentType: mod.contentType,
        confidence: 'high',
        reason: 'title contains "body preset"',
      });
    }
  }

  for (const mod of presetBucket) {
    if (candidates.has(mod.id)) continue;
    const text = `${mod.title} ${mod.description ?? ''}`;
    if (VISUAL_PRESET_RE.test(text)) continue; // stays a visual preset
    if (BODY_PRESET_TITLE_RE.test(mod.title) || CAS_PRESET_HINT_RE.test(mod.title)) {
      candidates.set(mod.id, {
        id: mod.id,
        title: mod.title,
        currentType: mod.contentType,
        confidence: 'high',
        reason: 'preset-typed with CAS/body signals in title',
      });
    } else if (/\bbody\s*presets?\b/i.test(mod.description ?? '')) {
      candidates.set(mod.id, {
        id: mod.id,
        title: mod.title,
        currentType: mod.contentType,
        confidence: 'medium',
        reason: 'preset-typed, "body preset" only in description',
      });
    }
  }

  const all = Array.from(candidates.values());
  const high = all.filter((c) => c.confidence === 'high');
  const medium = all.filter((c) => c.confidence === 'medium');

  console.log(`Candidates: ${high.length} high confidence, ${medium.length} medium confidence`);
  const byType = new Map<string, number>();
  for (const c of all) byType.set(c.currentType ?? 'NULL', (byType.get(c.currentType ?? 'NULL') ?? 0) + 1);
  console.log('Current contentType of candidates:', Object.fromEntries(byType), '\n');

  if (VERBOSE || !APPLY) {
    const show = VERBOSE ? all : all.slice(0, 20);
    for (const c of show) {
      console.log(`  [${c.confidence}] (${c.currentType ?? 'NULL'} → body-preset) ${c.title.slice(0, 70)} — ${c.reason}`);
    }
    if (!VERBOSE && all.length > 20) console.log(`  ... and ${all.length - 20} more (use --verbose)`);
  }

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to write changes.');
    return;
  }

  const toApply = INCLUDE_MEDIUM ? all : high;
  let updated = 0;
  for (const c of toApply) {
    await prisma.mod.update({ where: { id: c.id }, data: { contentType: 'body-preset' } });
    updated++;
  }
  console.log(`\nUpdated ${updated} mods to contentType 'body-preset'.`);
  console.log('Next step: add a body-presets entry to lib/collections.ts and verify the page renders.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
