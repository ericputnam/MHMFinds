/**
 * Copy mod thumbnails/images still pointing at Patreon's expiring signed image
 * URLs (*.patreonusercontent.com) to Vercel Blob and update the mod rows.
 *
 *   npx tsx scripts/rehost-patreon-images.ts           # dry run
 *   npx tsx scripts/rehost-patreon-images.ts --apply   # copy + update
 */
import { prisma } from '../lib/prisma';
import { needsRehost } from '../lib/imageUpload';
import { rehostModImages } from '../lib/services/imageUploader';

async function main() {
  const apply = process.argv.includes('--apply');
  // Postgres arrays can't be substring-matched through Prisma; filter in JS.
  const mods = await prisma.mod.findMany({
    select: { id: true, title: true, thumbnail: true, images: true },
  });
  const affected = mods.filter(
    (m) => needsRehost(m.thumbnail) || m.images.some((img) => needsRehost(img))
  );

  console.log(`${affected.length} mod(s) with Patreon image URLs${apply ? '' : ' (dry run)'}`);
  let fixed = 0;
  for (const mod of affected) {
    console.log(`- ${mod.id} ${mod.title}\n    old thumbnail: ${mod.thumbnail}`);
    if (!apply) continue;
    try {
      const out = await rehostModImages({ thumbnail: mod.thumbnail, images: mod.images });
      await prisma.mod.update({
        where: { id: mod.id },
        data: { thumbnail: out.thumbnail, images: out.images },
      });
      console.log(`    new thumbnail: ${out.thumbnail}`);
      fixed++;
    } catch (err) {
      console.error(`    FAILED: ${(err as Error).message}`);
    }
  }
  if (apply) console.log(`Updated ${fixed}/${affected.length}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
