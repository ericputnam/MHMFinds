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
  // 2026-10-15 weekly issue 06 run 1 (100 attempted, 99 sent): 1 synchronous reject,
  // hash taken from `rejects[]` in reports/funnel/newsletter-sends.jsonl (E205), SMTP
  // code not parsed (null). Matches exactly 1 waitlist row, subscribed before issue 05
  // (10-11), whose single `failed: 1` was a 550 — i.e. rejected on two consecutive
  // issues, not a one-off transient. Added before issue 07 (Cass, E226, 2026-10-17).
  '00e8bfa8afd6244ae1bcc3d3c206cfd7b50a93087b916fd9f5d5d419875af046', // weekly-06, reject
  // 2026-10-19 weekly issues 05 + 06 (runs 1 and 2), read with `mailbox-dsn-count.py --since
  // 2026-10-11 --campaign all --hashes` (Cass, E240): 13 hard DSNs (3x 5.7.1, 3x 5.1.1,
  // 3x 5.5.0, 2x 5.1.3, 2x 5.1.0), 10 distinct recipients, 0 soft, 0 complaints. Every hash
  // matches a live waitlist row; 3 of them bounced on both issue 05 and issue-06 run 1, and
  // 7 are issue-06 run 2 subscribers (7/53 = 13.2% of that cohort vs 3/96 = 3.1% of issue 05's).
  // Until 10-19 the counter attributed these to "other" (encoded-word subject), so none was listed.
  '1a4c3aa328048eed368dd38b825da182cc44bc54ab18a160645d0c4ea8635541', // weekly-05/06, 5.x.x DSN
  'ce172e84804f7c9547db4348d6632028b3f65779f6489c552ba6cba5553aa1ae', // weekly-05/06, 5.x.x DSN
  'b0d1f576b8dfafb4ee4e3919afd1cf0d1d4cff67ca89729845bb306b019c4217', // weekly-05/06, 5.x.x DSN
  'd8dcfc02becc3abafcf5bc3823fe08cf6bb812b9695bd987306162d1d1dc353c', // weekly-05/06, 5.x.x DSN
  '62f84f30ed1d63c9bf4afef6064df90ad35a48f2b5bbc119c50a7b360eeba156', // weekly-05/06, 5.x.x DSN
  '8de0468ede621befbc8ab2d75913dcec68ece579c3809e7a7b92d2b893e56942', // weekly-05/06, 5.x.x DSN
  'bfa0edb38089de509290da6d9c8b2230a31c651c369ec8781d3a9a06badf7f61', // weekly-05/06, 5.x.x DSN
  '53400f9602335d90f14b52df81926a224edc57913c310e7b57339680051fd112', // weekly-05/06, 5.x.x DSN
  'a09bf8178846bbb1d46278ff188f214424a8061f1fd85577cc89d36dbb83aac0', // weekly-05/06, 5.x.x DSN
  '5c4992b0a05759717b456266ead65f14d79065ace2ee9cfa052556c36e5c8f3a', // weekly-05/06, 5.x.x DSN
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
