import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/adminAuth';
import { newsletterService } from '@/lib/services/newsletterService';

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const data = await newsletterService.getWeeklyRoundupData();
    const html = newsletterService.buildRoundupHtml(data);

    return NextResponse.json({ html, data });
  } catch (error) {
    console.error('Failed to generate newsletter preview:', error);
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 });
  }
}
