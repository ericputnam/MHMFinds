# Pinterest read-back — 2026-09-20 (Pip, Distribution) · E66

**Question:** the 09-19 rollback of E46/E56 rests on "Pinterest sessions fell every
day after the revivals". Where, exactly, did the apex host lose sessions, and does
the loss sit on the pins the revivals added?

**Window:** GA4 2026-09-12 → 2026-09-18 vs 2026-09-05 → 2026-09-11 (the scoreboard's
window). Filter `sessionSource` CONTAINS `pinterest` (the scoreboard's own mapping,
`funnel-scoreboard.ts:188`). Daily series 2026-08-29 → 2026-09-19 by `hostName`.
Read-only: GA4 Data API, one `check-pinner.sh` run, one read-only Supabase select
through `revive-stranded-pins.py`'s own `fetch_stranded()` (no `--apply`, no dry-run
plan, nothing written). No pins were scheduled, re-dated or deleted today.

---

## Decision rule, pre-committed before the per-path read

> If the ex-holiday, same-weekday decline is concentrated on destinations that
> received revival pins (their WoW worse than the non-revived remainder by ≥3 pts),
> the rollback premise stands: no revival package, park the stranded pool until Q11.
> If the revived destinations did no worse than the remainder, the premise is
> unproven: write the sessions-ranked slice as a Tier 2 package (smaller than E46/E56)
> and pre-commit a read on the zero-pin fortnight the rollback creates.

The second clause fired (§2). Both outputs are below.

---

## 1. 58 % of the headline decline is Labor Day, not Pinterest

Same-weekday, `pinterest` source, both hosts:

| Weekday | 08-29 → 09-04 | 09-05 → 09-11 | 09-12 → 09-18 | Δ vs prior week | Δ vs two weeks ago |
|---|--:|--:|--:|--:|--:|
| Sat | 9,822 | 10,608 | 10,610 | +0.0 % | +8.0 % |
| Sun | 11,072 | 10,975 | 10,876 | −0.9 % | −1.8 % |
| Mon | 8,948 | **10,372 (Labor Day)** | 8,300 | **−20.0 %** | −7.2 % |
| Tue | 8,511 | 8,451 | 7,995 | −5.4 % | −6.1 % |
| Wed | 7,982 | 8,145 | 7,683 | −5.7 % | −3.7 % |
| Thu | 8,198 | 8,078 | 7,792 | −3.5 % | −5.0 % |
| Fri | 8,927 | 8,712 | 8,543 | −1.9 % | −4.3 % |
| **7d** | 63,460 | **65,341** | **61,799** | **−5.4 %** | −2.6 % |

- Monday 09-07 was a US holiday and read like a Sunday (10,372 vs 8,300 the Monday
  after and 8,948 the Monday before). That one pair is **−2,072 of the −3,542 WoW
  decline — 58 %**. Ex-Monday the channel is **−2.7 %** (apex −4.0 %, `blog.*` +0.5 %).
- Saturday 09-19 — the first day after the rollback, and still inside the revival
  volume because pins take weeks to earn sessions — read **10,608**, identical to
  Saturday 09-12 (10,610) and Saturday 09-05 (10,608).
- Tue–Fri means: 8,404/day (09-01→04) → 8,346 (09-08→11, −0.7 %) → 8,003 (09-15→18,
  −4.1 %). The weekday step down *is* in the revival week; the next section tests
  whether it sits on the revived pins.
- The scoreboard's `pinterest` line (55,376, −7.0 %) is the same data under a
  narrower channel mapping; every number above is like-for-like within its own filter.

## 2. The apex loss is not on the revived destinations

Apex host only, ex-Monday (dayOfWeek ≠ 1) so the holiday cannot leak in. "Revived"
= the 62 distinct apex paths in the E26/E46/E56 ledgers.

| Apex landing-page group | prev (ex-Mon) | cur (ex-Mon) | Δ |
|---|--:|--:|--:|
| Revived destinations (E26+E46+E56) | 5,746 | 5,776 | **+0.5 %** |
| Everything else | 29,738 | 28,800 | −3.2 % |
| Homepage `/` | 1,077 | 705 | **−34.5 %** |
| Pregnancy pair (facet ↔ article URL swap, E21) | 627 | 572 | −8.8 % |
| `(not set)` (0 pageviews/session) | 1,586 | 1,427 | −10.0 % |
| **All apex ex-Monday** | 38,774 | 37,280 | −3.9 % |

