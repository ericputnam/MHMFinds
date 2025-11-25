import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Rate limiting map (in-memory - for production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = {
  maxRequests: 10, // Maximum 10 signups per hour per IP
  windowMs: 60 * 60 * 1000, // 1 hour
};

function checkRateLimit(ip: string): { allowed: boolean; message?: string } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    });
    return { allowed: true };
  }

  if (userLimit.count >= RATE_LIMIT.maxRequests) {
    return {
      allowed: false,
      message: 'Too many signups. Please try again later.',
    };
  }

  userLimit.count++;
  return { allowed: true };
}

/**
 * POST /api/waitlist
 * Add email to waitlist
 */
export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Check rate limit
    const rateLimitResult = checkRateLimit(ip);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, message: rateLimitResult.message },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email, source = 'sign-in' } = body;

    // Basic validation
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Get user agent
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check if email already exists
    const existing = await prisma.waitlist.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: true,
          message: "You're already on the waitlist!",
          alreadyExists: true,
        },
        { status: 200 }
      );
    }

    // Add to waitlist
    await prisma.waitlist.create({
      data: {
        email: email.toLowerCase(),
        source: source,
        ipAddress: ip,
        userAgent: userAgent,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Thanks! We'll notify you when member accounts are ready.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Waitlist signup error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
