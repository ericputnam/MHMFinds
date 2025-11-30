import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SubscriptionService } from '@/lib/services/subscriptionService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { modId } = await request.json();
    if (!modId) {
      return NextResponse.json({ error: 'modId required' }, { status: 400 });
    }

    const metadata = {
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      referrer: request.headers.get('referer')
    };

    const result = await SubscriptionService.trackClick(
      session.user.id,
      modId,
      metadata
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Track click error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
