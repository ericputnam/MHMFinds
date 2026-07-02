// CRITICAL: Import setup-env FIRST to configure DATABASE_URL for scripts
import './lib/setup-env';

import { prisma } from '../lib/prisma';
import {
  detectContentTypeWithConfidence,
  detectRoomThemes,
} from '../lib/services/contentTypeDetector';
import { detectContentTypeFromUrl } from '../lib/services/mhmScraperUtils';

/**
 * Audit & correct content-type categories for MustHaveMods scraped mods.
 *
 * Two safe operations, mirroring the live scraper's detection order
 * (URL slug → title → description):
 *
 *   1. FILL    — a mod whose contentType is null gets the detected value
 *                (any signal: url, title, or description).
 *   2. CORRECT — a mod with a WRONG contentType is overwritten ONLY when the
 *                new value is backed by a strong signal: the URL slug or a
 *                keyword in the TITLE. Description-only matches are never
 *                allowed to overwrite an existing value (that's exactly the
 *                noise that mislabels e.g. a dress as a "preset" because its
 *                description says "...depending on the body preset you use").
 *
 * It NEVER replaces an existing value with null.
 *
 * Usage:
 *   npx tsx scripts/fix-mhm-run-categories.ts                 # dry run, today's run
 *   npx tsx scripts/fix-mhm-run-categories.ts --apply         # write changes
 *   npx tsx scripts/fix-mhm-run-categories.ts --all           # whole MHM catalog
 *   npx tsx scripts/fix-mhm-run-categories.ts --all --apply
 */
async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const all = args.includes('--all');
  const updated = args.includes('--updated');

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Default scope = mods CREATED today (the genuinely new content this run pulled
  // in). --updated widens to every mod touched today; --all is the whole catalog.
  const where = {
    sourceUrl: { contains: 'musthavemods.com' },
    ...(all ? {} : updated ? { updatedAt: { gte: startOfToday } } : { createdAt: { gte: startOfToday } }),
  };

  const scope = all
    ? 'ALL MHM-sourced mods'
    : updated
    ? "all mods touched today (new + updated)"
    : "this run's NEW mods (created today)";
  console.log(`\n🔍 Scope: ${scope}`);
  console.log(`   Mode:  ${apply ? '✍️  APPLY (writing changes)' : '🧪 DRY RUN (no writes)'}\n`);

  const mods = await prisma.mod.findMany({
    where,
    select: { id: true, title: true, sourceUrl: true, description: true, contentType: true, themes: true },
  });

  // A broad URL category (e.g. a "hair-cc" listicle) must NOT clobber a more
  // specific, already-correct value (a beard in that post is still a beard).
  // Maps broad parent → specific children that should win if already set.
  const SPECIFIC_OVER_BROAD: Record<string, string[]> = {
    hair: ['beard', 'facial-hair'],
    makeup: ['eyeliner', 'lipstick', 'blush', 'eyebrows', 'lashes', 'eyes'],
    accessories: ['jewelry', 'glasses', 'hats', 'watches'],
  };

  console.log(`Scanning ${mods.length} mods...\n`);

  let filled = 0;
  let corrected = 0;
  let skippedWeak = 0;
  const fillByType: Record<string, number> = {};
  const corrections: string[] = [];

  for (const mod of mods) {
    const urlCt = detectContentTypeFromUrl(mod.sourceUrl || '');
    const titleResult = detectContentTypeWithConfidence(mod.title, mod.description || undefined);
    const titleMatched = titleResult.reasoning?.includes('in title') ?? false;
    const detected = urlCt || titleResult.contentType;

    if (!detected) continue;

    const isStrong = !!urlCt || titleMatched; // url slug or a title keyword

    // Protect specific existing values from being broadened by a URL category.
    if (
      mod.contentType !== null &&
      mod.contentType !== detected &&
      SPECIFIC_OVER_BROAD[detected]?.includes(mod.contentType)
    ) {
      continue;
    }

    let action: 'fill' | 'correct' | null = null;
    if (mod.contentType === null) {
      action = 'fill';
    } else if (mod.contentType !== detected && isStrong) {
      action = 'correct';
    } else if (mod.contentType !== detected && !isStrong) {
      // description-only suggestion that disagrees — too weak to overwrite
      skippedWeak++;
      continue;
    } else {
      continue; // already correct
    }

    const detectedThemes =
      mod.themes.length === 0 ? detectRoomThemes(mod.title, mod.description || undefined) : mod.themes;

    if (action === 'fill') {
      filled++;
      fillByType[detected] = (fillByType[detected] || 0) + 1;
    } else {
      corrected++;
      const via = urlCt ? 'url' : 'title';
      corrections.push(`  ${String(mod.contentType).padEnd(13)} → ${detected.padEnd(13)} (${via})  ${mod.title.slice(0, 42)}`);
    }

    if (apply) {
      await prisma.mod.update({
        where: { id: mod.id },
        data: {
          contentType: detected,
          ...(detectedThemes.length > 0 && mod.themes.length === 0 ? { themes: detectedThemes } : {}),
        },
      });
    }
  }

  console.log('──────────────────────────────────────────────');
  console.log(`Filled (null → value):  ${filled}`);
  console.log(`Corrected (wrong → right): ${corrected}`);
  console.log(`Skipped (weak desc-only disagreement): ${skippedWeak}`);

  if (Object.keys(fillByType).length) {
    console.log('\nFills by contentType:');
    for (const [t, n] of Object.entries(fillByType).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${t.padEnd(16)} ${n}`);
    }
  }
  if (corrections.length) {
    console.log('\nCorrections:');
    corrections.forEach((c) => console.log(c));
  }
  if (!apply && (filled + corrected) > 0) {
    console.log('\n👉 Re-run with --apply to write these changes.');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
