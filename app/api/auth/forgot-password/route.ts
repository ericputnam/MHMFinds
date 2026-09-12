import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPasswordToken, sendPasswordEmail } from '@/lib/services/authEmail';

export const dynamic = 'force-dynamic';

// In-memory limiter, same approach as the other public POST routes. Per-instance
// only, so it throttles casual abuse rather than a distributed attack.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= MAX_REQUESTS) return true;

  entry.count++;
  return false;
}

/**
 * POST /api/auth/forgot-password
 *
 * Always responds with the same success payload whether or not the address is
 * registered — telling an anonymous caller which emails exist would turn this
 * into an account-enumeration oracle.
 */
export async function POST(request: NextRequest) {
  const genericResponse = NextResponse.json({
    success: true,
    message:
      "If that email has an account, we've sent a link to reset your password.",
  });

  try {
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    if (rateLimited(ip)) {
      return NextResponse.json(
        { success: false, message: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      // Still generic — an "invalid email" branch is itself a signal.
      return genericResponse;
    }

    // The env-var admin account (lib/authOptions.ts) exists as a User row with
    // an `@admin.local` address and authenticates against ADMIN_PASSWORD, not
    // a credentials Account. A reset would mint a token for a mailbox that
    // cannot exist and, if ever consumed, would create a DB credentials row
    // for the admin — a second password path nobody intended. Never issue
    // tokens for it. Generic response, same as an unknown address.
    // Review fix 2026-09-12.
    if (email.endsWith('@admin.local')) {
      return genericResponse;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (user) {
      const { rawToken } = await createPasswordToken(user.email, 'reset');
      await sendPasswordEmail(user.email, rawToken, 'reset');
    }

    return genericResponse;
  } catch (error) {
    console.error('[forgot-password] error:', error);
    // Deliberately generic here too, so failures don't distinguish accounts.
    return genericResponse;
  }
}
