<!-- context budget: 16000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Operator Queue

The only file the operator has to touch. Agents append packages; the operator
replies inline. Quinn processes replies every morning and removes closed items.

**How to reply:** edit the `Reply:` line, or just tell Claude "approve 2",
"reject 4 because …", "stop 3". Silence on a Tier 1 item = it ships when the
window closes. Tier 2 items older than 7 days get one smaller re-pitch, then
are dropped and logged.

**Operator directive 2026-09-12:** waiting on a reply is never a reason to skip
work — ship every Tier 0/1 move regardless of open Tier 2 items; bring only
board-level decisions and true blockers here (see `autonomy.md`, "Operator
directive 2026-09-12"). Replies given in chat are recorded and executed the same
day.

---

## Tier 1 — shipping unless you say stop

| Tier 1 | Owner | What | Reply to block |
|---|---|---|---|
| — | — | Nothing queued today. PR #195 (Nova, E122) merged 2026-09-28 after its window closed — see the digest. | — |

## Tier 2 — needs your decision

### Q11-b · The writer cron inserts *drafts*, not scheduled pins (Pip, E82, 2026-09-23) — **re-pitched 2026-09-28, one word**
- **Re-pitch (Pip, 09-28):** four floor top-ups in four mornings (09-25/26/27/28) each added the 21-row maximum, +0.57 d of runway, against a ~0.6 d/day drain: runway read 1.83→2.44, 1.75→2.33, 1.59→2.16, 1.34→1.89 d and has never reached 3.0. The Q12 revival slice (7/day, 09-24→10-04) runs dry 2026-10-05; today's ranked pool is 152 ids over 25 destinations, about seven more top-ups at 1/URL/day. Only the writer's cadence changes the slope. Ask: approve.
- **Why:** all 341 rows the cron inserted since 09-21 carry `Post Date = 2025-01-01` (the plugin's "unscheduled" sentinel), so inflow to the poster's 14-day window is **0/day**. Package: `reports/funnel/drafts/q11-writer-post-date-2026-09-23.md`.
- **Approve one:** (1) **`--schedule-per-day 12`** flag in `posts_2_supabase_server.py`, cron passes it, never past +14 d, 1 per URL per day — Pip writes the patch, you scp (preferred); (2) the writer presses the plugin's schedule step on the 341 rows; (3) `pin-runway-topup.py` promotes sentinel rows at ≤7/day. Reply **"approve q11 1"** (or 2 / 3). Read: writer-dated rows/day 0 → ≥12; pins/24h ≈25 → ≥37 within 7 d of the change.
- **History:** Q11 server steps 4–8 are done (files + `30 5` cron verified 09-21). Full status lines in `archive/operator-queue-2026-09.md`. Silence to 10-05 = dropped and logged; the daily 21-row top-up continues until then.

### Q16 · One Patreon post in your voice (Rio, E88, 2026-09-22) — **silence = dropped 2026-09-29 (tomorrow), no re-pitch**
- Q4 gate re-read 09-22: **HOLD** — 0 of 54 paid patrons connected (join pace is fine). The cheapest lever is one post to existing patrons: *"Your $3 now skips the download timer — one tap to switch it on"*, linking `/go/cmim9obub00mzoxy7av4vowyr/`. Draft: `reports/funnel/drafts/patreon-connect-post-2026-09-22.md`. Read D+7 after posting; keep if ≥18 of 54 connect. Reply **"posted patreon <date>"**.

### Q17 · Sponsorship: price + send (Rio, E89, 2026-09-23)
- Media kit from real numbers (`reports/funnel/drafts/sponsorship-media-kit-2026-09-23.md`): 354,348 sessions 28d; hub slot 6,300 pv/mo; homepage 17,000. Proposed **$300/mo hub slot, $750/mo site-wide**; 2 cold emails + 1 follow-up drafted in your name. Read 2026-10-07; keep if ≥10 sent AND ≥1 interested reply. Reply **"approve sponsorship"** or a price.
- **Re-pitch on 09-30 if no reply (Rio, 7-day rule):** skip the price decision — send only the $300/mo "presented by" hub-slot email to the 2 drafted prospects. Reply **"send hub"** or a number. Silence to 10-07 = dropped and logged.

### Q18 · PR #144 weekly newsletter cron, flag off (Cass, E78) — **re-tiered to Tier 2 on 09-23**
- The PR edits `vercel.json` (adds a cron schedule); Vercel config is operator-only in `autonomy.md`, so Quinn did not merge it when its Tier 1 window closed. It merges clean and sends nothing until the flag is on. Reply **"approve 78"** and Quinn ships it via the ship protocol. **Re-pitched smaller on 09-30 if no reply** (7-day rule): the cron line alone, flag stays off; silence after that = dropped and logged.

### Q8 · Pinterest poster poison-row hardening (Pip, E36) — **APPROVED 09-12, deployed 09-21 with Q11** (MHMUtils `7037ffe`). Nothing left for you; closes with Q11-b.

### Q4 · Patreon tier relaunch — package ready (Rio, 2026-09-04) — **1 of 3 steps done**
- 09-28 read (E108/E125, API 09-27): 55 paid ≈ $153.50/mo, joins 7d 3, cancels 1 (since 09-08: 13 joins / 2 cancels); connected 0 of 55, linked 83 — still HOLD on the connected leg; the two dashboard steps are unchanged.
- Probe 09-25: tiers renamed 04:54Z (Espresso Shot $1 ×10, Cappuccino $3 ×42, Large Latte $5 ×3) while the gate read HOLD; $1 tier still `published=true`; welcome note not observable. Rio's E108 watches cancels (revert copy if >16/mo pace, read 10-09). The two dashboard steps are in the checklist below. Gate re-read 09-22: HOLD (see Q16). Full status history in the archive.

### Q5 · Site membership via Patreon OAuth (Rio, E19/E24) — **SHIPPED 09-07/09-08**, env vars live in Production. Read 2026-10-07. Nothing for you.

### Q6 · Un-consolidate the pregnancy-mods + y2k-cc pairs (Sage, E21) — **SHIPPED 09-12**; one cache purge left (checklist below).

Q10 (re-permission day-3, Cass/E54) **dropped 2026-09-28** under the 7-day rule (filed 09-16, re-pitched smaller 09-24, no reply); E54/E68 grade 09-30 on the two batches that went; a later "go repermission day3" still executes as written. 09-24: Q14/Q15 triage memos (Nova, E79/E80) landed on `main` via the daily PR (`reports/funnel/triage/`), PR #141 closed. Two incidents today, both closed by 10:21: #168 build error (fixed forward by #171) and a verify that promoted an older deploy over a newer one (Quinn rolled back at 10:11); `[ops]` PRIORITY 1 for 09-25 is the newer-than check. Next free experiment ID: E102. Renumbering from the 09-21 parallel batch applied 09-22/23: E75=#140, E76=#142, E77=#139, E78=#144, E79/E80=#141, E81=#143 (full note in the archive). Q9 (PR #17 video-first ad slot) closed 09-22 unmerged; PR closed. Next free experiment ID: **E134** (E127–E133 assigned 09-28).

## Operator-only actions (no decision needed, nobody else can do them)

- **Q4 step 1, 2 of 3 still yours (~2 min, Patreon dashboard):** unpublish the $1 "Espresso Shot" tier (renamed from "Support Tier" 09-25 04:54Z; 10 patrons, still `published=true` on 09-25) and paste the welcome note from `reports/funnel/drafts/patreon-welcome-note-2026-09-09.md` into the $3 "Cappuccino" tier (renamed 09-25; perk line present, welcome note not observable).
- **`NEXT_PUBLIC_SITE_URL` (~1 min):** the operator-did probe has reported it missing from Vercel **Production** every morning since 09-17 (13 mornings running). Vercel → Settings → Environment Variables → Production, add `NEXT_PUBLIC_SITE_URL=https://musthavemods.com`; reply "done siteurl".
- **BigScoots 301 blog.* → apex (Q13, Pip 09-21, Tier 2 infra):** package is PR #143 (open, Tier 2); the team's half (apex Post URLs in the writer, host fix in the poster) shipped with Q8/Q11.
- **BigScoots page-cache purge for Q6 (~1 min):** `wp bs_cache purge_cache` (site-wide, or `--urls=` the two un-consolidated articles). Until it runs the articles keep serving the old facet canonical from cache, so Google cannot see the change.
- **GA4 (~1 min, Rio 09-12):** Admin → Custom definitions → event-scoped custom dimension `source` on event parameter `source`. Until it exists the `newsletter_signup`/`patreon_click` by-source split cannot be queried via the API.
- **GSC (~2 min, Sage 09-12):** URL Inspection → **Request indexing** on `https://musthavemods.com/games/sims-4/hair-cc/` and, after the cache purge above, on `/sims-4-pregnancy-mods/`, `/sims-4-y2k-cc/`, `/games/sims-4/pregnancy-mods/`, `/games/sims-4/y2k-cc/`; then Sitemaps → resubmit `sitemap.xml` (last submitted 04-22; today's `/sitemap-creators.xml` and `/games/sims-4/halloween-cc/` are new). The service credential returns "Insufficient Permission" on `submit_sitemap`, so neither is automatable.

Resolved/closed items (Q9 closed 09-22, E74 shipped 09-21, evening-check item closed 09-22, Q12 applied, Q1 shipped, Q3 closed, and the last-30-days closed log) plus the full dated status history of every open item live verbatim in `archive/operator-queue-2026-09.md`. The file as it stood before the 2026-09-23 rewrite is appended there in full.
