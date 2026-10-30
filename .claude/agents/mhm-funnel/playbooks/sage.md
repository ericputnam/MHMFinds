<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Sage — Search & AI — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. "I think it worked" is not a learning. Covers search and AI: indexing findings, what moved GSC clicks or AI referrals, SSR/schema outcomes.

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

## 2026-10-30 — E292 creator→hub links (#408) · E299 creators sitemap lastmod (#412), both Tier 0
- Tried: ~527 creator pages (4,072 impr / 103 clk, 28d) carried zero links to the hubs at pos 20–37; URL Inspection showed the hubs' only referrers were other hubs and /creator/orchiona/ last crawled 09-24. Then found the creators sitemap still said January on 169/554 entries after E267 rewrote every creator meta — only 28/554 had lastmod ≥ 10-27. Applied the E37 laterOf(template, newest) rule; IndexNow pushed 717 URLs (554 creators) http=200.
- Before → after: /games/sims-4/* 277 clk / 7,095 impr; /creator/* 103 / 4,072 (09-30→10-27); sitemap 28/554 fresh → 554/554 at 2026-10-30 (curl 11:41Z).
- Verdict: MORE DATA (both read 2026-11-20 on GSC 10-31→11-19).
- Next time: a route.ts may export only route fields — a helper that needs a unit test lives in lib/, or `next build` fails on the export; and bump CREATOR_TEMPLATE_LASTMOD whenever the creator template changes.

## 2026-10-29 — E268 landed (PR #381, Tier 0) · E284 cohort 2 of hand-written mod metas
- Tried: #381 was 40 commits behind main; merged origin/main clean (3 files, 0 conflicts), 82 tests green, build + type-check clean, merged f1eaf2e. Then the next cohort from the /mods/* class read (GSC 09-30→10-27, 220 rows): six pages with ≥60 impr at pos ≤23 and ≤1.5% CTR not already in E268 — Better Build/Buy 123/1/22.7, Dynamic Teen Life 109/1/17.0, Into the Light 101/1/6.0, Live-In Services 70/1/14.7, Black Magic 69/1/9.6, Turbo Careers 60/1/15.3 = 532 impr / 6 clk / 1.13%. Every query is the mod's own name (navigational); two pages have contentType null so the rule-built title carried no "Mod" at all → title overrides for those two. Rejected: nails-cc (208 impr/1 clk, pos 17) and tattoos (152/2, pos 21.8) — visible queries are 17 and 13 impr of long tail, no title to write (as E238).
- Before → after: cohort 2 CTR 1.13% (6/532, 28d) → read 2026-11-12 (14d 10-30→11-12), final 2026-11-27 (28d).
- Verdict: MORE DATA. Graded today: E71 KEEP (7d 10-16→10-22 = 519 ≥385; chatgpt 28d share 90.5% vs 89.5%), E224 KEEP (519 ≥300, chatgpt 97.1%), E189 KEEP first read (/mods+/games 1,085 ≥768; / 496 ≥340), E210 KEEP (20 clk / 575 impr / pos 22.2, 10-16→10-27), E217 KEEP (pins 4/4, pop 384), E245 KEEP (W43 Bing /creator/* 74 sessions / 50 URLs), E203 NOT MET → links stay (apex 3 clk / 97 impr / pos 14.0, 10-19→10-25).
- Next time: /mods/* is where Google impressions sit (22,393 impr / 816 clk in 28d vs 7,258 / 269 on /games/*); the GSC page read sorts by clicks, so 0-click pages with high impressions fall off a 220-row list — pull the 0-click tail with a query-dimension read before calling a cohort complete.

## 2026-10-23 — E259 homepage title leads with "Must-Have Sims 4 Mods", 15,000+ → 17,000+ (Tier 0, PR #367)
- Tried: no hub was eligible. Unbuilt facets ≥20 SFW rows: lots (E252 NOT ELIGIBLE), gameplay (watchlist isNSFW 6/8 — Wonderful Whims, Cuddle and Bath still false; 2 adult + 1 off-type in top 30), workout+gym (158 rows, ≈18/48 off-type by hand: "Anorexia Trait" #1, Pilates Mod, gym lots, poses; family demand ≈60 impr, no query >5, already on /sims-4-gym-clothes-cc/ @5), royals+princess (55 rows ≤8 downloads from one scrape; "royal cc" 14 impr on the listicle @8.5). `workout`/`gym`/`royals`/`princess`/`easter` are themes written into contentType — Rowan. GSC sitemap `contents[].indexed` is "Deprecated; do not use" in the Sitemaps API docs: the 7-week "0 of 18,247 indexed" item is closed — indexing reads come from URL Inspection only. Homepage: must-have cluster on `/` 321 impr / 34 clk, 10.6% CTR, pos ≈7 (14d 10-07→10-20) under a title saying "Finder — 15,000+" (catalog 17,004).
- Before → after: "Sims 4 Mods & CC Finder — 15,000+…" → "Must-Have Sims 4 Mods & CC — 17,000+ Verified Finds | MustHaveMods"; count fixed in WebSite/FAQ JSON-LD, llms.txt, llms-full.txt. Brand-exact guard 103 clk / 196 impr on `/` (14d). Verify PASS 5912df1.
- Verdict: MORE DATA (read 2026-11-08 on 10-24→11-06: keep if cluster CTR ≥12.5% and clicks ≥38 with brand-exact clicks ≥93; revert if brand <88 or cluster CTR <8%).
- Next time: hubs earn AI landings without Google demand (cc 26, build-cc 25 AI sessions/28d vs 1–2 Google each) — a clean facet is worth a hub for the AI leg alone; the blocker is grid cleanliness, not impressions.

## 2026-10-21 — E252 the tool said ELIGIBLE for a grid that was 18/48 not lots (Tier 0, PR #359)
- Tried: the only unbuilt family with ≥20 rows is lots (lot+residential+commercial+community, 959 SFW). The eligibility tool printed ELIGIBLE with no `--family` — leg (c) was vacuous — while 18 of the first 48 rows were objects, careers, a save file, an EA pack and a Sim. Fixed the class, not the read: no family → INCONCLUSIVE; `OFF_TYPE_RE.lots` measured on all 959 (rejected with counts: `cc` 32 hits/3 "(No CC)" lots, `home` 49, `starter` 22/21 lots, `functional` 4/1, `kiss` 2/1); `nails?` → `nails|nail (polish|art|…)` (1/544 gameplay hits, the career).
- Before → after: lots verdict ELIGIBLE → NOT ELIGIBLE, 16/48 named, 0 false positives on the 30 real lots; gameplay off-type 1 → 0. 7 new tests fail on the pre-fix lib.
- Demand (GSC 09-21→10-18): bare lot/house browse terms ≈60 queries, none >5 impr, 1 click; hospital-lot terms (65 impr) already land on /sims-4-hospital-lots/ @6–10. The 10-18 "≈170 impr" was the generous read. No hub.
- Verdict: KEEP (deterministic). Next time: a hub grader with no family is not a grader — add and measure the family BEFORE quoting a verdict. 18 ids for Rowan in PR #359.

## 2026-10-19 — E238 hub-eligibility read is a script; gameplay BEFORE taken (Tier 0)
- Tried: no title fix was worth shipping — `/games/*` 28d (GSC 09-19→10-16): the only hub at pos ≤15 with ≥50 impr and 0 clicks is nails-cc (90 impr, pos 15.3) and its title already names its 14 visible-query impressions; poses (1,036 impr, pos 12.1, CTR 3.9%) already carries "Gallery Poses" and moved 968/18/pos 25.4 → 1,036/40/12.1 on its own. So: `scripts/agents/collection-hub-eligibility.ts` (+ `-lib`, 11 tests) mirrors the hub page's own where/order and prints the rule before the read.
- Before → after: gameplay-mod+script-mod+career = 550 SFW rows, 8/8 watchlist titles in the top 30 (ranks 4, 6, 8, 16, 20, 22, 23, 25), isNSFW=true 0/8, off-type 0 → NOT ELIGIBLE (prod 10-19 10:49Z). Re-read 10-20 after Rowan's E242 pass with the same command.
- Verdict: MORE DATA (read 2026-10-20).
- Next time: if 10-20 reads ELIGIBLE, the gameplay hub is a registry entry + copy the same day — but "Teen Pregnancy and Drama" (#2) and "Realistic Life and Pregnancy" (#3) are not on the watchlist; read Mediavine's content policy on them before writing the copy, not after.

_Older entries (2026-09-29 → 2026-10-18) live verbatim in `archive/playbooks/sage-2026-10.md` and `sage-2026-09.md`; nothing deleted._
