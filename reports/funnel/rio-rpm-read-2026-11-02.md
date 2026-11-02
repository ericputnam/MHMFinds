# Rio — RPM read 2026-11-02 (E324): 10-31 is a volume day (Halloween Saturday); guardrail holds; Q37 → A; affiliates $0 on a confirmed pipe

Circuit breaker 🔴 RED-TRAFFIC, action investigate (`guardrail-2026-11-02.md`); rollback withheld (90 in-window deploys > bound 24). **Mediavine MCP unavailable this session** (no `mcp__mediavine-reporting__*` tools registered) → `scripts/mcp-mediavine/client.ts → earnings('2026-10-01','2026-11-02')` direct, GA4 Data API for sessions, `affiliate-pipe-read.ts --start 2026-10-26 --end 2026-11-01`, scoreboard `2026-11-02.md`. No token is printed here.

## (a) Decision rule, stated before the read

Ex-segment RPM −7.0% on one day with 3-day RPM +9.0% → **"volume (Halloween Saturday), guardrail holds, no rollback"** unless 11-01's RPM is also < 95% of its same-weekday mean. Same-weekday mean = the 4 prior Saturdays (10-03/10/17/24) or Sundays (10-04/11/18/25).

## (b) The read — 10-31 is volume; 11-01 does not fire the exception

| 10-31 Sat | actual | 4-Sat mean | Δ |
|---|--:|--:|--:|
| revenue | $187.07 | $258.85 | **−27.7%** |
| sessions (MV / GA4) | 11,236 / 11,402 | 14,928 / 14,870 | −24.7% / −23.3% |
| session RPM | $16.65 | $17.36 | −4.2% |
| monetizable sessions | 6,639 | 8,488 | −21.8% |
| mon-session RPM | $28.17 | $30.50 | −7.6% = imp/mon-sess −4.5% ($28.46 vs 29.79) × CPM −2.7% ($0.99 vs $1.0175) |
| imp / mon-pageview | 11.71 | 13.79 | −15.1% — offset by mon-pv / mon-session 2.43 vs 2.16 (+12.5%) |

Identity: sessions −24.7% × RPM −4.2% = −27.9% (printed −27.7%). In log terms sessions carry **87%** of the gap and RPM 13%; on the monetizable basis 76% / 24%. The rate leg is CPM −2.7% and ads-per-session −4.5% — demand softness on a holiday Saturday, not an ad-surface break (health ok, blog markers present, no `functions.php` push since #391 10-27).

**11-01 Sun (provisional — Mediavine's `sessions` line is still 0 and `finalized` is null):** revenue $243.46 vs $257.45 (−5.4%); GA4 sessions 13,858 vs 15,753 (−12.0%); RPM proxy (MV revenue ÷ GA4 sessions) **$17.57 vs $16.35 = 107.5%** of the Sunday mean; mon-session RPM $30.25 vs $29.29 (+3.3%), CPM $1.01 vs $0.9825 (+2.8%), imp/mon-sess 29.80 vs 29.66 (+0.5%). ≥ 95% → **the exception does not fire.**

**Verdict:** *10-31 is a volume dip (sessions −24.7% carry 87% of the −27.7%; RPM −4.2% is CPM −2.7% × ads/session −4.5%), 11-01 bounced to 107.5% of its Sunday RPM mean on sessions still −12% — the guardrail holds, no rollback, no Mediavine ticket; red-traffic is Pip/Sage's incident (Pinterest 7d +0.1%, direct −32.6%).*

**One watch, rule pre-committed:** ads per monetizable pageview read −15.1% (10-31) / −9.9% (11-01) while pages per monetizable session read +12.5% / +11.6% — net ads per session −4.5% / +0.5%. Read 11-05 over 10-29→11-04 vs same weekdays: if imp/mon-pv ≤ −8% **and** imp/mon-session ≤ −3%, package a Tier 2 ad-anchor check on the catalog/hub templates (the charter's index-template gap); otherwise close the watch. Not a rollback input.

## (c) Q37 — what A needs, in units (decide by 11-05)

Base 11-02: 6,425 free · 54 paid ($1×13, $3×38, $5×3 = $142 public; API 55 ≈ $147.50) · $3 joins 7d **0** (prior 7d 2; 14 since 09-08 = 0.25/day ≈ 7.6/mo = **0.12% of free per month**) · paid joins/cancels 7d 3/2 · `patreon_click` 10.14 users/day (E40 baseline 8.75).
- **A ($3 "skip the wait" perk):** every 0.1 pt of free→$3 conversion = +6.4 patrons = **+$19/mo**. The $250 line needs +$96 = 32 joins = 0.5% — **4× the organic monthly rate**, so the perk must do the work, not the base. Week-1 gate after the E294 post: **≥ 8 $3 joins** = on pace (32/30 × 7); 4–7 = on pace for ~$203; **< 4 → kill the perk pitch** (E315 rule stands). At the organic rate alone A ≈ silence ($155).
- **B (creator rev-share):** no dollar base; it is a payout, so to match A it must generate ≥ $96/mo *net* — at a 50% share that is ~$192/mo of creator-attributable ad revenue ≈ **11,600 extra sessions/mo at $16.56 RPM**, from 2 onboarded creators with 0 submissions in 7d. B cannot break even against A in November; it is a December bet with a named creator.
- **Recommendation: `Q37: A`.** Break-even vs silence is any conversion above 0.12%/mo; break-even vs the $250 line is 0.5% (32 joins, ≥ 8 in week 1).

## (d) Affiliates 7d (10-26→11-01) — $0 on a confirmed pipe, kill read 11-11

On-site 20 clicks (DB 21) · gtracing 10 → Impact 9 clicks / 0 actions (90% recorded, pipe **confirmed**) · Envato 7/0 · Canva 2/0 · **$0.00**. GA4: grid (`/` + `/games/*`) 12 = 1.71/day; blog Amazon pack block (#391) **58 clicks on 43 posts = 9.67/day** (10-27 14, 10-28 5, 10-29 14, 10-30 11, 10-31 10, 11-01 4) — dollars are Amazon Associates, operator-only. The one change I would ship tomorrow is **none on placement** (E134 repair-only; E55 stands): the block is the only surface with volume and it is `functions.php` (Tier 2). What moves the line is a number, not a placement: **Q-line for the operator — paste the Associates earnings for 10-27→11-10 by 11-11** so 58 clicks/wk get a dollar before the E134 kill read; Impact $0 on 11-11 → KILL to E13.

— Rio, Product & Revenue
