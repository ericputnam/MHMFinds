import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, logAdminAction, getRequestMetadata } from '@/lib/auth/adminAuth';
import { importAmazonEarningsCsv } from '@/lib/services/affiliateEarnings/amazonCsvImport';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// POST /api/admin/affiliates/earnings/import — upload an Amazon Associates
// earnings-report CSV (Amazon has no earnings API). Body: { csv: string }.
// Idempotent: re-uploading the same or an overlapping report won't duplicate rows.
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const body = await request.json();
    const csv = body?.csv;
    if (typeof csv !== 'string' || csv.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: csv (report file contents as text)' },
        { status: 400 }
      );
    }

    const result = await importAmazonEarningsCsv(csv);

    const { ipAddress, userAgent } = getRequestMetadata(request);
    await logAdminAction({
      userId: user.id,
      action: 'affiliate_earnings_csv_import',
      resource: 'affiliate_earnings',
      details: result,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Amazon earnings CSV import failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