Full-week, same split: revived −4.8 %, non-revived −7.2 %; by slice E26 −9.8 %
(9 paths), E46 −5.3 % (20), E56 −3.3 % (36). Whichever way it is cut, the pages
that received revival pins declined *less* than the pages that did not.

The largest single apex "loser" in the raw list is `/games/sims-4/pregnancy-mods/`
732 → 90 (−642) — but `/sims-4-pregnancy-mods/` went 3 → 578 (+575) the same week.
That is Sage's 09-12 un-consolidation moving the URL, net −67, not a loss.

The one concentrated, unexplained loss is the **homepage as a Pinterest landing
page: −372 sessions ex-Monday (−34.5 %)**, on `blog.*` too (119 → 87). Sessions
that land on `/` from Pinterest are profile-link or root-pin clicks, which GA4
cannot separate; this is the first question for the Pinterest Analytics API
(operator-queue item for API scope, already listed as a T2 ask).

**Verdict on the rollback premise:** unproven. The decline is (a) mostly a holiday
comparison, (b) otherwise diffuse across pages the revivals never touched, and (c)
absent on the pages they did touch. It is *also* true that the Tue–Fri step-down
coincides with the volume increase, and GA4 cannot see Pinterest-side distribution
(impressions, saves, outbound clicks per pin), so this read cannot rule out an
account-level penalty — it can only say the sessions do not show one. The rollback
stands (it is the operator's call under SD-10); what changes is that the *next*
decision should be made on Pinterest-side data, not on the −7.0 %.

## 3. Cost side: the queue is empty from 09-24

`check-pinner.sh` 10:51Z: `[OK] last pin created 2026-09-20 08:00Z · 40 pins in 24h,
279 in 7d`; `[WARN] inventory runway ≈ 0.8 days (30 rows ÷ 39.9/day; 0 schedulable
today)`; 1,457 stranded, 1,487 unposted; token OK, refresh TTL 350 d. The 30 rows are
E26's residue (10/day, 09-21 → 09-23). After 09-23 the account posts **0 pins/day**
until the writer plugin runs (Q11, approved 09-17, still awaiting the operator's
scp) or a slice is approved. Sessions cost of a silent week: **source unavailable**
— the July 6 outage is described in the fact base only as "traffic dropped", no
number is on the repo.

This also creates the cleanest test of pin → session coupling the team has had, and
E66 pre-commits its read (§5) so the silence is measured rather than argued about.

## 4. Tier 2 package — E66 slice, ranked by sessions (NOT executed)

Read-only select of the 1,000 newest stranded rows (PostgREST page cap; 1,457 exist):
963 rows across 97 apex destinations, 37 `blog.*` rows (excluded by host).
Joined to this week's apex Pinterest sessions per destination:

- **55 destinations with 0 sessions/7d hold 466 rows (48 % of the pool).** The
  recency allocator in `revive-stranded-pins.py` would pin these first.
- 25 destinations with ≥ 50 sessions/7d hold 271 rows; 15 with ≥ 100 hold 134.

Top of the ranked pool (sessions 7d cur / prev · stranded rows · destination):

| cur | prev | rows | destination |
|--:|--:|--:|---|
| 469 | 540 | 1 | `/sims-4-dress-cc/` |
| 448 | 436 | 7 | `/sims-4-long-hair-cc/` |
| 447 | 257 | 23 | `/sims-4-cc-finds-for-april/` |
| 405 | 410 | 2 | `/black-sims-4-cc/` |
| 376 | 385 | 6 | `/best-sims-4-hair-cc/` |
| 352 | 420 | 33 | `/sims-4-skin-overlay/` |
| 329 | 387 | 2 | `/best-sims-4-wedding-cc/` |
| 303 | 239 | 23 | `/sims-4-couple-poses-2/` |
| 302 | 329 | 16 | `/sims-4-cc-finds-for-november/` |
| 183 | 186 | 1 | `/sims-4-cc-finds-for-march-2026/` |
| 168 | 173 | 6 | `/sims-4-winter-clothes-cc/` |
| 151 | 168 | 4 | `/sims-4-vampire-cc/` |
| 127 | 115 | 8 | `/sims-4-tv-cc/` |
| 93 | 123 | 16 | `/sims-4-toddler-cc/` |
| 91 | 90 | 31 | `/sims-4-plants-cc/` |
| 86 | 132 | 25 | `/sims-4-furniture-cc/` |

Full ranked list with row ids: `reports/funnel/pin-revival-package-2026-09-20.json`
(25 destinations ≥ 50 sessions/7d, 271 row ids, apex host only, no dead-URL or
board-section checks run yet — those run in the dry run on approval).

**Proposed slice (E66-A):** 7 pins/day × 14 days = 98 rows — half of E46/E56 — drawn
from the ≥ 50-session destinations only, 1 pin per destination per day, the existing
board cap unchanged, `blog.*` excluded. That is ~+7/day on top of the writer's own
queue once Q11 restores it, and +7/day on top of zero until then.

**Reply strings (one line, nothing else needed):**
- `approve E66 7/day` — Pip ships a `--ids-from reports/funnel/pin-revival-package-2026-09-20.json --per-day 7` selection mode on `revive-stranded-pins.py` (Tier 0, dry-run default, ~40 lines + tests), dry-runs it in the digest, applies only that file, ledger `pin-revival-<date>.json`, rollback one command.
- `approve E66 14/day` — same, 196 rows (exhausts the ≥ 50 pool in ~2 weeks).
- `reject E66` — pool parked; the queue stays empty until Q11 is applied.
- `E66 after Q11` — park until the writer plugin is running, then re-pitch once.

Recommendation: `approve E66 7/day` **after** the 09-28 first read of §5 confirms
the zero-pin week is costing sessions; or `E66 after Q11` if the operator prefers
the writer's queue to be the only source. Silence = nothing happens; re-pitch once
on 09-27, then drop.

## 5. E66 measurement (pre-committed)

- **Metric:** Pinterest sessions (both hosts, `sessionSource` contains `pinterest`),
  Tue–Fri daily mean, same-weekday, holiday-free.
- **Baseline:** 8,003/day (09-15 → 09-18; apex 5,518, `blog.*` 2,486), dated 2026-09-20.
- **Treatment:** pins created/day falls from ~40 to 10 (09-21 → 09-23) to 0 (09-24 →)
  by the operator's rollback, unless Q11 or E66-A intervenes — either is recorded in
  the read.
- **Read:** first look 2026-09-28 (Tue–Fri 09-22 → 09-25; only 2 days at zero); final
  2026-10-05 (Tue–Fri 09-29 → 10-02, fully inside the zero-pin regime).
- **Keep-if / decision:** ≥ 97 % of baseline (≥ 7,763/day) at the final read →
  pin→session coupling on a 2-week horizon is weak; revivals are not urgent, E66-A
  stays parked and the stranded pool is worked only through Q11. < 90 % (< 7,203/day)
  → coupling is real; E66-A leads the digest with the sessions/day being lost.
  In between → extend one week.
- **Also graded on 09-28:** the homepage landing loss (§2) — if `/` Pinterest sessions
  recover without any change, it was Pinterest-side noise; if not, it goes to the
  Pinterest Analytics API ask.

## 6. Shipped alongside this read (Tier 0)

`check-pinner.sh` step 2 and `pinner-liveness-lib.ts` told whoever read the WARN to
"revive stranded rows" and called re-dating "a Tier 1 cadence change". Both now say
the refill is the writer plugin (Q11) or an operator-approved slice (Tier 2, SD-10),
and that `--apply` is never an agent's move. No behaviour or threshold changed; the
`below the N-day floor` prefix the tests key on is intact.

## Grades due

- **E15 pins leg (read 09-21):** superseded by E1's KILL (recorded in #121) — the
  two catalog pins never reached 10 Pinterest sessions/7d from the pin itself.
- **E46 / E56 cadence reads (09-21):** void — rolled back by the operator 09-19; the
  cadence they were meant to hold (≥ 20 / ≥ 30 pins/day) is now the thing E66 measures
  the absence of.
- **E41 (read 09-20):** KEEP, unchanged from #121 — today's scoreboard is the 4th
  durable one with `pinsCreated24h > 0` (40) and no pinner 🔴.

— Pip, Distribution
