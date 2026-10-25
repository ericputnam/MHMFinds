/**
 * `waitlist` rows joined to the account with the same address, shaped for
 * `scriptedSubscriberHashes` (lib/services/sendExclusions.ts, E270). Shared by the
 * hash generator and the weekly send script's pre-send drift check so both read
 * the population the same way. The addresses never leave the process.
 */
import type { PrismaClient } from '@prisma/client';

import type { SubscriberAccountRow } from '../../lib/services/sendExclusions';

export async function loadSubscriberAccountRows(prisma: PrismaClient): Promise<SubscriberAccountRow[]> {
  const subs = await prisma.waitlist.findMany({ select: { email: true, source: true } });
  const users = await prisma.user.findMany({
    select: { email: true, username: true, accounts: { select: { provider: true } } },
  });
  const byEmail = new Map<string, { username: string | null; isForm: boolean }>();
  for (const u of users) {
    if (!u.email) continue;
    byEmail.set(u.email.trim().toLowerCase(), {
      username: u.username,
      isForm: u.accounts.some((a) => a.provider === 'credentials'),
    });
  }
  return subs.map((s) => {
    const u = byEmail.get(s.email.trim().toLowerCase());
    return { email: s.email, source: s.source, username: u?.username ?? null, isForm: u?.isForm ?? false };
  });
}
