#!/usr/bin/env npx tsx
/**
 * READ-ONLY audit (Rowan, E147, 2026-09-30): rows whose `contentType` is a
 * room / lot value — `bathroom`, `kitchen`, `bedroom`, `living-room`,
 * `residential`, `lot`, `holidays` — broken down by whether the row also
 * carries a room theme and whether its title passes a title-only room rule.
 *
 * Prints counts per bucket and, with `--list`, every row (id, contentType,
 * category, source, themes, title). Never writes.
 *
 *   npx tsx scripts/agents/catalog-room-typed-audit.ts
 *   npx tsx scripts/agents/catalog-room-typed-audit.ts --list --types=bathroom,kitchen
 */
import '../lib/setup-env';

import { prisma } from '../../lib/prisma';
import { isBathroomTitle } from '../../lib/bathroomThemeRules';
import { isBedroomTitle } from '../../lib/bedroomThemeRules';
import { isKitchenTitle } from '../../lib/kitchenThemeRules';

const DEFAULT_TYPES = ['bathroom', 'kitchen', 'bedroom', 'living-room', 'residential', 'lot', 'holidays'];
const ROOM_THEMES = ['bathroom', 'kitchen', 'bedroom'];

async function main() {
  const argv = process.argv.slice(2);
  const list = argv.includes('--list');
  const roomThemedOnly = argv.includes('--room-themed');
  const typesArg = argv.find((a) => a.startsWith('--types='));
  const types = typesArg ? typesArg.slice('--types='.length).split(',').filter(Boolean) : DEFAULT_TYPES;

  const rows = await prisma.mod.findMany({
    where: { contentType: { in: types } },
    select: {
      id: true, title: true, contentType: true, category: true, source: true,
      themes: true, downloadCount: true, createdAt: true,
    },
    orderBy: [{ contentType: 'asc' }, { downloadCount: 'desc' }],
    take: 6000, // bounded read
  });

  console.log(`Loaded ${rows.length} rows typed ${types.join('/')}`);
  for (const t of types) {
    const inT = rows.filter((r) => r.contentType === t);
    const themed = inT.filter((r) => r.themes.some((th) => ROOM_THEMES.includes(th)));
    const titled = inT.filter((r) => isBathroomTitle(r.title) || isBedroomTitle(r.title) || isKitchenTitle(r.title));
    console.log(`  ${t.padEnd(12)} all ${String(inT.length).padStart(5)} · room-themed ${String(themed.length).padStart(4)} · room-titled ${String(titled.length).padStart(4)}`);
  }

  if (list) {
    for (const r of rows) {
      const themed = r.themes.some((th) => ROOM_THEMES.includes(th));
      if (roomThemedOnly && !themed) continue;
      console.log(
        [r.id, r.contentType, r.category, r.source, r.downloadCount, r.createdAt.toISOString().slice(0, 10),
          r.themes.filter((th) => ROOM_THEMES.includes(th)).join('+') || '-', r.title].join(' | '),
      );
    }
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await prisma.$disconnect();
  process.exit(1);
});
