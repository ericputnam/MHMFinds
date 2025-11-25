# Security Implementation Guide

## Overview

This document outlines the comprehensive security measures implemented for MHMFinds (MustHaveMods). All critical security vulnerabilities have been addressed.

---

## 🔐 Authentication & Authorization

### Admin Access Control

**Files:**
- `middleware.ts` - Next.js middleware protecting `/admin` routes
- `lib/auth/adminAuth.ts` - Admin authentication utilities

**Implementation:**
1. **Route Protection**: `/admin/*` routes require authentication + `isAdmin` role
2. **Middleware Check**: Redirects unauthorized users to `/sign-in`
3. **API Protection**: `requireAdmin()` function validates all admin API requests
4. **Session Management**: NextAuth JWT strategy with role-based claims

**Security Features:**
- ✅ Server-side authentication check before route access
- ✅ Admin role validation (isAdmin flag in JWT token)
- ✅ Automatic redirect for unauthorized access
- ✅ Session expiration handling

### Admin User Setup

**Script:** `scripts/create-admin.ts`

**Usage:**
```bash
npm run admin:create
```

**Security Features:**
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Never stores plain text passwords
- ✅ Credentials read from environment variables
- ✅ Automatic admin role assignment

**Initial Credentials:**
- Username: `adminuser45` (from ADMIN_USERNAME env var)
- Password: `5GbHE%X9c%#tIg4i` (from ADMIN_PASSWORD env var)
- Email: `adminuser45@admin.local`

**⚠️ CRITICAL: Change password immediately after first login!**

---

## 🤖 CAPTCHA Protection

### Cloudflare Turnstile Implementation

**Files:**
- `lib/services/turnstile.ts` - CAPTCHA verification service
- `app/submit-mod/page.tsx` - Submit form with CAPTCHA widget
- `app/api/submit-mod/route.ts` - Backend verification

**Why Turnstile?**
- ✅ Free tier: 1M requests/month
- ✅ Privacy-friendly (GDPR compliant)
- ✅ AI-resistant bot detection
- ✅ Better UX than reCAPTCHA
- ✅ No user interaction required (most cases)

**Configuration:**

