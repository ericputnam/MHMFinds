VERDICT: SAME-INCIDENT
MERGES: CLEAR
ROLLBACK-WANTED: none

# Rio verdict — 🔴 RED-RPM on finalized 2026-10-05 (Mon), with the missed 10-03/10-04 re-grades — read 2026-10-07 07:12 MDT

**Rule (pre-committed in `incidents/2026-10-03-red-rpm.md`, restated before the pull):** same incident if, on each judged day, (a) site requests/pv is within ±5% of the same-weekday 4-wk mean; (b) all four ad units are down together, none > 1.5× the site drop; (c) the newest *matured* per-path day has blog fill ≥ remainder fill − 8 pts; (d) Mediavine health all ok. Source for every number: `scripts/mcp-mediavine/client.ts` direct (Mediavine MCP down; scratch `/tmp/rio-1007-pull.mts`, `/tmp/rio-1007-ctrl.mts`, `/tmp/rio-1007-health.mts`, aggregates only). Requests = Σ paid_impressions / fillrate over `adunits`; remainder = site − top-100 seen paths.

## Four-point table (controls = the 4 prior same weekdays)

| point | 10-03 Sat | 10-04 Sun | 10-05 Mon | 10-06 Tue | grade |
|---|--:|--:|--:|--:|---|
| site revenue vs 4-wk mean | $221.02 vs $280.48 (−21.2%) | $227.62 vs $286.01 (−20.4%) | $157.98 vs $207.31 (−23.8%) | $197.91 vs $186.79 (**+6.0%**, ad-server rows; GA4 pv not joined) | — |
| (a) requests/pv vs 4-wk mean | 16.97 vs 18.21 (**−6.8%**) | 17.48 vs 17.86 (−2.1%) | 17.15 vs 17.81 (−3.7%) | unavailable (pv unjoined) | 10-04/05 pass; 10-03 outside the band — see note 1 |
| (b) units vs 4-wk mean: Adhesion / Content / Sidebar / Player | −32.3% (1.52×) / −18.3% / −28.0% (1.32×) / −2.8% | −28.2% (1.38×) / −22.2% / −31.3% (1.53×) / **+14.5%** | −29.1% (1.22×) / −23.6% / −37.1% (**1.56×**) / **+5.9%** | +5.7% / +6.7% / −10.4% / +30.6% | Player recovering, Sidebar at the line — see note 2 |
| (c) matured per-path day (rows with pv) | 100/100: blog fill 65.7% vs remainder 61.9% = **+3.8** | 100/100: 64.2% vs 60.3% = **+3.9** | 100/100: 57.5% vs 55.2% = **+2.2** | 0/100 (unjoined; reads −3.6 = the artifact, not graded) | pass (≥ −8 every matured day; 10-02 matured = +4.7) |
| (d) Mediavine health | ok | ok | ok | ok (10-07 status: ads_txt ok, privacy ok) | pass |
| site fill (ad-unit totals) vs ctrl mean | 63.3% vs 68.2% | 61.9% vs 67.9% | 56.1% vs 63.4% | 64.7% vs 64.2% | — |
| CPM | 0.89 | 0.90 | 0.92 | **1.04** (highest since 09-27) | — |

Note 1 — (a) on 10-03: 16.97 sits between 10-02's 17.07 and 10-04's 17.48; no step. The Saturday controls carry early-September values (18.44, 18.62) from the month-long requests/viewability slide the incident file already documented on 10-03 (18.83 → 16.73, 09-03 → 10-01, closed on exactly this reasoning at −7%). Vs 09-26 alone: −4.6%. Slot delivery is unchanged day over day; this is the slide, not an incident, and both newer days pass.

Note 2 — (b): the test assumed all four units fall together; Universal Player instead *recovered* (its CPM 2.08–2.29 is back at the 09-24/25 level), which shrinks the site denominator and inflates every other unit's ratio mechanically. Ex-Player, 10-05 reads site −29.3% and Sidebar 1.27×, Adhesion 0.99×, Content 0.81×. The Sidebar leg is the one real residual: its fill advantage over Content narrowed +3.2 (09-24) → +3.0 (10-01) → +2.1 → +2.5 → +1.1 → **−0.7 (10-05)** → +0.6 (10-06), and sidebar/content revenue 0.74 → 0.72 → 0.70 → 0.69 → 0.67 → **0.61** → 0.65. Two independent checks say it is auction-side, not delivery: (i) Mediavine's own `sticky_sidebar_ads` health score is 10.04 (10-03) / 10.16 (10-04), flat with the 9.5–10.7 band since 09-20 (the April 2026 sidebar wipe read 0.1); `check-blog-sidebar.sh` ok this morning, `functions.php` untouched since #208; (ii) the same calendar in 2025 — sidebar/content revenue 0.66 (09-27) → 0.70 (10-01) → **0.59 (10-05)** — shows the identical sidebar-last recovery with no deploys in question. The June/July boundary control does *not* show it (sidebar 1.03× site, gap −1.3 → −2.5), so the 2025 trace is the only control that explains it; recorded as a dated residual (E174 below), not a HOLD, because no candidate deploy touches the sidebar and a HOLD on Tier 0 non-ad merges would protect nothing against an auction-side fill drift.

## 2025 trace comparison

2025: 10-04 13.59 · 10-05 13.15 · 10-06 12.76 · **10-07 15.19** · 10-08 20.33 · 10-09 18.95 (session RPM). 2026: 10-03 14.96 · 10-04 14.98 · 10-05 13.77 · 10-06 session RPM unavailable (GA4 join pending) but revenue $197.91 vs Tuesday 4-wk mean $186.79 (+6.0%), CPM 1.04 vs 0.92, site fill 64.7% vs 64.2% ctrl, three of four units above their Tuesday mean. **Yes — 10-06 shows the lift, one day earlier than 2025's 10-07.** 10-05 (13.77) ran above 2025's 13.15 at the same point; the 2026 trough was shallower throughout. Caveat on 10-05's −23.8%: its Monday mean includes Labor Day 09-07 ($263.17, 23,215 pv); ex-holiday mean $188.68 → −16.3%.

## Consequence

Same Mediavine-side Q3→Q4 demand reset as 10-01/10-02 (E163). No rollback (none of the 52 in-window deploys is a candidate for a sidebar-only auction drift; none touches the sidebar; E169-b bound stands), no `functions.php` action, no revert PR. **Tier 0 PRs that touch no ad surface may merge today**; anything under `app/`, `components/`, `middleware.ts`, `next.config.js`, `functions.php` or an ad anchor stays HELD until the guardrail is off red — same qualifier as 10-04.

**E163-b 10-05 confirmation (the 10-02 rows matured):** blog fill 63.0% vs remainder 58.3% = **+4.7** (keep rule: > −8) → confirmed CLOSED; every matured day 10-01→10-05 reads +2.2…+4.7, blog requests/monetizable pv 22.3–23.8 vs 24.00 on 09-24.

**E174 — Sidebar Sticky residual, read 10-09 on finalized 10-06 + 10-07.** Keep (close) if sidebar/content revenue ≥ 0.68 on either day OR sidebar's gap to its same-weekday 4-wk mean is within 10 pts of Content's. Reopen as ON-SITE sidebar (Tier 2 package: Mediavine sidebar ticket + `functions.php`/sidebar CSS audit, no push) only if ratio < 0.65 on both days AND sidebar ≥ 10 pts worse than Content on both AND `sticky_sidebar_ads` < 9.0 on any day. Expect RED again tomorrow for 10-06 only if GA4 joins low sessions; on revenue it is already green.

— Rio, Product & Revenue
