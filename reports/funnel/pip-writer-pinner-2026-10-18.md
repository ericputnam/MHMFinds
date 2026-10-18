# E230 — "Pinner writer 🔴" diagnosis (Pip, 2026-10-18, Tier 0)

Scoreboard 10-18 10:3xZ: `🔴 Pinner writer: newest writer-attributed row queued 2026-10-15 10:30Z (72.1 h ago) · 0 inserted in 24h, 92 in 7d · runway 3d — over the 72h floor, the writer looks dead`.
Flag source: `assessWriterLiveness` in `scripts/agents/pinner-liveness-lib.ts` (red > 72 h since the newest `Wordpress Post ID`-attributed row by `created_at`); mirror in `scripts/agents/check-pinner.sh` step 2b.

## 1. Decision rule (written before the reading)

- **R1 — is the insert step dead or idle?** The writer plugin inserts queue rows per published article. The flag is a **FALSE ALARM** if (i) every WP post published since the Q11 deploy (2026-09-21) has a writer batch whose `created_at` is on the same UTC day, and (ii) no post has been published since the newest writer row. It is **GENUINELY DEAD** if any post published ≥ 26 h ago has 0 writer rows. Counting is by `created_at` only — `Post Date = 2025-01-01` is the plugin's waiting state (Q11-b), never staleness.
- **R2 — does the 72 h floor pass on an ordinary weekend?** Over the last 4 weekends (09-26/27, 10-03/04, 10-10/11, 10-17/18), count scoreboard readings where hours-since-newest-writer-row > 72 with **no post in between** — those are false reds by construction.
- **R3 — is anything actually dead?** Pinner: Pinterest `created_at` ≤ 36 h. Poster cron: `Is Posted` flips on rows dated 10-16/17/18. Dating step (23:00 banner cron → `update_supabase_entries`): writer rows carrying a real `Post Date`, posted/total. The BigScoots cron logs and the plugin's own schedule table are **not readable** from here (plugin REST is POST-only behind `permission_check`); they are reported as *unknown*, never as a verdict.
- **Decision:** (a) R1 false alarm AND pinner alive → `[pip→ops]` inbox line proposing a publish-keyed flag, 🔴 declared a false alarm. (b) R1 finds an unmatched post → Q31 package with the cost of silence.
- E181 grade rule (pre-registered 10-11): Pinterest sessions 7d to the 10 treated destinations, treated WoW ≥ site Pinterest WoW, same GA4 definition (`sessionSource` contains "pinterest", `landingPage` path), baseline re-pulled.

## 2. Reading (read-only: Supabase `n8n_pinterest_posts`, WP REST `date_gmt`, GA4 437117335, Pinterest API via the scoreboard)

