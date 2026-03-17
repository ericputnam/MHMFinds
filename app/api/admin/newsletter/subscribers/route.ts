import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, logAdminAction, getRequestMetadata } from '@/lib/auth/adminAuth';
import { newsletterService } from '@/lib/services/newsletterService';

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const { user } = authResult;
  const { ipAddress, userAgent } = getRequestMetadata(request);

  try {
    const stats = await newsletterService.getSubscriberStats();

    await logAdminAction({
      userId: user.id,
      action: 'view_newsletter_subscribers',
      resource: 'newsletter',
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Failed to fetch newsletter subscriber stats:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriber stats' }, { status: 500 });
  }
}
