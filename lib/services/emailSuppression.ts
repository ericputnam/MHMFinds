/**
 * Durable unsubscribe list (2026-10-26).
 *
 * Why this exists: until now "unsubscribed" meant "the waitlist row was
 * deleted". That suppresses nothing that is not a waitlist row — a User or
 * Patreon member who unsubscribed would be mailed again by the next send that
 * draws from accounts — and it could be undone silently by anything that
 * re-creates the row. CAN-SPAM requires an opt-out to be honoured for every
 * future commercial message, whichever list the address came from.
 *
 * The list is keyed by `hashRecipient` (sha256 of the trimmed, lower-cased
 * address) — never the address — so it can hold mailbox-only requests (a
 * `mailto:` unsubscribe from someone with no row anywhere) without becoming a
 * second copy of the mailing list.
 *
 * Lifecycle of a row:
 *   - `recordUnsubscribe*` creates it (or re-activates a cleared one when the
 *     new request is *newer* than the clear).
 *   - `clearUnsubscribe` sets `clearedAt` when the address proves mailbox
 *     control by POSTing a signed confirm link *after* the request. The
 *     unauthenticated `/api/waitlist` form never clears — anyone can type
 *     anyone's address into it.
 *   - A request dated at or before `clearedAt` is stale and changes nothing,
 *     so re-processing an old mailbox can never undo a re-subscribe, and a
 *     re-subscribe can never be undone by replaying its own past.
 *
 * `sendBulk` refuses a live send without a lookup built here, and fails closed
 * when the lookup throws.
 */
import type { PrismaClient } from '@prisma/client';

import { hashRecipient } from './sendExclusions';

export type SuppressionSource = 'link' | 'mailto' | 'reply' | 'manual';
export const SUPPRESSION_SOURCES: readonly SuppressionSource[] = ['link', 'mailto', 'reply', 'manual'];

export type SuppressionDb = Pick<PrismaClient, 'emailSuppression'>;

/** Given normalized recipients, return the subset that must not be mailed. */
export type SuppressionLookup = (emails: readonly string[]) => Promise<Set<string>>;

export type RecordOutcome = 'created' | 'reactivated' | 'already' | 'stale';

const HASH_RE = /^[0-9a-f]{64}$/;
const IN_CHUNK = 1000;

function assertSource(source: string): asserts source is SuppressionSource {
  if (!SUPPRESSION_SOURCES.includes(source as SuppressionSource)) {
    throw new Error(`emailSuppression: unknown source "${source}"`);
  }
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002';
}

/** Record an unsubscribe by hash. Idempotent; see the lifecycle above. */
export async function recordUnsubscribeHash(
  db: SuppressionDb,
  emailHash: string,
  source: SuppressionSource,
  requestedAt: Date = new Date()
): Promise<RecordOutcome> {
  if (!HASH_RE.test(emailHash)) throw new Error('emailSuppression: emailHash must be 64 lower-case hex chars');
  assertSource(source);
  if (Number.isNaN(requestedAt.getTime())) throw new Error('emailSuppression: requestedAt is not a valid date');

  for (let attempt = 0; attempt < 2; attempt++) {
    const existing = await db.emailSuppression.findUnique({
      where: { emailHash },
      select: { requestedAt: true, clearedAt: true },
    });

    if (!existing) {
      try {
        await db.emailSuppression.create({ data: { emailHash, source, requestedAt } });
        return 'created';
      } catch (e) {
        // Two requests for one address raced (link + mailto); re-read and decide.
        if (isUniqueViolation(e) && attempt === 0) continue;
        throw e;
      }
    }

    if (!existing.clearedAt) return 'already';
    if (requestedAt.getTime() <= existing.clearedAt.getTime()) return 'stale';

    await db.emailSuppression.update({
      where: { emailHash },
      data: { clearedAt: null, requestedAt, source },
    });
    return 'reactivated';
  }
  throw new Error('emailSuppression: could not record unsubscribe');
}

export function recordUnsubscribe(
  db: SuppressionDb,
  email: string,
  source: SuppressionSource,
  requestedAt?: Date
): Promise<RecordOutcome> {
  return recordUnsubscribeHash(db, hashRecipient(email), source, requestedAt);
}

/**
 * The address re-confirmed (signed link, POST) at `at`. Clears an active
 * suppression whose request predates the confirmation. Returns rows changed.
 */
export async function clearUnsubscribe(db: SuppressionDb, email: string, at: Date = new Date()): Promise<number> {
  const r = await db.emailSuppression.updateMany({
    where: { emailHash: hashRecipient(email), clearedAt: null, requestedAt: { lt: at } },
    data: { clearedAt: at },
  });
  return r.count;
}

/** Active (not cleared) suppressions among the given hashes. */
export async function activeSuppressedHashes(db: SuppressionDb, hashes: readonly string[]): Promise<Set<string>> {
  const unique = Array.from(new Set(hashes));
  const out = new Set<string>();
  for (let i = 0; i < unique.length; i += IN_CHUNK) {
    const rows = await db.emailSuppression.findMany({
      where: { emailHash: { in: unique.slice(i, i + IN_CHUNK) }, clearedAt: null },
      select: { emailHash: true },
    });
    for (const r of rows) out.add(r.emailHash);
  }
  return out;
}

export async function isSuppressed(db: SuppressionDb, email: string): Promise<boolean> {
  return (await activeSuppressedHashes(db, [hashRecipient(email)])).size > 0;
}

/** The lookup every send path passes to `sendBulk`. Lazy: nothing is queried until it is called. */
export function suppressionLookupFor(db: SuppressionDb): SuppressionLookup {
  return async (emails) => {
    const byHash = new Map<string, string[]>();
    for (const email of emails) {
      const h = hashRecipient(email);
      const list = byHash.get(h);
      if (list) list.push(email);
      else byHash.set(h, [email]);
    }
    const hit = await activeSuppressedHashes(db, Array.from(byHash.keys()));
    const out = new Set<string>();
    hit.forEach((h) => byHash.get(h)?.forEach((e) => out.add(e)));
    return out;
  };
}
