# `(not set)` landing-page sessions — audit 2026-09-26 (E117, Pip)

**Question.** The scoreboard carries `notSetLanding7d = 3,816` (owner: Pip, flagged
2026-09-01, DQ-1 said "not primarily bot, ~61% Pinterest app"). Are these real
visits we are under-crediting to a landing page — a UTM/URL-builder bug in the
pinner — or noise that must never count toward the headline sessions number?

**Data.** One GA4 Data API report (property 437117335), 2026-09-18 → 2026-09-24
(7 finalized days), `landingPage = "(not set)"`, dimensions
`sessionSource / sessionMedium / deviceCategory`, metrics `sessions`,
`engagedSessions`, `screenPageViews`. 73 rows, 3,816 sessions in total — the
same figure as the scoreboard.

## Decision rule (written before the read)

- A session with zero `page_view` events is not traffic (standing rule).
- **Real-but-misattributed** would look like: page views > 0 on the `(not set)`
  slice, a Pinterest-app-heavy *mobile* mix (the 09-01 hypothesis), and
  `sessionSource` collapsing to `(direct)` / `(not set)` — the signature of a
  pin URL that lost its referrer or its UTM. That would justify the UTM fix in
  the pinner URL builder.
- **Noise** would look like: page views = 0 across the slice, desktop-dominant,
  and the source already correctly attributed (so a UTM change could not move
  anything).

## Top 20 source / medium / device rows

| # | sessionSource | medium | device | sessions | engaged | pageviews |
|---|---|---|---|---:|---:|---:|
| 1 | pinterest | organic | desktop | 2,327 | 86 | 0 |
| 2 | bing | organic | desktop | 868 | 0 | 0 |
| 3 | yahoo | organic | desktop | 94 | 0 | 0 |
| 4 | google | organic | desktop | 91 | 0 | 0 |
| 5 | (direct) | (none) | desktop | 60 | 0 | 0 |
| 6 | (not set) | (not set) | desktop | 60 | 0 | 0 |
| 7 | pinterest.com | referral | desktop | 35 | 0 | 0 |
| 8 | tumblr.com | referral | desktop | 34 | 0 | 0 |
| 9 | duckduckgo | organic | desktop | 26 | 0 | 0 |
| 10 | musthavemods.tumblr.com | referral | desktop | 20 | 0 | 0 |
| 11 | chatgpt.com | referral | desktop | 14 | 0 | 0 |
| 12 | reddit.com | referral | desktop | 11 | 0 | 0 |
| 13 | yandex.ru | referral | desktop | 11 | 0 | 0 |
| 14 | ca.search.yahoo.com | referral | desktop | 10 | 0 | 0 |
| 15 | patreon.com | referral | desktop | 10 | 0 | 0 |
| 16 | ecosia.org | referral | mobile | 9 | 0 | 0 |
| 17 | ecosia.org | referral | desktop | 8 | 0 | 0 |
| 18 | uk.search.yahoo.com | referral | desktop | 8 | 0 | 0 |
| 19 | cn.bing.com | referral | desktop | 6 | 0 | 0 |
| 20 | duckduckgo | organic | mobile | 6 | 0 | 0 |

Remaining 53 rows: 108 sessions, every one with 0 page views (google mobile 5,
se.search.yahoo.com 5, pinterest mobile 4, au/de yahoo 4 each, long tail of
1–3).

## Findings

1. **100% zero-pageview.** All 73 rows — 3,816 of 3,816 sessions — report
   `screenPageViews = 0`. There is no page view to attach a landing page *to*;
   `(not set)` is GA4's correct label for a session that fired `session_start`
   and nothing else. Nothing here is a mis-labelled real visit.
2. **~97% desktop.** 3,690 desktop vs ~126 mobile/tablet. Site-wide the Pinterest
   channel is ~80% mobile. The 09-01 "61% Pinterest app" reading was on the
   `sessionSource` share (Pinterest is 61% of this slice — 2,327/3,816), not on
   device; it does not survive the device cut.
3. **Source is already attributed.** Pinterest, Bing, Yahoo, Google, Tumblr are
   all named. A UTM parameter in the pinner URL builder changes *source
   attribution*; it cannot create a page view. The fix the 09-01 flag proposed
   would move nothing on this metric. **Not shipped, data does not support it.**
4. **Engagement is the tell.** 86 engaged sessions of 3,816 (2.3%), all on the
   Pinterest row; 0 on every other row. The Bing row (868, 0 engaged, 0 page
   views, desktop) is the same shape as the "Bing 12.6x Google — verify real vs
   bot" bucket and corroborates that a large share of Bing organic is
   session-start-only prefetch/preview hits.

## Verdict

**Bot / preview / prefetch noise, not real traffic.** Mechanism is consistent
with link-preview and prefetch fetches (Pinterest's own link validator,
Bing/Yahoo desktop prefetch, ChatGPT/Reddit/Patreon unfurlers) that execute the
GA tag far enough to send `session_start` and then abort before `page_view`.

## Actions

- **No pinner URL-builder change.** Recorded here so it is not re-proposed.
- **Never count `(not set)` toward the headline.** 3,816 sessions/7d ≈ 545/day
  is larger than the ~413/day gap to the sessions line (28d at 96.8%); the gap
  is real and this slice cannot close it.
- **Scoreboard (Ops/Quinn, not Pip's file):** report channel sessions net of
  zero-pageview sessions, or carry `zeroPageviewSessions7d` beside each channel,
  so the Bing and Pinterest lines stop carrying ~3.8k/7d of non-visits. Filed
  in `ideas-inbox.md`.
- **Re-read 2026-10-03** (7 more finalized days). Keep the verdict if the slice
  stays ≥95% zero-pageview; reopen if a real-pageview `(not set)` cohort
  appears (>5% of the slice with `screenPageViews > 0`).

— Pip, Traffic
