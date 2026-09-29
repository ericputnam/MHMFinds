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

### Q11-b · Writer cron inserts drafts — **CLOSED 2026-09-28 by operator: options 1–3 declined**
- Operator (chat, 09-28): focus on the pins the **writer schedules going forward** and make those the best Pinterest SEO they can be; do not overwhelm the Pinterest algorithm (SD-10). So: no auto-dating in `posts_2_supabase_server.py`, no team promotion of the placeholder-dated (`2025-01-01`) backlog, and no re-pitch. Pin volume and timing stay with the writer.
- **Standing Pip step (Tier 0, copy only, SD-10-safe):** every run, `pin-seo-audit.py --source page` on the next-14-day window, then `--apply` for rows that fail and re-score clean. This covers writer-dated rows as they appear and never touches Post Date, image, URL or volume. The ledger row carries the ids and the rollback file.
- **09-28 baseline (read-only audit):** 63 rows in the window, **0 writer-scheduled**. All 63 are runway-floor revival rows (56/63 passing, mean 84/100). Writer rows only appear once the writer schedules them; none are dated since the 09-21 server move. The SD-10 runway floor (≤7/day, stops at 3 d) is unchanged.

### Q16 · One Patreon post in your voice (Rio, E88, 2026-09-22) — **silence = dropped 2026-09-29 (tomorrow), no re-pitch**
- Q4 gate re-read 09-22: **HOLD** — 0 of 54 paid patrons connected (join pace is fine). The cheapest lever is one post to existing patrons: *"Your $3 now skips the download timer — one tap to switch it on"*, linking `/go/cmim9obub00mzoxy7av4vowyr/`. Draft: `reports/funnel/drafts/patreon-connect-post-2026-09-22.md`. Read D+7 after posting; keep if ≥18 of 54 connect. Reply **"posted patreon <date>"**.

### Q17 · Sponsorship: price + send (Rio, E89, 2026-09-23)
- Media kit from real numbers (`reports/funnel/drafts/sponsorship-media-kit-2026-09-23.md`): 354,348 sessions 28d; hub slot 6,300 pv/mo; homepage 17,000. Proposed **$300/mo hub slot, $750/mo site-wide**; 2 cold emails + 1 follow-up drafted in your name. Read 2026-10-07; keep if ≥10 sent AND ≥1 interested reply. Reply **"approve sponsorship"** or a price.
- **Re-pitch on 09-30 if no reply (Rio, 7-day rule):** skip the price decision — send only the $300/mo "presented by" hub-slot email to the 2 drafted prospects. Reply **"send hub"** or a number. Silence to 10-07 = dropped and logged.

### Q18 · PR #144 weekly newsletter cron, flag off (Cass, E78) — **re-tiered to Tier 2 on 09-23**
- The PR edits `vercel.json` (adds a cron schedule); Vercel config is operator-only in `autonomy.md`, so Quinn did not merge it when its Tier 1 window closed. It merges clean and sends nothing until the flag is on. Reply **"approve 78"** and Quinn ships it via the ship protocol. **Re-pitched smaller on 09-30 if no reply** (7-day rule): the cron line alone, flag stays off; silence after that = dropped and logged.

### Q8 · Pinterest poster poison-row hardening (Pip, E36) — **APPROVED 09-12, deployed 09-21 with Q11** (MHMUtils `7037ffe`). Nothing left for you; closes with Q11-b.

### Q4 · Patreon tier relaunch — **CLOSED 2026-09-28 by operator: won't do**
- Operator (chat, 09-28): the writer controls the Patreon pay plans and "it ain't broke", so the remaining dashboard steps (unpublish the $1 Espresso Shot tier, paste the $3 welcome note) will not be done. Tiers stay as they are (Espresso Shot $1 / Cappuccino $3 / Large Latte $5). **Do not re-pitch tier or pricing changes.** Rio keeps reading paid count and gross as a guardrail only. History is in the archive.

### Q5 · Site membership via Patreon OAuth (Rio, E19/E24) — **SHIPPED 09-07/09-08**, env vars live in Production. Read 2026-10-07. Nothing for you.

### Q6 · Un-consolidate the pregnancy-mods + y2k-cc pairs (Sage, E21) — **SHIPPED 09-12**; one cache purge left (checklist below).

Q10 (re-permission day-3, Cass/E54) **dropped 2026-09-28** under the 7-day rule (filed 09-16, re-pitched smaller 09-24, no reply); E54/E68 grade 09-30 on the two batches that went; a later "go repermission day3" still executes as written. 09-24: Q14/Q15 triage memos (Nova, E79/E80) landed on `main` via the daily PR (`reports/funnel/triage/`), PR #141 closed. Two incidents today, both closed by 10:21: #168 build error (fixed forward by #171) and a verify that promoted an older deploy over a newer one (Quinn rolled back at 10:11); `[ops]` PRIORITY 1 for 09-25 is the newer-than check. Next free experiment ID: E102. Renumbering from the 09-21 parallel batch applied 09-22/23: E75=#140, E76=#142, E77=#139, E78=#144, E79/E80=#141, E81=#143 (full note in the archive). Q9 (PR #17 video-first ad slot) closed 09-22 unmerged; PR closed. Next free experiment ID: **E134** (E127–E133 assigned 09-28).

## Operator-only actions (no decision needed, nobody else can do them)

- **All cleared 2026-09-28.** The operator reported done: `NEXT_PUBLIC_SITE_URL` in Vercel Production, the Q6 BigScoots cache purge (verified by Claude), the GA4 custom dimension `source`, and the GSC indexing requests plus sitemap resubmit. Q13 (blog.* → apex 301) **SHIPPED 09-28** through the kadence-child `functions.php` rather than nginx, because the nginx config is root-owned (PR #208, CRITICAL_MARKERS `mhm_host_split_301` and `mhm_host_split_js`). PR #143's nginx package is superseded. Read 2026-10-05 as E81 (whole-site Pinterest pv/session vs 1.51, not per-host; see `reports/funnel/pinterest-read-2026-09-19.md` §2 correction).

Resolved/closed items (Q9 closed 09-22, E74 shipped 09-21, evening-check item closed 09-22, Q12 applied, Q1 shipped, Q3 closed, and the last-30-days closed log) plus the full dated status history of every open item live verbatim in `archive/operator-queue-2026-09.md`. The file as it stood before the 2026-09-23 rewrite is appended there in full.
