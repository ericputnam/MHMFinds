import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, logAdminAction, getRequestMetadata } from '@/lib/auth/adminAuth';

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const { user } = authResult;
  const { ipAddress, userAgent } = getRequestMetadata(request);
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const [entries, total, notified, pending, recentSignups] = await Promise.all([
      prisma.waitlist.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, source: true, ipAddress: true, createdAt: true, notified: true }
      }),
      prisma.waitlist.count(),
      prisma.waitlist.count({ where: { notified: true } }),
      prisma.waitlist.count({ where: { notified: false } }),
      prisma.waitlist.count({ where: { createdAt: { gte: sevenDaysAgo } } })
    ]);
    await logAdminAction({
      userId: user.id,
      action: 'view_waitlist',
      resource: 'waitlist',
      ipAddress,
      userAgent
    });
    return NextResponse.json({
      entries,
      stats: { total, notified, pending, recentSignups }
    });
  } catch (error) {
    console.error('Failed to fetch waitlist:', error);
    return NextResponse.json({ error: 'Failed to fetch waitlist' }, { status: 500 });
  }
}
