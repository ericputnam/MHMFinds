import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { ModSubmissionSchema, formatZodError } from '@/lib/validation/schemas';
import { ZodError } from 'zod';
import { verifyTurnstileToken } from '@/lib/services/turnstile';
import { emailNotifier } from '@/lib/services/emailNotifier';
import { CLAIM_SOURCE, parseClaimSlug, pendingProfileHandle } from '@/lib/creatorClaim';

// getServerSession reads request headers; never let this route be
// evaluated statically.
export const dynamic = 'force-dynamic';

// Rate limiting map (in-memory - for production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Who is submitting, if anyone is signed in (Nova, E122). The form is
 * public and must keep working for anonymous visitors, so a session
 * lookup failure is treated as "nobody", never as an error.
 */
async function sessionUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Make sure a signed-in claimant has the CreatorProfile row the scoreboard
 * counts ("creators onboarded" = CreatorProfile.userId ∩
 * ModSubmission.userId). Idempotent; a failure here is logged and
 * swallowed so the submission that triggered it is never lost. Does NOT
 * set User.isCreator — the review queue keeps that gate (admin-only) — and
 * does NOT use the public slug as the handle: /creator/[slug]/ joins on
 * `handle === slug`, so the row is created under a pending handle that no
 * page reads, and an admin promotes it at review.
 */
async function ensureCreatorProfile(userId: string, slug: string): Promise<void> {
  try {
    const existing = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true } });
    if (existing) return;
    await prisma.creatorProfile.create({
      data: { userId, handle: pendingProfileHandle(slug, userId) },
    });
  } catch (error) {
    console.error('ensureCreatorProfile failed:', error);
  }
}

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
    // Creator claim (E122): re-validated here, not trusted from the schema.
    const claimedSlug = parseClaimSlug(validatedData.claimedCreatorSlug);
    const userId = await sessionUserId();

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
        // E122: tie the row to the signed-in account (null when anonymous —
        // the pre-E122 behaviour) and record which creator page was claimed.
        userId,
        ...(claimedSlug ? { source: CLAIM_SOURCE, author: claimedSlug } : {}),
      },
    });

    if (userId && claimedSlug) {
      await ensureCreatorProfile(userId, claimedSlug);
    }

    const adminEmail = process.env.SUBMISSIONS_ALERT_EMAIL || process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const subject = claimedSlug
        ? `Creator claim for /creator/${claimedSlug}/: ${submission.modName}`
        : `New mod submission: ${submission.modName}`;
      const html = `
        <p>A new mod submission is waiting for review.</p>
        <ul>
          <li><strong>Name:</strong> ${submission.modName}</li>
          <li><strong>Category:</strong> ${submission.category}</li>
          <li><strong>URL:</strong> ${submission.modUrl}</li>
          <li><strong>Submitter:</strong> ${submission.submitterName} (${submission.submitterEmail})</li>
          ${claimedSlug ? `<li><strong>Claims creator page:</strong> https://musthavemods.com/creator/${claimedSlug}/${userId ? ' (signed-in account, profile created)' : ' (anonymous — ask them to sign in to link it)'}</li>` : ''}
        </ul>
      `;

      void Promise.resolve(emailNotifier.send(adminEmail, subject, html)).catch((notifyError) => {
        console.error('Failed to send submission notification email:', notifyError);
      });
    }

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
