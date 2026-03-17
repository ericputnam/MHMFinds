import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, logAdminAction, getRequestMetadata } from '@/lib/auth/adminAuth';
import { newsletterService } from '@/lib/services/newsletterService';

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const { user } = authResult;
  const { ipAddress, userAgent } = getRequestMetadata(request);

  try {
    const result = await newsletterService.sendBlast(user.id);

    await logAdminAction({
      userId: user.id,
      action: 'send_newsletter_blast',
      resource: 'newsletter',
      details: { sendId: result.sendId, recipientCount: result.recipientCount },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to send newsletter blast:', error);
    return NextResponse.json({ error: 'Failed to send newsletter blast' }, { status: 500 });
  }
}
