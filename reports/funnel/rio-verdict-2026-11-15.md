# Rio — verdict 2026-11-15 (E416): the 28d gap to the ramp is 100% sessions (RPM is 7.3% above what the ramp assumes); the 7d RPM jump is 60% monetizable-share, 40% Q4 CPM; the skip-the-wait perk reaches 3 of 58 payers and is not the mechanism behind the $3-tier join lift — B2 stays on the drift line

Circuit breaker 🟢 GREEN, action none (`guardrail-2026-11-15.md`, judged 11-12: revenue +5.1%, RPM +3.0%, sessions +1.6%, 3-day +15.7%, health all ok). **Auto-rollback withheld: 83 in-window production deploys vs the bound of 24** — a red day in this state would not roll back on its own; a manual rollback is Tier 1 and the Mediavine side is read first (10-01/10-02 precedent).

**Sources.** Mediavine reporting MCP (`mv_metrics_summary` 10-16→11-12 and 09-18→10-15; `mv_metrics_daily` 10-30→11-12), read 2026-11-15 ≈12:00Z. GA4 Data API, property 437117335: `sessions, screenPageViews` by date and by `pagePath` prefix (`/`, `/go/`, `/mods/`, `/games/`); Singapore × (direct) segment (E216); `eventName` counts for `member_skip_countdown`, `patreon_click`, `patreon_click_after_wait`. Patreon Members API via `scripts/agents/patreon-relaunch-read.ts --since` (09-16, 10-16) and `summarizePatreonMembers` with anchors 09-08 / 09-16 / 10-16 (counts only; no id, email or token read or printed). `operator-did-2026-11-15.md` for tier state. Mediavine `pages` rows are still lagging for this window (136 paths, `/` at 9,304 pv) and were not used.

## (a) One line for the digest

*28d revenue $6,151.81 is 82.0% of the operator ramp ($7,671) on 74.7% of the ramp's sessions: at ramp sessions and today's $17.53 RPM the 28d would read $8,236, so sessions account for −$2,084 (137% of the −$1,519 gap) and RPM gives back +$565. The gap is sessions, all of it. The 7d RPM jump ($17.46 → $19.32, +10.7%) is 60% more-of-each-session-monetizable (mon-pv share 83.0% → 91.1%, stepped 11-03 and 11-06) and 40% CPM ($1.022 → $1.064, Q4). Not app-page mix: app pages rose 26.1% → 29.3% of pageviews and they earn $3–8 RPM against $15–32 on posts, which pushes RPM down. No ad action.*

## (b) RPM / page-mix

**28d vs the ramp (anchor 11-12).**

| | actual | ramp | ratio |
|---|--:|--:|--:|
| revenue | $6,151.81 | $7,671 | 82.0% |
| sessions (MV) | 350,962 | ≈469,800 | 74.7% |
| implied session RPM | $17.53 | $16.33 | 107.3% |

ln-decomposition of the −19.8% revenue gap: sessions −29.2 pts, RPM +7.1 pts. The team's number to move is sessions; RPM is already above the plan line.

**28d vs prior 28d.** $6,151.81 vs $5,865.92 = **+4.87%** = sessions −2.50% (350,962 vs 359,944) × session RPM +7.55% ($17.53 vs $16.30). The RPM leg splits as monetizable-session share +6.0% (61.2% vs 57.7%) × monetizable-session RPM +1.4% ($28.65 vs $28.25). Page RPM is flat ($10.53 vs $10.62). The revenue growth is a rate effect on a shrinking session base — exactly the pattern the 09-19 amendment says does not count as growth.

**7d WoW (11-06→11-12 vs 10-30→11-05), ratio of sums from `mv_metrics_daily`.**

| leg | prev 7d | 7d | Δ | share of ln-lift |
|---|--:|--:|--:|--:|
| revenue | $1,419.90 | $1,712.80 | +20.6% | |
| sessions (MV) | 81,305 | 88,643 | +9.0% | |
| session RPM | $17.46 | $19.32 | **+10.65%** | 100% |
| paid imp / session | 17.09 | 18.15 | +6.2% | 60% |
| CPM | $1.022 | $1.064 | +4.1% | 40% |
| monetizable pv / pv | 83.0% | 91.1% | +9.8% | |
| monetizable pv / session | 1.474 | 1.645 | +11.6% | |
| paid imp / monetizable pv | 11.59 | 11.03 | −4.8% | |

