import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isApprovedPath } from '@/lib/modFiles/paths';
import { hostedUploadsEnabled, presignPublicDownload } from '@/lib/modFiles/storage';
import { ticketSecret, verifyTicket } from '@/lib/modFiles/ticket';

export const dynamic = 'force-dynamic';

const HEADERS = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
};

/**
 * GET /api/mods/[id]/download/?ticket=…
 * Releases a hosted mod file: checks the ticket from the /go countdown,
 * checks the file is still approved, then redirects to a private-store link
 * that expires in 5 minutes.
 *
 * Read-only on purpose (GET must never mutate): the download is counted by
 * the /go page's existing tracking call, not here. Never logs the ticket or
 * the signed link.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const notAvailable = (status: number, error: string) =>
    NextResponse.json({ error }, { status, headers: HEADERS });

  if (!hostedUploadsEnabled()) return notAvailable(404, 'Download not available');

  const ticket = request.nextUrl.searchParams.get('ticket');
  const check = verifyTicket(ticket, { modId: params.id, secret: ticketSecret() });
  if (!check.ok) {
    if (check.reason === 'too-early') return notAvailable(425, 'Please wait for the countdown to finish');
    if (check.reason === 'expired') return notAvailable(410, 'This download link expired. Go back and try again.');
    return notAvailable(403, 'Invalid download link');
  }

  const upload = await prisma.modUpload.findUnique({
    where: { id: check.payload.u },
    select: { status: true, modId: true, blobPathname: true },
  });
  if (!upload || upload.status !== 'approved' || upload.modId !== params.id || !isApprovedPath(upload.blobPathname)) {
    return notAvailable(404, 'This file is no longer available');
  }

  let url: string;
  try {
    url = await presignPublicDownload(upload.blobPathname);
  } catch (err) {
    console.error('[mod-files] presign failed:', (err as Error).name);
    return notAvailable(502, 'Download temporarily unavailable');
  }

  return new NextResponse(null, { status: 302, headers: { ...HEADERS, Location: url } });
}
