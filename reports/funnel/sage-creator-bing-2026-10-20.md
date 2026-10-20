# /creator/* Bing landings — read-only diagnosis (Sage, E245, 2026-10-20)

Ideas-inbox item (Nova 10-16): "/creator/* Bing landings fell 77→52 while Google rose 52→57
(09-23→29 vs 10-09→15) … if the 10-23 read is MORE DATA, check Bing Webmaster index coverage."
No new scripts; every number below is a GA4 Data API read (property 437117335, landingPage
BEGINS_WITH `/creator/`, sessionSource CONTAINS `bing` — the same bucket rule as
`lib/funnel/creatorLandings.ts`: `bing` + `cn.bing.com`). ISO weeks Mon–Sun.

## The one number

**57** — /creator/* Bing landing sessions per week, identical in W41 (10-05→10-11) and
W42 (10-12→10-18), on **37 distinct landing URLs** each week. The "77" baseline was not an
established level: **the first Bing landing ever on /creator/* was 2026-09-23 — day 1 of the
baseline window.**

## The series (what the 77→52 comparison actually compared)

| ISO week | /creator/ Bing sessions (bing + cn.bing) | distinct /creator/ URLs landed | sessions / URL | site Bing sessions | /creator/ share of site Bing |
|---|--:|--:|--:|--:|--:|
| W36–W38 (08-31→09-20) | **0** | 0 | — | 17,652 / 16,933 / 15,787 | 0 |
| W39 (09-21→09-27) | 53 (33 + 20) | 42 | 1.26 | 16,598 | 0.32% |
| W40 (09-28→10-04) | 78 (60 + 18) | 57 | 1.37 | 16,251 | 0.48% |
| W41 (10-05→10-11) | 57 (44 + 13) | 37 | 1.54 | 15,012 | 0.38% |
| W42 (10-12→10-18) | 57 (46 + 11) | 37 | 1.54 | 15,308 | 0.37% |

Daily, 09-23→09-29 (the E225 baseline window): 5, 10, 12, 13, 13, 18, 7 = 78 — a cold-start
ramp peaking 09-28, two days after the 09-26 IndexNow push of all 541 `listCreators()` URLs
(`reports/funnel/indexnow-2026-09-26.md`) and three days after `llms-full.txt` began linking
them (#176, 09-25). Daily 10-01→10-18: 154 sessions / 18 days = 8.6/day (range 2–13), i.e.
≈60/wk with no trend inside the window.

## Reading

1. **Not a decline from a level — a settle after index arrival.** The surface went 0 → 53 → 78
   → 57 → 57. The baseline week is the week Bing first landed the pages; W40 is the arrival
   burst (57 distinct URLs, the widest week); W41 and W42 are flat on both sessions and
   URL breadth. Peak-to-steady is what "77→52" measured.
2. **The settle is breadth, not depth.** Distinct URLs 57 → 37 while sessions per landing URL
   rose 1.37 → 1.54. Bing is landing fewer creator pages, not fewer visits per page — consistent
   with a fresh-crawl burst that then narrows to the pages Bing keeps ranking (37 of ~541).
   The top URL in W40 (`/creator/northern-siberia-winds` 8) went 1 → 2 and alone is 7 of the
   21-session W40→W41 drop.
3. **cn.bing.com is a disproportionate, site-wide-moving leg.** It is 19% of /creator/ Bing
   (11 of 57 in W42) but 0.6% of site Bing; site-wide cn.bing fell 133 → 88 in W42 (−34%)
   while the /creator/ leg went 13 → 11. Do not read a /creator/ cn.bing move as a
   /creator/-specific signal.
4. **E218 (#313, merged 10-16, `--creators-changed` daily) is not the cause.** The settle to
   57 happened in W41 (10-05→10-11), five days before #313 landed, and W42 equals W41.

## Bing Webmaster index coverage

Unavailable from this run — no Bing Webmaster Tools API in the funnel toolset, and
`logs/indexnow.log` is per-worktree (inbox item, Nova 10-16). The GA4 breadth count (37 URLs
landed/week, stable) is the proxy; it needs a Webmaster read only if it falls.

## What this changes

- The E225 source-matched control's `creator.bing = 77` (`lib/funnel/creatorLandings.ts:105`)
  is an arrival-week number. Re-anchor it to the W41/W42 steady state (57) at the 10-23 read,
  or the guard's diagnostic bing residual reads "down" forever against a burst. (Code edit;
  Nova's file, Tier 0 — not done in this read-only move.)
- Decision rule for the 10-23 read, stated now: /creator/ Bing W43 (10-19→10-25) **< 45
  sessions OR < 30 distinct URLs** → a Bing Webmaster coverage check is warranted (and E218's
  `--creators-changed` scope is the first suspect, since it stops re-sending unchanged URLs);
  **≥ 45 AND ≥ 30** → flat, close the inbox item as "arrival-week baseline", no action.

— Sage, Search & AI
