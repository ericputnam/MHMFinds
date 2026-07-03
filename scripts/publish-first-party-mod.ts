#!/usr/bin/env npx tsx
/**
 * Publish the MHM "Main Character Energy" trait pack as a first-party mod.
 *
 * What it does:
 *   1. Uploads the built .package and the pin graphic to Vercel Blob (public).
 *   2. Creates a Mod row pointing downloadUrl at the Blob file, so the mod is
 *      downloadable through the normal /go/[modId] interstitial (tracked and
 *      monetized like every other listing).
 *   3. Updates the AI search index for the new mod (best effort).
 *
 * Idempotent: if a mod with the same title + source already exists it updates
 * the URLs instead of creating a duplicate.
 *
 * Usage:
 *   npx tsx scripts/publish-first-party-mod.ts                          # Dry run (preview)
 *   npx tsx scripts/publish-first-party-mod.ts --apply                  # Upload to Blob + create row
 *   npx tsx scripts/publish-first-party-mod.ts --apply --site-hosted    # Skip Blob; point at
 *       https://musthavemods.com/downloads/... (requires the files in public/downloads/
 *       to be deployed FIRST, or the listing will 404)
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { put } from '@vercel/blob';
import { prisma } from '../lib/prisma';

const APPLY = process.argv.includes('--apply');
const SITE_HOSTED = process.argv.includes('--site-hosted');
const SITE_PACKAGE_URL = 'https://musthavemods.com/downloads/MHM-Main-Character-Energy-Trait-Pack-v1.0.package';
const SITE_PIN_URL = 'https://musthavemods.com/downloads/main-character-energy-pin.png';

const MOD_DIR = path.join(__dirname, '..', 'first-party-mods', 'main-character-energy');
const PACKAGE_FILE = path.join(MOD_DIR, 'dist', 'MHM-Main-Character-Energy-Trait-Pack-v1.0.package');
const PIN_FILE = path.join(MOD_DIR, 'dist', 'pin-main-character-energy.png');

const TITLE = 'Main Character Energy — Sims 4 Trait Pack (4 Custom CAS Traits)';
const SOURCE = 'MustHaveMods.com';

const SHORT_DESCRIPTION =
  'Four CAS personality traits EA was never going to make: Main Character (+1 Confident), ' +
  'Golden Retriever Energy (+1 Playful), Delulu (+1 Happy) and Cottagecore Dreamer (+1 Inspired). ' +
  'Base game only — no packs, no script mods, 32KB. Made by MustHaveMods.';

const DESCRIPTION = `Main Character Energy is our first first-party trait pack: four CAS personality traits, each with a permanent low-weight moodlet and a custom icon.

The traits:
- Main Character — permanent +1 Confident. The plot bends around them and they know it.
- Golden Retriever Energy — permanent +1 Playful. No thoughts, just enthusiasm.
- Delulu — permanent +1 Happy. The delulu is, in fact, the solulu.
- Cottagecore Dreamer — permanent +1 Inspired. Mentally, they are baking bread in a meadow.

The buffs are weight 1 on purpose. A trait that locks your Sim into one emotion forever gets old fast — these nudge the baseline instead, so your Delulu Sim still gets sad when the stove catches fire. They just recover suspiciously fast.

Details: base game only, no packs required, Teen through Elder. Pure tuning mod, so you don't need Script Mods enabled — just "Enable Custom Content and Mods" in Game Options. English text ships to all 18 game languages.

Install: drop the .package file into Documents/Electronic Arts/The Sims 4/Mods, enable custom content in Game Options, restart the game and check the trait picker in CAS.`;

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);

  for (const f of [PACKAGE_FILE, PIN_FILE]) {
    if (!fs.existsSync(f)) throw new Error(`Missing file: ${f}`);
    console.log(`  found ${path.basename(f)} (${fs.statSync(f).size} bytes)`);
  }
  if (!SITE_HOSTED && !process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN not set');

  const existing = await prisma.mod.findFirst({ where: { title: TITLE, source: SOURCE } });
  console.log(existing ? `  existing mod found: ${existing.id} (will update)` : '  no existing mod (will create)');

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to upload and publish.');
    return;
  }

  let packageUrl: string;
  let pinUrl: string;
  if (SITE_HOSTED) {
    // Files must already be deployed via public/downloads/. Verify before
    // creating a listing that would otherwise 404.
    for (const url of [SITE_PACKAGE_URL, SITE_PIN_URL]) {
      const res = await fetch(url, { method: 'HEAD' });
      if (!res.ok) throw new Error(`${url} returned ${res.status} — deploy public/downloads/ first`);
      console.log(`  verified live: ${url}`);
    }
    packageUrl = SITE_PACKAGE_URL;
    pinUrl = SITE_PIN_URL;
  } else {
    const pkgBlob = await put(
      'mods/first-party/MHM-Main-Character-Energy-Trait-Pack-v1.0.package',
      fs.readFileSync(PACKAGE_FILE),
      { access: 'public', contentType: 'application/octet-stream', addRandomSuffix: false }
    );
    console.log(`  uploaded package: ${pkgBlob.url}`);
    const pinBlob = await put(
      'mods/first-party/main-character-energy-pin.png',
      fs.readFileSync(PIN_FILE),
      { access: 'public', contentType: 'image/png', addRandomSuffix: false }
    );
    console.log(`  uploaded pin image: ${pinBlob.url}`);
    packageUrl = pkgBlob.url;
    pinUrl = pinBlob.url;
  }

  const data = {
    title: TITLE,
    description: DESCRIPTION,
    shortDescription: SHORT_DESCRIPTION,
    category: 'Gameplay Mods',
    contentType: 'gameplay-mod',
    tags: ['traits', 'trait pack', 'cas', 'personality', 'base game compatible', 'maxis match'],
    source: SOURCE,
    author: 'MustHaveMods',
    version: '1.0',
    gameVersion: 'Sims 4',
    isFree: true,
    isVerified: true,
    isFeatured: true,
    downloadUrl: packageUrl,
    thumbnail: pinUrl,
    images: [pinUrl],
    publishedAt: new Date(),
  };

  const mod = existing
    ? await prisma.mod.update({ where: { id: existing.id }, data })
    : await prisma.mod.create({ data });
  console.log(`  mod ${existing ? 'updated' : 'created'}: ${mod.id}`);
  console.log(`  listing: https://musthavemods.com/mods/${mod.id}`);
  console.log(`  download page: https://musthavemods.com/go/${mod.id}`);

  try {
    const { aiSearchService } = await import('../lib/services/aiSearch');
    await aiSearchService.updateSearchIndex(mod.id);
    console.log('  search index updated');
  } catch (e: any) {
    console.warn(`  search index update skipped: ${e.message}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
