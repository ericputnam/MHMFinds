# Security Hardening Guide for MHMFinds

> **Priority:** CRITICAL
> **Status:** Required Before Production Launch
> **Last Updated:** November 2025

---

## Table of Contents

1. [Critical Security Vulnerabilities](#critical-security-vulnerabilities)
2. [Authentication & Authorization](#authentication--authorization)
3. [API Security](#api-security)
4. [Database Security](#database-security)
5. [Input Validation & Sanitization](#input-validation--sanitization)
6. [Rate Limiting & DDoS Protection](#rate-limiting--ddos-protection)
7. [Secrets Management](#secrets-management)
8. [Security Headers](#security-headers)
9. [Dependency Security](#dependency-security)
10. [Monitoring & Incident Response](#monitoring--incident-response)

---

## Critical Security Vulnerabilities

### 🔴 CRITICAL: Missing Admin Authentication

**Status:** MUST FIX BEFORE PRODUCTION

**Issue:** All admin routes (`/api/admin/*`) are currently unprotected. Anyone can access admin functionality.

**Affected Files:**
- `app/api/admin/stats/route.ts`
- `app/api/admin/mods/route.ts`
- `app/api/admin/users/route.ts`
- `app/api/admin/submissions/route.ts`
- `app/api/admin/creators/route.ts`
- `app/api/admin/categories/route.ts`
- All other `/api/admin/**/*` routes

**Fix:** Create authentication middleware

**Implementation:**

1. Create `/lib/middleware/auth.ts`:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextRequest, NextResponse } from 'next/server';

export async function requireAuth(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return session;
}

export async function requireAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!session.user.isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden - Admin access required' },
      { status: 403 }
    );
  }

  return session;
}

export async function requireCreator(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!session.user.isCreator && !session.user.isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden - Creator access required' },
      { status: 403 }
    );
  }

  return session;
}

export async function requirePremium(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!session.user.isPremium && !session.user.isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden - Premium subscription required' },
      { status: 403 }
    );
  }

  return session;
}
```

2. Update all admin routes. Example for `app/api/admin/stats/route.ts`:

```typescript
import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return error response
  }

  try {
    // ... existing stats logic ...
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
```

3. Apply to ALL admin routes:
   - [ ] `app/api/admin/stats/route.ts`
   - [ ] `app/api/admin/mods/route.ts`
   - [ ] `app/api/admin/mods/[id]/route.ts`
   - [ ] `app/api/admin/mods/bulk/route.ts`
   - [ ] `app/api/admin/submissions/route.ts`
   - [ ] `app/api/admin/submissions/[id]/approve/route.ts`
   - [ ] `app/api/admin/submissions/[id]/reject/route.ts`
   - [ ] `app/api/admin/creators/route.ts`
   - [ ] `app/api/admin/creators/[id]/route.ts`
   - [ ] `app/api/admin/users/route.ts`
   - [ ] `app/api/admin/users/[id]/route.ts`
   - [ ] `app/api/admin/categories/route.ts`
   - [ ] `app/api/admin/categories/[id]/route.ts`

---

### 🟠 HIGH: In-Memory Rate Limiting

**Issue:** Rate limiting in `/api/submit-mod/route.ts` uses in-memory Map, which resets on each serverless function invocation.

**Impact:** Rate limiting is ineffective on Vercel, allowing spam/abuse.

**Fix:** Implement Redis-based rate limiting

**Implementation:**

1. Install dependencies:
```bash
npm install @upstash/redis @upstash/ratelimit
```

2. Create `/lib/ratelimit.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create Redis client
const redis = new Redis({
  url: process.env.REDIS_URL || '',
  token: process.env.REDIS_TOKEN || '',
});

// Rate limiters for different endpoints
export const submitModLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 requests per hour
  analytics: true,
  prefix: 'ratelimit:submit-mod',
});

export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
  prefix: 'ratelimit:api',
});

export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 login attempts per 15 min
  analytics: true,
  prefix: 'ratelimit:auth',
});

export const downloadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 h'), // 20 downloads per hour (free tier)
  analytics: true,
  prefix: 'ratelimit:download',
});

