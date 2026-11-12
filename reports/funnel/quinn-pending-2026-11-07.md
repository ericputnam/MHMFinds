# Quinn 2026-11-07 — `.claude/` edits the session could not write

The headless session was again refused writes under `.claude/agents/` (a test edit to
`experiments.md` at the start of the run was denied). Quinn did not route around the refusal.
**`reports/funnel/quinn-pending-2026-11-06.md` is also still unapplied — apply it first**, then
this file, then delete both in the same commit.

Budget note: `experiments.md` is 15.5 KB of a 24 KB budget. The 11-06 rows (≈6 KB) plus today's
(≈5 KB) go over, so park E328–E344 verbatim to `archive/experiments-2026-11.md` first.

## 1. `experiments.md` — insert at the top of the Active table (newest first, above the 11-06 rows)

```
| E371 | 2026-11-07 | Cass | 0 | CAPTURE | Issue-08 pre-send review: 2 unlisted scripted-shaped signup-optin subscribers (11-02, 11-06; the inbox said 1), shape-reviewed (form, creator ticked, 0 favs, opt-in <4 s after account, UA prefix = 101/101 listed, dotted Gmail) and added to SCRIPTED_SIGNUP_HASHES; test floor 101 → 103; 11-07 dry-run row committed (#478 e76f989, PASS) | unlisted scripted-shaped at the pre-send read; issue-08 recipients | 2 unlisted (live send refused); dry 11-06 186 recipients / 120 excluded | issue-08 re-dry (hold release or "send newsletter-08") | unlisted = 0 at the re-dry AND issue 08 sends to 0 listed scripted hashes; rollback `git revert e76f989` | dry 11-07: 0 unlisted, 193 recipients, 122 excluded (103 scripted), run 1 100 / deferred 93 | SHIPPED |
```

## 2. Playbooks

`playbooks/cass.md` (above 2026-11-06):
```
## 2026-11-07 — E371 list the unlisted scripted subscribers before issue 08 (T0, #478)
- Tried: re-read the classifier before the send instead of trusting the 11-06 note; shape-reviewed each unlisted row against the listed cohort, then listed the hashes.
- Before → after: unlisted 1 (11-06 note) → 2 found (11-02, 11-06) → 0; dry 186 → 193 recipients, excluded 120 → 122.
- Verdict: PENDING (read at the issue-08 re-dry).
- Next time: the bot adds about 1 row every 2–4 days. Re-run scripted-signup-hashes.ts on the morning of any send, not the day before. One day was enough to make the count stale.
```

## 3. `ideas-inbox.md`

- Replace "[cass] 1 unlisted scripted subscriber to review before newsletter-08 run 1" (from the 11-06 pending file) with: `- [x] [cass] unlisted scripted subscribers before newsletter-08: 2 found and listed, #478 — Cass 11-07`
- `- [ ] [cass] Class fix (T0 proposal): every bot sign-up between sends blocks the live send until a hash ships. Option: on a live run, exclude freshly classified scripted hashes in memory, print the count, ship the hashes after; refuse only when the rule's classification changes. Needs review (send-path safety). — Cass 11-07`
- `- [ ] [quinn] issue-08 re-dry gate (2 × trailing daily opt-ins × days since dry) already over by 1 after one day (+7 vs ≈6.9) — count it on human-shaped rows only. — Cass 11-07`

## Ops — E374 (PR #480 7fa9786, SUPERSEDED-PASS)

experiments.md row:
```
| E374 | 2026-11-07 | Ops | 0 | OPS | Runner preflight retries on FUNNEL_FALLBACK_MODELS (opus, fable; primary skipped) when diagnosed QUOTA only; Quinn runs on the first that answers; MODEL FALLBACK prompt line re-routes specialists + digest flag (PR #480, 7fa9786) | MISSED mornings with preflight=QUOTA; false fallbacks | 14d run success 64.3%; 11-03 MISSED on Fable 429 while Opus had credit (passed 11-04..11-07) | 2026-12-07 or first QUOTA preflight | 0 QUOTA MISSED rows while any fallback model has credit, 0 non-QUOTA retries | test 8/8 red pre-fix; 12 runner test files 190 tests green | SHIPPED |
```

