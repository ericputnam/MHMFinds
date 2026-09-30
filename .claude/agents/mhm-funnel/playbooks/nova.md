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

## 2026-09-30
- Tried: E144 (T0, PR #228): diagnosed 0 claim starts on the population, not the CTA. GA4 09-23→09-29: /creator/* 558 landing sessions, /submit-mod/ 1 view total, 0 with `?creator=`; DB: 0 ModSubmission rows source='Creator Claim' ever, 4 submissions lifetime (last 2026-01-10), 0 pending profiles. The CTA was server-rendered above the grid but a slate-500 footnote — and the visitor is a fan (~1 landing/page/week), not the creator. Shipped `CreatorClaimCard` in the hero: visible "Claim this page" + fan-forward "Send them this page" (copies the claim URL with `&ref=share`, GA4 `creator_claim_share`), hidden on verified profiles; hub copy no longer routes claims through the bare form.
- Before → after: claim views 0/wk, share events 0 (no surface) → read 2026-10-14.
- Verdict: MORE DATA (read 2026-10-14; keep if ≥10 `creator_claim_share` events OR ≥3 `/submit-mod/?creator=` views in 14d, with /creator/* landing 7d ≥95% of 558).
- Next time: when a CTA reads 0 on 500+ sessions, ask who is in the sessions first — an ask aimed at 1-in-500 visitors needs the other 499 to carry it. Outreach (Q23) is still the only direct feed.

## 2026-09-29
- Tried: (a) E137 creator outreach package (T2, queued): top 20 hub creators by 28d download clicks, page + claim URL per row, template, and the isCreator decision in one file. (b) E137-b (T0, PR #217 `949b536`): 'creator' added to page-rpm OTHER_APP_PREFIXES; class test covers every NEXTJS_PREFIXES entry and every app/ route dir, red pre-fix on exactly /creator/ (2 cases).
- Before → after: /creator/* landing sessions 116 (09-15→09-21) → 558 (09-22→09-28, GA4 apex). The top 20 hold only 202/1,408 28d clicks, 5–26 each; 11/20 publish mainly on TSR, and 8 are TSR-only with no contact route of their own. Onboarded 0, claims 0.
- Verdict: MORE DATA (read 2026-10-13).
- Next time: `sourceUrl` on scraped mods is the MHM blog post, not the creator. Read `downloadUrl` for a creator's channel. And if the next batch skips TSR-only creators, rank from 21+ rather than re-sorting.

## 2026-09-28
- Tried: admin review for E122 claims (T0, PR #204 `115f8bd`, E129). `/admin/creator-claims` plus GET/POST `/api/admin/creator-claims/`, with the decisions in a pure planner (`lib/creatorClaimReview.ts`). Reject refuses when mods link to the profile; promote refuses a handle that is already taken.
- Before → after: ways to see or promote a pending claim in the admin went 0 → 1. Pending claims 0, claim submissions 0, onboarded 0 (DB 2026-09-28). The existing `/api/admin/creators/[id]` PATCH already accepts any handle with no check, which is why nobody noticed the missing review step. E33 graded KEEP and closed: coverage 96.87% (NULL 518), gameplay-mod 467→487.
- Verdict: MORE DATA (read 2026-10-11 with E122).
- Next time: the claim path now works end to end but nobody is being sent to it. Outreach (the T2 template) is the only move that feeds it, and E33-style facet coverage has drifted to 96.87% as ingests land NULL.

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

_Older entries (up to 2026-09-21) live verbatim in `archive/playbooks/nova-2026-09.md`; nothing deleted._
