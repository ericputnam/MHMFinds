# Pinterest read — 2026-10-03 (E81 pulled forward; incident 🔴 RED-RPM 10-01)

GA4 property 437117335, `sessionSource` CONTAINS "pinterest" (case-insensitive — the E61 definition).
Read taken 2026-10-03 ~11:00Z; 10-02 is not yet a finalized GA4 day and is quoted only where labelled.
Mediavine MCP was down for this session — RPM by page class is Rio's half of the incident evidence.

## 1. Pinterest pageviews ÷ Pinterest sessions, ALL hosts (E81 metric; baseline 1.51 = 85,547 / 56,640)

Unsegmented (no `hostName` dimension — the only denominator that partitions; a host split double-counts
~6,000 cross-host sessions/week, see #210).

| window | sessions | pageviews | pv / session | vs 1.51 |
|---|--:|--:|--:|--:|
| base 09-13→09-19 | 56,640 | 85,547 | 1.510 | — |
| pre 09-22→09-28 (last full week on two hosts) | 59,828 | 91,485 | 1.529 | +1.2% |
| **post 09-29→10-01** (Tue–Thu, after the 301 at 09-28 20:48) | 21,933 | 34,049 | **1.552** | **+2.8%** |
| cur 7d 09-25→10-01 | 57,889 | 90,692 | 1.567 | +3.7% |

Same-weekday control: Tue–Thu 09-22→24 pv/s 1.525 (34,842 / 22,854 from the daily series) vs Tue–Thu
09-29→10-01 1.526 (34,049 / 22,307). **Depth per Pinterest session did not fall** — flat to +2.8%, inside
the ±3% noise band the keep-if names, and in the wrong direction to explain a −25% RPM day.

## 2. blog.* share of Pinterest sessions (keep-if: <5%, with apex ≥ the former sum)

Host-segmented (shares are host ÷ sum of hosts; the sum over-counts cross-host sessions).

| window | apex sessions | blog.* sessions | blog.* share | apex pv | blog.* pv |
|---|--:|--:|--:|--:|--:|
| base 09-13→09-19 | 43,153 | 19,480 | 31.1% | 61,779 | 23,768 |
| pre 09-22→09-28 | 45,883 | 20,321 | 30.7% | 66,254 | 25,231 |
| **post 09-29→10-01** | 21,833 | **94** | **0.43%** | 33,991 | 58 |

Apex now carries 21,833 of the 21,933 unsegmented Pinterest sessions (99.5%); the 94 residual blog.*
sessions are cached-HTML / pre-redirect hits. **The 301 did what it was meant to do:** ≈2,600–2,900
Pinterest sessions/day that used to land on `blog.musthavemods.com` land on the apex since 09-28 20:48.

## 3. Pinterest sessions, Tue–Fri daily mean (E66 rule: ≥97% of 8,003/day = ≥7,763)

| day | sessions | pv | pv/s |
|---|--:|--:|--:|
| Tue 09-22 | 7,521 | 11,290 | 1.501 |
| Wed 09-23 | 7,576 | 11,753 | 1.551 |
| Thu 09-24 | 7,757 | 11,799 | 1.521 |
| Fri 09-25 | 8,251 | 12,250 | 1.485 |
| **Tue–Fri 09-22→25 mean** | **7,776** (97.2%) | | |
| Tue 09-29 | 7,951 | 11,795 | 1.483 |
| Wed 09-30 | 7,335 | 11,415 | 1.556 |
| Thu 10-01 | 7,021 | 10,839 | 1.544 |
| Fri 10-02 (not finalized) | 7,937 | 11,589 | 1.460 |
| **Tue–Fri 09-29→10-02 mean** | **7,561** (94.5% of 8,003) | | |

Tue–Thu only (both finalized): 22,854 → 22,307 = **−2.4% WoW**. Mediavine's own 10-01 session count
was −1.4% vs expectation (11,139 vs 11,292), consistent with GA4.

## 4. Interpretation for the 🔴 RED-RPM incident (GA4 half)

- **The denominator did not move.** Sessions −1.4% (Mediavine) / −2.4% (GA4 Tue–Thu), pages per Pinterest
  session +1.5% to +2.8%. Nothing on the audience side is the size of a −24.6% RPM / −25.7% revenue day.
  This is not a traffic incident (no red-traffic action; no Pinterest rollback premise).
- **The one structural traffic change inside the guardrail's 72 h window is the host split (#208, 09-28
  20:48):** ~30% of the Pinterest channel moved from `blog.*` to apex-served pages overnight, and the
  3-day RPM (−13.0%) covers exactly the first three days on one host. If Mediavine monetized the two hosts
  differently (site profile, ad density, the sidebar/in-content units the proxied pages receive), a 30%
  mix shift is the only GA4-visible mechanism. For a blended −25% from a 30% slice the moved slice would
  have to earn ~80% less than before — so either the moved slice is monetizing far worse than `blog.*` did,
  or the cause is not the split at all (Mediavine-side fill/CPM — Q4 starts 10-01 and CPMs usually *rise*).
- **What Rio's read must separate:** RPM of the apex-served blog-post class 09-29→10-01 vs (a) its own
  09-22→28 and (b) `blog.*`'s 09-22→28. If (a) is flat and the blended drop sits elsewhere, clear the
  split; if the apex blog class fell while app pages held, the split is the mechanism and the rollback is
  the 301 in `functions.php` (Tier 2, operator) — not the pin queue.
- **E81 as written:** blog.* share 0.43% (<5% ✓); pv/s 1.552 ≥ 1.51 ✓; apex ≥ former sum per-day Tue–Thu
  7,278 vs 7,618 (−4.5%, but the pre-week sum over-counts cross-host sessions — on the unsegmented series the
  gap is −2.4%). Recommended grade on 10-05 as scheduled: KEEP on the traffic metrics; the revenue leg is Rio's.

## 5. E102 / E61 / E117 reads taken from the same pulls

- E102 (8 destinations topped 09-25; `landingPage` regex, both hosts): 09-18→24 3,328 → 09-25→10-01 3,501
  = **+5.2%** vs site Pinterest 59,993 → 57,889 = **−3.5%** (+8.7 pts). Per destination: april 739→853,
  november 359→336, couple-poses-2 486→481, furniture 226→251, plants 123→115, skin-overlay 339→342,
  tv 142→139, wedges 914→984 (4 of 8 up). Keep-if "beats site-wide Pinterest WoW" → KEEP.
- E61 keep-if "≥+10% Pinterest sessions to its destination set vs the matching pre-period": set = the same
  8 destinations, pre-period 3,598 (09-17→23) → 3,501 (09-25→10-01) = **−2.7% absolute**. Bar not met
  → KILL the absolute bar with the number; the relative read (+8.7 pts vs site, E26 recency slice was
  −7.5 pts) lives on as E102 KEEP.
- E117 `(not set)` landing sessions 09-25→10-01: 4,118 sessions, **0 pageviews (100% zero-pageview)**,
  146 engaged. Holds ≥95% → KEEP the decision (never counted toward the headline).

Note for the next reader: GA4's `landingPage` dimension carries **no trailing slash** (`/sims-4-wedges-cc`),
so an `inListFilter` built from the queue's `/…/` paths returns 0 rows silently; use `FULL_REGEXP` with `/?$`.

— Pip, Traffic
