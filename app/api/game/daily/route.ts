import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getEpisodeInfo,
  gameDateString,
  hashString,
  seededShuffle,
  RACK_SLOTS,
  ITEMS_PER_SLOT,
  type RackItem,
} from '@/lib/game/mainCharacter';

export const dynamic = 'force-dynamic';

const ITEM_SELECT = {
  id: true,
  title: true,
  thumbnail: true,
  author: true,
  themes: true,
  visualStyle: true,
  contentType: true,
  isFree: true,
} as const;

type ModRow = {
  id: string;
  title: string;
  thumbnail: string | null;
  author: string | null;
  themes: string[];
  visualStyle: string | null;
  contentType: string | null;
  isFree: boolean;
};

function toRackItem(mod: ModRow): RackItem {
  return {
    id: mod.id,
    title: mod.title,
    thumbnail: mod.thumbnail ?? '',
    author: mod.author,
    themes: mod.themes ?? [],
    visualStyle: mod.visualStyle,
    contentType: mod.contentType,
    isFree: mod.isFree,
  };
}

export async function GET() {
  try {
    const date = gameDateString();
    const info = getEpisodeInfo(date);
    const daySeed = hashString(`main-character:${date}`);

    const baseWhere = {
      isVerified: true,
      isNSFW: false,
      thumbnail: { not: null },
    };

    const slots = await Promise.all(
      RACK_SLOTS.map(async (slot, slotIndex) => {
        const slotSeed = daySeed + slotIndex * 7919;

        // On-theme picks first so every episode is winnable, then popular fill.
        const [themed, popular] = await Promise.all([
          prisma.mod.findMany({
            where: {
              ...baseWhere,
              contentType: { in: slot.contentTypes },
              OR: info.scene.keywords.map((k) => ({
                title: { contains: k, mode: 'insensitive' as const },
              })),
            },
            select: ITEM_SELECT,
            orderBy: { downloadCount: 'desc' },
            take: 30,
          }),
          prisma.mod.findMany({
            where: { ...baseWhere, contentType: { in: slot.contentTypes } },
            select: ITEM_SELECT,
            orderBy: { downloadCount: 'desc' },
            take: 150,
          }),
        ]);

        const themedPicks = seededShuffle(themed, slotSeed).slice(0, 3);
        const themedIds = new Set(themedPicks.map((m) => m.id));
        const fillPicks = seededShuffle(
          popular.filter((m) => !themedIds.has(m.id)),
          slotSeed + 1
        ).slice(0, ITEMS_PER_SLOT - themedPicks.length);

        const items = seededShuffle([...themedPicks, ...fillPicks], slotSeed + 2).map(
          toRackItem
        );

        return { slot: slot.slot, label: slot.label, emoji: slot.emoji, items };
      })
    );

    return NextResponse.json({
      episode: info.episode,
      date: info.date,
      scene: {
        id: info.scene.id,
        title: info.scene.title,
        prompt: info.scene.prompt,
        keywords: info.scene.keywords,
      },
      castId: info.cast.id,
      slots,
    });
  } catch (error) {
    console.error('[game/daily] failed to build episode:', error);
    return NextResponse.json(
      { error: 'Failed to load today\'s episode' },
      { status: 500 }
    );
  }
}
