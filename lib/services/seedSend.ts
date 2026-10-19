/**
 * Seed-test recipients for the weekly issue (Cass, E240, 2026-10-19).
 *
 * A seed send puts ONE rendered copy of a weekly issue into the team's own test mailboxes
 * (e.g. one Gmail, one Outlook) so a human can see which folder it lands in and read its
 * Authentication-Results. It must never be able to reach a subscriber, so the invariant
 * lives here, not in the caller:
 *
 *   - addresses come from the `NEWSLETTER_SEED_TO` env var (comma list) — never a CLI
 *     argument, never a committed literal;
 *   - at most SEED_MAX_RECIPIENTS of them;
 *   - every one must hash-match SEED_ALLOWLIST_HASHES (sha256 of lower(trim(address)),
 *     the same key as sendExclusions.ts). The list ships EMPTY, so the seed path is inert
 *     until the operator adds the hashes of their own seed mailboxes (Tier 2: env var +
 *     the hashes; queued in operator-queue.md on 2026-10-19).
 *
 * A refusal names the hashes it did not recognise (never the address) so the operator can
 * paste them into the list after checking they are theirs.
 */
import { hashRecipient } from './sendExclusions';

export const SEED_MAX_RECIPIENTS = 3;

/** sha256(lower(trim(address))) of the team's own seed mailboxes. Empty = seed sends refused. */
export const SEED_ALLOWLIST_HASHES: readonly string[] = [];

export type SeedResolution =
  | { ok: true; recipients: string[] }
  | { ok: false; reason: string; unrecognisedHashes: string[] };

export function resolveSeedRecipients(
  raw: string | undefined,
  allowlist: readonly string[] = SEED_ALLOWLIST_HASHES
): SeedResolution {
  const list = Array.from(
    new Set((raw ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))
  );
  if (!list.length) return { ok: false, reason: 'NEWSLETTER_SEED_TO is not set', unrecognisedHashes: [] };
  if (list.some((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))) {
    return { ok: false, reason: 'NEWSLETTER_SEED_TO holds a value that is not an address', unrecognisedHashes: [] };
  }
  if (list.length > SEED_MAX_RECIPIENTS) {
    return { ok: false, reason: `NEWSLETTER_SEED_TO has ${list.length} addresses; the cap is ${SEED_MAX_RECIPIENTS}`, unrecognisedHashes: [] };
  }
  const allowed = new Set(allowlist);
  const unrecognised = list.map(hashRecipient).filter((h) => !allowed.has(h));
  if (unrecognised.length) {
    return {
      ok: false,
      reason: `${unrecognised.length} of ${list.length} seed addresses are not in SEED_ALLOWLIST_HASHES`,
      unrecognisedHashes: unrecognised,
    };
  }
  return { ok: true, recipients: list };
}
