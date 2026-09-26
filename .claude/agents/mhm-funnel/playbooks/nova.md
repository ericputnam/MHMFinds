<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Nova — Content & Creators — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. "I think it worked" is not a learning. Covers content: which briefs the writer used and how they performed, collection pages that worked, creator outreach response rates.

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

## 2026-09-26
- Tried: E113 (T0, one PR): (a) mod-page author link now takes its href from the server-resolved `moreFromCreator.creatorHref` (count-gated `creatorHrefFor`) instead of `creatorHref(authorSlug(mod.author))`; (b) "More Sims 4 CC creators" on every `/creator/[slug]/` — 8 server-rendered links to the creators ranked next to it by downloads, hub population only, memoised 1 h, 800 ms cap. Sitemap/IndexNow (E95), hub ItemList schema and server-rendered hub counts (E97) already existed, so none of the three suggested lifts was new.
- Before → after: author links to a 404 on the 2,290 SFW mods whose creator has 2–4 mods → 0 (single-mod creators' links also gone); inbound peer links per leaf 0 → ~8 (534 leaves). `listCreators` read 4.9 s cold / one 610 s stall from the operator host today — do not await it unbounded on a force-dynamic page.
- Verdict: MORE DATA (read 2026-10-24; keep if `/creator/*` landing sessions 7d ≥ 174 = 1.5× the 09-19→09-25 baseline of 116 (96 distinct pages, GA4) AND 0 `/creator/*` 404 hits from `/mods/*` referrers, with `/mods/*` sessions ≥95%).
- Next time: read what already exists before choosing among dispatched options — all three were shipped; the real gap was leaf-to-leaf links.

## 2026-09-25
- Tried: server-render "More from <creator>" on /mods/[id] + crawlable "See all N mods by <creator>" link to /creator/[slug]/ (T0, PR #175 `8f3b5ed`, E106). New `lib/creatorMods.ts` (own file — Sage may touch lib/creators.ts the same day); loader folds spellings via findAuthorVariants, links the creator page only when ≥ MIN_MODS_FOR_PAGE, null on error; component is presentational, still a sibling of the InContentAd anchors.
- Before → after: crawlable links from a mod page into its creator's other mods 0 → 6, and into /creator/[slug]/ 1 (author name) → 3 on the 8,404 SFW mods (50.9%) whose creator has ≥5 mods; 2,290 more get a block only. Ravasheen 41 + RAVASHEEN 12 now read as one "See all 53" (they were split). /creator/* landing 40 (09-23) / 28 (09-24), GSC impressions 0. Query cost 88 ms unindexed under 1 h ISR; prod raw-HTML check 6 links + 2 creator hrefs, .mv-ads 5 / aside#secondary 1 unchanged.
- Verdict: MORE DATA (read 2026-10-23; keep if /creator/* landing 7d ≥ 2× the 09-23→09-29 week AND ≥30 creator pages with ≥1 GSC impression, /mods/* clicks ≥95% and mod-page RPM ≥95%).
- Next time: read the *server* HTML of a "link block" before counting it as an internal-link surface — this one had shipped as a useEffect fetch and every audit since had counted its links; and the E85 author link still sends 2–4-mod creators to a 404 (dreamgirl), fixable in one line now that ModDetailClient receives totalMods.

## 2026-09-24
- Tried: `/creator/` crawlable hub for the 534 creator pages (T0, E97) — PR #168 `d748eaf` BUILD ERROR (never promoted) → fix-forward PR #171 `2e7627d` PASS. Top 24 by downloads + A–Z, plain `<a>` links; Navbar, leaf breadcrumb, sitemap-nextjs, llms.txt and smoke-render point at it; 7 platform "authors" excluded hub-only via `NON_CREATOR_SLUGS`.
- Before → after: hub landing sessions 0 (404) → live; 534 creators / 8,132 mods linked from one server-rendered page; leaves already drew 43 landing sessions on day 1 with no hub; `/top-creators/` 9 sessions/28d.
- Verdict: MORE DATA (read on 2026-10-22; keep if hub ≥50 landing sessions/28d AND leaves ≥600/wk AND ≥1 non-brand GSC query on the hub; else Navbar back to `/top-creators/`).
- Next time: two green PRs from the same base can still break `main` — #167 and #168 each added `listCreators` to `lib/creators.ts`, the squash merged both, Vercel refused the build (main unbuildable 10:03→10:12, Rio's #169 merged into the window). Before merging on a day other agents touch your file, `git diff --name-only <base> origin/main` and rebuild if there is overlap; `lib-duplicate-exports.test.ts` now catches the repeat-export case. Also: the "smoke the preview URL" line in every incident file has never been executable here — previews are cancelled by the Ignored Build Step and sit behind SSO; smoke `next start` of the fix build locally instead.

## 2026-09-23
- Tried: public creator pages `/creator/[slug]/` from existing catalog data (T0, PR #159, E85) — the profile + attribution half of the Q14 memo (#141), no file hosting, no agreements. New `lib/creatorSlug.ts` (pure) + `lib/creators.ts` (loader), `app/creator/[slug]/`, `sitemap-creators.xml` in the index, `creator` in `NEXTJS_PREFIXES`, sidebar registry entry, and the mod-page author name now links to its creator page. Slug folds the scraper's spelling variants (Ravasheen 41 + RAVASHEEN 12 rows → one page); ≥5 SFW mods or 404; junk author strings (bare Patreon ids, "Kobe Sweats 135179830") never get a page or a link.
- Before → after: creator landing pages on the catalog 0 → ~540 (542 slugs ≥5 mods of 6,597; 894 ≥3, 273 ≥10, read 2026-09-23); demand read: "nekoswirl" creator-name cluster 69 GSC clicks/28d to 2026-09-20 landing on one mod page, blog `/sims-4-cc-creators/` 1,314 landing sessions/28d, `/top-creators/` 9, `/creators/` 1 (GA4 08-26→09-22).
- Verdict: MORE DATA (read 2026-10-21; keep if `/creator/*` landing sessions ≥ 200 in the 28d to the read date OR ≥ 20 distinct creator pages with ≥ 1 GSC click, with `/mods/*` GSC clicks ≥ 95% of 28d baseline and mod-page session RPM ≥ 95% of the prior 4 weeks).
- Next time: the creator-name demand was hiding in `/mods/[id]` query data, not in any creator surface — read GSC queries by *page* for a name before assuming a hub page has no demand. Outreach to the top slugs (Seoulsoul-sims 19,270 downloads, brandysims, Syboulette 67 mods) now has a URL to offer; the template is still T2.

## 2026-09-21
- Tried: `kids-cc` collection page **and the class bug behind it, in one PR** (T0, PR #136, `7816cbe`, E72). On 09-20 I rejected this cluster — 752 rows on infant/toddler/child, only 45.6% of titles carrying a kid word — and wrote…
- Before → after: `ageGroups` kid axis **752 rows / 343 title-supported (45.6%) → 686 / 686 (100%)** — 362 added, 428 stripped, 35 rewritten, 289 no-ops over a 1,114-row union population, verified by a separate read of the changed…
- Verdict: MORE DATA (read 2026-10-19; keep if ≥15 engaged sessions in the 7d to the read date **and** aggregate collection-page engaged sessions ≥95% of 1,069 **and** `/sims-4-kids-cc/` impressions ≥80% of 153 — i.e. the page has…
- Next time: three things. **(1) Distinguish a class bug from heterogeneous junk by asking whether one rule is uniformly wrong, and check both directions.** 09-20's nails case was six wrong rows for six reasons and correctly got `…

## 2026-09-20
- Tried: `nails-cc` collection page + a 6-row repair of the `nails` facet in the same PR (T0, PR #127, E67). `nails` was the last clean un-paged contentType: 151 rows, 0 pages, 0 mod detail pages with a collection breadcrumb. **Re…
- Before → after: `nails` facet 151 rows / 92.7% title-clean → 145 / **97.2%** (141 of 145), top 12 by downloads 12/12 genuine and two 8-row mid-grid samples 16/16; collection routes 21 → 22; mod detail pages with a collection bre…
- Verdict: MORE DATA (read 2026-10-18; keep if ≥200 engaged sessions OR ≥5 favorites in the first 28 days — the bar used for decor-cc, shoes-cc, loading-screens and jewelry-cc). E38 reads **KILL** on its own rule; `/play` keeps it…
- Next time: **take the facet-wide dry run even when you intend a narrow fix, then throw it away.** `--facets=nails` proposed 21 changes and **15 were wrong** — rule priority beats the literal word "nails" in a title ("S-Club Nail…
