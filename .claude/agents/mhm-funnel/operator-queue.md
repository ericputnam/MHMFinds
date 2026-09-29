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

### Q11-b · Writer pins — **CLOSED 2026-09-28; the E82 diagnosis was wrong**
- **Correction (Claude, 09-28, after the operator showed the WP "Pin Schedule" screen):** the writer's plugin schedule *does* work. Rows sit at `Post Date = 2025-01-01` until the article's Scheduled Date, then get dated that day and post. Supabase shows it: pumpkin-recipes was created 09-22, dated 09-27, 25/25 posted; fall-cc-clothes 09-21→09-25, 51/51; cardigan-cc 09-21→09-23, 31/31. The placeholder means "waiting for its scheduled day", not "stranded". Upcoming on 09-28: fall-loading-screen 09-29 (43), autumn-houses 10-01 (24), kissing-poses 10-03 (25) = 92 rows. Do not treat plugin-scheduled placeholder rows as a backlog or promote them.
- **Operator direction (09-28):** focus on the writer's scheduled pins and make them the best Pinterest SEO they can be; do not overwhelm the algorithm (SD-10). Volume and timing stay with the writer; no auto-dating, no re-pitch.
- **Pin-SEO pass:** the next-14-day window cannot see writer rows (placeholder date until their day), so the pass must target the plugin's Upcoming articles by id (`pin-seo-audit.py --source page --ids`). 09-28 read-only baseline on the 92 upcoming rows: 1/92 passing, mean 59/100, mostly descriptions over 400 chars and the keyword not in the first sentence. 49 of the 92 point at `blog.musthavemods.com` (now a 301). Applying copy or URL changes to the writer's rows waits for the operator's yes.

### Q16 · One Patreon post in your voice (Rio, E88, 2026-09-22) — **silence = dropped 2026-09-29 (tomorrow), no re-pitch**
- Q4 gate re-read 09-22: **HOLD** — 0 of 54 paid patrons connected (join pace is fine). The cheapest lever is one post to existing patrons: *"Your $3 now skips the download timer — one tap to switch it on"*, linking `/go/cmim9obub00mzoxy7av4vowyr/`. Draft: `reports/funnel/drafts/patreon-connect-post-2026-09-22.md`. Read D+7 after posting; keep if ≥18 of 54 connect. Reply **"posted patreon <date>"**.

### Q17 · Sponsorship: price + send (Rio, E89, 2026-09-23)
- Media kit from real numbers (`reports/funnel/drafts/sponsorship-media-kit-2026-09-23.md`): 354,348 sessions 28d; hub slot 6,300 pv/mo; homepage 17,000. Proposed **$300/mo hub slot, $750/mo site-wide**; 2 cold emails + 1 follow-up drafted in your name. Read 2026-10-07; keep if ≥10 sent AND ≥1 interested reply. Reply **"approve sponsorship"** or a price.
- **Re-pitch on 09-30 if no reply (Rio, 7-day rule):** skip the price decision — send only the $300/mo "presented by" hub-slot email to the 2 drafted prospects. Reply **"send hub"** or a number. Silence to 10-07 = dropped and logged.

### Q18 · PR #144 weekly newsletter cron, flag off (Cass, E78) — **re-tiered to Tier 2 on 09-23**
- The PR edits `vercel.json` (adds a cron schedule); Vercel config is operator-only in `autonomy.md`, so Quinn did not merge it when its Tier 1 window closed. It merges clean and sends nothing until the flag is on. Reply **"approve 78"** and Quinn ships it via the ship protocol. **Re-pitched smaller on 09-30 if no reply** (7-day rule): the cron line alone, flag stays off; silence after that = dropped and logged.

### Q19 · Amazon link rel=sponsored + disclosure — spec only (Rio, E134 item E, 2026-09-29)
- Real gap found while building tonight's tag-hygiene tool: anchor `rel` attributes on the Amazon links are inconsistent. Fixture-confirmed examples from real posts: `rel="noreferrer noopener"` (no nofollow, no sponsored) and `rel="noreferrer noopener nofollow"` (nofollow, no sponsored); the dynamic `kadence/singlebtn` block instead sets `"noFollow":true,"sponsored":true` as JSON attributes (whether Kadence's template actually renders these into the anchor's `rel` is unchecked). Google's guidance since 2019 is `rel="sponsored"` for paid/affiliate links. Whether an FTC-style affiliate disclosure exists on these posts is also unchecked. Proposed Tier 2 package: audit real rendered `rel` output across all Amazon anchors (reuse `kadence-safe-replace.ts read` mode), add `sponsored` where missing, plus a one-line disclosure block. This is a spec, not a build — attribute additions change byte length, so it needs a different invariant than tonight's same-length swap.

