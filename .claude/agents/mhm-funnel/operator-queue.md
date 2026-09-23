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
| E75 · PR #140 | Pip | `rank-pin-destinations` producer: ranks revival candidates by the sessions their destination earned instead of by row recency (script + tests, no queue write). The 24h window closed 09-22 but the branch conflicts with `main` (registries + `revive-stranded-pins.py`); Pip rebases and Quinn merges **2026-09-24** via the ship protocol. | stop 140 |

## Tier 2 — needs your decision

### Q11-b · The writer cron inserts *drafts*, not scheduled pins (Pip, E82, 2026-09-23) — **one word**
- **What Pip found:** all 341 rows the cron inserted since 09-21 carry `Post Date = 2025-01-01` (the plugin's "unscheduled" sentinel), so inflow to the poster's 14-day window is **0/day**. The only thing feeding the poster is the Q12 slice at 7/day, which runs dry **2026-10-05**. Runway 2.37 d today (top-up floor 2.0 → it did not write). Package: `reports/funnel/drafts/q11-writer-post-date-2026-09-23.md`.
- **Approve one:** (1) **`--schedule-per-day 12`** flag in `posts_2_supabase_server.py`, cron passes it, never past +14 d, 1 per URL per day — Pip writes the patch, you scp (preferred); (2) the writer presses the plugin's schedule step on the 341 rows; (3) `pin-runway-topup.py` promotes sentinel rows at ≤7/day. Reply **"approve q11 1"** (or 2 / 3). Read 2026-09-30: writer-dated rows/day 0 → ≥12; pins/24h 15 → ≥25 by 10-07.
- **History:** Q11 server steps 4–8 are done (files + `30 5` cron verified 09-21; 268 rows live-run by Quinn 00:53Z 09-22; dry-run label fix re-scp'd by you). Full status lines in `archive/operator-queue-2026-09.md`.

### Q10 · Re-permission day-2 batch (Cass, E54, 2026-09-16) — **SENT 09-21; day-3 HELD on the bounce gate**
- **Reply:** go repermission day2 at 7% (09-21, chat). Sent 09-21 11:54Z, `--offset 100` on the frozen anchor, 0 excluded hashes in the slice.
- **Status 2026-09-23 (Cass, E54 + E68 read):** day-2 batch **5 hard bounces / 100 (5.0%, gate 3%)**, 0 of the 7 excluded re-sent, 0 complaints, 2 re-permission confirms total (1.06 per 100 delivered). Day-3 is held by its own rule: Cass adds the 5 new bounce hashes to `lib/services/sendExclusions.ts` first (Tier 0, 09-24), then it needs your **"go repermission day3"**. Recommendation: go at 7% once the hashes are in; kill the leg if day-3 bounces ≥3% again.

### Q16 · One Patreon post in your voice (Rio, E88, 2026-09-22) — **silence = dropped 2026-09-29**
- Q4 gate re-read 09-22: **HOLD** — 0 of 54 paid patrons connected (join pace is fine). The cheapest lever is one post to existing patrons: *"Your $3 now skips the download timer — one tap to switch it on"*, linking `/go/cmim9obub00mzoxy7av4vowyr/`. Draft: `reports/funnel/drafts/patreon-connect-post-2026-09-22.md`. Read D+7 after posting; keep if ≥18 of 54 connect. Reply **"posted patreon <date>"**.

### Q17 · Sponsorship: price + send (Rio, E89, 2026-09-23)
- Media kit from real numbers (`reports/funnel/drafts/sponsorship-media-kit-2026-09-23.md`): 354,348 sessions 28d; hub slot 6,300 pv/mo; homepage 17,000. Proposed **$300/mo hub slot, $750/mo site-wide**; 2 cold emails + 1 follow-up drafted in your name. Read 2026-10-07; keep if ≥10 sent AND ≥1 interested reply. Reply **"approve sponsorship"** or a price.

### Q18 · PR #144 weekly newsletter cron, flag off (Cass, E78) — **re-tiered to Tier 2 on 09-23**
- The PR edits `vercel.json` (adds a cron schedule); Vercel config is operator-only in `autonomy.md`, so Quinn did not merge it when its Tier 1 window closed. It merges clean and sends nothing until the flag is on. Reply **"approve 78"** and Quinn ships it via the ship protocol.

### Q8 · Pinterest poster poison-row hardening (Pip, E36) — **APPROVED 09-12, deployed 09-21 with Q11** (MHMUtils `7037ffe`). Nothing left for you; closes with Q11-b.

### Q4 · Patreon tier relaunch — package ready (Rio, 2026-09-04) — **1 of 3 steps done**
- Probe 09-23: $1 "Support Tier" still `published=true` (9 patrons); $3 tier 41, $5 tier 2; welcome note not pasted. The two dashboard steps are in the checklist below. Gate re-read 09-22: HOLD (see Q16). Full status history in the archive.

### Q5 · Site membership via Patreon OAuth (Rio, E19/E24) — **SHIPPED 09-07/09-08**, env vars live in Production. Read 2026-10-07. Nothing for you.

### Q6 · Un-consolidate the pregnancy-mods + y2k-cc pairs (Sage, E21) — **SHIPPED 09-12**; one cache purge left (checklist below).

Renumbering from the 09-21 parallel batch applied 09-22/23: E75=#140, E76=#142, E77=#139, E78=#144, E79/E80=#141, E81=#143 (full note in the archive). Q9 (PR #17 video-first ad slot) closed 09-22 unmerged; PR closed. Next free experiment ID: **E92**.

## Operator-only actions (no decision needed, nobody else can do them)

- **Q4 step 1, 2 of 3 still yours (~2 min, Patreon dashboard):** unpublish the $1 "Support Tier" (9 patrons, still `published=true` on 09-23) and paste the welcome note from `reports/funnel/drafts/patreon-welcome-note-2026-09-09.md` into the $3 tier.
- **`NEXT_PUBLIC_SITE_URL` (~1 min):** the operator-did probe has reported it missing from Vercel **Production** every morning since 09-17 (12 of 13 names). Vercel → Settings → Environment Variables → Production, add `NEXT_PUBLIC_SITE_URL=https://musthavemods.com`; reply "done siteurl".
- **BigScoots 301 blog.* → apex (Q13, Pip 09-21, Tier 2 infra):** package is PR #143 (open, Tier 2); the team's half (apex Post URLs in the writer, host fix in the poster) shipped with Q8/Q11.
- **BigScoots page-cache purge for Q6 (~1 min):** `wp bs_cache purge_cache` (site-wide, or `--urls=` the two un-consolidated articles). Until it runs the articles keep serving the old facet canonical from cache, so Google cannot see the change.
- **GA4 (~1 min, Rio 09-12):** Admin → Custom definitions → event-scoped custom dimension `source` on event parameter `source`. Until it exists the `newsletter_signup`/`patreon_click` by-source split cannot be queried via the API.
- **GSC (~2 min, Sage 09-12):** URL Inspection → **Request indexing** on `https://musthavemods.com/games/sims-4/hair-cc/` and, after the cache purge above, on `/sims-4-pregnancy-mods/`, `/sims-4-y2k-cc/`, `/games/sims-4/pregnancy-mods/`, `/games/sims-4/y2k-cc/`; then Sitemaps → resubmit `sitemap.xml` (last submitted 04-22; today's `/sitemap-creators.xml` and `/games/sims-4/halloween-cc/` are new). The service credential returns "Insufficient Permission" on `submit_sitemap`, so neither is automatable.

Resolved/closed items (Q9 closed 09-22, E74 shipped 09-21, evening-check item closed 09-22, Q12 applied, Q1 shipped, Q3 closed, and the last-30-days closed log) plus the full dated status history of every open item live verbatim in `archive/operator-queue-2026-09.md`. The file as it stood before the 2026-09-23 rewrite is appended there in full.