`playbooks/ops.md`:
```
## 2026-11-07 — E374 preflight model fallback on QUOTA (T0, #480)
- A 429 "out of usage credits" is per model: the API says "Switch to another model", and Opus passed 4/4 preflights after Fable's 11-03 429. QUOTA is the only preflight failure another model can clear, so it is the only one retried; retrying anything else only delays the MISSED row. Quinn's prompt must also re-route specialists, since subagents inherit no fallback.
```

ideas-inbox:
- `- [ ] [ops] a 429 during Quinn's main run (after preflight passed) is still unhandled — Ops 11-07`
- `- [ ] [ops] next: read-back dry run overwrites the plan CSV (destroys a rollback file); then the 4 timing flakes; then the first-build-ERROR diagnosis (needs Vercel build logs) — Ops 11-07`
- `- [ ] [quinn/rio] scoreboard buckets *.search.yahoo.com and cn.bing.com as "other" — Ops declined as scoreboard work — Ops 11-07`

operator-queue (Tier 2 config — not applied):
- **Q43 · allow headless writes under `.claude/agents/`** (Ops, E374 follow-up). No `.claude/settings*.json` exists in the repo; the runner already passes `--permission-mode acceptEdits` and `--allowedTools …Write,Edit…` (`run-funnel-daily.sh:805-806`). Ops' unverified diagnosis: Claude Code guards `.claude/` paths even under acceptEdits. Proposed fix, to be confirmed in one interactive run: a committed `.claude/settings.json` allowing `Edit(.claude/agents/**)` and `Write(.claude/agents/**)`, or the same two entries in the runner's `--allowedTools`. Reply `approve Q43` / `Q43: no`. Silence = Quinn keeps landing rows from agent appendices by hand via these pending files.

## Rowan — E373 (PR #482 58b58bc, PASS; correction ledger row d5d29239)

experiments.md row:
```
| E373 | 2026-11-07 | Rowan | 0 | AUDIENCE | /games/sims-4/hello-kitty-cc/ on title-only `sanrio` theme (29 rows); inbound nails-cc + plumbob-overrides + IndexNow 200 + legacy blogUrl; 6 hand pins incl. kawaii doll NULL → decor (PR #482, 58b58bc) | GSC clicks/impr on page; landings; legacy clicks (guardrail) | legacy 1,230 impr / 18 clk / pos 7.9 (10-07→11-04); page 0 | 2026-11-21 / 2026-12-05 | page ≥1 GSC click or ≥10 landings in 14d AND legacy clicks ≥85% AND 29/29 tagged | — | pending |
```

`playbooks/rowan.md`:
```
- 2026-11-07 (E373): Grep HAND_AUDITED_CONTENT_TYPES for the id before adding a pin. A duplicate key only shows up in `tsc` (TS1117), not in vitest: 3,306 tests passed with the duplicate in place. The apply script uses whichever key comes last, so my full-body pin overrode E214's deliberate NULL in production until I set it back. 1 of 7 new pins collided.
```

ideas-inbox:
- `- [ ] [rowan] Kawaii Swimsuit cmikd89i1001doxbh8175vp91 typed furniture — needs a hand pin (no Sanrio tag; title doesn't name the brand) — Rowan 11-07`
- `- [ ] [rowan] 4 Sanrio plumbob/phone-override rows left NULL contentType on purpose (no plumbob type) — Rowan 11-07`
- `- [ ] [ops] retag-*-theme.ts read-back dry run overwrites the dated backup CSV (E373 backup is header-only) — write -dryrun.csv instead. Same item as Ops' "plan CSV overwrite" — Rowan 11-07`

## Pip — E366 (PR #481 6a517db, PASS) + E367 (PR #484 d42b8a4, PASS)