### Q20 · GA4 outbound-click measurement for the WordPress blog (Rio, E134 item F, 2026-09-29)
- Checked GA4 (property 437117335) tonight: every 28d event name containing "click" is attributed to `hostName: musthavemods.com` only (`affiliate_click` 41, `patreon_click` 186, etc.) — zero rows for the blog host, and no generic GA4 Enhanced-Measurement `click`/`outbound` event appears anywhere in the property. The WordPress blog (confirmed running Google Site Kit) has no confirmed outbound-click visibility into the Amazon links this session touched. Proposed: turn on GA4 Enhanced Measurement's "Outbound clicks" toggle for the property (an admin setting, not code — this agent's GA4 access is `can_edit: false`) and confirm it fires on blog pages. Spec only.

### Q21 · Amazon OneLink / buying-guide package (Rio, E134 item G, 2026-09-29)
- Proposal, not scoped: OneLink auto-redirects international visitors to their local Amazon marketplace under the same tag, which the current flat `musthavemod04-20` links do not do; international session share is unknown to this session. Pairing OneLink with dedicated "buying guide" content is a bigger, separate investment needing GA4/Mediavine geo data, Amazon OneLink eligibility research, and a content plan with Nova. Flagging as a future Tier 2 candidate once E134 items A–D have had time to show whether the repaired links convert at all.

### Q22 · Alternative affiliate programs shortlist: GMG / Envato / Humble (Rio, E134 item H, 2026-09-29)
- Amazon's own performance argues for diversifying: 133 Impact clicks / 0 actions Jul–Sep even before tonight's fix. Shortlist for future network applications (Tier 2 — "network re-applications"): Green Man Gaming (game keys), Envato (creative assets, closer to this site's mod/CC content), Humble Bundle (game bundles). No applications made, no research beyond naming candidates — a shortlist for the operator to weigh, not a package.

### Q8 · Pinterest poster poison-row hardening (Pip, E36) — **APPROVED 09-12, deployed 09-21 with Q11** (MHMUtils `7037ffe`). Nothing left for you; closes with Q11-b.

### Q4 · Patreon tier relaunch — **CLOSED 2026-09-28 by operator: won't do**
- Operator (chat, 09-28): the writer controls the Patreon pay plans and "it ain't broke", so the remaining dashboard steps (unpublish the $1 Espresso Shot tier, paste the $3 welcome note) will not be done. Tiers stay as they are (Espresso Shot $1 / Cappuccino $3 / Large Latte $5). **Do not re-pitch tier or pricing changes.** Rio keeps reading paid count and gross as a guardrail only. History is in the archive.

### Q5 · Site membership via Patreon OAuth (Rio, E19/E24) — **SHIPPED 09-07/09-08**, env vars live in Production. Read 2026-10-07. Nothing for you.

### Q6 · Un-consolidate the pregnancy-mods + y2k-cc pairs (Sage, E21) — **SHIPPED 09-12**; one cache purge left (checklist below).

Q10 (re-permission day-3, Cass/E54) **dropped 2026-09-28** under the 7-day rule (filed 09-16, re-pitched smaller 09-24, no reply); E54/E68 grade 09-30 on the two batches that went; a later "go repermission day3" still executes as written. 09-24: Q14/Q15 triage memos (Nova, E79/E80) landed on `main` via the daily PR (`reports/funnel/triage/`), PR #141 closed. Two incidents today, both closed by 10:21: #168 build error (fixed forward by #171) and a verify that promoted an older deploy over a newer one (Quinn rolled back at 10:11); `[ops]` PRIORITY 1 for 09-25 is the newer-than check. Next free experiment ID: E102. Renumbering from the 09-21 parallel batch applied 09-22/23: E75=#140, E76=#142, E77=#139, E78=#144, E79/E80=#141, E81=#143 (full note in the archive). Q9 (PR #17 video-first ad slot) closed 09-22 unmerged; PR closed. Next free experiment ID: **E134** (E127–E133 assigned 09-28).

## Operator-only actions (no decision needed, nobody else can do them)

- **All cleared 2026-09-28.** The operator reported done: `NEXT_PUBLIC_SITE_URL` in Vercel Production, the Q6 BigScoots cache purge (verified by Claude), the GA4 custom dimension `source`, and the GSC indexing requests plus sitemap resubmit. Q13 (blog.* → apex 301) **SHIPPED 09-28** through the kadence-child `functions.php` rather than nginx, because the nginx config is root-owned (PR #208, CRITICAL_MARKERS `mhm_host_split_301` and `mhm_host_split_js`). PR #143's nginx package is superseded. Read 2026-10-05 as E81 (whole-site Pinterest pv/session vs 1.51, not per-host; see `reports/funnel/pinterest-read-2026-09-19.md` §2 correction).

Resolved/closed items (Q9 closed 09-22, E74 shipped 09-21, evening-check item closed 09-22, Q12 applied, Q1 shipped, Q3 closed, and the last-30-days closed log) plus the full dated status history of every open item live verbatim in `archive/operator-queue-2026-09.md`. The file as it stood before the 2026-09-23 rewrite is appended there in full.