**R1 — insert step.** 22 WP posts published 09-13→10-18 (`date_gmt`). 0 of the 5 posts 09-14→09-20 have writer rows (the pre-Q11 dead period, as expected). **17 of 17 posts since 09-21 got a same-UTC-day writer batch**, lag 10 min (10-12 09:15Z → 09:25Z) to 6.8 h (10-15 03:42Z → 10:30Z); 13 of 17 batches land at 10:30Z. **0 of 14 non-post days since 09-21 have any writer insert.** Newest post: 2026-10-15 03:42Z `sims-4-cowboy-hat-cc` (the scoreboard prints "2026-10-14" because it reads WP's site-local `date`); its 26 rows were inserted 10-15 10:30:09–11Z (ids 12150–12175). Posts published since that batch: **0** (none on 10-16, 10-17, 10-18). 72.2 h of silence at 10:43Z = 72.2 h without a publish. **R1 = false alarm.**

**R2 — weekends.** Gaps > 24 h between writer-insert days since 09-21: 7; three are ≥ 70 h: 09-29→10-02 **71.9 h** (Wed/Thu, no post), 10-09→10-12 **70.9 h** (Fri→Mon), 10-15→now **72.2 h** (Fri+weekend). Scoreboard readings: 09-27 Sun 24.1 h (the 🔴 that day was the pre-E141 runway override); 10-04 Sun 29.6 h 🟡; 10-11 Sun 52.5 h 🟡 → 10-12 Mon 0.1 h 🟢 only because Monday's post + batch (09:25Z) beat the 10:3xZ run by ~1 h; 10-17 Sat 48.1 h 🟡 → 10-18 Sun **72.2 h 🔴**. So: last 4 weekends = 1 false red (today), 1 near-miss (10-12, margin 1.1 h), 2 warns. The writer publishes Mon–Fri plus 3 of 5 Saturdays and never on Sunday (22 posts / 35 d), so **any Friday without a post makes the Sunday read ≥ 72 h**, and any two post-free weekdays make the third-day read ≥ 72 h.

**R3 — dead checks.** Pinner alive: Pinterest `created_at` 10-18 07:00Z, 8 pins/24 h, 86/7 d, 151/14 d. Poster cron alive: rows dated 10-16/10-17/10-18 flipped `Is Posted` (7 / 34 / 7). Dating step alive but sparse: writer rows with a real `Post Date` since 09-21 = 227, **227/227 posted** (last batches: 10-13 halloween-mods 11/11, 10-15 1/1). Cron logs / plugin schedule table: unknown (not readable without the server or WP admin).

**The real gap is the dating step, not the insert step.** Of 745 writer rows created since 09-21, **518 (69.5%) still sit at the placeholder**: every batch since 10-05 (trench-coat 28, blanket 30, arm-warmers 25, leg-warmers 30, y2k 26, halloween-cc-finds 32, halloween-loading-screens 22, cowboy-hat 26 = **219 rows**, 3–13 days waiting) plus four older ones (autumn-houses 24, cottage-houses 28, fall-outdoor 20, fall-poses 36 = 108). A writer row gets its date only when the writer's banner pin for that article is scheduled in the WP plugin for that day (`daily_pin_poster_server.py` 23:00 cron → `update_supabase_entries(... scheduled_date=today)`), i.e. a human step per article. In the last 14 d the poster posted **29 writer rows vs 181 pool/top-up rows**. That is Q28's subject (drops 10-21) — numbers added there, no new queue item.

**Side observation (not acted on):** rows dated 2026-10-17 posted = 34 (vs the ≤7/date top-up cap and the 10.7/day rate); none are Pip's ledger rows — Rowan's E228 `--ids` pins. Quinn to read.

**Top-up gate (tool, dry run 10:5xZ):** inventory 32 ÷ pinterest-14d 10.71/day = **2.99 d ≥ 2.0** → no top-up. Inventory 10-19..10-23 = 7/7/7/7/4, all Pip top-ups, 0 writer rows.

## 3. Decision — (a) false alarm; propose a publish-keyed flag

Keep the signal, change the clock: `assessWriterLiveness` should take `postsPublishedSinceLastInsert` (WP posts with `date_gmt` > newest writer `created_at`; `funnel-scoreboard.ts` already fetches `wp.data`) and `hoursSinceOldestUnmatchedPost`. Level: 🔴 only when an unmatched post is ≥ 72 h old, 🟡 at ≥ 26 h, else 🟢 with "idle — no post since <date_gmt> (<n> h), last batch <n> rows". Replay: 🟢 on all 16 scoreboard readings 09-25→10-18 (every post matched same day), 🔴 from 09-15 on the pre-Q11 dead week (5 posts, 0 rows). `check-pinner.sh` step 2b mirrors it in the same PR (SD-11 plumbing → Ops).

## 4. E181 grade (read 10-18)

GA4, `sessionSource` contains "pinterest", `landingPage` (no trailing slash — see the Sage 10-11 inbox line), 10 treated destinations: `/sims-4-wedges-cc` 965→896, `/sims-4-cc-finds-for-april` 767→847, `/sims-4-urban-tattoos` 566→520, `/sims-4-male-urban-hair` 202→206, `/sims-4-gshade-presets` 161→141, `/sims-4-plants-cc` 117→145, `/sims-4-lookbooks` 119→81, `/sims-4-urban-hair-cc` 99→99, `/sims-4-graphic-tees` 101→74, `/sims-4-maxis-match-hair` 75→78.
- Recorded base 10-03→10-09 re-pulls **3,115** (= the row's Before).
- Treated 10-11→10-17 **3,087** vs prior 7d 10-04→10-10 **3,172** → **−2.7%**; 4 of 10 up, 1 flat, 5 down.
- Site Pinterest same windows **55,492 vs 56,091 → −1.1%** (apex 55,457 / blog.* 35; prior 56,021 / 70).
- Keep-if "treated WoW ≥ site WoW": **−2.7% < −1.1% → NOT MET** (gap −1.6 pts). 0 writer rows touched; ≤7/date held (7×10-12/13/14).
- Verdict: KILL as a lift claim — 7 ranked pins/date do not move a 3,100-session/7d destination set above the site line. The floor keeps running under the SD-10 standing approval as a runway floor, not a lift lever; E188 (read 10-19) and E202 (10-21) decide whether the ranker changes.

— Pip, Distribution
