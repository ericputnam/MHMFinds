import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { isMembershipEnabled } from '@/lib/membership';
import { DOWNLOAD_TICKET_TTL_MS, DOWNLOAD_WAIT_MS } from '@/lib/modFiles/constants';
import { findHostedFile } from '@/lib/modFiles/lifecycle';
import { isSameOrigin } from '@/lib/modFiles/requestGuards';
import { hostedUploadsEnabled } from '@/lib/modFiles/storage';
import { signTicket, ticketSecret } from '@/lib/modFiles/ticket';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * POST /api/mods/[id]/download-ticket/
 * Called by the /go countdown page. Returns a signed ticket that becomes
 * valid only after the countdown (members skip the wait, matching /go).
 * The download route refuses a ticket used early, so the countdown is
 * enforced by the server, not just the page.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE });
  }
  if (!hostedUploadsEnabled()) {
    return NextResponse.json({ error: 'No hosted file' }, { status: 404, headers: NO_STORE });
  }
  if (typeof params.id !== 'string' || params.id.length === 0 || params.id.length > 64) {
    return NextResponse.json({ error: 'No hosted file' }, { status: 404, headers: NO_STORE });
  }

  const file = await findHostedFile(params.id);
  if (!file) return NextResponse.json({ error: 'No hosted file' }, { status: 404, headers: NO_STORE });

  let waitMs = DOWNLOAD_WAIT_MS;
  if (isMembershipEnabled()) {
    const session = await getServerSession(authOptions).catch(() => null);
    if (session?.user?.isPremium) waitMs = 0;
  }

  const now = Date.now();
  const nbf = now + waitMs;
  const ticket = signTicket({ u: file.id, m: params.id, nbf, exp: nbf + DOWNLOAD_TICKET_TTL_MS }, ticketSecret());

  return NextResponse.json(
    {
      ticket,
      waitMs,
      expiresInMs: waitMs + DOWNLOAD_TICKET_TTL_MS,
      file: { name: file.downloadName, sizeBytes: file.sizeBytes, kind: file.kind, containsScript: file.containsScript },
    },
    { headers: NO_STORE },
  );
}
