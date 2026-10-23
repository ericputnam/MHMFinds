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

## 2026-10-18 — E171 graded EXTEND; E231 eyes-cc hub queued (Tier 1, PR #335)
- Tried: graded build-cc at 14 days — indexed (crawl 10-15), 27 impr / 0 clk at pos 32.2, bare "sims 4 build cc" is 1 impr on `/`, not the hub → EXTEND → 11-01. Then ranked no-hub bare-term families 09-18→10-15 with the rule printed first (facet ≥20 clean SFW rows, top 30 on-type): gameplay ≈570 impr (294 on `/` at 41.5) but 8 adult-themed SFW-flagged titles in the facet's top 25; lots ≈170 but `residential`+`lot` top 30 is 9/30 CAS/objects; male hair/cc ≈635 but `genderOptions` is empty on hair; eyes/brows/lashes ≈100 impr on three listicles at pos 16–57, facet 269/269 clean → built that one.
- Before → after: hub 404 → PR #335 (QUEUED-T1, merges 10-19); family 0 clicks either way.
- Verdict: PENDING (read 2026-11-01: indexed AND ≥100 impr OR family best pos +5).
- Next time: the 7-term gap is closed; the next real head term is "sims 4 mods" and it is blocked on catalog data, not on a page — ask Rowan for an isNSFW pass on the gameplay facet before anyone re-proposes a gameplay hub (MC WooHoo cmijppd0j0162oxc81yf6k5dz, Wicked Whims cmim8rrvz002boxy8vcqt0yrg, Prostitution Mod cmijppj1r0166oxc850u0lir1, Ho* It Up cmim9dnuf000yoxqwqbhi32f4, Breast Slider cmim9jz39002uoxy7z2tbyidh, Basemental cmikk9oj9006tox331c1a2g0g, Wonderful Whims cmim91d7u01l8oxy8mrvijtik, Cuddle and Bath cmim8rs4i002eoxy8enc7gbsp). A union that already holds a new page's types takes its crumb unless the new page is inserted before it — run collection-primary-crumb-order before writing the entry, not after.

## 2026-10-17 — E224 ai_referral −57.1% is OpenAI's UTM outage, not ours (Tier 0 measurement fix)
- Tried: segmented GA4 ai_referral by source × host × landing × day for 28d before touching anything. chatgpt.com = 202 of the 212-session drop (95%; gemini −9, copilot −6, perplexity 0, claude +5), 98% apex both weeks, loss spread over 313 landing rows (max single-path loss 9), medium `ai-assistant` unchanged. Daily chatgpt: 42 (10-08) → 20/17/24/13/13/10 → 29 (10-15) → 48 (10-16). No deploy 10-07 07:47 → 10-11 11:09; /llms.txt, /robots.txt, /llms-full.txt, /mods/* all 200 to GPTBot + ChatGPT-User. External: OpenAI's Intelligent UI rollout dropped `utm_source=chatgpt.com` + referrer 10-08 18:30Z → 10-16 06:30Z (industry-wide −31–46%), visits landed in (direct). Shipped `scripts/agents/channel-external-windows.ts`: the scoreboard now prints the cause under the Audience table when either 7d leg overlaps the window.
- Before → after: 159/7d (10-09→10-15) vs 371; 10-16 alone = 55 AI sessions (48 chatgpt). Read 10-24: 7d 10-16→10-22 ≥ 300 (pre-outage run-rate was 325–378) with chatgpt ≥ 85% share; E71's 10-19 final reads a contaminated window (10-12→10-18 has 3 outage days) — grade it on 10-16→10-22 instead.
- Verdict: MORE DATA (read 2026-10-24).
- Next time: a channel that steps on one calendar day across hundreds of landing paths with no deploy is a referrer-side change — check the vendor's status before the site. The (direct) bucket cannot give those sessions back (Singapore bot stream sits on top of it), so the fix is an annotation, never a re-attribution.

## 2026-10-16 — E217 skin-details top-30 hand-fix (Tier 0)
- Tried: 388 skin rows; top 30 had 3 off-type cards (#15 lighting mod, #19 swimsuit set, #22 lips of unknowable subtype) → pinned gameplay-mod / full-body / NULL via `--ids=`; #7 Girls Night Set pinned KEEP (PR #315 56c4a01, verify PASS).
- Before → after: top-30 off-type 3 → 0 (read-back + live page); pop 388 → 385.
- Verdict: MORE DATA (read 2026-10-29 with E210).
- Next time: a hub's top 30 is the audit unit — 3 wrong cards out of 388 rows were all above the fold by downloadCount; audit the grid order, not the facet count. (Entry written by Quinn from Sage's report: Write/Edit was denied in Sage's run.)

_Older entries (2026-09-29 → 2026-10-15) live verbatim in `archive/playbooks/sage-2026-10.md` and `sage-2026-09.md`; nothing deleted._
