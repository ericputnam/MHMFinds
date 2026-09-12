import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { consumePasswordToken, peekPasswordToken } from '@/lib/services/authEmail';
import { setUserPassword, validatePassword } from '@/lib/auth/credentials';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/reset-password?token=...
 *
 * Checks a link before the user types a password, so an expired invite shows a
 * useful message instead of failing on submit. Does not consume the token.
 */
export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get('token') || '';
    const result = await peekPasswordToken(token);

    if (!result) {
      return NextResponse.json(
        { valid: false, message: 'This link is invalid or has expired.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true, email: result.email });
  } catch (error) {
    console.error('[reset-password] validate error:', error);
    return NextResponse.json(
      { valid: false, message: 'Could not verify this link.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/reset-password
 * Body: { token, password }
 *
 * Consumes the token and writes the new password. Serves both the
 * forgot-password flow and the first-time invite for converted subscribers.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === 'string' ? body.token : '';
    const { password } = body;

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json(
        { success: false, message: passwordError },
        { status: 400 }
      );
    }

    // Validate before consuming so a weak password doesn't burn the token.
    const peeked = await peekPasswordToken(token);
    if (!peeked) {
      return NextResponse.json(
        { success: false, message: 'This link is invalid or has expired.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: peeked.email },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'This link is invalid or has expired.' },
        { status: 400 }
      );
    }

    const consumed = await consumePasswordToken(token);
    if (!consumed) {
      // Another request spent it between the peek and here.
      return NextResponse.json(
        { success: false, message: 'This link is invalid or has expired.' },
        { status: 400 }
      );
    }

    await setUserPassword(user.id, password);

    // Following the link proves control of the mailbox.
    if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      email: user.email,
      message: 'Your password has been set. You can sign in now.',
    });
  } catch (error) {
    console.error('[reset-password] error:', error);
    return NextResponse.json(
      { success: false, message: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
