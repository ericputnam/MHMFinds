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
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const result = await newsletterService.sendTestEmail(email);

    await logAdminAction({
      userId: user.id,
      action: 'send_test_newsletter',
      resource: 'newsletter',
      details: { email },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to send test newsletter:', error);
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}
