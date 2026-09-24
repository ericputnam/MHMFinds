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
  // 2026-09-21 re-permission day-2 (`--offset 100`, 100 attempted), read 2026-09-24 13:45Z
  // (`--since 2026-09-21`, ≥72 h): 5 distinct hard-bounced recipients = 3× `5.1.1`,
  // 1× `5.2.2`, 1× `5.5.0`; 0 soft, 0 complaints. Cross-check `--since 2026-09-16`:
  // 12 distinct hard all-time = the 7 above + these 5, disjoint, none left over.
  '7b8599a5d2e849b96648c2fb59401ca996a4a9db11582e37a04b9b05dd35453f', // day-2, 5.x.x
  '75d6576befbf6c90997da29b3ff8d667681251ad482aacc0431ac6493106c71d', // day-2, 5.x.x
  '428b8c3f5bd010ab44b4f87f0f6da8571cd1c6139971b502dd559e88764bb58a', // day-2, 5.x.x
  '734622e399efe5fdf59fc0f375cf48616a7ad90831e8eba4b095d844dc5b1bf4', // day-2, 5.x.x
  'c7bf3d6ec4f2681a1efe3a749837ebb52cb3c0dae60eb76a81b19bb51541f641', // day-2, 5.x.x
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