experiments.md rows:
```
| E366 | 2026-11-07 | Pip | 0 | AUDIENCE | `guides` links from 6 hubs to the 8 Bing-losing WP guides with no Next.js inbound link: body-presets→/sims-4-sliders/, gshade-presets→/sims-4-reshade/, wedding-cc→/best-sims-4-wedding-cc/, kids-cc→/sims-4-infant-cc/, clothes-cc→/sims-4-urban-cc/+/sims-4-cowboy-cc/, cc→/new-sims-4-mods-2026/+/black-sims-4-cc/; test red pre-fix 8/8 (#481 6a517db, PASS) | Bing-index organic sessions on the 8 guides, 14d, vs untreated Bing-index guide landings | 2,541/14d (10-23→11-05; 3,178 prior, −20.0%); untreated 20,259 (−6.5%) | 2026-11-21 | treated 14d change beats untreated by ≥5 pts; else KILL (git revert) | | PENDING |
| E367 | 2026-11-07 | Pip | 0 | AUDIENCE | Hub→blogUrl twin anchor from the twin's slug (`lib/seo/blogTwinLabel.ts`, "Our Sims 4 Skin Overlay guide →") instead of "Full article on the blog →" on all 34 hubs; COLLECTION_TEMPLATE_LASTMOD 11-07; scanner test, red pre-fix (#484 d42b8a4, PASS) | Bing-index organic sessions on the 34 twins, 14d, vs untreated | 3,174/14d (10-23→11-05; 3,449 prior, −8.0%); untreated 20,259 (−6.5%) | 2026-11-21 | twins' 14d change ≥3 pts better than untreated; else KILL (git revert) | | PENDING |
```

`playbooks/pip.md` (on top):
```
## 2026-11-07 — E366 hub links to Bing losers + E367 twin anchor text
- Tried: (T0) 8 Bing-losing WP guides got their first Next.js inbound link from 6 hubs (#481). All 34 hub→twin links now name the twin, using its slug as the anchor (#484).
- Before → after: Bing-index sessions/14d: E366 set 3,178 → 2,541 (−20.0%), E367 set 3,449 → 3,174 (−8.0%), untreated 21,656 → 20,259 (−6.5%). Biggest losers: /sims-4-sliders/ 159 → 9; /new-sims-4-mods-2026/ 1,621 → 1,256.
- Verdict: MORE DATA (read 11-21).
- Next time: before linking a hub's "twin" guide, check which URL Bing actually ranks. wedding-cc's twin got 1 session while its sibling got 189.
```

ideas-inbox:
- `- [ ] [sage] wedding-cc blogUrl points at /sims-4-wedding-cc/ (1 Bing session/14d) while /best-sims-4-wedding-cc/ gets 189 — swap the twin? — Pip 11-07`
- `- [ ] [quinn/ops] Bing organic −9.7% WoW sessions while its pageviews rose +7.7%; zero-pageview (not set) Bing slice flat (761 → 782) — the loss is real WP-guide sessions — Pip 11-07`

## Rio — E372 (PR #479 276fed4, PAPER PASS)

experiments.md row:
```
| E372 | 2026-11-07 | Rio | 0 | REVENUE | Paper verdict: 11-04 ex-Singapore RPM −5.4% decomposed (imp/session −0.5% × CPM −4.9%); 11-05 rate +2.1%; 7d −7.5% = Halloween-weekend volume (105% of gap); no 72h deploy implicated; E342 graded (PR #479 276fed4, PAPER PASS) | ex-segment session RPM + CPM (rev ÷ paid imp) vs same-weekday 4-wk | 11-04 ex-seg RPM $16.97 vs $17.93; CPM $0.9823 vs $1.0329; 10-day CPM mean $1.020 | 2026-11-11 | No two consecutive judged days with ex-seg RPM < −5% and CPM < 10-day mean | 11-05 ex-seg RPM $18.64 vs $18.25 (+2.1%), CPM −2.2% | SHIPPED / PAPER PASS |
```

Row updates:
- E342 → Result "11-06 guardrail judged 11-03: 3-day 102.4% (= projection), health ok; 11-03 sessions 11,580 posted on Mediavine by 11-07, no support note" → Verdict **KEEP** (closed as volume).
- E332 → (a) closed as volume on the same reading; (b) still reads 11-11 (7d imp/sess ≥16.47 and RPM ≥95% of $16.62).

