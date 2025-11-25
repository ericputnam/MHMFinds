import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ModSubmissionSchema, formatZodError } from '@/lib/validation/schemas';
import { ZodError } from 'zod';
import { verifyTurnstileToken } from '@/lib/services/turnstile';

// Rate limiting map (in-memory - for production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 5, // Maximum 5 submissions
  windowMs: 60 * 60 * 1000, // Per hour
};

// Helper function to check rate limit
function checkRateLimit(ip: string): { allowed: boolean; message?: string } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    });
    return { allowed: true };
  }

  if (userLimit.count >= RATE_LIMIT.maxRequests) {
    return {
      allowed: false,
      message: 'Too many submissions. Please try again later.',
    };
  }

  userLimit.count++;
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    // Get IP address for rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Check rate limit
    const rateLimitResult = checkRateLimit(ip);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: rateLimitResult.message
        },
        { status: 429 }
      );
    }

    // Parse and validate request body with Zod
    let validatedData;
    let captchaToken;
    try {
      const body = await request.json();
      captchaToken = body.captchaToken;
      validatedData = ModSubmissionSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            success: false,
            message: 'Validation failed',
            errors: formatZodError(error),
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Verify CAPTCHA token
    if (!captchaToken) {
      return NextResponse.json(
        {
          success: false,
          message: 'CAPTCHA verification required'
        },
        { status: 400 }
      );
    }

    const captchaResult = await verifyTurnstileToken(captchaToken, ip);
    if (!captchaResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: captchaResult.error || 'CAPTCHA verification failed'
        },
        { status: 400 }
      );
    }

    const { modUrl, modName, description, category, submitterName, submitterEmail } = validatedData;

    // Check for duplicate submissions (same URL within last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingSubmission = await prisma.modSubmission.findFirst({
      where: {
        modUrl,
        createdAt: {
          gte: oneDayAgo,
        },
      },
    });

    if (existingSubmission) {
      return NextResponse.json(
        {
          success: false,
          message: 'This mod has already been submitted recently.'
        },
        { status: 409 }
      );
    }

    // Create submission in database
    const submission = await prisma.modSubmission.create({
      data: {
        modUrl,
        modName,
        description,
        category,
        submitterName,
        submitterEmail,
        submitterIp: ip,
        status: 'pending',
      },
    });

    // TODO: Send email notification to admin
    // This would be implemented with SendGrid or similar service

    return NextResponse.json(
      {
        success: true,
        message: 'Mod submission received successfully',
        submissionId: submission.id
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Submit mod error:', error);

    // Don't expose internal errors to client
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while processing your submission. Please try again later.'
      },
      { status: 500 }
    );
  }
}
