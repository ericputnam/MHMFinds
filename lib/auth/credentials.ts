/**
 * Credentials-account helpers.
 *
 * This project stores the bcrypt password hash in `Account.id_token` on a row
 * with provider `credentials` — there is no password column on `User`. That
 * convention is set by app/api/auth/signup/route.ts and read by the
 * CredentialsProvider in lib/authOptions.ts; anything that writes a password
 * must go through here so the three stay in agreement.
 */

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const MIN_PASSWORD_LENGTH = 8;

/** Matches the cost factor used by app/api/auth/signup/route.ts. */
const BCRYPT_ROUNDS = 10;

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length === 0) {
    return 'Password is required';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (password.length > 200) {
    return 'Password is too long';
  }
  return null;
}

/**
 * Set (or replace) a user's password, creating the credentials account row if
 * the user has none — which is the case for subscribers converted to members,
 * who get a User with no Account until they accept the invite.
 */
export async function setUserPassword(
  userId: string,
  password: string
): Promise<void> {
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const existing = await prisma.account.findFirst({
    where: { userId, provider: 'credentials' },
  });

  if (existing) {
    await prisma.account.update({
      where: { id: existing.id },
      data: { id_token: hashedPassword },
    });
    return;
  }

  await prisma.account.create({
    data: {
      userId,
      type: 'credentials',
      provider: 'credentials',
      providerAccountId: userId,
      id_token: hashedPassword,
    },
  });
}
