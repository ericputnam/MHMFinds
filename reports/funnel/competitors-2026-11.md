# Competitor intel — 2026-11

GSC window: 2026-10-01→2026-10-28 (sc-domain:musthavemods.com, same 28-day length/weekday anchor
as October's 2026-09-01→2026-09-28; each of the 20 head queries re-read by exact `queryFilter`,
not top-N-by-impressions, so this month's reads aren't gated by whether a query cleared the
original top-40 cut). WebSearch/WebFetch run 2026-11-01.

## Headline

Flat-to-slightly-better on the head-query gap (10 of 20 vs 11 last month) but two new facts outweigh
that: CurseForge now **publishes** a catalog number for the first time — 139,202 Sims 4 projects,
~8.1x our 17,132 — and "sims 4 hospital build cc", our best-ranked head query last month (6.2),
fell to position 17 (2 impressions, 0 clicks) even though CurseForge still holds #1 there. October's
Rio proposal (skip the `/go` countdown for paid members) shipped 2026-10-16 (E152/B2) — already live,
ahead of this report proposing it again.

## Catalog & freshness

| Site | Catalog size | Cadence | Trend vs last month |
|---|---|---|---|
| MustHaveMods (us) | 17,132 mods (DB) | 111 new mods/7d + 15 other (scoreboard) | catalog +571 vs Oct's 16,561 |
| CurseForge | **139,202 Sims 4 projects** (own site, first time it has published a number) | "Latest Mods" updated same-day (2026-11-01); no new-today count | new read — "not published" retired |
| The Sims Resource | not published ("5M+ Sims 4 CC" is a lifetime-downloads claim, not a catalog count) | "new content daily" (site copy, unchanged) | flat |
| SimsFinds | not published (homepage carries no number or cadence claim this read) | unmeasured this read | flat |
| ModTheSims | 15,295 Sims 4 uploads (site's own count) | ongoing; newest visible post 2026-10-23 | +18 vs Oct's 15,277 |

CurseForge's 139,202 figure almost certainly includes recolors/translations/addon files counted as
separate "projects" (translations of the same mod show up as distinct CurseForge listings in this
run's samples), so it is not apples-to-apples with our per-mod count — reported as the site's own
stated number, not adjusted.

## Search visibility (20 head queries)

| Query | Our GSC position (Oct) | Δ vs Sep | Top-ranking named competitor this read | Their position |
|---|--:|--:|---|---|
| sims 4 mods | 38.8 | +6.3 | ModTheSims | top5 (order not confirmed; CurseForge absent from this read) |
| sims 4 cc | 37.2 | +3.9 | The Sims Resource | top5 (order not confirmed; CurseForge absent) |
| sims 4 hospital build cc | 17.0 | **-10.8** | CurseForge | #1 — we fell out of top10 |
| sims 4 male body presets | 7.6 | flat (7.6) | CurseForge | top5 — we're already top10 |
| sims 4 pregnancy mods | 59.0 | -41.7 | CurseForge | #1 |
| best sims 4 mods | 27.8 | -6.3 | none of our 4 in top5 | n/a |
| sims 4 mods cc | 30.9 | -11.5 | none of our 4 in top5 this read (CurseForge absent) | n/a |
| sims 4 social media mod | 10.9 | -1.8 | CurseForge | top5 — we're already top10 |
| sims 4 gameplay ideas | 23.0 | +1.7 | none of our 4 in top5 (we rank #4 in this WebSearch sample) | n/a |
| sims 4 adult mods | 34.7 | +3.9 | none of our 4 in top5 this read (CurseForge absent) | n/a |
| boho braids sims 4 cc | 7.3 | +0.2 | none of our 4 surfaced — we rank | n/a |
| gallery pose sims 4 | 8.3 | +2.0 | CurseForge | #1 — we're already top10 |
| sims 4 hair cc | 43.2 | new read | CurseForge | top5 |
| sims 4 furniture cc | 40.9 | new read | none of our 4 in top5 | n/a |
| sims 4 clothes cc | 30.7 | new read | CurseForge | top5 |
| sims 4 skin overlay | 26.0 | new read | CurseForge | #1 |
| sims 4 poses | 22.8 | new read | CurseForge | top5 |
| sims 4 build cc | 49.5 | new read | CurseForge | #1 |
| sims 4 custom content | 37.5 | new read | The Sims Resource | top5 (CurseForge absent this read) |
| sims 4 cc finds | 33.8 | new read | The Sims Resource | #1 (SimsFinds absent from this read, despite the query naming it) |

**10 of 20 queries** (down from 11) have a benchmarked competitor top5 while we rank >20: sims 4
mods, sims 4 cc, sims 4 pregnancy mods, sims 4 hair cc, sims 4 clothes cc, sims 4 skin overlay,
sims 4 poses, sims 4 build cc, sims 4 custom content, sims 4 cc finds. "Not in top 40" rows from
September now have exact positions via `queryFilter` — they were a measurement gap, not a ranking
gap, and all land in the 22–50 range, consistent with last month's qualitative read. WebSearch
result order is still not a confirmed SERP rank (per spec); CurseForge dropping out of 5 queries'
visible results this run vs. last month is more likely snippet-sampling noise than an actual rank
change — treat month-over-month competitor-name swaps as low-confidence, position deltas as the
hard number.

## Creator coverage

DB read 2026-11-01 (Favorite→Mod.author groupBy, same garbage-author filter as
`scripts/cleanup-author-data.ts`, plus a standalone-4+-digit exclusion added this run after
"January 2024 Set 96368659" surfaced as a false "creator"). **Identical 15-name roster to October**
(brandysims 359, Seoulsoul-sims 263, Cecesimsxo 220, dreamgirl 210, BADDDIESIMS 187, Syboulette 182,
PolarBearSims 180, slaughtsims 169, Rebellesims420 165, trillqueen 149, adeepindigo 141,
Simenapule 132, Madlen 123, SimwithShan 117, MagicHand 116) — only minor rank/count shuffling from
the +1055 favorites added this week.

**12 of 15** show a public presence on at least one of the 4 sites this read (up from 10/15), via
fresh WebSearch per creator rather than reused October data: CurseForge (Seoulsoul-sims, dreamgirl,
BADDDIESIMS, Syboulette, PolarBearSims\*, adeepindigo, Madlen), TSR (Seoulsoul-sims, BADDDIESIMS,
Syboulette, MagicHand), SimsFinds (brandysims, Seoulsoul-sims, dreamgirl, BADDDIESIMS,
Rebellesims420 — thin, 6 dl/mo, trillqueen, SimwithShan, MagicHand), ModTheSims (PolarBearSims,
adeepindigo). No creator is on all 4; **Seoulsoul-sims joins BADDDIESIMS at 3 of 4** (both missing
only ModTheSims) with no CreatorProfile on us — handoff note for Nova, not an instruction. 3 of 15
(Cecesimsxo, slaughtsims, Simenapule) show no competitor presence this read. Flagged, not resolved:
adeepindigo and Rebellesims420 flip from "no presence" in October to "yes" here, and Simenapule
flips the other way (TSR last month, nothing found this run) — WebSearch snippet variability, not a
re-audit of account state; treat single-creator flips as noise, the 12/15 vs 10/15 trend as directional.
\*PolarBearSims' SimsFinds listing explicitly links back to ModTheSims as the original source.

## UX / download friction

3-mod sample completed this run for every competitor (October was 1-mod budget-limited).

| Site | Clicks to file (3-mod avg) | Friction observed |
|---|--:|---|
| CurseForge | ~1-2 | consistent across all 3 samples: no login, no ads, no timer; "Install via App" nudges the CurseForge app but a direct file link exists on every page |
| The Sims Resource | ~4 (range 2-6) | consistent: login + email verification, ad-blocker-off gate, VIP one-click upsell on every sample; one sample bundled 7 required items |
| SimsFinds | ~2-4 | consistent: mandatory countdown ("skip the wait with Premium"), redirect to original creator/source site, optional account creation |
| ModTheSims | ~1 | consistent: direct file link on all 3 samples, no login/ads/timer |
| **Ours** | 2 (mandatory) | `/go/[modId]`, countdown now fixed at **10s** (not "10-15s" as read last month — confirmed from `GoClient.tsx`), no login required; **members skip the countdown entirely** (B2 perk, shipped 2026-10-16, after last month's move #3 proposed exactly this) |

## Monetization

- **CurseForge**: ad-supported app; no per-item paywall; now the only one of the 4 publishing a
  catalog-size number.
- **The Sims Resource**: freemium — ads + mandatory ad-blocker-off for free tier, VIP removes both
  and collapses multi-item sets to one click (confirmed again this read).
- **SimsFinds**: freemium — ad-supported with skippable countdown; Premium removes the wait
  (confirmed again this read).
- **ModTheSims**: ad-supported, voluntary donation "Ads Free" option (not re-confirmed this read;
  carried from October, no contrary evidence found).
- **Patreon creators**: not re-sampled this read (carried from October's BADDDIESIMS/Syboulette/
  dreamgirl sample — 21-day early access, $3+/mo entry); flag for December to refresh.
- **Us**: `/go` countdown now skippable for paid members (live) — the first of the four competitor
  friction-removal patterns we've actually shipped, against nonAdRevenue still at $144/mo gross vs
  the $750 target.

## 3 ranked moves

1. Keep closing the category-hub gap, now against a disclosed number — owner: Sage — why:
   CurseForge's newly-published 139,202-project catalog (8.1x our 17,132) still holds top5 on
   CurseForge-dominated category terms (hair cc, clothes cc, skin overlay, poses, build cc) where we
   sit 22–50; our narrow long-tail pages keep working (gallery pose sims 4 improved to 8.3, boho
   braids flat at 7.3) — extend that pattern rather than chase the aggregator's volume. Tier 0/1.
2. Prioritize Seoulsoul-sims alongside BADDDIESIMS in the next outreach batch — owner: Nova — why:
   both are now measured at 3 of 4 benchmarked competitor sites (missing only ModTheSims) with 0
   CreatorProfile on musthavemods.com, against the creatorsOnboarded target (2 onboarded, Dec goal
   10). Tier 1, existing template/cadence — not a new send authorization.
3. Read the B2 "skip countdown" member perk against nonAdRevenue before widening it — owner: Rio —
   why: the perk this report proposed in October shipped 2026-10-16, and nonAdRevenue is still
   $144/mo gross vs the $750 target two weeks later; confirm whether the perk moved paid-and-connected
   or $3-tier joins before any further `/go`-flow or pricing change, which stays Tier 2 either way.

— competitor-intel (sonnet)
