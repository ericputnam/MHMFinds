VERDICT: SAME-INCIDENT
MERGES: CLEAR
ROLLBACK-WANTED: none

# Rio verdict — 🔴 RED-RPM on finalized 2026-10-02 (Thu) — read 2026-10-04 ~11:05Z

**Decision rule (pre-committed in `incidents/2026-10-03-red-rpm.md`, restated before the pull):** a second RED on 10-02 is the SAME incident if it matches the 10-01 trace — carried by fill and/or CPM, every partner and every ad unit down together, site requests/pv within ±5% of the same-weekday 4-wk mean — *unless* fill or requests/pv on a touched page class (blog via #208, /go via E152, /mods via #203/#219) breaks from the site. E163-b: reopen as ON-SITE host split only if blog-bucket fill is ≥ 8 pts below the remainder's on a *matured* per-path day while site fill ≥ 60%; otherwise the residual closes. Source for every number: `scripts/mcp-mediavine/client.ts` direct (Mediavine MCP not used), pulled 10-04 ~11:00Z.

Evidence (10-02 vs the 4 prior Thursdays 09-04/11/18/25 unless stated):
1. Revenue $152.46 vs $208.17 (−26.8%) = paid impressions −15.5% (185,946 vs 219,977) × CPM −13.8% (0.81 vs 0.94) → −27.2%. Yield, not traffic: sessions −3.8%, pageviews −5.6%.
2. Site requests/pageview 17.07 vs 17.46 4-Thu mean (−2.2%, inside ±5%) and *up* from 09-25's 16.27 and 10-01's 16.73. Slot delivery unchanged across both candidate deploys.
3. Fill (ad-unit totals) 60.4% vs 66.0% 4-Thu mean — recovered from 56.0% on 10-01 (≥ 60% ✓). CPM 0.81 is the lowest of the series (0.84 on 10-01); 10-02's gap is CPM-led where 10-01's was fill-led.
4. All four ad units down together vs 09-25: Adhesion −34%, Content −25%, Sidebar Sticky −30%, Universal Player −33% (fill −3.4…−6.4 pts and CPM −18…−23% on each). No unit > 1.5× the site drop.
5. 15 of 15 recurring partners down vs 09-25 (AdX −17%, IX −28%, Magnite −20%, TripleLift −48%, OpenX −30%, Ozone −58%, Kargo −45%, Smart −56% …); Criteo + SeedTag + Conversant ($13.42 on 09-25) still bid $0 — 21% of the $64.93 gap. A site change cannot switch three specific bidders off.
6. Devices: desktop $208.10 → $144.68 (−30.5%), mobile $8.89 → $7.47 (−16%); uniform direction (device sessions not yet joined for 10-02, so per-device RPM is unreadable). Viewability 56.1 vs 54.2 (up). Ad-block 6.3% vs 6.85% (down).
7. **E163-b, matured 10-01 per-path rows (100/100 now carry pageviews; 0/100 yesterday):** blog-bucket fill 58.7% vs remainder 54.3% = **+4.4 pts (blog above)**. Same gap every day since 09-18: +4.3, +4.5, +3.9, +3.5, +4.2, +4.4 — no step at the 09-28 host split. Blog requests/monetizable pv 23.80 vs 24.00 on 09-24 (−0.8%). Yesterday's −9 pt reading was the unjoined artifact my playbook already names.
8. Blog vs remainder RPM, 3-day 09-29→10-01 on matured rows: blog 16.50 → 13.19 (−20.1%), remainder 11.84 → 9.82 (−17.1%), ratio **1.18×** (< 1.5× rule-3 threshold; the 1.87× on 10-03 was the unjoined data). Rule 3 (host split) fails on both legs → **E163-b residual CLOSED.**
9. 10-02 per-path rows are unjoined (0/100 with pageviews) and read −8.0 pts — the identical artifact; not readable as a verdict. Confirmation re-read 10-05 when they join (keep: matured gap > −8 pts).
10. Calendar control: 2025-10-02 vs its 4 prior Thursdays was −35.9% revenue and −35.9% RPM (12.54 vs 19.56) with no host split and no /go change; 2026 is −26.8%/−24.0%, smaller. 2025's trace stayed low through 10-06 (12.54 → 12.97 → 13.59 → 13.15 → 12.76) and first lifted 10-07 (15.19).
11. 10-03 (partial, not finalized): $221.02 on 246,762 paid impressions, CPM 0.89 (up from 0.81/0.84). Saturday 09-26 was $295.20 / 285,914 / 1.03. Direction up on CPM; grade tomorrow.
12. Nothing on a touched page class breaks from the site: blog fill ≥ site fill on every matured day; remainder (/go, /mods, long tail) fill sits 1.0–1.9 pts under site fill on every day 09-18 → 10-01 (−1.7 on 10-01), unchanged by E152.

**Consequence:** same Mediavine-side Q3→Q4 demand reset as 10-01. No rollback, no `functions.php` action, no revert PR. Per autonomy.md "red-rpm, nothing on an ad surface deployed → investigate; no merges of anything touching ad pages": **Tier 0 PRs that touch no ad surface may merge today**; anything under `app/`, `components/`, `middleware.ts`, `functions.php` or an ad anchor stays HELD until the guardrail is off red.

**Expect RED again tomorrow** (10-03 Sat vs 4 prior Saturdays, incl. 09-26 $295.20) and likely through ~10-07 per the 2025 trace. Standing same-incident test for each re-grade while this file is open (all four → same incident, Tier 0 non-ad merges CLEAR; any one fails → NEW incident, HOLD): (a) site requests/pv within ±5% of the same-weekday 4-wk mean; (b) all four ad units down together, none > 1.5× the site drop; (c) on the newest *matured* per-path day, blog-bucket fill ≥ remainder fill − 8 pts; (d) Mediavine health all ok.

— Rio, Product & Revenue
