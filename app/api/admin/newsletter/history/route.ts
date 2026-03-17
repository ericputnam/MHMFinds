import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/adminAuth';
import { newsletterService } from '@/lib/services/newsletterService';

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const history = await newsletterService.getSendHistory();

    return NextResponse.json(history);
  } catch (error) {
    console.error('Failed to fetch newsletter send history:', error);
    return NextResponse.json({ error: 'Failed to fetch send history' }, { status: 500 });
  }
}
