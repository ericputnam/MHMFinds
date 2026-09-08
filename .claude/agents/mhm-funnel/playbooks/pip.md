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
