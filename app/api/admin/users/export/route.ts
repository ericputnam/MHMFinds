import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Export users as CSV
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause for date filtering
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // End of day for end date
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Fetch all users (or filtered by date)
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        isCreator: true,
        isPremium: true,
        isAdmin: true,
        createdAt: true,
        emailVerified: true,
      },
    });

    // Generate CSV
    const headers = [
      'ID',
      'Email',
      'Username',
      'Display Name',
      'Creator',
      'Premium',
      'Admin',
      'Email Verified',
      'Joined Date',
    ];

    const rows = users.map((user) => [
      user.id,
      user.email,
      user.username,
      user.displayName || '',
      user.isCreator ? 'Yes' : 'No',
      user.isPremium ? 'Yes' : 'No',
      user.isAdmin ? 'Yes' : 'No',
      user.emailVerified ? 'Yes' : 'No',
      new Date(user.createdAt).toISOString(),
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting users:', error);
    return NextResponse.json({ error: 'Failed to export users' }, { status: 500 });
  }
}
