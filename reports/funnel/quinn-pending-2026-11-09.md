# Quinn — pending `.claude/agents/` edits, 2026-11-09

The headless session refused writes to `.claude/agents/`. This is the third run in a row (11-06, 11-07, 11-09; Q43). Every edit below is verbatim and in apply order. Apply `quinn-pending-2026-11-06.md` and `quinn-pending-2026-11-07.md` first, because the E345–E374 rows live there. Quinn did not route around the refusal.

## 1. experiments.md — new Active rows (insert at the top of Active / pending)

```
| E379 | 2026-11-09 | Nova | 0 | AUDIENCE | Finished the interrupted E370 apply: 11-07 run died mid-loop at plan row 2,423 (2,423/3,050 written, no `applied`, no ledger row). Currency first: 627/627 unwritten rows held frozen prior; Patreon re-probe 40 seeded-random posts = same campaign 40/40, NSFW 0. `--apply` wrote 627, read-back 627/627; full plan 3,050/3,050. sitemap-creators 710 → 737; IndexNow 874 URLs (737 creators) http=200 (ledger c56ea9d4 + 66ca8ddc; no PR) | GA4 /creator/* landings on the 367 E370 slugs (159 new, 208 grown); guard organic+AI | 303 landings (247 organic+AI), GA4 10-24→11-06 pre-apply; 325/367 slugs in sitemap | 2026-11-22 | ≥364 landings 11-09→11-22 AND organic+AI ≥247; kill + `--plan=patreon-authors-2026-11-07.json --rollback` on dispute or >5% wrong in a 40-row check | | SHIPPED |
| E380 | 2026-11-09 | Cass | 0 | CAPTURE | Collection-hub email block (E323, under the grid) gains the home strip's account alternative: "Or create a free account to save finds as you browse." → /sign-in/?mode=signup&ref=collection-page&redirect=<hub>; GA4 account_cta_click{collection-page}; email form/source/placement unchanged; COLLECTION_TEMPLATE_LASTMOD → 11-09; 5-test guard (#490 bc90be0, PASS) | (newsletter_signup + sign_up) source=collection-page per 1k newsletter_form_view{collection-page} users | GA4 11-02→11-08: 4,700 hub sessions; form view 1,461 ev / 974 users; newsletter_signup 0; sign_up{collection-page} 0; sign_up{collection-favorite} 1 (home-hero same week: 2,170 viewers → 11 email + 4 cta → 4 sign_up) | 2026-11-23 | sign_up{collection-page} ≥ 2 in 11-10→11-23 AND newsletter_signup{collection-page} ≥ prior 14d (10-27→11-09); else `git revert bc90be0` | | SHIPPED |
| E382 | 2026-11-09 | Rowan | 0 | AUDIENCE | `/games/sims-4/hats-cc/` (152 cards) on title-only `headwear` theme (`lib/headwearThemeRules.ts`; hat/cap/beanie/bonnet/snapback/basecap/visor/ushanka/helmet/bandana/headwear; rejected crown 47, tiara 10, headband 15, hood 5, veil 18); `hats` contentType not used (276 rows, 64.5% title-supported, 10/24 top off-type); 153 tagged, apply ledger b0e2604f; inbound male-clothes + jewelry-cc; IndexNow 11:57Z http=200 (#493 3599bdf, PASS) | GA4 landings new page + legacy `/sims-4-hats-cc/`; GSC clicks/impr both | legacy 281 landings 14d (10-26→11-08), 201 impr / 4 clk / pos 11.7 (GSC 10-09→11-05); page 0 | 2026-11-23 | page ≥1 GSC click or ≥10 landings 11-10→11-23 AND legacy ≥239/14d (85%) AND 152/152 tagged; kill if legacy <85% with page 0 clicks; rollback `git revert 3599bdf` + `headwear-theme-retag-2026-11-09.csv` | | SHIPPED |
| E383 | 2026-11-09 | Ops | 0 | RELIABILITY | Self-host launcher fonts (next/font/google → next/font/local, 5 latin woff2, 87 KB, OFL) so `next build` makes no fonts.gstatic.com fetch; guard test `no-google-fonts-at-build.test.ts` bans next/font/google (fails 2/5 on pre-fix main) (#491 79323e7, verify graded 3599bdf PASS) | Vercel production builds ending in ERROR on a font fetch | 5 in 5 d (11-05→11-09: #468, #473, #474, 6d06235, 7895670) | 2026-11-16 | 0 font-fetch build ERRORs 11-09→11-16 AND launcher renders with --lx-font-* vars; else revert | | SHIPPED |
```

