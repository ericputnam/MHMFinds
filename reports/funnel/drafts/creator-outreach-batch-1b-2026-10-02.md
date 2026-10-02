# Creator outreach batch 1b: favorites-ranked (E158, paper only)

Written 2026-10-02 by Nova. **Nothing is sent. This file is not covered by Q23.**
"approve E137" approves the 20 rows in `creator-outreach-template-2026-09-28.md`
and nothing here. These rows need their own line on Q23, or a reply
"approve E137 + 1b", once the blockers below are cleared. Sending stays Tier 2
until approved and Tier 1 after that, at ≤20/week combined with batch 1.

## Why a second list

The competitor read (`reports/funnel/competitors-2026-10.md`, 10-01) ranked creators by
favorites on *raw* `mods.author` strings and said 8 of our top 15 are missing from batch 1.
Re-run on 2026-10-02 the way the site actually builds pages, by **folding author spellings
to the `/creator/` slug**, SFW only, junk/platform slugs excluded:

- **Simenapule is already in batch 1** (row 20). The competitor count was off by one.
- **SIMcredible** is missing and the raw-author read didn't see it. Its 138 SFW mods are
  split across `SIMcredible!` 84 / `Simcredible!` 44 / `SIMcredible` 10, and folded they hold
  150 favorites.
- So 8 are missing: dreamgirl, BADDDIESIMS, slaughtsims, SIMcredible, trillqueen,
  adeepindigo, Madlen, SimwithShan.

Favorites are organic (DB 2026-10-02): 22,634 favorites from 869 distinct users, one per
user per mod, growing monthly from 118 (Dec) to ~3,400 (Sep). They are concentrated,
though. dreamgirl's 190 sit on 3 mods, slaughtsims' 158 and trillqueen's 138 on 1 each.

## The 8 rows

Same columns as batch 1. Source: read-only DB query 2026-10-02. "DL clicks 28d" =
`download_clicks` on the slug's SFW mods. "Lifetime" = sum of `mods.downloadCount`.
**Contact channel** = the host the creator's own download links point to in our catalog
(nothing scraped). It is not an inbox. "patreon posts" means individual post URLs
(`patreon.com/posts/...`), so the creator's Patreon page has to be found from the post at
send time.

Page = `https://musthavemods.com/creator/<slug>/` · Claim = `https://musthavemods.com/submit-mod/?creator=<slug>`

| # | slug | display name | SFW mods | favorites | DL clicks 28d | lifetime | contact channel | page today | blocker |
|---|---|---|---|---|---|---|---|---|---|
| 1 | dreamgirl | dreamgirl | 3 | 190 | 19 | 10,673 | patreon posts (3) | **404** (3 < 5) | no page |
| 2 | badddiesims | BADDDIESIMS | 2 | 166 | 15 | 7,568 | patreon posts (1), patreon.com (1) | **404** (2 < 5) | no page |
| 3 | slaughtsims | slaughtsims | 1 | 158 | 12 | 6,711 | slaughtasims.tumblr.com (1) | **404** (1 < 5) | no page |
| 4 | simcredible | SIMcredible | 138 | 150 | 1 | 846 | thesimsresource.com (138) | live | TSR-only (same check as batch 1) |
| 5 | trillqueen | trillqueen | 1 | 138 | 6 | 4,138 | patreon posts (1) | **404** (1 < 5) | no page |
| 6 | adeepindigo | adeepindigo | 5 | 126 | 3 | 2,089 | patreon posts (4), modthesims.info (1) | live | seed profile holds the handle (see below) |
| 7 | madlen | Madlen | 102 | 119 | 5 | 521 | patreon posts (81), madlensims.tumblr.com (9), TSR (7), patreon.com (4) | live | none |
| 8 | simwithshan | SimwithShan | 3 | 112 | 4 | 1,521 | patreon.com (2), patreon posts (1) | **404** (3 < 5) | no page |

Sendable today, if approved: **Madlen** (row 7). SIMcredible after the TSR-messaging
check. adeepindigo after E158 (below) and the promote fix in the inbox.

## Blocker 1: 5 of 8 have no page, and a CreatorProfile would not create one

`/creator/<slug>/` is built from `mods.author` alone (`getCreatorPageData`, ≥5 SFW mods,
`MIN_MODS_FOR_PAGE`). A CreatorProfile only adds the badge, bio and website, and is never
required. A CreatorProfile is created today only by the claim form (pending
`pending-<slug>-…` handle, E122). An admin promotes it (E129/E151). Promotion does
not lower the page threshold, so a promoted dreamgirl would still land on a 404.

**No Tier 0 data move fixes this.** The variant spellings are already folded
(BADDDIESIMS 1 + Badddiesims 1; SimwithShan 1 + Simwithshan 2; "Shannon - SimwithShan"
1 would make 4, still < 5). Several high-favorite mods carry junk authors
(`Random Urban 66056001`, `January 2024 Set 96368659`). Attributing them would require
fetching the source pages (`scripts/cleanup-author-data.ts`), and that is Rowan's
catalog lever. Sending these 5 the template as written would point them at a 404. Two
options, both queued, neither shipped:
- (a) render a page under 5 mods when a *claimed* (non-placeholder, promoted) profile
  holds the handle. That is a page-population change, Tier 1.
- (b) a variant of the template with no page link for these 5, which makes it Tier 2 text.

## Blocker 2 (fixed by E158): seed profiles posed as claimed

All 20 CreatorProfile rows are script-minted seed rows (users on the placeholder domain
`musthavemods.generated`, 0 OAuth logins, created 2025-11-29), and all 20 had
`isVerified=true`. Eight of the handles equal a live page: adeepindigo, dolilac,
gegesims, littlemssam, lumpinou, rimings, sacrificialmods, shakeproductions. Those pages
said "Verified creator" and **hid the claim card** (E144 hides it on verified profiles).
71 SFW mods carried the badge on cards and mod pages through `creatorId`.
E158 un-verifies the 20 (rollback file
`reports/funnel/triage/creator-placeholder-unverify-2026-10-02.json`), and the page now
ignores `isVerified` on any placeholder account.

Still open: **promote returns 409** for a real claimant of those 8 handles, because the seed
row holds the handle (`planPromotion`, "already belongs to another profile"). The fix is
for promote to rename a placeholder holder to `seed-<handle>` in the same transaction.
That touches `app/api/admin`, so it is queued as its own move.
