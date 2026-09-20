/**
 * Code-only send exclusion list (Cass, E54/E68, 2026-09-20).
 *
 * Why this exists: the re-permission day-1 batch (2026-09-16, 100 accounts)
 * produced hard bounces, and there is nowhere in the schema to record a bounce
 * (no `bouncedAt` on `users` or `waitlist`; adding one is Tier 2). Until then,
 * every later `--offset` would re-attempt the same dead addresses and every
 * later batch would be judged on them. Re-sending to a `5.1.1` address buys
 * nothing and costs sender reputation on the one mailbox we send from.
 *
 * The list holds SHA-256 hashes of the normalized address (trimmed, lower-cased),
 * never an address. The hashes are produced by
 * `scripts/agents/mailbox-dsn-count.py --hashes`, which reads the DSNs in the
 * sending mailbox read-only and prints counts + hashes only.
 *
 * Bounces are keyed here in the module, not the caller, so every send path that
 * uses `partitionExcluded` inherits the exclusion.
 */
import { createHash } from 'crypto';

/** Same normalization as `normalizeRecipients` in bulkMailer and the DSN counter. */
export function hashRecipient(email: string): string {
  return createHash('sha256').update(String(email ?? '').trim().toLowerCase(), 'utf8').digest('hex');
}

/**
 * Hard-bounced recipients. One line per address, with the batch and the DSN class
 * that put it here (counts only — never the address, never a domain).
 *
 * 2026-09-16 re-permission day-1 (`--offset 0`, 100 attempted), read 2026-09-20 10:54Z
 * (≥20 h): 7 distinct hard-bounced recipients = 5× `5.1.1` no such user, 2× `5.2.2`
 * mailbox full (permanent after retries). 3 soft `4.2.2` notices are NOT listed —
 * a soft bounce is not evidence the address is dead.
 */
export const EXCLUDED_RECIPIENT_HASHES: readonly string[] = [
  '88ad67328c57ede044c3d750b736aa2e76ceba23e87d6942313de3ebc3d31c80', // day-1, 5.x.x
  '80f8505232c3a758d0b2de9aff1e787d5841fc7aacf778d4a1bd054f83799318', // day-1, 5.x.x
  'a1a6a3b2e2bad4972e4a857637d1ad048aa851a710537d7899ebe512257be62e', // day-1, 5.x.x
  '0e6eb869ae12b364efb6c33237602a67026e1b6b1bd1377601d32024c108f310', // day-1, 5.x.x
  '18bb02f6f7a5e5870b437b515c3e7cce10b8fdae6ad0d0a2291ad6b932b1eb35', // day-1, 5.x.x
  'e9aad8397f610054a476e079b23fbe3713dbdd57130307761324cd1e7c42812e', // day-1, 5.x.x
  '84be038d2138135f11ab2c600efa0b84061853a937ac1cef8e110db164ac5ce4', // day-1, 5.x.x
];

const EXCLUDED = new Set(EXCLUDED_RECIPIENT_HASHES);

export function isExcludedRecipient(email: string): boolean {
  return EXCLUDED.has(hashRecipient(email));
}

/** Split a recipient list into the ones we may send to and the ones on the list. Order preserved. */
export function partitionExcluded(recipients: readonly string[]): { kept: string[]; excluded: string[] } {
  const kept: string[] = [];
  const excluded: string[] = [];
  for (const r of recipients) (isExcludedRecipient(r) ? excluded : kept).push(r);
  return { kept, excluded };
}
