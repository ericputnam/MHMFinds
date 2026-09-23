<!-- context budget: 16000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
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
| E74 · PR #131 | Rio | `/go` post-connect state ("follow free first"): after Patreon OAuth returns, a signed-in non-member sees "Follow free on Patreon — $3/mo patrons skip this wait" + Reconnect instead of the same Connect line. Copy-only, behind the existing membership flag; no price, no tier, no auth change; ad anchors untouched. Why: 48 of 52 Patreon-linked accounts never followed the campaign, so the Connect click is a follow funnel. Read 2026-10-06. **MERGED 2026-09-21 11:59Z as `4c97e66`** on the operator's "I approve all of these" (chat, 09-21); deploy-verify result in the changelog row. | — (shipped) |

## Tier 2 — needs your decision

### Q11 · The Pinterest pin *writer* has been idle since 09-04 — it was never scheduled (Pip, E56, 2026-09-16)
- **Status 2026-09-21 13:05Z (Quinn):** **SERVER STEPS 4–6 DONE by the operator** — verified read-only over ssh: both `*_server.py` md5s on BigScoots match MHMUtils `7037ffe`, `crontab -l` has the `30 5` writer line above the `0 6` orchestrator, operator ran t…
- **Status 2026-09-22 00:55Z (Quinn):** **STEP 7 DONE — 268 queue rows inserted.** The operator's "live run, failed=0" was the *dry run*: the server log `supabase_sync.log` has exactly one run (18:39:40–18:40:05 server time, `[DRY RUN] Would insert` ×268, then…

### Q10 · Re-permission day-2 batch (Cass, E54, 2026-09-16) — **HELD on its own gate; needs your "go"**
- **Reply:** **go repermission day2 at 7%** (operator, 2026-09-21, in chat: "I approve all of these").
- **Status 2026-09-21 11:54Z (Quinn, interactive session):** **SENT.** `newsletter-send-test.ts --accounts-from-db --only repermission --offset 100` (live): segment 383 at the frozen anchor, 7 excluded hashes all fall before offset 100 (0 in this slice), 0 con…

### Q9 · PR #17 video-first ad slot on `/mods/[id]` (opened 2026-08-21, Tier 2 ad layout) — **one re-pitch, then it closes 2026-09-22**
- **Execution 2026-09-18 → NOT MERGED (Rio):** the re-validation found PR #17 re-adds the exact Mediavine DOM-move pattern (`.mv-outstream-container` relocation + a timed `.mv-ads` hide) that PR #18 removed on 2026-09-02 at Mediavine support's request — eviden…
- **Status 2026-09-20 (Quinn):** no reply yet; the ask above is in today's digest. Two days to the 09-22 close.

### Q8 · Harden the Pinterest poster against a poison row (Pip, E36, 2026-09-12) — **APPROVED 2026-09-12, patch ready for you to deploy**
- **Status 2026-09-17:** operator re-affirmed ("approve all #2 items"). Nothing changes for the team — the apply + pytest + scp step in MHMUtils is still the operator's; Pip bundles it with the Q11 cron line so both go out in one scp.
- **Status 2026-09-21 (Quinn):** patch applied, tested (15 of the 27) and committed locally in MHMUtils as `7037ffe` together with Q11; the scp is the operator's (see Q11 status, same file, same command).