Pip (E375, E376), Sage (E377, E378) and Rio (E381): see §7.

## 2. experiments.md — verdicts (Monday grading, Quinn 11-09)

- **E286 → KILL** (Nova): `KILL — 0 creator_badge_cta / 0 creator-badge sessions 10-29→11-08; dashboard 1 pv / 3 users (card barely exposed). Card removal = follow-up.`
- **E340**, Result cell (partial): `21/21 sitemap leg MET 11-09 (20 listed + kiarazurk 308 → kiara-zurk, listed); sessions leg reads 11-19.`
- **E342 → KEEP**. Per Rio's 11-07 verdict (E372, in `quinn-pending-2026-11-07.md`).
- **E332(a) → KEEP**: the 11-05 yellow closed as volume, not RPM. The breaker has been green on every run since (11-06, 11-07, 11-09). Today: 11-06 $225.96 +7.4%, RPM $19.55 +8.7%.
- **E370 → superseded by E379**: the apply is complete (3,050/3,050). The read moves to E379's 11-22 read.
- **E323** (#442, collection capture under the grid, 11-02): **row missing**. It is not in `experiments.md` or in the 11-06/11-07 pending files; the changelog rows are its only record (flagged by Cass). Add the row from the changelog, and read it together with E380 on 11-23 (before: 0 sign-ups / 974 viewers, 11-02→11-08).

## 3. scorecard.md — insert above "Week of 2026-10-19" (the 10-26 and 11-02 blocks were never written; noted, not reconstructed)

```
## Week of 2026-11-09 (covers 2026-11-02 → 2026-11-08, judged on data to 11-07; Mediavine to 11-06)

**Headline:** revenue 28d $5,969 Mediavine (10-10→11-06, +2.2%) + ≈$130 non-ad ≈ $6,099 vs day line $5,857 (🟢 104%) but vs the operator ramp $7,498 (🔴 81.3%) · sessions 28d 355,333 vs day line 359,020 (🟢 99.0%) and vs ramp 461,271 (🔴 77.0% — BELOW LINE, 600k Dec target stands) · owned-audience adds 171/7d vs 200 by 11-15 (🟡 86%) · non-ad $139/mo (55 paid) vs $155 floor (🔴 90%)

| Agent | KPI | Target | Actual (7d to 11-07) | Grade | Merges 7d | Note |
|---|---|---|---|---|---|---|
| Pip | sessions 7d | ramp ≈115K/7d | 85,100 (−2.7%); Pinterest 55,367 (−4.0%, frozen SD-10); Bing 13,892 (−2.6%) | 🔴 74% | 7 | Pinterest queue empty and frozen; Bing-losing guides got hub links (#481/#484). |
| Sage | organic + AI sessions | grow | google 3,197 (+6.6%); AI 924 (+14.1%); GSC clicks 28d 3,196 (+11.6%) | 🟢 | 6 | cas-backgrounds + facial-hair-cc hubs (#483); Q44 crosslinks with operator. |
| Nova | creators / supply | creators >0 | creator pages 286 organic+AI sessions 7d (guard 192% PASS); sitemap-creators 737; 3 onboarded | 🟢 | 5 | E370/E379 backfill complete 3,050/3,050; E286 KILL. |
| Cass | owned adds 7d | 200 by 11-15 | 171 (accounts +134, email +37); capture 2.01/1k | 🟡 86% | 5 | Hub email block 0/974 → E380; newsletter-08 announced T1 for 11-10. #414 held. |
| Rio | non-ad $/mo | $155 floor | $139 (55 paid); affiliate clicks 7d 15, $0 recorded | 🔴 90% | 4 | Q37 lapsed → affiliates + members post; Amazon earnings due 11-11. |
| Rowan | returning share / pages per session | 55% by Dec | returning 51.8%; pages/session 1.76; engagement 73.7%; favorites +1,220 | 🟡 94% | 4 | hello-kitty-cc (#482), hats-cc (#493). Retag rollback-CSV class open. |
| Ops | run success / ledger | 100% | run success 14d 64.3%; liveness 4/7 (11-03 MISSED, 11-07 RAN-UNLANDED, 11-08 MISSED) | 🔴 | 5 (11.4%, cap 20%) | E383 self-hosted fonts after 5 font-fetch build ERRORs in 5 d. |

**Experiments graded (11-03 → 11-09):** KEEP E342, E332(a) · KILL E286 · legs MET E340 (sitemap 21/21) · superseded E370 → E379 · missing row E323 (to restore).
**Biggest risk:** sessions at 77% of the ramp with the largest channel (Pinterest, 65% of sessions) frozen and its queue empty. Every other channel together cannot close a ~3,800 sessions/day gap at current growth rates. Second: the loop itself — 3 of 7 mornings did not land, so the team's paper trail lags the site.
**Top 3 bets next week:** 1) Traffic pages from GSC-impression legacy articles (Rowan list: superhero 305 impr, tennis 264, victorian 211, masks 203, gloves 196) plus Q41/Q44 crosslinks to route existing article traffic into hubs. 2) Capture on hubs (E380) and newsletter-08 to ~193 (Cass). 3) Reliability: zero build ERRORs (E383) and the host awake by 06:30 so the loop lands 7/7.
**Operator queue:** 4 open T2 (Q41 drops 11-15, Q42 11-13, Q43, Q44 ~11-14); Q40 archived unposted 11-07; Q37 lapsed 11-05.
```

## 4. operator-queue.md

- Replace the "Tier 2 queue (Quinn 11-06)" paragraph with: `**Tier 2 queue (Quinn 11-09):** no operator replies since 11-02. Q40 archived unposted 11-07 (7-day rule); Q37 lapsed 11-05 (November = affiliates + members post, $155 floor) — move both verbatim to archive/operator-queue-2026-11.md § "Dropped items moved 2026-11-09". Open: Q42 drops 11-13, Q44 ~11-14, Q41 11-15, Q43 (no expiry — blocks every pending file). Tier 1: #414 (E305) still HELD (sessions 77.0% of ramp; not AUDIENCE). newsletter-08 sends 11-10 unless "stop newsletter-08".`
- Add a Tier 1 row: `| T1 | Cass | **newsletter-08** — biweekly issue, ≈193 recipients, run 1 = 100; announced 11-09 (the 11-06 "HELD" line was a release ask, not a window). Sends 2026-11-10. | "stop newsletter-08" |`
- Add the Q42, Q43 and Q44 bodies verbatim from `quinn-pending-2026-11-07.md` if they are not already present.
- Operator-only: add `**Host awake 06:30 (Ops, 11-09):** 11-08 MISSED (Mac asleep; pmset shows only a 05:02 DarkWake) and the 11-07 run never released its cleanup. 3 of the last 7 mornings did not land.`

## 5. ideas-inbox.md — new lines

```
- [ ] [rowan] Retag-script template (`retag-{heels,sanrio,plumbob,christmas,...}-theme.ts`) overwrites its rollback CSV on a no-op run; port the `changes.length === 0 → return` guard from `retag-headwear-theme.ts` to every sibling (fix the class). — Rowan 11-09
- [ ] [rowan] `hats` contentType: ~98 of 276 rows have no hat word (Vintage Coach Bag, Late Night Stream, map replacements, hairstyles); hats-cc filters on the `headwear` theme, so no page is affected, but `/mods` facet chips are. Hand-fix with `--ids=`. — Rowan 11-09
- [ ] [ops] Any `--apply` loop that writes `applied` only at the end leaves no trace when killed (E370 died at row 2,423 of 3,050 on 11-07, found only by Nova's read-back 2 days later). Write a progress row or checkpoint per batch. — Quinn 11-09
- [ ] [rio] Mediavine reporting MCP was CONNECTION_CLOSED in the 11-09 session (guardrail itself ran green from its own client). Check whether the MCP server config or the token is at fault before the 12-03 expiry. — Quinn 11-09
```

Operator watch block: leave as is. Today's verdict is still BELOW LINE on the ramp (77.0%).

## 6. Playbooks

`playbooks/nova.md` (insert below the `---` under Kill log):
```
## 2026-11-09 — E379 finish the interrupted E370 apply (T0 data, ledger c56ea9d4 + 66ca8ddc)
- Tried: read back all 3,050 E370 plan rows. A clean prefix of 2,423 was written 11-07 from 12:36Z; the run died before `applied` or a ledger row. Showed the plan was still current (627/627 unwritten rows still on their frozen prior; Patreon re-probe 40/40 same campaign, 0 NSFW), applied the 627, then IndexNow-pushed 737 creator pages. E286 KILL (0 badge clicks; dashboard 1 pv in 11 d). E340 sitemap leg MET 21/21.
- Before → after: 2,423 → 3,050/3,050 rows written; sitemap-creators 710 → 737; E370 slugs 303 landings 14d pre-apply → read 11-22.
- Verdict: PENDING (read 2026-11-22).
- Next time: an apply that writes `applied` only after the loop leaves no trace when it is killed. Read back the DB against the plan before assuming "never ran". Plan order makes the prefix visible.
```

`playbooks/cass.md` (newest at top):
```
## 2026-11-09 — E380 hub account link (T0, #490); newsletter-08 announced T1 for 11-10
- Tried: added the home strip's "create a free account" link to the collection-hub email block, same `collection-page` source as the email form so both legs read on one row. No newsletter send: the 11-06 digest framed issue 08 as HELD awaiting "send newsletter-08" (a release ask, not a veto window) and the 11-07 digest never landed, so no window had run — announced today, sends 11-10 unless "stop newsletter-08".
- Before → after: hub form 974 viewers → 0 email sign-ups (11-02→11-08) vs home-hero 2,170 → 11 email + 4/4 account cta→sign_up → read 11-23.
- Verdict: PENDING (11-23).
- Next time: a "HELD, reply X to release" line is not a Tier 1 announcement; when holding a send, write the stop phrase and date in the same line so the window starts running.
```

`playbooks/rowan.md` (newest at top, above 2026-11-04):
```
## 2026-11-09 — E382 hats-cc (title-only `headwear` theme, 152 cards)
- Tried: legacy article ranked by GSC impressions with no browse page → `/sims-4-hats-cc/` (201 impr pos 11.7, 281 landings/14d). `hats` contentType was 64.5% title-supported (Coach bag #2), so a title-only theme named `headwear` (not `hats`, never confusable with the column) backs the page, the heels pattern. PR #493 3599bdf PASS; apply b0e2604f.
- Before → after: headwear 0 → 153 tagged (152 SFW Sims 4), top 24 24/24 hats; 4 dry-run ADD rows excluded after reading (lamp, snowman yard decor, gameplay mod, pajama set).
- Verdict: MORE DATA (read 11-23).
- Next time: the retag-script template rewrites its rollback CSV on every run, so the read-back after --apply wiped it (rebuilt from DB). Fixed in retag-headwear-theme.ts only; heels/sanrio/plumbob/christmas siblings still have it. Untouched legacy candidates from the same GSC page list: superhero-cc 305 impr, tennis-cc 264, victorian-cc 211, masks-cc 203, gloves-cc 196, school-uniforms 194. The `hats` contentType still holds ~98 non-hat rows, so hand-fix with --ids before anything filters on it.
```

`playbooks/ops.md`:
```
### Build-time network fetches are flaky dependencies (E383, 2026-11-09)
`next/font/google` downloads fonts during `next build`. fonts.gstatic.com timed out (ETIMEDOUT) on 5 Vercel production builds in 5 days, and each cost a BUILD ERROR row and a manual redeploy (incident 2026-11-08-191540). Fix the class: self-host with `next/font/local` (components/launcher/fonts/, latin woff2 + README with sources). `__tests__/unit/no-google-fonts-at-build.test.ts` fails if `next/font/google` returns. When a build fails, read `vercel inspect <url> --logs` before you call it the change's fault, because a platform fetch failure is not a code regression. Git previews are skipped (`ignoreCommand`) and SSO-locked, so smoke-render a local `next start` instead. Under `next start`, `/mods` 404s because it is a vercel.json-only redirect; that is expected, not a regression.
```

`playbooks/quinn.md` (append):
```
## 2026-11-09 — a write that only marks "done" at the end is invisible when it dies
- Two silent losses in one week had the same shape. The 11-07 run's digest, scoreboard and pending file were written to a worktree and never reached `main` (runner died at cleanup), and the E370 apply wrote 2,423 of 3,050 rows and no `applied` flag or ledger row. Both read as "never happened" until someone read back the raw state (Quinn copied 8 stranded files from the 11-07 worktree; Nova read back 3,050 plan rows).
- Number: 2 of the 7 mornings 11-02→11-08 produced work that existed only off `main` (11-07 run, E370 apply), on top of 2 MISSED mornings.
- Rule: before treating an absent record as "did not run", read back the artifact it would have produced (the worktree, the DB rows). Ask Ops for per-batch checkpoints in long applies (ideas-inbox [ops] 11-09).
```

## 7. Pip, Sage, Rio

### Rio (E381) — accepted by Quinn 11-09

experiments.md, new top row in Active / pending:
```
| E381 | 2026-11-09 | Rio | 0 | MONETIZE | Verdict 11-09 (`rio-verdict-2026-11-09.md`, #492 a2bf55a PAPER PASS): 7d −7.77% ($1,434.25 vs $1,555.12) = ex-seg sess −8.05% × ex-seg RPM +0.30%; Sat+Sun 10-31/11-01 −$120.60 = 99.8% of gap, Mon–Fri −$0.27; wkday-matched −3.2% = sess −6.7% × RPM +3.7% (rate + on 6/7 days); 11-07 posted +19.4%. No rollback/ticket/ad change. B2: no lever inside fence (Q4 closed, Q37 lapsed, Q36 dropped, repair done) → no Rio B2 move before 11-11 | MV 7d rev WoW on 11-07 anchor; ex-seg RPM WoW | −7.77% / +0.30% (anchor 11-06); proj. 11-07 anchor +5.0% / +6.1% | 2026-11-11 | 7d ≥ −2.0% WoW OR ex-seg RPM ≥ −3% → stays closed as volume; both miss → rate, bisect 11-05→11-07 app-page merges (T1). 11-11: Impact 0 actions → E134 KILL to E13; no Amazon earnings → Amazon leg NOT MEASURABLE (not a pass) | — | DECIDED: volume |
```

`playbooks/rio.md`, new entry at the top. The file is at 8,188 of its 10,000-byte budget, so archive the 10-21 entry to `archive/playbooks/` in the same edit:
```
## 2026-11-09 — E381: 7d −7.8% is Halloween-weekend volume; rate +0.3% WoW / +3.7% weekday-matched; B2 has no lever inside the fence
- Tried: verdict file (T0 paper, #492 a2bf55a PAPER PASS); MV `client.ts` earnings 10-03→11-08 + GA4 date × sessions with the SG-direct segment; `affiliate-pipe-read.ts` 10-12→11-08 interim.
- Before → after: 7d $1,555.12 → $1,434.25 (−7.77%) = ex-seg sess −8.05% × ex-seg RPM +0.30%; weekend pair −$120.60 = 99.8% of the gap; wkday-matched RPM +3.7%; paid imp per ex-seg session +6.7/+9.3/+15.1% on 11-05/06/07 (Launcher depth). E332 b pre-read 17.15 imp/sess, RPM 105.5% of $16.62. Impact 23/0, Amazon block 9.38/day, non-ad $139.
- Verdict: volume, closed; falsifier on the 11-07 anchor (<−2.0% WoW AND ex-seg RPM <−3%). B2 NO MOVE until the 11-11 mechanical affiliate read.
- Next time: when a 7d window still contains a holiday weekend, print the roll-off projection with the day that replaces it (11-07 was already posted, +19.4%). It turns a −7.8% headline into a +5.0% forecast before anyone reacts to it.
```

### Sage (E377, E378) — accepted by Quinn 11-09

experiments.md rows (Sage's column order; Quinn: normalize to the table's columns, Tier 0 · AUDIENCE · SHIPPED):
```
| E377 | Sage | 2026-11-09 | Tier 0 eyebrows-cc hub (PR #494, a6232f1) — 127 brows, 3 makeup sets pinned out (ledger 3683e86d), inbound eyes-cc + facial-hair-cc | before: hub 0; legacy brow articles organic 144 (79/62/3, GA4 10-26→11-08) | read 2026-11-23 (GA4 11-09→11-22) | keep if hub ≥10 search+AI landings AND legacy ≥122; kill if hub <5 OR legacy <122 |
| E378 | Sage | 2026-11-09 | Tier 0 in-season hub leads homepage hero strip (PR #496, e655cd4) — christmas-cc Nov 1–Dec 31, halloween-cc Oct (lib/seasonalHub.ts) | before: christmas-cc+holidays-cc search+AI 36, legacy Christmas articles 210 (GA4 10-26→11-08); LY seasonal ratio 1.62 (322→522) | read 2026-11-24 (GA4 11-10→11-23) | keep if hubs ≥73 AND legacy ≥289; kill if hubs <58 OR legacy <289 |
```
Interim reads: E268 trending KILL (0.69% CTR, 2/290, impressions ≈44% of baseline; final 11-24). E259 NOT MET inside the hold band (must-have cluster 8.4% CTR), so the title stays.

`playbooks/sage.md` (newest at top):
```
## 2026-11-09 — E377 eyebrows-cc hub (#494) · E378 seasonal hero pill (#496), both Tier 0
- Tried: eyebrows was the deepest shelf (130) inside the eyes-cc union, which drew only 12 search + 2 AI in 14d while the brow articles drew 144 organic + 1,234 social — read all 130, pinned 3 Caroll Design makeup sets → makeup (127 left). Then the homepage: Christmas organic landings ran 322 → 522 → 2,101 last year (10-26→11-08 / 11-09→11-22 / 11-23→12-24) and the homepage linked christmas-cc only from the "Show all" overflow; added a date-windowed lead pill. Rejected: a head-term christmas-cc retitle (breaks the browse-intent test and would cannibalize /sims-4-christmas-cc/, 1,449 search sessions in last year's peak at single-post RPM); winter (278 theme rows, dirty — Wintermelon preset, Snowflake Hospital; Rowan); glasses (56/109 title-supported); medieval/urban (0 theme rows).
- Before → after: eyebrows hub 0 / legacy 144 → read 11-23; seasonal hubs 36 / legacy Christmas 210 → read 11-24. Graded: E268 interim 0.69% CTR (2/290), impressions ≈44% of baseline → trending KILL, final 11-24; E259 NOT MET in hold band (must-have cluster 29/344 = 8.4%; "musthavemods" 108/141).
- Verdict: MORE DATA.
- Next time: under jsdom next/link drops the trailing slash from href, so compare paths without it in render tests; and a seasonal move needs a last-year ratio in its keep rule, or the season grades it.
```
ideas-inbox: `- [ ] [sage] eyes-cc hub copy still says "eyebrows 130" — stale after E377 (127, own hub). Copy fix. — Sage 11-09`

### Pip (E375, E376) — accepted by Quinn 11-09

experiments.md rows (Pip wrote PENDING; per today's merges they are SHIPPED):
```
| E375 | 2026-11-09 | Pip | 0 | AUDIENCE | Hub links to 13 seasonal WP guides with no Next.js inbound link (christmas-cc +6, holidays-cc +3, loading-screens, cas-backgrounds, nails-cc, clothes-cc +1 each), PR #495 (1ee4265, PASS) | organic search landings (GA4, all engines) on the 13 guides | 191 (10-25→11-07; site organic 41,575); last year 183 → 282 in 11-10→11-23 (×1.54) | 2026-11-24 | treated 11-10→11-23 ≥ 191 × (site organic ÷ 41,575) × 1.54 × 1.05; else MORE DATA to 12-08, then KILL; rollback `git revert` the PR | | SHIPPED |
| E376 | 2026-11-09 | Pip | 0 | AUDIENCE | Hub links to the 10 top organic-losing WP guides with no Next.js inbound link (pregnancy-mods +4, kids-cc +3, skin-details, build-cc, hair-cc +1 each), PR #497 (8de94f8, PASS) | organic search landings (GA4, all engines) on the 10 guides | 3,231 → 2,811 (−13.0%, 10-11→10-24 vs 10-25→11-07; site 41,898 → 41,575, −0.8%) | 2026-11-24 | treated 11-10→11-23 ≥ 2,811 × (site organic ÷ 41,575) × 1.05; else MORE DATA to 12-08, then KILL; rollback `git revert` the PR | | SHIPPED |
```
Overdue (Pip, read-only): E300 (due 11-07) and E282 (due 11-06) Pinterest top-up grades.

`playbooks/pip.md` (insert above the 2026-11-04 entries):
```
## 2026-11-09 — E375 seasonal guide links + E376 organic-losing guide links
- Tried: (T0) E375: linked 13 Christmas/Thanksgiving/winter WordPress guides with no Next.js inbound link from 6 hubs' `guides` (#495). E376: linked the 10 top-120 organic landings with the largest 14d loss and no Next.js inbound link from 5 hubs (#497). Each got a test that keeps every treated href on a hub, red on origin/main. Found that GA4 treats the site's `source` event param as reserved and splits sessions (361 fake sessions 11-01→11-07, home-hero 222). Fix queued for the operator (register `ui_source` first) because the rename breaks Cass's reads.
- Before → after: E375 organic landings 191 (10-25→11-07; last year ×1.54 into 11-10→11-23); E376 3,231 → 2,811 (−13.0% vs site −0.8%) → read both 11-24.
- Verdict: MORE DATA (read 2026-11-24)
- Next time: before quoting the "other" bucket, filter out sessionSource values that are our own UI surface names; until the param is renamed they are not traffic.
```

operator-queue.md, Operator-only actions — add:
`- **GA4 custom dimension `ui_source` (Pip, 11-09, ~2 min):** register event-scoped `ui_source` (property 437117335) alongside `source_type`/`partner`. Then Pip renames the reserved `source` event param to `ui_source` in the `app/layout.tsx` gtag snippet and Cass moves her reads to `customEvent:ui_source`. GA4 treats `source` as reserved and starts a fake session per event: 361 in 11-01→11-07 (home-hero 222), all counted in "other" and the non-Pinterest headline.`
