import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { CacheService } from '@/lib/cache';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// PATCH - Bulk update facets on multiple mods
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { modIds, contentType, visualStyle, themes } = body;

    if (!modIds || !Array.isArray(modIds) || modIds.length === 0) {
      return NextResponse.json({ error: 'modIds array is required' }, { status: 400 });
    }

    // Build update data object
    const updateData: Record<string, unknown> = {};

    // Handle contentType: can be a string value or null to clear
    if (contentType !== undefined) {
      updateData.contentType = contentType;
    }

    // Handle visualStyle: can be a string value or null to clear
    if (visualStyle !== undefined) {
      updateData.visualStyle = visualStyle;
    }

    // Handle themes: has mode ('set', 'add', 'clear')
    if (themes !== undefined) {
      const { mode, values } = themes;

      if (mode === 'clear') {
        // Clear all themes
        updateData.themes = [];
      } else if (mode === 'set' && Array.isArray(values)) {
        // Replace themes entirely
        updateData.themes = values;
      } else if (mode === 'add' && Array.isArray(values)) {
        // Add themes to existing - need to handle per-mod
        // This requires individual updates, not a bulk update
        const results = await Promise.all(
          modIds.map(async (modId: string) => {
            const mod = await prisma.mod.findUnique({
              where: { id: modId },
              select: { themes: true },
            });

            if (!mod) return null;

            // Merge existing themes with new ones (no duplicates)
            const mergedThemes = Array.from(new Set([...mod.themes, ...values]));

            return prisma.mod.update({
              where: { id: modId },
              data: { themes: mergedThemes },
            });
          })
        );

        const updatedCount = results.filter(Boolean).length;

        // Invalidate cache for all updated mods
        await Promise.all(modIds.map((id: string) => CacheService.invalidateMod(id)));

        // Log bulk operation
        console.log(`[BULK FACETS] Admin ${session.user.email} added themes to ${updatedCount} mods`);

        return NextResponse.json({
          success: true,
          updatedCount,
          operation: 'add_themes',
        });
      }
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No updates specified' }, { status: 400 });
    }

    // Perform bulk update
    const result = await prisma.mod.updateMany({
      where: { id: { in: modIds } },
      data: updateData,
    });

    // Invalidate cache for all updated mods
    await Promise.all(modIds.map((id: string) => CacheService.invalidateMod(id)));

    // Log bulk operation for audit trail
    console.log(
      `[BULK FACETS] Admin ${session.user.email} updated facets on ${result.count} mods:`,
      JSON.stringify(updateData)
    );

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
    });
  } catch (error) {
    console.error('Error bulk updating facets:', error);
    return NextResponse.json({ error: 'Failed to bulk update facets' }, { status: 500 });
  }
}
