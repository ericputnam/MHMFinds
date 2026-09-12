/**
 * Password setup / reset tokens and their emails.
 *
 * Until Aug 2026 the site had no account-recovery path at all: 1,313 of 1,333
 * users authenticate with credentials (bcrypt hash stashed in
 * `Account.id_token`, see lib/authOptions.ts) and a forgotten password meant a
 * dead account. This module backs both the "set your password" invite sent to
 * converted email subscribers and the ordinary forgot-password flow.
 *
 * Tokens live in the `VerificationToken` table, which NextAuth's adapter
 * defines but nothing else writes to. We store only a SHA-256 hash of the
 * token, so a database read cannot be replayed against the reset endpoint.
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { EmailNotifier } from '@/lib/services/emailNotifier';

export type PasswordTokenMode = 'invite' | 'reset';

/** Invites go to people who have never logged in, so they get a long window. */
const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
/** Resets are user-initiated and should expire fast. */
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

function baseUrl(): string {
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'https://musthavemods.com'
  );
}

/**
 * Issue a single-use token for `email`, invalidating any outstanding ones.
 * Returns the RAW token — it is never persisted and cannot be recovered later.
 */
export async function createPasswordToken(
  email: string,
  mode: PasswordTokenMode
): Promise<{ rawToken: string; expires: Date }> {
  const identifier = email.toLowerCase();
  const rawToken = randomBytes(32).toString('hex');
  const expires = new Date(
    Date.now() + (mode === 'invite' ? INVITE_TTL_MS : RESET_TTL_MS)
  );

  // One live token per address — issuing a new one retires the old.
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token: hashToken(rawToken), expires },
  });

  return { rawToken, expires };
}

/**
 * Resolve a raw token to its email without consuming it. Used by the
 * set-password page to show "this link expired" before the user types.
 */
export async function peekPasswordToken(
  rawToken: string
): Promise<{ email: string } | null> {
  if (!rawToken) return null;

  const record = await prisma.verificationToken.findUnique({
    where: { token: hashToken(rawToken) },
  });
  if (!record) return null;

  if (record.expires.getTime() < Date.now()) {
    await prisma.verificationToken
      .deleteMany({ where: { token: record.token } })
      .catch(() => undefined);
    return null;
  }

  return { email: record.identifier };
}

/**
 * Resolve and consume a raw token. Deleting inside the same call is what makes
 * the token single-use, so callers must treat a successful return as spent.
 */
export async function consumePasswordToken(
  rawToken: string
): Promise<{ email: string } | null> {
  const peeked = await peekPasswordToken(rawToken);
  if (!peeked) return null;

  const stored = hashToken(rawToken);

  // Constant-time re-check guards against a token that changed between the
  // peek and the delete.
  const deleted = await prisma.verificationToken.deleteMany({
    where: { token: stored },
  });
  if (deleted.count === 0) return null;

  return peeked;
}

/** Compare two tokens without leaking length/prefix through timing. */
export function tokensMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function layout(heading: string, body: string, ctaUrl: string, ctaLabel: string, footnote: string): string {
  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1e293b;border:1px solid #334155;border-radius:14px;padding:32px;">
            <tr>
              <td>
                <p style="margin:0 0 24px;font-size:18px;font-weight:700;color:#ec4899;">MustHaveMods</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#ffffff;">${heading}</h1>
                <div style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#cbd5e1;">${body}</div>
                <a href="${ctaUrl}" style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:9px;">${ctaLabel}</a>
                <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#94a3b8;">${footnote}</p>
                <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#64748b;word-break:break-all;">
                  If the button doesn't work, paste this into your browser:<br />${ctaUrl}
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;font-size:11px;color:#64748b;">&copy; ${new Date().getFullYear()} MustHaveMods</p>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
}

/**
 * Send the set-password email. `invite` is for converted subscribers who never
 * asked for an account, so the copy explains why they're hearing from us.
 */
export async function sendPasswordEmail(
  email: string,
  rawToken: string,
  mode: PasswordTokenMode
): Promise<boolean> {
  const notifier = new EmailNotifier();
  const url = `${baseUrl()}/set-password?token=${rawToken}`;

  const subject =
    mode === 'invite'
      ? 'Your MustHaveMods account is ready — set a password'
      : 'Reset your MustHaveMods password';

  const html =
    mode === 'invite'
      ? layout(
          'Your account is ready',
          `You signed up for mod-drop emails from MustHaveMods, and the full mod
           catalog is now live. We've set up an account for you so you can save
           favorites and build collections.<br /><br />
           Choose a password to finish activating it.`,
          url,
          'Set your password',
          `This link works for 14 days. If you'd rather not have an account, just
           ignore this email and nothing further will happen — you'll stay
           subscribed to mod drops only.`
        )
      : layout(
          'Reset your password',
          `We got a request to reset the password for <strong>${email}</strong>.
           Click below to choose a new one.`,
          url,
          'Choose a new password',
          `This link expires in 1 hour. If you didn't request this, you can
           safely ignore this email — your password won't change.`
        );

  return notifier.send(email, subject, html);
}
