# Rio — verdict 2026-11-11 (E392): the E134 affiliates read. The Impact leg is KILLED back to E13 (0 actions on 47 recorded clicks over a confirmed-fixed pipe). The Amazon block passes its clicks bar at 9.8/day, but its earnings leg is NOT MEASURABLE. The +$40 Patreon jump is a counter artefact, not new joins.

Circuit breaker 🟢 GREEN (`guardrail-2026-11-11.md`, judged 11-08: revenue $304.70 +16.6%, RPM $19.93 +15.1%, ex-segment RPM +11.7%, 3-day +14.9%). Mediavine 28d $6,053.38 (+4.4%), 7d $1,607.47 (+12.1%). E381's falsifier needed the 7d below −2.0% WoW; it is at +12.1%, so E381 stays closed as volume.

**Sources (all read 2026-11-11 ≈11:40Z, read-only).**
- `scripts/agents/affiliate-pipe-read.ts --start 2026-10-12 --end 2026-11-10`, which reads:
  - production DB `AffiliateClick` by partner;
  - Impact `partner_performance_by_program`;
  - GA4 `affiliate_click` by surface.
- A Prisma count of `AffiliateEarning` (all networks, all time).
- `scripts/agents/patreon-churn-read.ts --no-db`: Patreon API v2 members and the tier `patron_count`.
- The 11-03 → 11-11 scoreboards.

No token, id or address is printed here.

## (a) The pre-committed rule (E134 / E306 / #391, written 10-12 and restated in E381 on 11-09)

> Impact $0 on the 11-11 read → affiliates revert to E13 (no new placements). Amazon block < 5 clicks/day → close that leg too. No Amazon earnings from the operator → the Amazon leg is NOT MEASURABLE. That is not a pass, and the block stays.

## (b) Impact leg: KILL → E13

| Leg (2026-10-12 → 2026-11-10, 30 d) | Value |
|---|--:|
| Pipe status (E153 rule) | **CONFIRMED**: Impact recorded 23 of 27 on-site gtracing clicks = 85.2% (floor 50%; pre-fix 8.2%) |
| On-site `AffiliateClick`, all partners | 55 (gtracing 27, all to repaired offers) |
| Impact clicks: GTPLAYER-US / Envato / Canva | 23 / 22 / 2 = 47 |
| Impact actions, all campaigns | **0** |
| Impact sale amount | **$0.00** |
| `AffiliateEarning` rows, any network, all time | **0** |
| GA4 `affiliate_click`, grid (`/` + `/games/*`) | 36 = 1.2/day |

The pipe was fixed and confirmed for the full 30 days, and demand still produced 0 actions. E134 assumed the earlier $0 was caused by a broken pipe. That assumption is now falsified.

What KILL means here:
- **E13 stands again.** No new placements, no partner applications, and no Rio moves spent on Impact.
- **Not removed:** the shared link validator (it protects every sync from writing broken links) and the existing repaired grid links (they cost nothing, and taking them out is a change with no upside).
- **Reopen only with new evidence:** an Impact action above $0, which the daily pulse would surface.

## (c) Amazon pack block (#391): clicks KEEP, earnings NOT MEASURABLE

- GA4 `affiliate_click` on blog post paths: **147 clicks on 81 posts over the 15 live days (10-27 → 11-10) = 9.8/day**. The bar is ≥ 5/day.
- Daily clicks ranged from 4 to 17. Only 11-01 and 11-08 (both Sundays, 4 each) fell under 5.
- Store id `musthavemod04-20`.
- Amazon Associates earnings are operator-only and **still not supplied** (asked 10-27, 11-07 and 11-09).

So the clicks leg passes, the dollars leg cannot be graded, and neither counts toward the $155 floor. The block stays. It lives in operator-owned `functions.php` under the `mhm_affiliate_pack_block` marker, so changing it would be Tier 2 anyway.

## (d) Patreon: the +$40 is a counter artefact, not joins

| Source | Paid | $/mo gross |
|---|--:|--:|
| Public page / tier `patron_count`, 11-09 | 55 (16×$1, 36×$3, 3×$5) | $139 |
| Public page / tier `patron_count`, 11-11 | **69** (18×$1, 47×$3, 4×$5) | **$179** |
| Members API `patron_status = active_patron`, 11-11 | **54** (16×$1, 35×$3, 2×$5, 1×$8) | **$138.50** |
| Members API, E40 read 09-19 | 54 | $138.50 |

- The API sees 6 joins and 14 cancels in November so far (net −8), plus 19 declined patrons.
- The +14 sits only in Patreon's per-tier counter. That counter also disagrees with the API on free members (6,658 vs 6,429), so it is not a count of active payers.
- The real paid base is flat at 54 / $138.50.
- **Consequence:** the scoreboard headline "non-ad $179.00/mo" overstates metric #2 by $40.50 (+29%). It should read from the Members API while `PATREON_*` creator tokens work. That fix is a Tier 1 scoreboard change and is queued as the next move, not done here.

## (e) November non-ad forecast

- Patreon is about **$138.50** on the API basis, with November net −8.
- Impact is $0 (killed).
- Amazon is unmeasured, so it counts as $0.
- Total ≈ **$139/mo**. That is **−$16 under the $155 floor and −$111 under the $250 line**.
- Every lever that could close the gap is Tier 2, and each has been declined or has lapsed: Q4 closed, Q37 lapsed, Q36 dropped, sponsorship never approved.

## (f) Decision

1. **E134 Impact leg: KILL → E13.** No code change.
2. **#391 Amazon block: KEEP on clicks (9.8/day ≥ 5).** Earnings are NOT MEASURABLE until the operator supplies Amazon Associates earnings for `musthavemod04-20`, 10-27 → 11-30. Re-grade at the December read. If earnings are $0 on ≥ 300 clicks, propose removal as Tier 2.
3. **Patreon headline:** treat $179 as an artefact. The real base is $138.50. Next Rio move (T1): source the scoreboard's paid count from the Members API, with the public page as fallback only.

— Rio, Product & Revenue
