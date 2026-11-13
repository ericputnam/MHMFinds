# Quinn — pending `.claude/agents/` edits, 2026-11-13

Headless runs cannot write `.claude/agents/` (Q43, 5th run: 11-05, 11-06, 11-07, 11-11, 11-13).
Everything below is verbatim text to file into the named file once Q43 is approved or an
interactive session runs. Nothing here is applied yet.

## §1 experiments.md rows

```
| E397 | 2026-11-13 | Pip | 0 | AUDIENCE | launch-amplification short for dresses-cc hub (E388): "gowns for the holiday party save", 5 mods (LyugL, Mably Store, Mablystore, Camuflaje, Belaloallure; 2 placeholder-author rows + 2 weak images dropped), video 43765 pending_review, slot 2026-11-20 21:00Z, campaign short-2026-11-13; check 0 problems, target 200 | sessions landing /games/sims-4/dresses-cc/ with utm_campaign=short-2026-11-13; hub non-Pinterest landings | campaign 0 (all short-* all-time 3, GA4 10-01→11-12); hub non-Pinterest 3 (11-11→11-12) | 2026-11-27 | ≥10 campaign sessions within 7d of posting; platforms still private → MORE DATA, not KILL | | RUNNING |
| E398 | 2026-11-13 | Pip | 0 | AUDIENCE | launch-amplification short for victorian-cc hub (E393): "victorian cc for the whole household", 6 mods/6 creators (Obsidian Bedroom dropped: same image credited to two creators), video 43766 pending_review, slot 2026-11-23 21:00Z, campaign short-2026-11-13; check 0 problems, target 200 | sessions landing /games/sims-4/victorian-cc/ with utm_campaign=short-2026-11-13; hub non-Pinterest landings | campaign 0; hub non-Pinterest 2 (11-11→11-12) | 2026-11-27 | ≥10 campaign sessions within 7d of posting (read again 11-30 if the post was ≤4d old on 11-27); platforms still private → MORE DATA | | RUNNING |
| E399 | 2026-11-13 | Sage | 0 | AUDIENCE | tops-cc hub + 228 off-type tops corrected by hand-read --ids pins (tops SFW Sims 4 1,083 → 855; apply ledger 06:47; rollback catalog-e399-apply-2026-11-13.json) (PR #541 e3fe870, PASS; IndexNow 81 URLs) | GA4 organic+AI landings: hub + 9 legacy tops articles | hub 0; legacy 326/28d | 2026-11-27 | hub ≥15 search+AI landings in 14d AND legacy ≥155 in 14d; 228/228 pins hold on 11-20 | | SHIPPED |
| E400 | 2026-11-13 | Sage | 0 | AUDIENCE | houses-lots hub (706 SFW Sims 4 lots, 690 free; top 48 ELIGIBLE, 0 adult, 0 off-type) + 277 lot-family (983 → 706; residential alone 251/547) and 85 gameplay-family off-type rows corrected (apply ledger 07:09 + 07:13; the 07:09 row says "gameplay-mods hub" and the 07:13 row "lots-cc hub" — planned names; gameplay hub rejected by the pre-set eligibility gate on 2 adult rows still marked SFW); inbound build-cc + witch-cc (PR #544 ed3fa41, PASS; IndexNow 83 URLs) | GA4 Organic Search+Referral+AI Assistant landings: hub + 6 legacy house articles | hub 0; legacy 387/28d (10-14→11-10: houses 163, castles 81, hotel-lots 42, family-house 39, modern-houses 29, cottage-houses 27) | 2026-11-27 | hub ≥15 in 14d AND legacy ≥184 in 14d (95%, one-sided); 277/277 + 85/85 pins hold on 11-20 | | SHIPPED |
| E404 | 2026-11-13 | Rowan | 0 | AUDIENCE | `/games/sims-4/nursery-cc/` (51 cards) on title-only `nursery` theme (`lib/nurseryThemeRules.ts`; nursery/nurseries 46, crib(s) 4 kept, changing table(s) 2, `invisible` excluded; rejected toddler room 6, newborn 3, playmat 3, bassinet 1, bare baby 79, mobile 2); removed from ROOM_THEME_RULES (was 100 rows, 45.0% title-supported, pregnancy overhaul at card #5); dry run add 4 / strip 53, every ADD row read; apply ledger 5aab715a; inbound kids-cc + pregnancy-mods; IndexNow 11:55:51Z http=200 (#540 43057c8, PASS) | GA4 landings new page + legacy /sims-4-nursery-cc/; GSC clicks/impr both | page 404; legacy 1,125 landings 14d (976 Pinterest, 127 organic search; GA4 10-30→11-12); GSC 45 impr / 1 clk pos 33.8 (10-14→11-10) | 2026-11-20 / 2026-11-27 | page ≥1 GSC click or ≥10 landings 11-13→11-26 AND legacy ≥957/14d (85%) AND 51/51 tagged; kill if legacy <85% with page 0 clicks; rollback `git revert 43057c8` + `nursery-theme-retag-2026-11-13.csv` | | SHIPPED |
| E405 | 2026-11-13 | Ops | 0 | OPS | APP_LASTMOD + HOME_SHELL_LASTMOD 11-06 → 11-11, COLLECTION_TEMPLATE_LASTMOD 11-09 → 11-11; sources changed by 97ee5083 (operator audit), #502, #519, all merged with E303 guard red; 3rd hand bump (E329, E364) (#537 e9b5d76, PASS) | failing unit test files on main | 1 file / 2 tests red on e38f7351 (guard 3/5); branch 225/225 files, 3,736 tests | 2026-11-20 | 0 failing unit files on main, or each failure owned; guard red again before 11-20 → class fix (pre-merge template-source check) is Ops's next move | guard 2/5 red pre-fix → 5/5; live / dateModified 2026-11-11 | PENDING |
| E403 | 2026-11-13 | Rio | 1 | MONETIZE | The scoreboard's non-ad headline reads the Patreon Members API, falls back to the public page only if the API fails, names its source, and shows null when neither is measured (E126); funnel-history treats Patreon as unmeasured only when that source is null (PR #539, ab6b947) | headline non-ad $/mo + headline.nonAdSource | $179.00 public counter (69 paid) → $144.50 Members API (56 paid), live run 11-13 | 2026-11-14 | keep if the headline says members-api and matches the "Paid patrons (API)" row ±$0.01; on an API-failure day it says public-page or ?, never $0; else revert #539 | #539 | rio-verdict-2026-11-13.md |
| E401 | 2026-11-13 | Nova | 0 | SUPPLY→AUDIENCE | Simsfinds creator from the download page's own JSON-LD (`lib/services/simsfindsAuthor.ts`: exact host, data-bycreator="1" only, exactly one Person author, usable name; never the URL's "-by-x-" text). Backfill `simsfinds-author-backfill.ts`: dry run 91 targets (91/91 HTTP 200) → set 71, skipped 20 re-uploads, 1 hand-dropped (Modcollective = modcollective.gg marketplace) → 70 applied, drifted 0, read-back 70/70; 28 authors, 7 new creator pages (outfitopia, polygoncouture, quen2n, redheadsims, shoestopia, simtographies, v1s4g3) + 13 grown, 58 mods onto pages. mhmScraper runs the same extractor at ingest, and a bare simsfinds.com host no longer slugs to "Simsfinds". IndexNow 46 URLs http=200 (#542 4387b6f SUPERSEDED-PASS, #543 de55b8b PAPER PASS; apply ledger 045f4114) | GA4 landings on the 20 affected /creator/ slugs (organic+AI graded, total reported); Simsfinds unusable-author count | 13 organic+AI / 28 total (10-30→11-12); 7 new slugs were 404; Simsfinds unusable 91 | 2026-11-27 | ≥20 organic+AI 11-14→11-27 AND 7/7 new slugs 200 + in sitemap-creators.xml AND Simsfinds unusable ≤21; kill lift if <13; data rollback `--plan=simsfinds-authors-2026-11-13.json --rollback` on any author dispute | | SHIPPED |
```

