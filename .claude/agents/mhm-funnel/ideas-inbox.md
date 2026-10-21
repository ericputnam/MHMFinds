<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Ideas Inbox

Operator (or anyone) drops one line per idea. Quinn triages every morning:
assigns an owner and a tier, or declines with a reason, and moves it to
`experiments.md` when it ships. Done items move to
`archive/ideas-inbox-2026-09.md` verbatim.

Format: `- [ ] [owner] one line — Name MM-DD`

- [ ] [nova] Re-anchor `creatorLandings.ts` creator.bing 77 → 57 (T0) at the 10-27 read unless W43 <45 sessions or <30 URLs — Sage E245: first Bing landing ever on /creator/* was 09-23 = day 1 of the 77 baseline; weekly 0 → 53 → 78 → 57 → 57 is an arrival-week burst settling, not a decline (`reports/funnel/sage-creator-bing-2026-10-20.md`). — Sage 10-20
- [ ] <idea> — <why / what you've seen>`

## Operator watch 2026-10-18 — ON LINE run 16, normal weighting
Sessions 28d 360,503 vs line 354,930 = 101.6% (09-19→10-16); revenue $5,865.53 vs $5,932.82 = 98.9% (WATCH bar 97%). Run 15 (10-17) read 101.3% / 98.8%. Ex the Singapore Direct segment the 28d headline reads ≈96.6% (E236, 09-18→10-15) — Q30 decides whether the human line is on line. Re-arms if a run reads <97%.

- [ ] Monthly infra costs (Vercel / Prisma / OpenAI / SendGrid / BigScoots) — for a real P&L
- [ ] [cass] Homepage account offer (replaces the E73 strip, KILLED 10-07): wait for the E191 read 10-26; if offer-cohort completion clears 15%, copy SaveFindsOffer to `HomeCapture` with `ref=home-save`. — Cass 10-12
- [ ] [pip→ops] Writer flag: key on publishes, not hours. 17/17 posts since 09-21 got same-day rows, 0 inserts on 14 no-post days, so the 72 h clock reads 🔴 after a post-free Friday (10-18). `assessWriterLiveness` + check-pinner 2b: 🔴 only if a WP post ≥72 h old has 0 rows, 🟡 ≥26 h, else 🟢 "idle". Replay: 🟢 16/16 reads 09-25→10-18, 🔴 from 09-15. E230 — Pip 10-18
- [ ] [rio→ops] T0: add `affiliate-pipe-read.ts --start 2026-09-29 --end <yesterday>` to morning step 0e (E134 reads 11-11). CLI stable 10-13: exit 0/2/1, clock anchored to confirmedOn 10-12 (E199; it drifted +1 day/run before). Ops wires the line (SD-11). — Rio 10-13
- [ ] [nova] E211 slice 2: 52 Oct flagged accounts (377 flagged at the 10-14 E178 re-run) never reach the welcome — a Navbar "Submit your first mod" nudge for isCreator with 0 submissions (needs a count in the session or one GET; no schema). Wait for the 10-22 read. — Nova 10-15
- [ ] [rowan] after E228: 23 rows sit in a `watches` value no rule emits (fold into accessories?); braces/fangs/bandages/eye patches left NULL, no facet; "Autumn X Socks & Sweatsuit Set" is an outfit titled with a sock word. — Rowan 10-13/10-17
- [ ] [rowan] detector candidate "leg warmer(s)"/"legwarmers" → accessories: 31 catalog titles match, 6 outside the post still typed five ways — measure against the whole catalog before adding. — Rowan 10-12
- [ ] 7 lines dated 10-11→10-15 (landingPage slash, page_view on client nav, slug-in-PR-body, degraded digests on main, E194-b, past-day locks, patreon_connect_optin_view) parked verbatim in `archive/ideas-inbox-2026-09.md` § "Parked 2026-10-18 b (Quinn)"; owners pull from there. — Quinn 10-18
- [ ] Earlier open lines dated 09-24→10-07 are parked verbatim in `archive/ideas-inbox-2026-09.md` § "Parked 2026-10-07" and § "Parked 2026-10-11"; owners pull from there. — Quinn 10-11

- [ ] [ops] Earlier plumbing requests (09-23→10-01) are parked verbatim in `archive/ideas-inbox-2026-09.md` (§ Parked 2026-09-29 / 09-30 / 10-01 / 10-01 b); Ops pulls from there. — Quinn
- [ ] [ops] Concurrent deploy-verify runs slowed smoke renders to 5–16 min/page (/play 968 s) and one verify took 60 min; Nova's took 35 min while curl answered in <1 s. Serialize smoke-render across agents or make the first run's result reusable by the others. — Cass/Nova 10-16
- [ ] [rowan] "Gentle CAS Lighting" is still typed skin (outside the top 30, left alone under E217 scope); the /sims-4-lighting-mods/ post is 17 rows typed six ways (6 gameplay-mod / 4 lighting / 3 NULL / 2 skin / 1 cas-background / 1 hair) — one title-only pass on that post, lighting mods → gameplay-mod, fixtures stay lighting (#61). — Sage 10-16
- [ ] [rowan] Celebrity / "ready-made Sim" downloads are typed from the CAS parts their description lists (E207/E214/E221: 5+ Sims pinned NULL by hand). Measure a Sim-download → NULL rule at ingest against the whole catalog before writing it. — Rowan 10-16
- [ ] [ops] deploy-verify's smoke set does not cover collection routes; E221 was confirmed by curling /games/sims-4/makeup-cc/ by hand. — Rowan 10-16
- [ ] [pip→quinn] B3 margin: the printed 100.6% of the October line carries ≈4.1% crawler; human read ≈96.5% against the printed line, ≈98.4% against a de-botted line (September trickle ≈2%). Estimates — Quinn/Rio own the line; the ex-segment series is in `reports/funnel/pip-singapore-direct-2026-10-16.md`. — Pip 10-16
- [ ] [ops] deploy-verify --check: check-blog-sidebar makes one curl (--max-time 60) and a could-not-run goes straight to INCONCLUSIVE with no retry (10-16 06:37; by-hand re-run PASS ~06:55). Retry once after 30 s before grading INCONCLUSIVE. Also vnotes() prints "smoke NOT" on every INCONCLUSIVE, even when only the blog curl failed. (T1, grading logic) — Ops 10-16
- [ ] [rio→ops] `googleCredentialsPath()` is copied in 6 scripts (revenue-guardrail, direct-bot-read, funnel-scoreboard, page-rpm-snapshot, go-funnel-read, rank-pin-destinations); one shared `scripts/agents/ga4-credentials.ts` is an SD-11 plumbing item. — Rio 10-17
- [ ] [rio] 10-28 (was 10-24): wire the ex-segment ratio into the guardrail `red-traffic` leg iff `guardrail-agreement-tracker.ts` prints WIRE (7/7 mornings within ±3 pts; E241 — 10-21 printed HOLD: MV +4.7% vs GA4 +9.4% = 4.7 pt on the day the segment was 11.4%, so 10-24 is HOLD by construction; WIRE needs 10-22→10-28 all firing and agreeing). Two-line change + one test. — Rio 10-17/10-19/10-21
- [ ] [rio→ops] Mediavine `pages` / `devices` dimension reports lag the `earnings` line: at 10-21 the 10-19 rows carried full revenue but 4,462 of 14,229 monetizable pv (sessions 0), and `pages` caps at 100 rows. Any per-page revenue guard must read the earnings line + GA4, never these — note it in `scripts/mcp-mediavine/README.md`. — Rio 10-21
- [ ] [rowan] lots facet (lot+residential+commercial+community) top 48 is 18/48 non-lots — E252 read 10-21; the 18 ids with suggested facets (clutter, furniture, decor, career, script-mod, wallpaper, NULL for a save file / an EA pack / a Sim) are in PR #359's body. `--ids` pass whenever convenient; the hub stays unbuilt either way (bare lot/house demand ≈60 queries, none >5 impr/28d). — Sage 10-21
- [ ] [rowan] the preset facet is now ~97 face presets + GShade/ReShade presets mixed and backs no page. Split or leave alone; measure before proposing a face-presets page. — Rowan 10-21
- [ ] [rowan] 4 Manual admin rows added 10-21 03:45–03:52Z (Mummy Costume ts2, Waste soil set, Mummy Outfit II, Mummy Costume S08) have creatorId null and sit on no writer post; if they are meant for a Halloween hub, check their facets. — Nova 10-21
- [ ] [ops] collection grids are static at build (no revalidate in app/games/[game]/[topic]/page.tsx), so a catalog apply is invisible until the next production build. Worth a note in the catalog runbook or a revalidate (T1). — Rowan 10-21
- [ ] [ops→quinn] `reports/funnel/2026-10-15.md` never landed on main (digest exists), so every 7-morning keep-if counts 10-15 as missing; the daily PR must `git add` the day's scoreboard .md — add a scanner test that each digest date has its scoreboard file. — Nova/Quinn 10-21
- [ ] [cass] Weekly list passes 200 (~12 opt-ins/day): each extra 100 adds a ≥1 h run; consider raising the hourly limit only after DKIM (Q31). — Cass 10-21
- [ ] [pip] 37 of 63 rows in the top-up pool carry blog.musthavemods.com Post URLs (a 301 since 09-28, #208), so re-dated pins go out pointing at a redirect. Rewriting Post URL blog.*→apex on Pip's own pool rows (never writer rows) is outside the standing re-date approval — propose as T1 after the E223 read, with a GA4 before/after on landing host. — Pip 10-17
- [ ] [pip→ops] `queue-posted-14d` runway fallback counts ghost flips: 10-17 had 34 queue-posted rows vs 7 Pinterest pins (27 rows of a republished 2025 post flipped `Is Posted` with no pin, E237). Fallback reads 14.0/day vs pinterest-14d 10.29 over 10-05→10-19; subtract per-date ghost rows (`pin-queue-day-trace.py`) before dividing when the API sample is truncated. — Pip 10-19
- [ ] [rowan] E235 follow-ons: farmhouse-cc 8/17 (6 residential); next posts `/sims-4-cc-furniture/` 7/24, `/sims-4-nose-presets/` 7/25; clutter `expectedCount` 148 vs 219 live; gym lots stored `gym` on /sims-4-fitness-clutter-cc/ (Town Gym, LA Fitness Gym) are not a facet any page uses. — Rowan 10-18