`playbooks/rio.md`:
```
## 2026-11-07 — E372 one-day CPM dip read
Tried: decomposed the guardrail's "rate" flag on 11-04 into imp/session × CPM, device split, viewability, 10-day CPM band, and the forward partial day (11-05) before deciding on a trend.
Before → after: ex-seg RPM −5.4% = imp/ex-seg session −0.5% × CPM −4.9%; 11-05 rate +2.1%; weekend pair −$120.60 = 105% of the 7d gap; Impact 24/0; Amazon block 9.91/day; Patreon $139 vs $155 floor.
Verdict: single-day auction dip, no deploy implicated, E342 KEEP, no ticket, no ad change.
Next time: a "rate" flag on one judged day is CPM noise until the next day confirms — print the CPM 10-day band and the forward partial day before calling a trend.
```

ideas-inbox:
- `- [ ] [ops] merge-gate --max-wait 600 was exceeded twice on 11-07 under 5 concurrent agent merges — consider 900 s or a queue-order hint — Rio 11-07`
- `- [ ] [rio] 11-11: imp/monetizable pv stepped 12.0 → 11.0 at 11-03 while app-route pv share rose 24.6% → 28.5% (Launcher pages) — grade on rev/1k sessions (E360) — Rio 11-07`

## Sage — E368 + E369 (PR #483 c3332fa, PASS; pins ledger 10d4444d)

experiments.md rows:
```
| E368 | 2026-11-07 | Sage | 0 | AUDIENCE | /games/sims-4/cas-backgrounds/ hub (102 mods, before loading-screens; inbound from poses and gshade-presets; 5 off-type pins) (#483 c3332fa, PASS) | search+AI landings on hub; loading-screens search+AI (guard) | 0 (new); loading-screens 163 (10-23→11-05) | 2026-11-21 | hub ≥8 AND loading-screens ≥147 AND pins 10/10 on 11-14 | — | pending |
| E369 | 2026-11-07 | Sage | 0 | AUDIENCE | /games/sims-4/facial-hair-cc/ hub (87 mods, beard + facial-hair; inbound from hair-cc and male-clothes; 5 off-type pins) (#483 c3332fa, PASS) | search+AI landings on hub | 0 (new; facet had no collection) | 2026-11-21 | hub ≥8 AND pins 10/10 on 11-14 | — | pending |
```

`playbooks/sage.md`:
```
- 2026-11-07 (E368/E369): read every row of a facet before building a hub on it. A full hand read of cas-background (107 rows) and beard+facial-hair (92 rows) found 10 off-type rows (4.7% and 5.4%); one was a skin pack at #3 by downloads in facial-hair. Hub copy claims (themes, top creators) also need checking against the database: the first draft claimed a greenhouse, Christmas sets and a creator ranking the rows did not support.
```

operator-queue (Tier 2, functions.php via push script — package, do not apply):
- **Q44 · crosslink 7 WP posts to the two new hubs** (Sage, E368/E369): add `cas-backgrounds` to `mhm_collection_crosslink_map` for the 5 CAS-background posts (incl. /sims-4-cas-background-cc/, /sims-4-cas-mirror-background/, /how-to-change-sims-4-cas-backgrounds/) and `facial-hair-cc` for /sims-4-facial-hair-cc/ and /sims-4-male-urban-facial-hair/. Marker pattern unchanged. Reply `approve Q44` / `Q44: no`; silence = dropped 11-21.

Operator checklist (WP editorial, operator-only): retitle /sims-4-hello-kitty-cc/ for editorial intent ("best Hello Kitty CC"; ~1,013 "kitty" impr at pos 7.8, 5 clicks 28d) now that the E373 hub holds browse intent.

ideas-inbox:
- `- [ ] [rowan] blog URL map sends /sims-4-facial-hair-cc/ to hair — map to facial-hair after a whole-catalog replay (E235 pattern), then remove the known-gap entry in collection-url-category.test.ts — Sage 11-07`
- `- [ ] [rowan] witch-cc cover #1 is "Bad Bitch 3D CAS Room" (a CAS background) — Sage 11-07`