E386 (Pip, #511): result cell → `SHIPPED 11-13 (Quinn T1 release) · 49df1c1 · verify SUPERSEDED-PASS · /christmas-cc/ → 308 /games/sims-4/christmas-cc/ confirmed by curl`.

E391 (Cass) result cell → `run 1 (11-11): 100 sent / 117 deferred · run 2 (11-13): 130 recipients (117 + 13 new), 100 sent, 0 failed, 30 deferred, 0 unsub; record #538 ccf162e PASS, rows 85e568bd + f14703c5 · run 3 (30) before 11-17 · read 11-20 | SENT`. (E402 unused by Cass — returned to spares.)

E332 (Rio) last cell → `(b) PASS 11-13 (graded 2 d late): 7d 11-04→11-10 imp/sess 18.34 (1,579,173/86,115) vs 16.47, session RPM $19.20 vs 95%×$16.62=$15.79 → no T2 ad-density package; CLOSED. Gain is depth: pv/sess +18.5%, imp/pv −6.0%, $/1k imp +3.7%, rev per monetizable session −4.1%.`

Quinn note on E403: Rio labelled it Tier 1 and merged it the same day. Tier 1 means open-and-wait (merge next agent day unless stopped). Content is scripts/agents/** scoreboard plumbing with no production surface, so Quinn grades it as a Tier 0 move mislabelled, not a T1 bypass — but the label and the action must agree. Recorded, not reverted.

## §2 playbooks

### pip.md
```
## 2026-11-13 — E397/E398 launch shorts for the 11-11 hubs
- Tried: (T0) shorts for dresses-cc (43765, 11-20) and victorian-cc (43766, 11-23) from collection picks.
- Before → after: the default collection pick gave 8 mods per hub, and 4 of 16 were unusable: 2 placeholder authors, 1 item credited to two different creators, 1 duplicate image. 3 more were dropped for weak images. Final 5 + 6 mods, check 0 problems. short-* sessions all-time = 3 (Shorts still private).
- Verdict: MORE DATA (read 11-27)
- Next time: run the auto-pick, then look at the contact sheet of every slide before writing copy; about 1 in 4 collection picks can't be credited cleanly.
```

### cass.md (newest at top)
```
## 2026-11-13 — E391 newsletter-08 run 2 (T1, #538)
- Tried: resumed issue 08 from the run-1 cursor two days later; re-ran scripted-signup-hashes (0 unlisted) and checked the send path was unchanged since run 1 before trusting the dry.
- Before → after: dry tail 117 (11-11) → 130 (11-13) = exactly +13 waitlist rows (339 → 352), under the 2×6.6/day×2d = 26 gate; live 100/100 sent, 0 failed, 30 deferred; issue 08 now 200 of 230 eligible.
- Verdict: PENDING (read 11-20).
- Next time: a deferred tail grows by every opt-in between runs, so a 117-row tail needed 2 more runs, not 1. Schedule the last run before computeIssueNumber steps (here 11-17), or the tail gets the next issue.
```

### rowan.md
```
## 2026-11-13 — E404 nursery-cc (title-only room theme, 51 cards)
- Tried: moved the last description-fed room theme (`nursery`) to title-only and put a page on it (PR #540 43057c8 PASS; apply ledger 5aab715a).
- Before → after: `nursery` 100 rows / 45.0% title-supported (LittleMsSam's Pregnancy Overhaul at card #5) → 51 / 100%; top 24 hand-read 24/24. Legacy article 1,125 landings in 14d with no browse page.
- Verdict: MORE DATA (read 11-20 / 11-27).
- Next time: a strip list can be bigger than the page itself (53 strips against 51 kept). Read the STRIP list for real nursery items whose title doesn't say so; those are `--ids` pins after checking the creator page, not rule words. Coquette had 15 whole-word titles, under the 20-card bar. The IndexNow dry-run printout only shows the first few URLs — confirm with `collectionUrls().indexOf()` or `logs/indexnow.log` before `--apply`. Run the new guard against pre-fix main and quote the red cases (skipped today — Quinn).
```

### ops.md
```
## 2026-11-13 — E405
- Tried: bumped APP/HOME_SHELL and COLLECTION template lastmod constants to 2026-11-11 so `template-lastmod-git-guard` is green on main (T0, #537 e9b5d76, verify PASS 07:00).
- Before → after: guard 2/5 red on origin/main → 5/5; full unit suite 225/225 files, 3,736 tests; 3 stale-making commits (97ee5083, #502, #519), 2 of them operator commits outside the funnel ship protocol.
- Verdict: PENDING (read 2026-11-20).
- Next time: this is the 3rd hand bump in 9 days (E329 11-04, E364 11-06, E405 11-13). A guard that only runs when someone runs the full suite catches the drift after merge, never before. The 4th occurrence gets the class fix: a pre-merge check, not another bump.
```

### rio.md
```
## 2026-11-13 — E332(b) + E403
- Before calling an RPM rise "rate", break session RPM into pageviews/session × impressions/pageview × $/1k impressions. On 11-13, RPM +15.5% was entirely pv/session (+18.5%); $/1k imp +3.7%, revenue per ad-serving session −4.1%. Then price the ramp gap at the ramp's own RPM ($15.09): sessions explained 129% of the $1,344 gap, so no RPM move could have closed it.
- Label and action must agree: a PR called Tier 1 waits a day; if it is safe to merge today, call it Tier 0 and say why.
```

### nova.md
```
## 2026-11-13 — E401 Simsfinds authors from the page's own structured data (#542, #543, T0)
- Tried: before scraping text, looked for what the source states about itself. Simsfinds puts a JSON-LD Person author on 71/91 pages, exactly the ones flagged data-bycreator="1". The 20 re-uploads (bycreator=0) name nobody, even when the URL says "-by-pralinesims-".
- Before → after: 91 Simsfinds rows with no usable author → 21 (70 applied, read-back 70/70); 7 new + 13 grown creator pages; 20-slug baseline 13 organic+AI / 28 total (10-30→11-12).
- Verdict: PENDING (read 2026-11-27).
- Next time: an aggregator's "uploaded by creator" flag is the gate. Without it, the name on the page is the uploader's. Also check what existing rows under a key link to before growing that page: the "Modcollective" page is a marketplace (every row links modcollective.gg), not a creator.
```

### sage.md
```
## 2026-11-13 — E399 tops-cc, E400 houses-lots
- The share of rows in the wrong category depends on the category, so read the whole category before building a hub on it. Lots 277/983 wrong (28.2%; `residential` alone 251/547 = 45.9%, mostly walls/windows/furniture); tops 228/1,083 (21.1%); gameplay 85/557 (15.3%). The pre-set eligibility gate blocked the gameplay hub on 2 adult rows; moving the same reading time to lots took that category from NOT ELIGIBLE to ELIGIBLE in one run.
- Ledger hygiene: write the shipped name in the apply row, not the planned one (07:09 "gameplay-mods hub", 07:13 "lots-cc hub" — shipped as houses-lots).
```

### quinn.md
```
## 2026-11-13 — AUDIENCE-only dispatch produced pages, not sessions
- Tried: BELOW-LINE re-weighting (ramp 75.4%): 9 AUDIENCE moves across Pip/Sage/Nova/Rowan + #511 release; 11 production merges, 7 DB applies, 0 rollbacks.
- Before → after: the baselines the new moves are graded against sum to ≈3,000 landings/28d (tops legacy 326, houses legacy 387, nursery legacy ≈2,250 = 1,125/14d ×2, 20 creator slugs ≈56 = 28/14d ×2, two shorts 0) against a ~115k-session/28d ramp gap. Rio priced the gap: sessions are 129% of the $1,344 revenue gap.
- Verdict: MORE DATA (11-27), but the sizing is already known: even if every baseline doubles, that is ≈3,000 sessions/28d = ≈2.6% of the gap.
- Next time: under AUDIENCE-only, require each AUDIENCE move to state its ceiling in sessions/28d, and dispatch at least one move per run whose ceiling is ≥1% of the gap (≥1,150 sessions/28d). Candidates on file: Yahoo/cn.bing classification (≥1,548/14d mis-bucketed — measurement, not growth), making Shorts public (operator), Bing-scale pages.
```

## §3 operator-queue.md

- [operator] Review videos 43765 (11-20) and 43766 (11-23) in WP → Videos → Queue — no reviewer email was sent.
- T1 (Cass) newsletter-08 run 3: the 30 deferred, 11-15, `--resume-after '2026-11-08T11:35:26.302Z~cmw7ra1jx4qo4xjdz5wmv4yea'` — ships 11-15 unless "stop newsletter-08-r3"; must go before 11-17 (issue number steps to 09).
- [operator] Still open: make the YouTube Shorts public (every short-* grade stays MORE DATA until then).

- Q45 bundle (Tier 2, functions.php `mhm_collection_crosslinks`): legacy `/sims-4-nursery-cc/` → `/games/sims-4/nursery-cc/` ("Browse all 50+ Sims 4 nursery CC"). (Rowan)

## §4 ideas-inbox.md

- [ops] video-queue reviewer email: `wp_mail failed for every reviewer` on 2 of 2 runs (11-09, 11-13) — check the blog's SMTP plugin. (Pip)
- [ops] internal-tag numbers for the existing line: home-hero 920, collection-page 163, mod-detail-optin 79 = 1,162 sessions/14d (GA4 10-30→11-12). (Pip)
- [pip] B3 11-15 read: Yahoo search country domains ≥1,323 + cn.bing.com 225 sessions/14d are logged as referral — real search, not in bing_organic. Classify before calling a channel-mix decline. (Pip)
- [rowan] curly hair: `/sims-4-cc-curly-hair` 1,066 landings/14d, GSC 73 impr pos 12.9; 116 whole-word "curly" titles counted, not read. Medieval: 51 titles, legacy 343/14d. Coquette rejected for now: 15 titles (<20) vs 1,981 legacy landings/14d. (Rowan)
- [rowan] possible nursery `--ids` pins from the strip list after checking creator pages: "Lullaby + Striped Wallpapers", "SimtriBullet Baby Set", "Sweet Dreams Murals for Kids", "Mikaella Functional Toys". (Rowan)
- [ops] unscheduled WeWantMods scraper still writes bathroom/kitchen/bedroom/kids-room themes from URL slugs; only nursery filtered now — close the rest if it is ever scheduled. (Rowan)
- [ops] deploy-verify leaves its ledger row as an uncommitted `M changelog.md` in the agent's worktree after ledger-commit.sh landed it on main — reproduced again on #537 (Ops's next move, T1).
- [quinn] protocol slip ×3 today (Rowan, Ops, and Quinn's own #511 chain): `; gh pr view` instead of `&& gh pr view`. Harmless (read-only, state was read), but the documented chain is `&&`-only.
- [ops] DROP the "scoreboard Patreon count from Members API" line — Rio shipped it (#539). (Rio)
- [rio] 11-14/11-15 finalize 11-11 and 11-12 (operator's #514→#535 batch). 59 deploys in-window vs rollback bound 24: if either day reads red, the breaker will not auto-roll back — bisect by page RPM on /mods/*, /go/*, upload/creator paths. (Rio)
- [rowan] `/creator/modcollective/` is a platform page (rows link modcollective.gg) — probably belongs in NON_CREATOR_SLUGS. (Nova)
- [nova] `curseforgeProjectSlug` rejects slugs containing `_` (e.g. `kat-y2k-makeup-set_remake-version`) — may be part of the 41 NULL CurseForge rows; measure before changing the regex. ModTheSims (11) / TSR (10) empty authors despite page scrapers — next. E293 grade (due 11-13) carried to 11-15 (needs GSC read). (Nova)
- [ops] deploy-verify leftover ledger edit blocked `git checkout` in Nova's tree again (3rd reproduction today with Ops's #537). (Nova)
- [rowan] adult flags before any gameplay-mods hub: Wonderful Whims (cmim91d7u01l8oxy8mrvijtik), Cuddle and Bath Together (cmim8rs4i002eoxy8enc7gbsp); review Cannibalism, Extreme Violence, butt/hip sliders, Woohoo tweaks, "Wicked Whims – Menstrual Cycle Feature". (Sage)
- [ops] hub-eligibility off-type check for gameplay matches "Bed" in "Bed Cuddle" (false positive). (Sage)
- [nova/rowan] 131 walls/windows/doors/wallpaper rows now uncategorised — a `walls` type could give them a page. (Sage)
- [sage] eyes-cc copy still says "eyebrows 130"; count is 127. (Sage, carried)
- Note: Sage reported template-lastmod-git-guard "still red on main" — stale; Ops's #537 (06:56) turned it green.
