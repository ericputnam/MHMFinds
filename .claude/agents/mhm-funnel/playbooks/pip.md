# Pip — Distribution — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. "I think it worked" is not a learning. Covers channels: what pin/post types drive sessions, pinner incidents, format tests, new-channel results.

Entry format:

```
## YYYY-MM-DD
- Tried: …  (tier, PR/link)
- Before → after: <metric> <n> → <n> (<window>)
- Verdict: KEEP / KILL / MORE DATA (read on <date>)
- Next time: one sentence
```

## Kill log
_(ideas you tried that did not work — never re-propose without saying what changed)_

---

## 2026-09-10
- Tried: E26 executed — `python3 scripts/agents/revive-stranded-pins.py --apply` after `--self-test` (6/6) and a dry run. 140 stranded rows (unposted, Post Date 2026-02-22..2026-05-12) re-dated forward at 10/day across 2026-09-10 → 2026-09-23. Ledger `reports/funnel/pin-revival-2026-09-10.json` (T0 execution of the already-merged T1 script, PR #69).
- Before → after: pinner **schedulable 0 → 10** today (the other 130 become schedulable on their own dates), **stranded 1,853 → 1,713**, unposted total unchanged at 1,853 — nothing was created or deleted, only re-dated. Filters: 600 fetched, 0 missing fields, 0 duplicate images (internal or against the posted set), 56 destination URLs live / 0 dead, 1 dead image dropped. Allocator held 1 pin per destination per day across 14 distinct destinations and 10 boards; cadence effect +10.0 pins/day on top of new-post pins (~146/7d), against ~72/day cron capacity. Pinterest sessions 7d baseline 58,784 (−1.2% WoW).
- Verdict: MORE DATA (read 2026-09-25 — Pinterest sessions 7d, keep if ≥3 pts over the seasonal taper; rollback `python3 scripts/agents/revive-stranded-pins.py --rollback reports/funnel/pin-revival-2026-09-10.json --apply`)
- Next time: the revived slice is 28/140 pins (20%) pointing at `blog.musthavemods.com/...` instead of the apex — those land on the proxied duplicate rather than the canonical page, so their sessions attribute to a URL the rest of the funnel does not optimize. The generator bug is in MHMUtils `posts_2_supabase_server.py` (~lines 261/393), outside this repo; fix the writer before reviving another slice, or every future batch re-strands 1-in-5 pins on the wrong host. Also note check-pinner still reads [WARN] at 10 schedulable — the threshold was written for a full queue, not for a deliberately-metered 10/day drip.

## 2026-09-09
- Tried: E26 — `scripts/agents/revive-stranded-pins.py` (T1, PR opens today, 24h veto): re-dates the newest 140 stranded queue rows (unposted, Post Date before the poster's 14d floor) forward at 10/day for 14 days. Dry-run default, `--apply` required, HARD_CAP 200, `Is Posted=false` in the PATCH filter (not just the select), duplicate-image guard against the posted set, HEAD liveness check on every destination and image URL, and a JSON ledger so rollback is one command. Also `--self-test` (6 offline allocator assertions, no network/credentials).
- Before → after: pinner queue 0 schedulable / 1,879 stranded (2026-09-09 scoreboard), cadence ~19 pins/day all from new blog posts. Dry run selects 140 rows, original dates 2026-02-22 → 2026-05-12, across 14 distinct destinations, 1 dead image URL dropped, 0 duplicate images against the posted set, 0 dead destinations. Planned cadence ~29/day for 14 days against a cron capacity of ~72/day (1 pin / 20 min).
- Verdict: MORE DATA (read 2026-09-25 — Pinterest sessions 7d, baseline 58,782 for 2026-09-01→09-07)
- Next time: the stranded slice held only **15 distinct destination URLs across 200 rows**, so the obvious "take the newest 140" would have fired 10 pins at one article in a single morning — the shape Pinterest scores as spam. Volume moves in a pin queue are never just a count; check the *concentration* of destination and board before scheduling, and put the cap in the allocator rather than trusting the input to be diverse. The round-robin version lands exactly 1 pin per destination per day.

## 2026-09-08
- Tried: pinner backlog metric corrected to "schedulable" — the poster (MHMUtils/supabase_pin_poster_server.py) only reads rows with Post Date inside [today-14, today]; both the scoreboard and check-pinner.sh were counting every unposted row. Also queued the decor-cc catalog pin (id 11430). (T0, PR #60)
- Before → after: reported backlog 1,879 with schedulable 0 → "1 schedulable, 1,879 stranded"; check-pinner step 2 [OK] → [WARN]; scoreboard Flags 🟢 none → 🟡. Posted 136 pins/7d, all from new blog posts. All 1,879 stranded rows have images that have never been posted (0 duplicates against the posted set).
- Verdict: MORE DATA (read 2026-09-15 monitoring, 2026-09-22 decor-cc pin)
- Next time: a health check whose threshold sits far below any value the metric can reach is decoration, not monitoring. Both my earlier pinner checks (E14, E15) passed a queue that could post nothing — I validated the query, never the threshold against the real distribution. Ask "what value would make this fire, and can the metric get there?" before shipping any check. Same trap produced the hardcoded catalog ID range, fixed in the same PR.

## 2026-09-07
- Tried: (a) token-manager port — scripts/agents/pinterest-token-status.py obtains a valid Pinterest token (imports MHMUtils pinterest_token_manager, falls back to an embedded stdlib port when `requests` is missing) and check-pinner.sh now asks it instead of trusting the stored string; (b) catalog pins for the two collection pages shipped since E1 — /games/sims-4/makeup-cc/ (id 11428) and /games/sims-4/witch-cc/ (id 11429) inserted into n8n_pinterest_posts. (T0, PR #50)
- Before -> after: check-pinner.sh token step FAIL (HTTP 401, 2026-09-05) -> OK/VALID (2026-09-07, backend=embedded-port; the runner's python3 has no `requests`, so the import-only path would have been dead on every run). Refresh-token TTL 363 days. Catalog batch 7/9 posted, 2 pending. Pinterest sessions to makeup-cc and witch-cc: 0 and 0 (all sources, GA4 7d 2026-08-30 -> 2026-09-05).
- Verdict: MORE DATA (read 2026-09-14 token, 2026-09-21 pins)
- Next time: the 09-05 401 was recoverable staleness, not an outage — a monitor that cannot renew a credential will cry wolf about a pipeline that is fine. And 2 days after E1's pins posted, all 7 pages still showed ~0 Pinterest sessions (hair-cc 13/7d, poses 37/7d, none from Pinterest): pin -> session lag is weeks, so never read a catalog-pin experiment before day 14.

## 2026-09-02
- Tried: Pinterest read-back via GA4 landingPage x source analysis (7d 2026-08-25 to 2026-08-31); 437 distinct Pinterest landing pages analyzed. Two decisions written to experiments.md (DQ-1: not-set label correction; DQ-2: catalog pinning gap baselined). (T0, PR for experiments.md + pip.md)
- Before -> after: Pinterest sessions/7d to catalog pages: pregnancy-mods 812, female-clothes 695, male-clothes 137, body-presets 127, goth-cc 42, skin-details 42, cottagecore-cc 19; hair-cc/tattoos/holidays-cc/clutter/y2k-cc/vampire-cc/poses = 0
- Verdict: MORE DATA -- read on 2026-09-16; catalog pins not yet queued (that is the next T0 move)
- Next time: do not label (not set) landing-page block as bot noise. ~61% is Pinterest app traffic (referrer stripped before GA4 tag fires). True unverified block is Bing organic (not set) 802/7d. The four catalog pages getting Pinterest traffic arrived there via blog-post pin internal links, not direct catalog-URL pins.

## 2026-09-01
- Tried: nothing yet — team chartered today. Read `../charter.md`, `../autonomy.md`, `../operating-model.md`, `../targets.json`, and `reports/growth/fact-base-2026-09-01.md` before your first move.
- Before → after: baseline in `../targets.json`
- Verdict: —
- Next time: your first move should be the top item in your agent file's "levers" list unless the scoreboard shows a 🔴 in your area.
