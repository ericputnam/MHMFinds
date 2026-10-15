/**
 * Free-follow Patreon ask on /go/[modId] (Cass, 2026-10-15) — the slot below
 * the `.mv-ads` wrapper that E4 (email box, KILLED 09-30 at 1.45/1K) and then
 * E152 ("Save this mod" account offer, KILLED 10-15 at 2 / 2,986 = 0.67/1K vs
 * ≥2.62/1K) occupied. Two owned-audience asks have now failed in this slot;
 * Patreon free members are the third kind of owned audience (5,144 → 6,058
 * between 09-01 and 10-15 with no on-site ask outside the countdown line).
 *
 * Rules this surface inherits:
 *   - Free tier only (`PATREON_FREE_TIER_CHECKOUT_URL`). Leading /go with the
 *     $3 checkout is the E40 kill (0 paid-and-connected, patreon_click
 *     8.75 → 3.57 users/day) — never `PATREON_MEMBER_TIER_CHECKOUT_URL` here.
 *   - Its own event name and source, so the E40/E65/E99 `patreon_click*`
 *     reads and E74's `patreon_follow_click` are not diluted.
 *   - Sibling of the `.mv-ads` wrapper, never a child; never in the aside.
 *
 * Client-safe: constants only, no server imports.
 */

/** `source` on the click event; `data-capture` on the block. */
export const GO_FOLLOW_SLOT_SOURCE = 'go-follow-slot';

/** GA4 event the follow link fires — distinct from every other Patreon event. */
export const GO_FOLLOW_SLOT_EVENT = 'go_patreon_follow_click';
