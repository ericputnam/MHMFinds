#!/usr/bin/env npx tsx
/**
 * Publish the MHM Lookbook Camera as a first-party mod.
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
const SITE_PACKAGE_URL = 'https://musthavemods.com/downloads/MHM-Lookbook-Camera-v1.0.zip';
const SITE_PIN_URL = 'https://musthavemods.com/downloads/lookbook-camera-pin.png';

const MOD_DIR = path.join(__dirname, '..', 'first-party-mods', 'lookbook-camera');
const PACKAGE_FILE = path.join(MOD_DIR, 'dist', 'MHM-Lookbook-Camera-v1.0.zip');
const PIN_FILE = path.join(MOD_DIR, 'dist', 'pin-lookbook-camera.png');

const TITLE = 'Top-Down CAS Camera — Sims 4 Lookbook Camera Mod (+2 Bonus Angles)';
const SOURCE = 'MustHaveMods.com';

const SHORT_DESCRIPTION =
  'The overhead CAS shot Sims 4 never had. The first mod to unlock the CAS camera vertical angle: ' +
  'Top-Down (+55) for overhead lookbook shots, plus two bonus angles — Editorial (+22) and Runway (-18) ' +
  'from below. Full-body views only, face editing stays untouched. Base game only, no script mods. Made by MustHaveMods.';

const DESCRIPTION = `The stock CAS camera only rotates horizontally: no overhead view, no low angle, which makes lookbook and outfit photography harder than it should be. It turns out the vertical angle was never an engine limitation, just a config value EA keeps between -7 and +10 degrees. Lookbook Camera changes it.

The hero is Top-Down. Two bonus angles ride along in the same zip. Install exactly ONE at a time:

- Top-Down: +55 degrees. The overhead editorial angle, flat-lay energy for full outfits.
- Editorial: +22 degrees. A subtle catalog angle, like your Sim is being photographed instead of scanned.
- Runway: -18 degrees. Shot from below. Makes every Sim look ten feet tall.

Only the full-body camera views change, and only for adult Sims. Face and detail editing views are completely stock, and horizontal rotation still works everywhere, so you can orbit your Sim 360 at whichever height you installed.

The practical details: base game only, no packs, pure tuning override so Script Mods can stay off. Just "Enable Custom Content and Mods" in Game Options. Each package is about 1KB. Switching angles is swap-the-file-and-restart.

Two honest notes. Switching angles takes a game restart — that is an engine limit (the camera config loads once at boot; we verified this harder than anyone) and it applies to every CAS camera mod ever made. And as a tuning override, this conflicts with other CAS camera mods and should be re-downloaded after major game patches.

Install: unzip, drop ONE .package into Documents/Electronic Arts/The Sims 4/Mods, restart the game, open CAS.`;

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);

  for (const f of [PACKAGE_FILE, PIN_FILE]) {
    if (!fs.existsSync(f)) throw new Error(`Missing file: ${f}`);
    console.log(`  found ${path.basename(f)} (${fs.statSync(f).size} bytes)`);
  }
  if (!SITE_HOSTED && !process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN not set');

  const MOD_ID = 'sims-4-lookbook-camera-mod'; // readable id = shareable /mods/ slug (pin titles derive from it)
  const existing = await prisma.mod.findFirst({ where: { OR: [{ id: MOD_ID }, { title: TITLE, source: SOURCE }] } });
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
      'mods/first-party/MHM-Lookbook-Camera-v1.0.zip',
      fs.readFileSync(PACKAGE_FILE),
      { access: 'public', contentType: 'application/zip', addRandomSuffix: false }
    );
    console.log(`  uploaded package: ${pkgBlob.url}`);
    const pinBlob = await put(
      'mods/first-party/lookbook-camera-pin.png',
      fs.readFileSync(PIN_FILE),
      { access: 'public', contentType: 'image/png', addRandomSuffix: false }
    );
    console.log(`  uploaded pin image: ${pinBlob.url}`);
    packageUrl = pkgBlob.url;
    pinUrl = pinBlob.url;
  }

  const data = {
    id: MOD_ID,
    title: TITLE,
    description: DESCRIPTION,
    shortDescription: SHORT_DESCRIPTION,
    category: 'Gameplay Mods',
    contentType: 'gameplay-mod',
    tags: ['camera', 'cas', 'lookbook', 'photography', 'base game compatible', 'utility'],
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
    ? await prisma.mod.update({ where: { id: existing.id }, data: (({ id, ...rest }) => rest)(data) })
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
