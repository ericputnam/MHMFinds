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

    const result = await SubscriptionService.canDownload(session.user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Check limit error:', error);

    // If user not found, return a specific error to trigger sign out on client
    if (error.message?.includes('User not found')) {
      return NextResponse.json({
        error: 'Invalid session',
        message: 'Please sign out and sign in again',
        shouldSignOut: true
      }, { status: 403 });
    }

    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
