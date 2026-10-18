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

## 2026-10-15 — E210 skin-details retitle (Tier 0)
- Tried: no 7-term hub left to build (all indexed: cc 10-12, build-cc/clothes-cc/hair-cc 10-06), so the fallback on-page fix: skin-details title/H1/meta now lead with "Skin CC" + "Skin Overlays, Skintones" (was "Skin Details CC — 270+"). Its 723 impr/28d sit at pos 25 on the generic skin family and the bare "skin overlay" family, neither in the old title.
- Before → after: 13 clk / 290 impr (09-29→10-10) → read 10-29. Facet 295/348 title-supported (84.8%), top-30 21/30, 3 description mis-tags → inbox.
- Verdict: MORE DATA (read 2026-10-29).
- Next time: the /games/ pages with the most impressions (body-presets 1,009, poses 1,005) already rank ≤13; skin-details was the only high-impression hub at pos >20 with a title that missed its own queries.

## 2026-10-14 — E203 hub→guide links for the host-split hospital-lots article (Tier 0)
- Tried: `guides` field on the registry; pregnancy-mods + build-cc link `/sims-4-hospital-lots/` on-page and in llms-full. Google −13.2% WoW decomposed (GSC 10-05→10-11 vs prior, −80): blog.* −32 = one URL (hospital-lots 34→4 after its 301 to apex; twin picked up 6), /mods/ −20 (CTR 4.06→3.43% on more impr), /games/ −16 (pos 19.6→17.8, new hubs entering low), home −13. E177 KEEP (6/6 lines carry age + ok).
- Before → after: pair 10 clicks/wk, apex pos 9–26, 2 referring URLs → read 10-28 (apex ≥ 20 or pair ≥ 25 at pos ≤ 12). ai_referral 233 (−38.5%): chatgpt 323→200 is 84% of the drop, 10-09 step, no deploy — referrer-side, decision row.
- Verdict: MORE DATA (read 2026-10-28).
- Next time: when a blog.* URL loses clicks after the host split, count the apex twin's referring URLs before anything else — the twin inherits the 301, not the links. Migrated-article class is small: only hospital-lots (111/28d), pregnancy (10), dark-academia (5) still earned on blog.*.

## 2026-10-12 — E189 homepage JSON-LD scoped to `/` (Tier 0)
- Tried: root layout emitted the homepage `WebPage` (`/#webpage`, url = root) + `FAQPage` on every page; moved both to `components/HomeJsonLd.tsx`, rendered only by `app/page.tsx`. Scanner `site-jsonld-scope.test.ts` 3/9 red on pre-fix layout.
- Before → after: live 5/5 templates carried both nodes → local `next start` 1/5 (`/` only); ad anchors identical. Pre-read E136/E143: /mods/* 751 clicks 28d (09-12→10-09) vs 614; lastmod≤28d 424/16,796; ld==lastmod 3/3 new, 1/3 old.
- Verdict: MORE DATA (read 2026-10-26).
- Next time: every hub on the competitor list exists after #275 — the next search lever is ranking existing hubs, not adding pages.

## 2026-10-07 — E177 IndexNow newest_mod_age_h (Tier 0, PR #265 f0edb05, SUPERSEDED-PASS)
- Tried: IndexNow summary line now prints `newest_mod_age_h` and a `mods_check` verdict (new tests 6/60 red against pre-fix main). Merged after Rio's 07:12 CLEAR; scripts/ only.
- Before → after: 0/14 lines carried an age → dry run mods=78 newest_mod_age_h=0.2 mods_check=ok; read 10-14. Grades: E27 KEEP (378, ChatGPT 28d share 89.5% vs 88.5%), E42 KEEP on the OR leg, E83 KILL (3.464%), E84 KILL (1,606), E18 KEEP traffic leg (pos 32.98), E21 revert-per-rule held (55 vs 95, canonical met), E128 KEEP, E71 MORE DATA → 10-19.
- Verdict: MORE DATA (read on 2026-10-14).
- Next time: recount a baseline with the same script before grading (E84 1,607 and E18 512 reproduced exactly), and never set a 28-day read only 14 days after shipping (E83's window was 57% pre-ship).

## 2026-10-13 — E196 modLastmod() publishedAt floor (Tier 0, PR #290)
- Tried: `lib/seo/modLastmod.ts` = max(createdAt, lastScraped, publishedAt); sitemap selects publishedAt; ModJsonLd hands publishedAt to the helper instead of flooring locally. New agreement test renders both surfaces per fixture; 5/25 red on pre-fix sources.
- Before → after: 7,076/16,796 eligible rows have publishedAt > createdAt (late-Jan 2026 backfill) and 6,894 (41 %) disagreed with their page by day; lastmod≤28d 405 → 405 (floor only moves old entries forward). Grades: E136 KEEP (754 /mods/* clicks 09-13→10-10 vs ≥584; ≤28d 405 vs ≤1,000), E143 EXTEND → 10-27 (clicks met, spot-check 4/7 explained by this). E71 pre-read: ai_referral 268/7d; chatgpt 326→231 is a 10-09 step (40–68/d → 13–24/d) across 329 landing rows, max 10 — referrer-side, no site fix.
- Verdict: MORE DATA (read 2026-10-27: 7/7 spot-check, clicks ≥716).
- Next time: when two surfaces compute "the same" date, make one of them call the other's function — a local floor in a component is how 41 % of a 16.8K-URL sitemap drifted without any test going red. Competitor hub list: all 7 terms have a hub after #275; bare-term impressions 28d are 229 (cc), 85 (custom content), 31 (cc finds), 26 (skin overlay), 25 (poses), 13, 7, 1 — rank existing hubs, do not add pages.

_Older entries (up to 2026-09-28) live verbatim in `archive/playbooks/sage-2026-09.md`; nothing deleted._
