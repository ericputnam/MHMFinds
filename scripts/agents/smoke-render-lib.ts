/**
 * scripts/agents/smoke-render-lib.ts — the pure retry decision behind smoke-render.ts, split out so it
 * can be unit-tested without launching Chromium (smoke-render.ts runs main() on import).
 */
export type SmokeKind = 'catalog' | 'detail' | 'interstitial' | 'blog' | 'game' | 'xml' | 'text';

/** Non-ad, non-revenue targets: sitemaps, llms.txt, feeds, the IndexNow key. */
export const SECONDARY_KINDS: ReadonlySet<SmokeKind> = new Set<SmokeKind>(['xml', 'text']);

/**
 * Render the target once more with a fresh page when the first result is plausibly transient:
 *  - every failure is an uncaught page error (third-party script race — the 2026-09-05 rule), or
 *  - the target is SECONDARY and the failure came from the navigation itself (`page.goto` timeout /
 *    no response). 2026-09-22 06:55: one 45 s timeout on the prerendered 463-byte /sitemap.xml —
 *    561 ms on the re-render four minutes later — rolled production back by itself.
 * Ad pages are never retried on a navigation failure: a homepage that does not answer is the
 * revenue-affecting case the smoke exists to catch, and it is deterministic enough to trust once.
 * The retry result replaces the first; the failure counts only if it reproduces.
 */
export function shouldRetryRender(kind: SmokeKind, failures: readonly string[], pageErrors: readonly string[]): boolean {
  if (!failures.length) return false;
  if (failures.every((f) => /uncaught page error/.test(f))) return true;
  return SECONDARY_KINDS.has(kind) && pageErrors.some((e) => e.startsWith('navigation:'));
}