// Helper to get IP address
export function getIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return 'unknown';
}
```

3. Update `/api/submit-mod/route.ts`:

```typescript
import { submitModLimiter, getIP } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
  try {
    const ip = getIP(request);

    // Check rate limit
    const { success, limit, remaining, reset } = await submitModLimiter.limit(ip);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many submissions. Please try again later.',
          limit,
          remaining,
          reset: new Date(reset).toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      );
    }

    // ... rest of the logic ...
  } catch (error) {
    // ...
  }
}
```

4. Apply rate limiting to all public endpoints:
   - [ ] `/api/mods/route.ts`
   - [ ] `/api/submit-mod/route.ts`
   - [ ] `/api/creators/rankings/route.ts`
   - [ ] `/api/auth/*` endpoints

---

### 🟠 HIGH: Missing CSRF Protection

**Issue:** State-changing operations (POST, PUT, DELETE) don't verify CSRF tokens.

**Fix:** Implement CSRF protection

**Implementation:**

1. Install:
```bash
npm install csrf
```

2. Create `/lib/csrf.ts`:

```typescript
import { createHash } from 'crypto';

export function generateCSRFToken(sessionId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || '';
  return createHash('sha256')
    .update(`${sessionId}${secret}`)
    .digest('hex');
}

export function validateCSRFToken(token: string, sessionId: string): boolean {
  const expectedToken = generateCSRFToken(sessionId);
  return token === expectedToken;
}
```

3. Add to forms and API routes that mutate data

---

### 🟡 MEDIUM: Environment Variable Exposure

**Issue:** Hardcoded `NEXTAUTH_SECRET` in `.env` file tracked in git history.

**Fix:**
1. Generate new secret: `openssl rand -base64 32`
2. Update in Vercel environment variables
3. Remove from git history:
```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all
```
4. Add `.env` to `.gitignore` (already done)

---

### 🟡 MEDIUM: Missing Input Validation on Mods API

**Issue:** `/api/mods/route.ts` doesn't validate query parameters.

**Fix:** Add validation using Zod

**Implementation:**

1. Install Zod (already installed):
```bash
npm install zod
```

2. Create `/lib/validation/schemas.ts`:

```typescript
import { z } from 'zod';

export const modsQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().max(100).optional(),
  search: z.string().max(500).optional(),
  sort: z.enum(['newest', 'popular', 'rating', 'downloads']).optional(),
  isFree: z.enum(['true', 'false']).optional(),
  gameVersion: z.string().max(50).optional(),
});

export const modCreateSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(20).max(10000),
  category: z.string().min(1).max(100),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isFree: z.boolean(),
  price: z.number().positive().max(999.99).optional(),
  gameVersion: z.string().max(50).optional(),
  downloadUrl: z.string().url().max(2000).optional(),
});

export const submitModSchema = z.object({
  modUrl: z.string().url().max(2000),
  modName: z.string().min(3).max(200),
  description: z.string().min(20).max(2000),
  category: z.string().min(1).max(100),
  submitterName: z.string().min(1).max(100),
  submitterEmail: z.string().email().max(255),
});
```

3. Apply validation to routes:

```typescript
import { modsQuerySchema } from '@/lib/validation/schemas';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate and parse query parameters
    const validatedParams = modsQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      category: searchParams.get('category'),
      search: searchParams.get('search'),
      sort: searchParams.get('sort'),
      isFree: searchParams.get('isFree'),
      gameVersion: searchParams.get('gameVersion'),
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validatedParams.error.flatten()
        },
        { status: 400 }
      );
    }

    const params = validatedParams.data;

    // ... use validated params ...
  } catch (error) {
    // ...
  }
}
```

---

## Authentication & Authorization

### Implement Role-Based Access Control (RBAC)

Create `/lib/rbac.ts`:

```typescript
export enum Permission {
  // Mod permissions
  MOD_VIEW = 'mod:view',
  MOD_CREATE = 'mod:create',
  MOD_EDIT = 'mod:edit',
  MOD_DELETE = 'mod:delete',
  MOD_FEATURE = 'mod:feature',

  // User permissions
  USER_VIEW = 'user:view',
  USER_EDIT_SELF = 'user:edit:self',
  USER_EDIT_ANY = 'user:edit:any',
  USER_DELETE = 'user:delete',

  // Creator permissions
  CREATOR_VIEW = 'creator:view',
  CREATOR_EDIT_SELF = 'creator:edit:self',
  CREATOR_EDIT_ANY = 'creator:edit:any',

  // Admin permissions
  ADMIN_PANEL = 'admin:panel',
  ADMIN_STATS = 'admin:stats',
  ADMIN_SUBMISSIONS = 'admin:submissions',
}

export const ROLE_PERMISSIONS = {
  FREE: [
    Permission.MOD_VIEW,
    Permission.CREATOR_VIEW,
    Permission.USER_EDIT_SELF,
  ],
  PREMIUM: [
    Permission.MOD_VIEW,
    Permission.CREATOR_VIEW,
    Permission.USER_EDIT_SELF,
  ],
  CREATOR: [
    Permission.MOD_VIEW,
    Permission.MOD_CREATE,
    Permission.MOD_EDIT,
    Permission.CREATOR_VIEW,
    Permission.CREATOR_EDIT_SELF,
    Permission.USER_EDIT_SELF,
  ],
  ADMIN: [
    ...Object.values(Permission), // All permissions
  ],
};

export function hasPermission(
  user: { isAdmin?: boolean; isCreator?: boolean; isPremium?: boolean },
  permission: Permission
): boolean {
  if (user.isAdmin) {
    return true; // Admins have all permissions
  }

  if (user.isCreator && ROLE_PERMISSIONS.CREATOR.includes(permission)) {
    return true;
  }

  if (user.isPremium && ROLE_PERMISSIONS.PREMIUM.includes(permission)) {
    return true;
  }

  return ROLE_PERMISSIONS.FREE.includes(permission);
}
```

---

## API Security

### Implement API Request Validation

Create `/lib/middleware/validateRequest.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export function validateRequest<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: NextResponse } {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: NextResponse.json(
        {
          error: 'Validation failed',
          details: result.error.flatten(),
        },
        { status: 400 }
      ),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
```

### Add Request Logging

Create `/lib/middleware/logging.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function logRequest(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const start = Date.now();
  const { method, url } = request;

  try {
    const response = await handler();
    const duration = Date.now() - start;

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method,
      url,
      status: response.status,
      duration: `${duration}ms`,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    }));

    return response;
  } catch (error) {
    const duration = Date.now() - start;

    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      method,
      url,
      status: 500,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    }));

    throw error;
  }
}
```

---

## Database Security

### Add Connection Pooling

Update `lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
```

### Add Database Indexes

Update `prisma/schema.prisma`:

```prisma
model Mod {
  // ... existing fields ...

  @@index([category])
  @@index([creatorId])
  @@index([isFeatured, createdAt])
  @@index([downloadCount])
  @@index([rating])
  @@index([source, sourceId])
  @@index([categoryId, isFree, createdAt])
}

model User {
  // ... existing fields ...

  @@index([isCreator])
  @@index([isPremium])
  @@index([isAdmin])
}

model Favorite {
  // ... existing fields ...

  @@index([userId, createdAt])
  @@index([modId])
}

model Download {
  // ... existing fields ...

  @@index([userId, createdAt])
  @@index([modId, createdAt])
}

model Review {
  // ... existing fields ...

  @@index([modId, createdAt])
  @@index([userId])
}
```

Run migration:
```bash
npx prisma migrate dev --name add_performance_indexes
```

---

## Input Validation & Sanitization

### SQL Injection Prevention

**Status:** ✅ Already protected by Prisma (uses parameterized queries)

**Verification:** All database queries use Prisma ORM, which automatically prevents SQL injection.

### XSS Prevention

1. Update `/api/submit-mod/route.ts` sanitization:

```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeInput(input: string, options: { allowHTML?: boolean } = {}): string {
  if (options.allowHTML) {
    // Allow safe HTML tags
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href'],
    });
  }

  // Strip all HTML
  return input
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 10000);
}
```

2. Install:
```bash
npm install isomorphic-dompurify
```

---

## Rate Limiting & DDoS Protection

### Implement Tiered Rate Limiting

Update `/lib/ratelimit.ts`:

```typescript
export function getRateLimiter(tier: 'FREE' | 'STANDARD' | 'PREMIUM' | 'ADMIN') {
  const limits = {
    FREE: { requests: 20, window: '1 m' },
    STANDARD: { requests: 100, window: '1 m' },
    PREMIUM: { requests: 500, window: '1 m' },
    ADMIN: { requests: 1000, window: '1 m' },
  };

  const { requests, window } = limits[tier];

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window as any),
    analytics: true,
    prefix: `ratelimit:${tier.toLowerCase()}`,
  });
}
```

### Add DDoS Protection via Middleware

Create `/middleware.ts` in project root:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Add security headers
  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## Secrets Management

### Validate Environment Variables on Startup

Create `/lib/env.ts`:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Auth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),

  // APIs
  OPENAI_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),

  // Redis
  REDIS_URL: z.string().url().optional(),

  // Node env
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    console.log('✅ Environment variables validated successfully');
    return env;
  } catch (error) {
    console.error('❌ Invalid environment variables:');
    console.error(error);
    process.exit(1);
  }
}

// Run validation on import
if (process.env.NODE_ENV === 'production') {
  validateEnv();
}
```

Import in `app/layout.tsx`:

```typescript
import '@/lib/env';
```

---

## Security Headers

### Already implemented in `next.config.js` ✅

Verify these headers are present:
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ Referrer-Policy
- 🔴 Missing: Content-Security-Policy (needs update)
- 🔴 Missing: Strict-Transport-Security (add in vercel.json)
- 🔴 Missing: Permissions-Policy (add)

---

## Dependency Security

### Regular Audit

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Check outdated packages
npm outdated

# Update with caution
npm update
```

### Implement Dependabot

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "your-github-username"
    labels:
      - "dependencies"
      - "security"
```

---

## Monitoring & Incident Response

### Implement Error Tracking with Sentry

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### Create Security Event Logging

Create `/lib/security/logger.ts`:

```typescript
export enum SecurityEvent {
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  INVALID_TOKEN = 'invalid_token',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ADMIN_ACTION = 'admin_action',
}

export function logSecurityEvent(
  event: SecurityEvent,
  details: {
    userId?: string;
    ip?: string;
    endpoint?: string;
    [key: string]: any;
  }
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...details,
  };

  console.warn('[SECURITY]', JSON.stringify(logEntry));

  // Send to monitoring service (Sentry, DataDog, etc.)
  if (process.env.SENTRY_DSN) {
    // Sentry.captureMessage(`Security Event: ${event}`, {
    //   level: 'warning',
    //   extra: logEntry,
    // });
  }
}
```

---

## Security Checklist

### Before Production Launch

- [ ] All admin routes protected with authentication
- [ ] Redis-based rate limiting implemented
- [ ] CSRF protection enabled
- [ ] Input validation on all endpoints
- [ ] Database indexes added
- [ ] Environment variables validated on startup
- [ ] Security headers configured
- [ ] Dependencies audited and updated
- [ ] Sentry error monitoring configured
- [ ] Security event logging implemented
- [ ] Webhook signature validation (Stripe, etc.)
- [ ] SSL/TLS enforced (automatic on Vercel)
- [ ] CORS properly configured
- [ ] Session security hardened
- [ ] File upload validation (if implemented)
- [ ] API response sanitization
- [ ] Logging audit trail for sensitive operations
- [ ] Incident response plan documented
- [ ] Regular security audit scheduled

---

## Continuous Security

### Monthly Tasks
- [ ] Review access logs for suspicious activity
- [ ] Audit user permissions
- [ ] Review and rotate API keys
- [ ] Check for dependency updates
- [ ] Review Sentry errors

### Quarterly Tasks
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Update security documentation
- [ ] Review and update incident response plan

### Annual Tasks
- [ ] Comprehensive security review
- [ ] Third-party security assessment
- [ ] Update compliance documentation

---

**Security is an ongoing process, not a one-time task.** Regularly review and update these measures as threats evolve.

For questions or to report security vulnerabilities, contact: security@yourdomain.com