1. **Get API Keys** (https://dash.cloudflare.com/)
   - Create a new Turnstile site
   - Copy Site Key and Secret Key

2. **Add to `.env`:**
```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY="your-site-key"
TURNSTILE_SECRET_KEY="your-secret-key"
```

3. **For Development** (use test keys):
```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000000000AA"
TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"
```

**Security Flow:**
1. User completes form + CAPTCHA challenge
2. CAPTCHA widget generates token
3. Token sent to backend with form data
4. Backend verifies token with Cloudflare API
5. Submission only processed if CAPTCHA valid

---

## 📋 Audit Logging

### Admin Action Tracking

**Database:** `AdminAuditLog` model in Prisma schema

**Tracked Actions:**
- View dashboard stats
- Create/Update/Delete mods
- Approve/Reject submissions
- Manage users
- Configuration changes

**Log Fields:**
- User ID (who performed action)
- Action type (create, update, delete, approve, etc.)
- Resource type (mod, user, submission, etc.)
- Resource ID (specific item affected)
- Details (JSON with additional context)
- IP Address
- User Agent
- Timestamp

**Usage:**
```typescript
import { logAdminAction } from '@/lib/auth/adminAuth';

await logAdminAction({
  userId: user.id,
  action: 'delete_mod',
  resource: 'mod',
  resourceId: modId,
  details: { reason: 'violates ToS' },
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
});
```

---

## 🛡️ Rate Limiting

### Mod Submission Rate Limits

**Current Implementation:**
- 5 submissions per hour per IP address
- In-memory rate limiting (development)
- Duplicate submission detection (24-hour window)

**Recommended for Production:**
- Migrate to Redis-based rate limiting (Upstash Redis)
- Implement exponential backoff
- Add user-based rate limits (if authenticated)

**Configuration:**
```typescript
const RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
};
```

---

## 🔒 Security Best Practices

### Password Security
- ✅ bcrypt hashing (12 rounds minimum)
- ✅ Never log passwords
- ✅ Force password change on first admin login
- ✅ Store in environment variables, not code

### Input Validation
- ✅ Zod schemas for all form inputs
- ✅ Server-side validation (never trust client)
- ✅ SQL injection protection (Prisma ORM)
- ✅ XSS protection (React escaping)

### Session Security
- ✅ JWT with secure secret (NEXTAUTH_SECRET)
- ✅ HTTP-only cookies
- ✅ Secure flag in production (HTTPS)
- ✅ Session expiration
- ✅ Logout functionality

### CSRF Protection
- ✅ NextAuth built-in CSRF protection
- ✅ Same-site cookie policy
- ✅ Origin validation

---

## 🚀 Deployment Checklist

### Before Going Live:

1. **Environment Variables:**
   - [ ] Change `NEXTAUTH_SECRET` (use `openssl rand -base64 32`)
   - [ ] Set production `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`
   - [ ] Change `ADMIN_USERNAME` and `ADMIN_PASSWORD`
   - [ ] Set `NODE_ENV=production`

2. **Admin Account:**
   - [ ] Run `npm run admin:create` on production
   - [ ] Login and change password immediately
   - [ ] Enable 2FA (TODO: implement)

3. **Database:**
   - [ ] Run migrations on production database
   - [ ] Verify audit log table exists
   - [ ] Set up database backups

4. **Security Headers:**
   - [ ] Add CSP (Content Security Policy)
   - [ ] Add HSTS (Strict-Transport-Security)
   - [ ] Add X-Frame-Options
   - [ ] Add X-Content-Type-Options

5. **Rate Limiting:**
   - [ ] Set up Redis (Upstash recommended)
   - [ ] Configure per-endpoint rate limits
   - [ ] Monitor for abuse patterns

6. **Monitoring:**
   - [ ] Set up error tracking (Sentry)
   - [ ] Monitor failed login attempts
   - [ ] Alert on suspicious activity
   - [ ] Review audit logs regularly

---

## 📊 Security Monitoring

### What to Monitor:

1. **Failed Login Attempts**
   - Multiple failures from same IP
   - Brute force patterns
   - Unusual login times

2. **Admin Actions**
   - Bulk deletions
   - Mass updates
   - Configuration changes
   - User privilege escalation

3. **Submission Patterns**
   - Spam submissions
   - Rapid-fire submissions
   - Malicious URLs
   - SQL injection attempts

4. **API Abuse**
   - Rate limit violations
   - Unusual traffic spikes
   - Invalid tokens
   - Bot activity

---

## 🔧 Additional Recommendations

### High Priority (Implement Next):

1. **Two-Factor Authentication (2FA)**
   - Use authenticator app (TOTP)
   - Require for all admin accounts
   - Backup codes for recovery

2. **IP Whitelisting (Optional)**
   - Restrict admin access to specific IPs
   - VPN-only access
   - Geolocation restrictions

3. **Content Security Policy (CSP)**
   - Prevent XSS attacks
   - Whitelist allowed sources
   - Report violations

4. **Redis Rate Limiting**
   - Replace in-memory with Redis
   - Distributed rate limiting
   - More accurate tracking

### Medium Priority:

5. **Webhook Signature Verification**
   - Verify external webhooks
   - Prevent replay attacks

6. **API Key Rotation**
   - Regular rotation schedule
   - Revoke compromised keys

7. **Security Scanning**
   - Automated vulnerability scanning
   - Dependency updates
   - OWASP Top 10 checks

---

## 🚨 Incident Response

### If Compromised:

1. **Immediate Actions:**
   - Revoke all sessions (change NEXTAUTH_SECRET)
   - Reset admin passwords
   - Review audit logs for suspicious activity
   - Take admin panel offline if necessary

2. **Investigation:**
   - Check database for unauthorized changes
   - Review server logs
   - Identify attack vector
   - Document timeline

3. **Recovery:**
   - Restore from backup if needed
   - Patch vulnerability
   - Reset all API keys
   - Force password reset for all admins

4. **Prevention:**
   - Implement additional security measures
   - Update documentation
   - Train team on security practices

---

## 📞 Support

For security concerns:
- Email: security@musthavemods.com
- Emergency: [Your contact method]

**Do NOT publicly disclose security vulnerabilities.**

---

## ✅ Implementation Status

- [x] Admin authentication middleware
- [x] Role-based access control
- [x] Cloudflare Turnstile CAPTCHA
- [x] Audit logging system
- [x] Admin user setup script
- [x] Rate limiting (basic)
- [x] Input validation
- [ ] Two-factor authentication
- [ ] Redis rate limiting
- [ ] IP whitelisting
- [ ] Security headers
- [ ] Error monitoring
- [ ] Automated security scanning

---

**Last Updated:** 2025-01-24
**Version:** 1.0
**Author:** MHMFinds Security Team
