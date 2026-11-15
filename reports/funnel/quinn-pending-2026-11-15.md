# Quinn pending edits — 2026-11-15

Headless runs cannot write `.claude/agents/` (Q43). Everything below is meant for
`.claude/agents/funnel/*`. Apply it verbatim in one interactive session.

## 1. experiments.md rows

### E391 (Cass): replace the row
| E391 | biweekly newsletter issue 08 — run 1 11-11: 100/100 sent; run 2 11-13: 100/100 sent (30 deferred); run 3 11-15: 42/42 sent (30 deferred + 12 new opt-ins), 0 failed, 0 unsubscribed, 0 mailbox unsubscribes. Issue complete: 242 of 242 eligible, 0 failed (#503, #538, #547 ac81e21, PASS). Run-3 cohort got 3 picks rather than 6 (14-day window held 3 eligible mods). Read 2026-11-20: keep if 0 duplicates and engaged tagged sessions ≥ 2 per 100 sent | SENT → PENDING READ |

### E420 (Ops): new row
| E420 | 2026-11-15 | Ops | deploy-verify.sh ledger() mirrors the row into $ROOT only when $ROOT is $FUNNEL_PRIMARY_WT (pwd -P) or no primary is set; a landed (rc 0) incident file is removed from an agent worktree | Tier 0 | PR #548 · edcff84 · PASS | agent worktrees dirty after deploy-verify: ≥3/run on 11-13 → 0 on first live run (Ops tree `git status --porcelain reports/funnel/` empty; row on main, 1 copy in primary) | read 11-17: 0 "local changes would be overwritten" on changelog.md, ledger 1:1 | git revert edcff84 |

## 2. Playbook entries

### playbooks/cass.md
## 2026-11-15
- Tried: issue 08 run 3 (T1, #547): the 30 deferred plus 12 opt-ins.
- Before → after: 200/230 → 242/242, 0 failed, 0 unsubscribed. Picks fell 6 → 3 because the 14-day window moves with the send date.
- Verdict: PENDING (11-20).
- Next time: fix the picks to the run-1 date, or note the thinner issue in the D+7 read.

### playbooks/ops.md
- 2026-11-15 (E420): A "mirror for convenience" write into a tracked file is a defect wherever the durable path lands the same bytes on main — the copy turns into a conflict with main. deploy-verify wrote every row to 2 places (agent tree + primary) and pushed it to a third (main). The agent-tree copy was read by nobody and blocked checkout for 3 of 7 agents on 11-13. Before you mirror, ask who reads this copy within the same run. If the answer is nobody, do not write it. Prove the fix with git status, not with the test: the first live verify after #548 left 0 changed paths under reports/funnel/.

## 3. Nova (E413, E293 grade)

### experiments.md: new row E413
| E413 | 2026-11-15 | Nova | 0 | AUDIENCE | Suffix-split creator fold as a class: census of all 105 SFW key pairs K/K+suffix (|K|≥4); 25 with identity evidence from the rows' own links (same tumblr/patreon handle/creator domain on both keys, cross-linked handle, or CurseForge API author); 3 ties + 3 still-sub-page dropped; 19 added to MOVED_CREATOR_KEYS incl. E356-held serenity and miro; frozen plan creator-split-fold-2026-11-15.json applied 58/58, read-back 58/58; 2 duplicate indexed pairs → 0, 2 new pages (mikkimur, dumbaby), 17 grown; IndexNow 19 creator pages http=200 (#549 7fd0a81 SUPERSEDED-PASS; apply ledger 5b5b690; #553 be90986 PAPER PASS) | GA4 sessions landing on the 19 canonical /creator/ pages; guard /creator/* organic+AI ≥95% | 21 sessions 7d (15 non-direct) on the 19 targets + 21 folded slugs, GA4 11-07→11-13; guard 257.2% | 2026-11-29 | ≥46 sessions 11-16→11-29 on the 19 canonical pages AND guard ≥95%; KILL + `creator-split-fold.ts --plan=creator-split-fold-2026-11-15.json --rollback` if <40 with guard flat; else MORE DATA. 28d ceiling ≈ +25 sessions | | PENDING |

### experiments.md: E293 grade (result/status columns of the archived row)
E293 graded 2026-11-15 (Nova): guard 257.2% PASS · 746/746 sitemap-creators URLs 200, 0 308/404 · canonical-page clicks sixam-cc 0 + mably-store 0 (GSC 10-31→11-12) vs pre-fold 2 + 2 — NOT MET at noise-level n; Google still shows the old spellings (sixam 15 impr, twisted-cat 21, mablystore 7, sixamcc 4) — KEEP (code), lift UNPROVEN

### playbooks/nova.md
## 2026-11-15 — E413 suffix-split fold as a class (#549 7fd0a81 + apply 58/58, T0)
- Tried: census of every SFW creator-key pair K/K+suffix (105), folded only the 19 with identity evidence from the rows' own links (shared tumblr/patreon handle/creator domain, cross-link, CF API author). E293 graded: guard 257.2% PASS, 746/746 sitemap creator URLs 200, canonical clicks 0 vs 2+2 pre-fold (noise) — KEEP code, lift unproven.
- Before → after: 2 double-indexed pairs → 0; 2 new pages; 19 pages at 21 sessions/7d (read 11-29, keep ≥46/14d). E370's 159 new pages: 204 sessions 7d but 149 (73%) (direct) — organic+AI ≈0.05/page/day.
- Verdict: PENDING (read 2026-11-29).
- Next time: split a new-page cohort by source before calling it a win — ~3 of 4 sessions on a fresh /creator/ URL are direct, so the creator lever is ~1,400 organic+AI sessions/28d in total and no single creator move clears a few dozen.

### ideas-inbox.md: Nova triage
- Close the "garbage author names" item. The spelling splits were fixed by E356/E413, and the "Title 12345678" shape is down to 486 rows from 3,296. Requeue the remainder as: "mod-page JSON-LD emits junk author names (873 rows: 633 Patreon, 99 Amazon, 42 SimFileShare) — Sage/Rowan".
- Note: creator-split-fold.ts hardcodes `experiment: "E356"` in its plan files. Parameterize it (Nova, Tier 0).

## 4. Pip (E409, E410)

### experiments.md: new rows
| E409 | 2026-11-15 | Pip | 0 | MEASURE | Scoreboard channel rule → pure `scoreboard-channel-lib.ts`; `*.search.yahoo.com`, `cn.bing.com`, `ntp.msn.com` referrals → other_search; AI medium token-matched so `email` is no longer ai_referral (PR #554, 4858df2e) | other_search vs other 7d; email row present | other 3,040 · other_search 1,940 · no email row (11-15); ~3,715/28d misbucketed + 43/28d email as AI | 2026-11-16 | other+other_search sum unchanged within WoW; email row appears; 26 tests green | measurement, 0 sessions | pending |
| E410 | 2026-11-15 | Pip | 0 | DECIDE | Channel-mix decision: non-Pinterest 28d ex-crawler 108,184 (kill-if <80k not fired); Bing −8,100/28d diffuse; next 14d = (a) writer refresh /new-sims-4-mods-2026/ (ceiling ≈1,400/28d), (b) Pinterest stranded re-date recommendation (≈2,000–3,500/28d, operator only), (c) Shorts public (0 until public) | Bing-family landings on /new-sims-4-mods-2026/ 14d; Pinterest sessions 7d | 2,251/28d (was 3,412); Pinterest 49,137/7d | 2026-11-29 | (a) ≥2,800/28d-equiv; (b) ≥1.5 sessions/pin | — | pending |

### targets.json / B3 note
B3 kill-if checked 11-15: non-Pinterest 28d ex-crawler 108,184 (10-16→11-12; prior 109,642, −1.3%), or 105,303 without the Bing zero-pageview slice. Both are ≥80,000, so the kill-if does NOT fire. Pace ≈116k/mo vs the 160k Nov target.

### playbooks/pip.md
## 2026-11-15
- Tried: Bing −8,100/28d (−12.9%) diagnosis before building a freshness scanner (T0, no PR); E409 scoreboard re-bucket (T0, PR #554).
- Before → after: Bing landings 62,668 → 54,568 across 2,461 pages; top loser /new-sims-4-mods-2026/ 3,412 → 2,251 despite the E366 hub link. Gainers (teen-mods +324, must-have-mods +189) were last modified 01-18→02-19 — as stale as the losers (01-18) — so staleness is not the general cause and the scanner was dropped; only the one freshness-intent title ("Recently Updated", modified 07-10, 128 days) is actionable.
- Verdict: KEEP the test-the-hypothesis-on-the-gainers step; MORE DATA on E410 (read 11-29).
- Next time: before building a class-wide tool for a channel drop, check whether the gainers share the suspected cause; if they do, the cause is not it. And read `medium.includes('ai')` as a bug on sight — 'email' and '(data not available)' both contain it (43 + 9 sessions filed as AI).

### operator-queue.md: new rows
Pip proposed these as Q44/Q45/Q46. Q44 and Q45 are already taken, so they are renumbered here.
- ### Q46 · Refresh /new-sims-4-mods-2026/ for Bing freshness intent (Nova/writer, E410, Tier 1 — content; filed 2026-11-15, drops 11-29). What: update the post (new EA-patch-era mods, date in body, title keeps "Recently Updated"). Why: top Bing loser −1,161/28d, hub link already applied and insufficient. Number: Bing-family landings on the page back to ≥2,800/28d-equivalent by 11-29 (ceiling ≈1,400 sessions/28d).
- ### Q47 · Pinterest: re-date ~224 stranded queue rows into the next 14 days (Operator, E410, frozen SD-10 — recommendation only; filed 2026-11-15, drops 11-29). What: writer plugin re-date, ranked by value, not by recency. Why: queue runway 0d, 1,951 stranded, Pinterest −8.9% WoW. Number: ≥1.5 sessions/pin in 14d ≈ 2,000–3,500 sessions/28d.
- ### Q48 · Make YouTube Shorts public, approve videos 43765 / 43766 (Operator, E410, Tier 2; filed 2026-11-15, drops 11-23). 0 sessions until public.

### ideas-inbox.md: Pip triage
- Resolved by E409: "[ops] Scoreboard buckets *.search.yahoo.com … as other (Pip 11-05)".
- New [cass/ops]: internal ref/utm values (home-hero 711, mod-detail-optin 272, collection-page 133, mod-detail-favorite 50 sessions/28d) start new GA4 sessions as Unassigned. Unassigned went 948 → 2,308/28d, and ≈1,200 of that is this inflation. Find where the parameter is set (likely client-side or WP) before anyone reads "Unassigned +143%" as traffic.

## 5. Rio (E416)

### experiments.md: new row
| E416 | 2026-11-15 | Rio | 0 | MONETIZE | Skip-the-wait perk read vs $3-tier joins: perk reached 3 of 58 payers lifetime (41 events, ≤5 users since 09-08); 30d $3 joins 4 → 9 (0.13 → 0.30/day), cancels 14 → 6, patreon_click users 233 → 340 (+46%), joins per 100 clickers 3.4 → 4.7. Perk KEEP as feature / KILL as conversion story — no widening, no tier re-pitch (Q4 closed). B2 November line pre-committed. | Read on 2026-11-30 (Members API, --since 2026-11-16) | Keep drift line if $3-tier joins 11-16→11-30 ≥ 4 AND paid ≥ 60 (baseline 58 paid, $150.50/mo); cancels > 8 reopens churn read | PR #551 a17f9c6, reports/funnel/rio-verdict-2026-11-15.md |

### Notes for Quinn's files
- October competitor move #3 (due 11-30): delivered early by E416. Mark it read.
- RPM read: the 28d revenue gap to the ramp (−$1,519) is 100% sessions. Sessions account for −$2,084 and RPM gives back +$565 (implied RPM $17.53 vs the ramp's $16.33).
- Ad-side falsifier, pre-committed: if the 7d monetizable-pv share is <85% on any scoreboard after 11-18 with CPM flat, treat it as Mediavine-side.

### playbooks/rio.md
- 2026-11-15 (E416): Read a perk's *reach* before crediting it with a join lift. The $3 skip-the-wait perk had been used by ≤5 of 58 paying patrons (5.2%) in 68 days while $3 joins doubled 4 → 9 per 30 d; the variable that moved with joins was patreon_click users (+46%), i.e. CTA reach, not the perk. A perk that 95% of payers never touch cannot be the mechanism — look at the funnel step that scaled.

## 6. Sage (E411, E412)

### experiments.md: new rows
| E411 | 2026-11-15 | Sage | 0 | AUDIENCE | One-time IndexNow push of 7,958 never-submitted /mods/<id>/ pages (createdAt < 2026-09-07), 50/50 holdout by sha256('E411:'+id); control 7,880 never sent (PR #550, c6a9203; push http=200) | Bing organic landing sessions per mod, T vs C (difference-in-differences); Google is the placebo | 10-31→11-13: T 0.1336/mod (1,063 sess, 312 pages) vs C 0.1176/mod (927, 289); A/A pre-check KILL (rel −6.9%) | 2026-12-01 | T beats C by ≥10% relative AND ≥0.02 sess/mod absolute (`indexnow-mod-backfill.ts --grade --pre 2026-11-01,2026-11-14 --post 2026-11-16,2026-11-29`). 28d ceiling ≈4,099 (upper bound) | pending | pending |
| E412 | 2026-11-15 | Sage | 0 | AUDIENCE | Homepage "Popular Sims 4 guides": 20 striking-distance WordPress guides (GSC pos 8–20, no Next.js inbound link) linked from the server-rendered collections area; 20 impression-matched controls never linked; assigned by sha256('E412:'+path) (PR #555, b50df4d) | GSC clicks + impression-weighted position, T vs C (difference-in-differences); secondary GA4 Google+Bing organic landings | GSC 10-16→11-12: T 4,074 impr / 141 clk / pos 12.5 vs C 3,989 / 129 / 12.1; GA4 10-17→11-13 T 1,671 vs C 2,244 landings; home $0.9645 per 1k site sessions | 2026-12-01 | T clicks ratio beats C by ≥15% relative AND T position improves ≥1.0 more than C, AND home $/1k site sessions ≥ $0.9356. 28d ceiling ≈300 | pending | pending |

### playbooks/sage.md
## 2026-11-15
- Tried: sizing a full-catalog IndexNow backfill of mod pages from the gap between Bing and Google coverage (Bing lands on 5.2% of pre-July mod pages, Google on 15.3%, at ~5.1 Bing sessions per landing page per 28d, so ~8,158 sessions/28d if Bing caught up).
- Before → after: the cohorts IndexNow had already pushed reached fewer pages on Bing, not more (5.1% of pages 09-14→10-15, 2.1% 10-16→11-13), and mod pages with no creator link earned more Bing sessions per mod than linked ones (0.506 vs 0.218). So neither coverage nor linking explains the gap on its face; shipped as a 7,958-vs-7,880 randomized holdout (E411) instead of a full push.
- Verdict: a coverage gap is not a ceiling until a randomized arm closes it; the observational evidence pointed the wrong way twice. Read 2026-12-01.
- Next time: before pushing any list to a search engine, hold out half by id hash and run the grader on two pre-period windows first (A/A here: KILL, rel −6.9%) so the pass rule is known not to fire on noise.

### Notes
- Process slip, self-reported: Sage chained `gh pr view` with `;` instead of `&&` after the #555 merge. No harm, since state read MERGED.
- Rio: watch homepage RPM until 11-22 (E412 guard, $0.9356 per 1k site sessions).

## 7. Rowan (E418, E419)

### experiments.md: new row
| E418 | 2026-11-15 | Rowan | Gameplay-mods browse hub `/games/sims-4/gameplay-mods/` (511 SFW gameplay/script/career mods), shipped after fixing its gate: E418 pins Wonderful Whims, Cuddle and Bath Together, WW Menstrual Cycle Feature isNSFW=true from mod text; E419 pins Teen Romance Mod, Teen/Adult Romance & Mess Around, Sleeping Animation Pack (found via the hub's #1 homepage cover); 15 leg-(c) false positives pinned on-type by id (HAND_AUDITED_ON_TYPE). Gate --top=48 ELIGIBLE. Inbound: pregnancy-mods + houses-lots related, homepage, /games/sims-4/, mod-page primary breadcrumb. PR #552 ed0d5a6 | Hub landing sessions (GA4); guardrail legacy gameplay-family organic landings | 0 (404); legacy family ≈4,051/28d (GA4 10-17→11-13) | 2026-11-29 | Keep if hub ≥30 landing sessions 11-16→11-29 AND legacy family ≥95% of prior 14d site-relative (one-sided). Ceiling 1,367/28d = 1.15% of the ≈119k gap; expected 586–715 (0.5–0.6%) | open |
(E419 is the second isNSFW batch inside E418. Apply ledger rows: f750e1f1 E418 3/3, 6cf21ba5 E419 3/3.)

### playbooks/rowan.md
2026-11-15 — Look at a new hub's generated covers before you ship it; they are a top-N spot-check you can see. The gameplay hub passed its pre-committed gate (ELIGIBLE, 0 adult in the first-paint 48), yet its #1 card and #1 homepage cover was "Teen Romance Mod" — a Teen + Young Adult "mess around" mod with an innocent title that no title regex can catch. A text scan of all 514 rows then found 2 more of its class (a second catalog row; a Wicked Whims "sex"-menu animation), pinned as E419 (131 landing sessions/28d on the three pages, which still serve 200). Also: two pin tables that disagree make a hub ungradeable by construction — my E242 pinned two mods SFW that Sage's watchlist failed the hub on; a class guard ("every watchlist id is pinned NSFW") now fails on that state (red on pre-fix main, 11/39 new cases).

### operator-queue.md: new row
- ### Q49 · Ruling: ~20 mods that only tweak base-game WooHoo — SFW or NSFW? (Operator, policy; filed 2026-11-15, drops 11-22). Rowan left them SFW. Also: a mod re-marked NSFW still serves its own /mods/<id>/ page at 200 (E418/E419: 165 landing sessions/28d). Say whether NSFW mod pages should stay reachable. Changing that is Tier 2 (routing + ad inventory).

### ideas-inbox.md: Rowan next
- Hand-fix male-clothes and shoes-cc wrong-type rows; title-only gender rule for male-hair (Rowan, T0/T1).

## 8. Quinn

### operator-queue.md updates
- Q41: DROPPED 11-15 (7-day rule, no reply).
- Q44: DROPPED 11-14 (already recorded).
- Q45 (functions.php crosslinks bundle incl. nursery): open, drops 11-18.
- Q43 (headless cannot write .claude/agents/): smaller re-pitch. Run one interactive session that applies quinn-pending-2026-11-1{3,5}.md verbatim. 6 pending files are now off main, and this run's quinn.md edit was denied again.
- Q46–Q49: new (sections 4 and 7 above).
- #414 (E305): HELD again. Sessions are 74.7% of the ramp, not ≥97%.
- Newsletter issue 08: CLOSED (242/242). Read on 11-20.

### experiments.md: E421/E422 unused (reserved, not shipped)
- E414 (Nova 2nd), E417 (Rio 2nd), E421 (Ops 2nd) and E422 (spare): reserved and unused.

### playbooks/quinn.md
## 2026-11-15
- Tried: watch-rule day. AUDIENCE-only Tier 1, every AUDIENCE move states its 28d ceiling, Pip and Sage owe ≥1 move ≥1,150/28d each.
- Before → after: 10 merges, 0 rollbacks, every ledger row on main. The sum of today's stated AUDIENCE ceilings is E411 4,099 + E418 1,367 + E412 300 + E413 25 + E409 0 = 5,791 sessions/28d, all upper bounds. That is 4.9% of the ≈119,000 gap. The two operator-only levers (Pinterest re-date 2,000–3,500; Shorts public) are the same size as the team's entire best-day output. Pip could not find an in-lane move ≥1,150; Sage made it only with an upper bound that was RCT-gated because the observational evidence pointed the wrong way.
- Verdict: KEEP the ceiling rule. It turned "busy" into a number, and the number says the gap cannot close on Tier 0/1 moves at this rate (≈20 such days at 100% hit rate).
- Next time: rank the operator queue by stated ceiling. Put the two largest operator-only levers at the top of section 2, with their ceilings, every day until answered.
