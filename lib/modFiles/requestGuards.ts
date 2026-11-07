/**
 * CSRF defence for state-changing hosted-upload routes. NextAuth cookies are
 * SameSite=Lax, which already blocks cross-site POSTs in modern browsers;
 * this is the second layer: the Origin must be this site.
 */
import type { NextRequest } from 'next/server';

export function isSameOrigin(request: NextRequest): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return false;
  const origin = request.headers.get('origin');
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host;
  return originHost === host;
}

/** Fields of a ModUpload that are safe to show the uploader. Never the blob path. */
export const CREATOR_UPLOAD_SELECT = {
  id: true,
  originalName: true,
  downloadName: true,
  kind: true,
  sizeBytes: true,
  status: true,
  validationError: true,
  containsScript: true,
  createdAt: true,
} as const;
