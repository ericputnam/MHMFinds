import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { agentOrchestrator, JobType } from '@/lib/services/agentOrchestrator';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobType } = await request.json();

  const validJobs: JobType[] = [
    'full',
    'ga4_sync',
    'affiliate_scan',
    'rpm_analysis',
    'forecast',
    'cleanup',
  ];

  if (!validJobs.includes(jobType)) {
    return NextResponse.json({ error: 'Invalid job type' }, { status: 400 });
  }

  try {
    const result = await agentOrchestrator.runJob(jobType);

    return NextResponse.json({
      success: result.success,
      duration: result.duration,
      itemsProcessed: result.itemsProcessed,
      opportunitiesFound: result.opportunitiesFound,
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      duration: 0,
      error: String(error),
    }, { status: 500 });
  }
}