Daily monetizable-pv share: 81.3 / 79.3 / 81.5 / 80.5 / **85.5** / 85.5 / 87.7 / **91.2** / 91.5 / 91.6 / 90.1 / 92.6 / 91.8 / 88.8 (10-30 → 11-12). Two steps, 11-03 and 11-06. Neither is the Singapore segment shrinking — it grew 1,845 → 2,429 sessions WoW (GA4). Impressions per monetizable page fell, so it is not denser ads. GA4 pageviews on `/`, `/go/`, `/mods/`, `/games/` went 37,637 → 40,741 (26.1% → 29.3% of pageviews) — a mix shift toward *lower*-RPM pages. What rose is the fraction of pageviews Mediavine counts as monetizable; whether that is fewer unmonetizable (adblock / bot) pageviews or a Mediavine-side classification change is not visible from the reporting API. It coincides with nothing Rio shipped. **Watch, don't act:** if the share falls back to ~81% the 7d RPM gives back ~6 pts and that is not a deploy regression.

GA4 vs Mediavine sessions agree per day within 1–3% through 11-11 (e.g. 11-08: 15,715 vs 15,282); GA4 has no 11-12 row yet, so any GA4 7d read today under-counts by a day.

## (c) E416 — the skip-the-wait perk, read against B2 (the October competitor move #3, due 11-30, delivered early)

Timeline from the data, not the queue: the perk (Q5, PR shipped 09-07/08) has been live since **09-08** — first `member_skip_countdown` event 09-08 — not 10-16. The `$3 Cappuccino` description carries the perk line since the operator's 09-25 edit; it is the only tier with a perk line (operator-did probe). The only `/go` change at the 10-16 boundary is Cass's #309 (E152 KILL → free-tier Patreon follow ask).

| metric | 09-16→10-15 (30 d) | 10-16→11-14/15 (30 d) |
|---|--:|--:|
| `member_skip_countdown` events / users (GA4) | 9 / 2 | 31 / 3 |
| paid-and-connected (id join) | 0 of 54 (09-22) | **3 of 58 (5.2%)** |
| paid joins, all tiers (Members API) | 8 | **16** |
| paid joins at the $3 perk tier | 4 (0.13/day) | **9 (0.30/day)** |
| paid cancels | 14 | 6 |
| `patreon_click` events / users (GA4) | 286 / 233 | 410 / 340 (+46% users) |
| `patreon_click_after_wait` events / users | 76 / 70 | 126 / 108 (+54%) |
| paid joins per 100 `patreon_click` users | 3.4 | 4.7 |

Lifetime perk usage: ≤41 events, 09-08→11-14, by at most 5 distinct users; 55 of 58 paying patrons have never received the thing the $3 tier promises. 7d: joins 4 ($3: 3), cancels 1; paid 58, gross **$150.50/mo**; floor $155 is 2 $3-patrons away.

**Reading.** The join rate at the perk tier more than doubled (4 → 9 per 30 d) and cancels fell 14 → 6, so the Patreon line is finally net positive (+10 paid in 30 d vs −6 the month before). The *site perk* cannot be the mechanism: it reached 3 payers. What moved in step with joins is the volume of people clicking through to Patreon from the site (+46% users), and joins per clicker also rose (3.4 → 4.7 per 100). So the lever that is inside the fence is **reach of the Patreon CTA**, not the perk and not pricing. The perk's cost is zero (a sibling of the ad anchors, 10 s of countdown for ≤5 people) and the ad side is up, so it stays as shipped.

## (d) Decision

1. **E416 verdict: perk KEEP as a feature, KILL as a conversion story.** Do not widen it, do not build another `/go` perk surface on it, and do not re-pitch a tier change around it (Q4 closed won't-do, 09-28). Any future B2 proposal has to move `patreon_click` users or joins-per-clicker, which is where the November lift actually sits. Ownership of the CTA reach is Cass's (E152 / #309); Rio reads the join side.
2. **B2 November line, pre-committed read 2026-11-30:** KEEP the drift line if $3-tier joins 11-16→11-30 ≥ 4 (the 0.30/day pace × 15 d, rounded down) AND paid ≥ 60 (clears the $155 floor at the current mix); MISSED otherwise, graded at the Members API figure (E392), never the public counter. Cancels > 8 in the same 15 d (the Aug 16/mo pace) reopens the churn read.
3. **Ad side:** no action. Pre-committed falsifier for the monetizable-share step: if the 7d share reads < 85% on any scoreboard after 11-18 with CPM flat, Rio writes one line naming it as Mediavine-side (not a deploy) and asks Mediavine support what changed on 11-03/11-06.
4. The October competitor move #3 ("read the perk before widening it", due 11-30) is delivered by this file; Quinn can mark it read.

— Rio, Product & Revenue
