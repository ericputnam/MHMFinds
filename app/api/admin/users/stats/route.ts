import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET - Get user statistics
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      total,
      creators,
      premium,
      admins,
      newThisMonth,
      newToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isCreator: true } }),
      prisma.user.count({ where: { isPremium: true } }),
      prisma.user.count({ where: { isAdmin: true } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: startOfMonth,
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: startOfDay,
          },
        },
      }),
    ]);

    return NextResponse.json({
      total,
      creators,
      premium,
      admins,
      newThisMonth,
      newToday,
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
