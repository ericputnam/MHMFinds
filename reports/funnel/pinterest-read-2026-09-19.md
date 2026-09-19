# Pinterest read-back — 2026-09-19 (Pip, Distribution)

**Window:** GA4 2026-09-11 → 2026-09-17 (the scoreboard's finalized 7d), prior week
2026-09-04 → 2026-09-10. **Source filter:** `sessionSource` CONTAINS `pinterest`
(39 distinct source values: `Pinterest`/organic 52,289 + `pinterest.com`/referral
2,305 + 37 country subdomains 631). That is **61,423 sessions**, wider than the
scoreboard's `pinterest` channel line of 55,318 — the scoreboard's channel mapping
does not fold in the country subdomains and part of the referral split. Both
numbers are right for their own definition; this file uses the wider one
throughout and every comparison below is like-for-like inside it.

Read-only: GA4 Data API + one `revive-stranded-pins.py` **dry run** (wrote nothing)
+ one `check-pinner.sh` run. No pins were scheduled, re-dated, or deleted today.

---

## Decision rule, pre-committed before the matched-path read

> If `blog.musthavemods.com` is ≥15% of Pinterest sessions **and** its engagement
> rate on the *same paths* is ≥3 points below the apex host, the decision is
> "stop sending pins to `blog.*`" and Q8/Q11 get escalated with the session number
> attached. Otherwise the host split is cosmetic and the decision reverts to
> selecting the next revival slice by sessions-per-destination.

Both clauses fired. Both decisions are recorded below — the host finding is an
escalation of work already packaged and approved (Q11/Q8), and the *new* decision
this read-back commits the team to is the slice-selection change (§3).

---

## 1. Where the 61,423 Pinterest sessions land: a third are on the wrong host

| Host | 7d sessions | prior 7d | Δ | share |
|---|--:|--:|--:|--:|
| `musthavemods.com` (apex, canonical) | 41,941 | 46,687 | **−10.2%** | 68.3% |
| `blog.musthavemods.com` (proxied duplicate) | 19,482 | 19,130 | **+1.8%** | **31.7%** |
| total | 61,423 | 65,817 | −6.7% | |

Two things worth saying out loud:

1. **31.7% of Pinterest sessions land on the proxied duplicate host.** The prior
   estimate for this was "12% of stranded rows are on `blog.*`" (E46, 09-14) —
   that was a count of *queue inventory*, and it badly understated the live
   traffic, because the already-posted historical pins are far more `blog.*`-heavy
   than the queue is.
2. **The entire WoW Pinterest decline is on the apex host.** Apex −4,746 sessions;
   `blog.*` +352. Whatever is decaying, it is not decaying on the duplicate — so
   the `blog.*` share is *growing*, not shrinking, and will keep growing until the
   generator is patched.

## 2. Same article, worse session: the matched-path comparison

Comparing hosts in aggregate confounds with page mix, so this is restricted to the
**10 paths that appear on both hosts** in the top-120 Pinterest landing rows.
Same content, same week, same channel — only the host differs.

| Path | apex sess | apex eng.rate | apex pv/s | blog sess | blog eng.rate | blog pv/s | pv/s Δ |
|---|--:|--:|--:|--:|--:|--:|--:|
| `/sims-4-belly-piercing/` | 171 | 98.2% | 1.719 | 549 | 77.6% | 1.217 | −29.2% |
| `/sims-4-eyebrows-cc/` | 151 | 99.3% | 1.735 | 492 | 78.3% | 1.376 | −20.7% |
| `/sims-4-male-sim-download/` | 479 | 81.8% | 1.418 | 420 | 70.7% | 1.179 | −16.9% |
| `/sims-4-melanin-skin/` | 416 | 83.2% | 1.990 | 267 | 77.2% | 1.551 | −22.1% |
| `/sims-4-couple-poses-2/` | 291 | 82.5% | 1.395 | 187 | 70.1% | 1.230 | −11.8% |
| `/best-sims-4-wedding-cc/` | 342 | 81.6% | 1.404 | 171 | 80.7% | 1.158 | −17.5% |
| `/sims-4-coquette-cc/` | 890 | 79.1% | 1.570 | 171 | 83.0% | 1.111 | −29.2% |
| `/black-sims-4-cc/` | 402 | 79.9% | 1.950 | 168 | 73.8% | 1.542 | −20.9% |
| `/sims-4-acne-cc/` | 210 | 81.4% | 1.376 | 138 | 73.2% | 1.210 | −12.1% |
| `/sims-4-wedges-cc/` | 733 | 81.6% | 1.542 | 120 | 91.7% | 1.367 | −11.3% |
| **weighted total** | **4,085** | **82.5%** | **1.603** | **2,683** | **76.8%** | **1.291** | **−19.5%** |

- **Pageviews/session is lower on `blog.*` in 10 of 10 pairs.** A clean sign test
  on ten matched pairs — this is not noise.
- Engagement rate is lower in 8 of 10 (the two exceptions, coquette and wedges,
  are also the two with the smallest `blog.*` samples).
- **Caveat, stated plainly:** this is observational, not randomized. Which host a
  visitor lands on is decided by which pin they clicked, and `blog.*` pins skew
  older, so pin age and audience are confounded with host. The 10/10 consistency
  and the −19.5% magnitude make host the most parsimonious explanation, but this
  read cannot prove causation.

**Pageviews forgone, order of magnitude:** `blog.*` served ≈24,190 pageviews on
19,482 Pinterest sessions (1.2416 pv/s, all devices). At the apex host's all-device
1.4818 pv/s that would be ≈28,870; at the matched-path ratio (0.805) ≈30,050. So
**≈4,700–5,900 pageviews per week** currently do not happen because the pin points
at the duplicate. Converting that to dollars needs Mediavine per-host RPM, which
this read does not have — **handing the dollar question to Rio, not inventing it.**

## 3. THE DECISION: stop allocating revival pins by recency

`revive-stranded-pins.py` selects the **600 newest stranded rows** and then fills
14/day round-robin. That selection is blind to whether a destination earns
anything. Today's dry run (196 rows, 22 destinations) joined to this week's actual
Pinterest sessions:

| Destination | pins the allocator would give it | Pinterest sessions 7d |
|---|--:|--:|
| `/sims-4-modern-furniture-cc/` | **23** (most in the slice) | **1** |
| `/sims-4-urban-hair-cc/` | **22** | 68 |
| `/sims-4-story-ideas/` | **18** | **0** |
| `/sims-4-mods-and-cc-for-a-futuristic-theme/` | 18 | 35 |
| `/sims-4-cc-finds-for-april/` | 17 | 392 |
| `/sims-4-wedges-cc/` | 14 | **773** |
| `/sims-4-plants-cc/` | 14 | 116 |
| `/sims-4-shower-cc/` | 14 | 29 |
| `/sims-4-urban-tattoos/` | 14 | **586** |
| `/sims-4-male-urban-hair/` | 12 | 239 |
| `/sims-4-cas-challenges/` | 10 | 3 |
| `/sims-4-graphic-tees/` | 9 | 49 |
| 10 more at 1–2 pins each | 12 | 165 |
| `/the-emerald-luxe-living-room/`, `/sims-4-urban-lookbook/` | 2 | **0** |

**The three destinations with the largest pin allocation (63 pins, 32% of the
slice) earned 69 sessions between them — 2.8% of the candidate set's 2,451.** The
two best destinations (wedges + urban-tattoos, 1,359 sessions, 55% of the set) get
28 pins, 14%. Recency and earning power are uncorrelated here, and the allocator is
currently anti-correlated with them by accident.

**Decision, executed on the next slice (not today — see §4):** select the candidate
pool by **observed Pinterest sessions per destination**, not by row recency.
Concretely: drop destinations with **0** sessions/7d from the pool outright, and
prefer destinations with ≥50 sessions/7d until the pool is exhausted. Keep the
existing 1-pin-per-destination-per-day and per-board caps untouched — they are the
anti-spam rails and they are correct. This is a `--min-sessions` / GA4-ranked
selection flag on `revive-stranded-pins.py`, Tier 0 (script change, dry-run first).

**Stop:** pinning `/sims-4-story-ideas/`, `/sims-4-modern-furniture-cc/`,
`/sims-4-cas-challenges/`, `/the-emerald-luxe-living-room/`,
`/sims-4-urban-lookbook/`, `/the-sims-4-vs-inzoi/`, `/sims-4-sofas/`
(0–4 sessions/7d each, 56 pins of the proposed slice).
**More:** `/sims-4-wedges-cc/`, `/sims-4-urban-tattoos/`,
`/sims-4-cc-finds-for-april/`, `/sims-4-male-urban-hair/`, `/sims-4-plants-cc/`.

## 4. Why no revival slice ran today

The brief carried a flag threshold of "runway < 10 days". **The script says 3.**
`DEFAULT_LOW_RUNWAY_DAYS = 3` in `scripts/agents/pinner-liveness-lib.ts:161`,
mirrored as `LOW_RUNWAY_DAYS="${PINNER_LOW_RUNWAY_DAYS:-3}"` in
`check-pinner.sh:135` and `PINNER_LOW_RUNWAY_DAYS = 3` in `funnel-scoreboard.ts:536`
(there is a constant-agreement test across the TS/shell boundary). Today's live
read is **8.5 days** (337 rows ÷ 39.9/day) — comfortably above the floor, and the
queue does not exhaust until ~09-27.

Reviving today would also have destroyed the E51 read due 09-25, whose keep rule
requires observing the flag fire *truly* when runway falls below 3 days. Refilling
the queue five days early removes the only chance to test that clause. The right
day for slice four is **~09-23**, with the §3 selection change shipped first.

## 5. Data quality (lever 6)

`(not set)` landing page, Pinterest sessions 7d: **2,424** (1,685 apex + 739
`blog.*`), 3.9% of the channel. Both blocks record **0.0 pageviews/session** and
~6% engagement rate. The 09-02 read labelled this block "~61% real Pinterest app
traffic"; a session with zero page_view events is not a session that read an
article, whatever stripped its referrer. This is a measurement artifact sitting
inside the headline number and it is not growth — flagging it, not fixing it today.

---

## Grades

**E14 — pinner liveness check (`check-pinner.sh`), read due 2026-09-12.**
**KEEP.** Ran clean today, exit 0, all 6 steps `[OK]`. Zero false FAILs across its
life: the only FAIL it ever produced was the 09-05 token 401 (real, recoverable
staleness — E15 fixed the renewal) and the 09-12 🔴 (a true positive, 138
consecutive poster failures on dead board section 5483319435714435392). Its one
real defect was a threshold that could not fire (E20/E51 replaced it), not a false
alarm.

**E15 — token leg, read due 2026-09-14.** **KEEP.** Step 3 `[OK] Pinterest token
valid (via embedded-port token manager)`; step 4 refresh TTL **351 days**
remaining (was 363 on 09-07 — decrementing exactly as expected, 12 days elapsed,
12 days consumed, so the TTL is real and not a cached constant). Token step has
not FAILed on any run since the port shipped 09-07. The pins half of E15
(≥10 Pinterest sessions/7d to makeup-cc + witch-cc) is superseded by E1's KILL:
witch-cc reads 136 sessions/7d this week but from blog-post internal links, not
from its catalog pin.

**E41 — liveness from Pinterest `created_at`, read due 2026-09-20 (read a day
early).** **KEEP on the evidence that exists, with an evidence gap I am not going
to paper over.** The keep rule asks for 0 false 🔴 across 7 scoreboards. Only
**3 of the 6** scoreboards since E41 shipped (09-13 10:57) were ever durably
written — 09-15, 09-16, 09-19 — because the 09-14, 09-17 and 09-18 runs died or
never committed their reports. On all three: **0 pinner 🔴**, `pinsCreated24h`
39 / 47 / 38, all > 0. Today's live `check-pinner.sh` step 1 reads
`last pin created 2026-09-19 11:00Z (0.1 h ago) · 38 pins in 24h, 279 in 7d`. The
kill rule (a 🔴 the poster log contradicts) never fired. The missing observations
are a run-durability failure, not an E41 failure, and the 09-15 flag that *did*
fire was a queue 🟡, which is E51's surface and cannot go 🔴 by construction.