### Q4 · Patreon tier relaunch — package ready (Rio, 2026-09-04)
- **Status 2026-09-10 (Rio, `scripts/agents/operator-did-probe.ts` first real run, ~11:00Z):** still **1 of 3**. $1 "Support Tier" is still `published=true` with **8** patrons (unchanged since 09-09); $3 "Tip Jar - Curious Simmer" 39 → 40 patrons, perk line pr…
- **Operator 2026-09-10 evening:** "all decisions are approved for tonight" — this item has no open decision; the two Patreon-dashboard steps (unpublish $1 tier, paste welcome note) are operator-hands-only and were NOT done by the interactive session (external…

### Q5 · Site membership via Patreon OAuth — "patrons skip the countdown" (Rio, 2026-09-07) — pairs with Q4
- **Status 2026-09-07 (Quinn):** SHIPPED — PR #52 merged as `f7820cd`, deploy-verify PASS (5xx/15m = 0, ad anchors + blog markers intact, ledger row 09:07). Vercel Production now has `NEXT_PUBLIC_MEMBERSHIP_ENABLED=1`, `PATREON_CAMPAIGN_ID=13460416`, `PATREON_…
- **Status 2026-09-08 (Rio, E24):** visitors saw none of it for ~22h — the client read the flag via `env[MEMBERSHIP_FLAG]`, which Next.js does not inline, so `/go` never rendered the CTA/countdown skip. Fixed forward in PR #62 (`032543e`, merged 07:07, verifie…

### Q6 · Un-consolidate the pregnancy-mods + y2k-cc legacy pairs (Sage, E21, 2026-09-08) — **SHIPPED 2026-09-12**, one cache purge left for you
- **Separate ticket (not in this PR):** GA4 7d `hostName` blog.musthavemods.com = 19,730 sessions (22% of all; 17,276 from Pinterest because the pinner posts blog.* URLs). Not fixable in `functions.php` (BigScoots cache leaks any direct-only 301/noindex to the…
- **Status 2026-09-12 (Quinn):** operator approved in chat. (1) #63 merged as `a2834ed` at 13:40, deploy-verify PASS (…6d7n4i190, 5xx/15m = 0, ledger row). (2) `push-blog-functions-prod.sh --yes` pushed the post-#63 `functions.php` to prod at 13:49 (backup `fu…

### Experiment-ID collision from the 2026-09-21 parallel batch (Quinn, for the 09-22 run)
Six agents opened PRs in parallel today and five of them claimed **E75** (#139 pin-SEO audit, #140 rank-pin-destinations, #141 triage memos, #143 host-split 301 package, #144 weekly newsletter cron) and two claimed **E76** (#141 second-game, #142 writer liveness). Their `experiments.md` / `operator-queue.md` edits will also conflict when merged serially. Quinn, at step 3 on 09-22: merge them one at a time (≥4 min apart, rebase on conflict) and renumber on merge — keep E75 = #140 (first opened), then E76 = #142, E77 = #139, E78 = #144, E79 = #141 (Q14 creator hosting), E80 = #141 (Q15 second game), E81 = #143 (Q13). The operator's "stop N" strings in those PRs all say "stop 75"/"stop 76"; read a "stop 75" as "stop all of today's Tier 1 batch" until renumbered, and print the renumbered table in the 09-22 digest.


## Operator-only actions (no decision needed, nobody else can do them)

- **Q4 step 1, 2 of 3 still yours (~2 min, Patreon dashboard):** unpublish the $1 "Support Tier" (9 patrons, still `published=true` on 09-20) and paste the welcome note from `reports/funnel/drafts/patreon-welcome-note-2026-09-09.md` into the $3 tier. Probe shows $3 tier 40 → 41, $5 tier 0 → 1 since 09-10.
- ~~**Two env-var names (~2 min):** `EMAIL_POSTAL_ADDRESS` and `NEXT_PUBLIC_SITE_URL`~~ — **done 2026-09-12** (operator gave the mailing address in chat; Quinn set both; 13 of 13 names present). **Re-opened 2026-09-20:** the operator-did probe has reported `NEXT_PUBLIC_SITE_URL` missing from Vercel Production (12 of 13) every morning since 09-17. Either it was removed or it was set on a non-Production environment — Vercel → Settings → Environment Variables → Production, add `NEXT_PUBLIC_SITE_URL=https://musthavemods.com` (~1 min); reply "done siteurl".
- **BigScoots 301 blog.* → apex (Q13, Pip 09-21, Tier 2 infra):** see the Q13 package below once Pip's PR lands; the team's half (apex Post URLs in the writer, host fix in the poster) is in the Q8/Q11 patch above.
- **BigScoots page-cache purge for Q6 (~1 min, Quinn 09-12):** the one command in the Q6 status above. Until it runs, the two un-consolidated articles keep serving the old facet canonical from cache, so Google cannot see the change.
- **CLOSED 2026-09-22 — operator: "I don't think we need an evening check."** Task disabled; `deploy-verify.sh --check` now runs every morning as runner step 0e and the MISSED-row audit is gone. Do not re-propose the evening task. History: **Scheduled task `mhm-guardrail-evening` (~1 min, Quinn 09-13 → still open 09-16):** open Scheduled tasks → `mhm-guardrail-evening` and confirm it is enabled at 18:30 with model Auto. The ledger now shows **eight consecutive `MISSED` rows (09-12 → 09-19)** written by the morning runner; no evening ledger row since 09-04 (16 days on 09-20) and never an `evening-*` worktree. If the task exists and is enabled, the fallback is the launchd item in the ideas inbox (Tier 1, Quinn). **Root cause found 2026-09-21 (Quinn, interactive):** the task IS enabled (18:30, next run tonight) but its 2026-09-14 run session (`local_9a923099-8ed3-4f46-a336-e9281d4fe192`, status "running" since 2026-09-14T22:31Z) never ended, and a task with a running session does not start a new one — hence nine `MISSED` rows. The agent session cannot stop or archive another session unattended; **you: open that session in the sidebar, stop it, archive it (~1 min)**, then tonight's 18:30 run fires on its own. Reply "evening unstuck".
- **Q8 + Q11 server steps (~5 min, Quinn 09-21):** apply/test/commit are done (MHMUtils `7037ffe`); still yours: scp the two `*_server.py` files, the 05:30 cron line, dry run, one live run, verify — runbook `reports/funnel/drafts/q11-pin-writer-cron-2026-09-18.md` §(d) 4–8. **DONE 2026-09-21** (files + cron verified on the server; live run done by Quinn 00:53Z 09-22, 268 rows — the operator's run was the dry run, see Q11 status). Re-scp of the dry-run label fix (`2b42292`) done by the operator 09-22 00:58Z. **Q11 server work complete**; only step 9 (Pip's 09-22 read) remains.
- **GA4 (~1 min, Rio 09-12):** Admin → Custom definitions → create an event-scoped custom dimension named `source` on event parameter `source`. Until it exists the `newsletter_signup`/`patreon_click` by-source split (E24 read) cannot be queried through the API; the scoreboard's "Subscribers by source" row comes from the DB, not GA4, so nothing else changes.
- **GSC (~2 min, Sage 09-12):** URL Inspection → **Request indexing** on `https://musthavemods.com/games/sims-4/hair-cc/` and, after the cache purge above, on `https://musthavemods.com/sims-4-pregnancy-mods/`, `https://musthavemods.com/sims-4-y2k-cc/`, `/games/sims-4/pregnancy-mods/`, `/games/sims-4/y2k-cc/`; then Sitemaps → resubmit `sitemap.xml` (last submitted 04-22). The service credential returns "Insufficient Permission" on `submit_sitemap`, so neither is automatable. hair-cc is the only collection page Google has not indexed (last crawled 2026-04-29).


Resolved/closed items (Q12 approved+applied, Q1 shipped, Q3 closed, and the last-30-days closed log) moved verbatim to `archive/operator-queue-2026-09.md`.

Compressed to the newest 1-2 status lines per item; full history (every dated status update) plus resolved/closed items moved verbatim to `archive/operator-queue-2026-09.md`.
