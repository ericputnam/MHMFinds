# E106 — "More from <creator>" server-rendered on /mods/[id], linking to /creator/[slug]/ (Nova, 2026-09-25)

**Tier 0** (internal links on a non-ad surface) · **Stage:** AUDIENCE (crawlable internal-link surface feeding the 534 creator pages of E85/E97) · **Owner:** Nova

## What was wrong

`components/MoreFromCreator.tsx` loaded its six sibling mods in a client `useEffect`
fetch to `/api/mods/[id]/creator`. Consequences, read from source on 2026-09-25:

- none of its links were in the server HTML — a crawler following `/mods/[id]` saw an empty skeleton;
- it matched the **exact** author string, so spelling variants never met (Ravasheen 41 rows vs RAVASHEEN 12);
- it never linked to the creator's own page, so the single E85 author-name link was the only crawlable
  path from 16.5K mod pages to the 534 `/creator/[slug]/` pages.

## What shipped

- `lib/creatorMods.ts` (new file — one owner per helper per day; Sage may touch `lib/creators.ts` today):
  `getMoreFromCreator(modId, author)` folds every spelling via `findAuthorVariants`, returns up to 6 SFW
  siblings most-downloaded first, and a `creatorHref` **only** when the creator clears
  `MIN_MODS_FOR_PAGE` (so the mod page never links to a creator URL that 404s). Degrades to `null` on error.
- `app/mods/[id]/page.tsx` resolves it in the ISR render (revalidate 3600) and passes it as a prop.
- `components/MoreFromCreator.tsx` is now presentational: heading link + 6 `/mods/<id>/` links +
  "See all N mods by <creator>" → `/creator/<slug>/`. Still a sibling of the two `InContentAd` `.mv-ads`
  anchors, never a child. `/api/mods/[id]/creator` is left in place, unused by the site.
- `__tests__/unit/more-from-creator.test.tsx`: 8 tests. Red against pre-fix `origin/main` three ways
  (`creatorHrefFor` missing; component contains `fetch(`/`useEffect`; page never imports the loader).

## Population (SFW rows, DB read 2026-09-25)

| Creator size | Mods affected | Renders |
|---|--:|---|
| ≥5 mods (creator page exists) | 8,404 (50.9% of 16,507) | block + "See all" link to `/creator/[slug]/` |
| 2–4 mods | 2,290 | block only, no creator link |
| 1 mod / junk / null author | 5,147 + rest | no block |

Slug-fold variant query: 88 ms unindexed (`ravasheen` → Ravasheen 41 + RAVASHEEN 12). Under 1 h ISR this is negligible.

## Local render check (production build, `next start`, real DB)

| Mod | Author | Block | Sibling links | Creator links in block | `.mv-ads` | `aside#secondary` |
|---|---|---|--:|---|--:|--:|
| `cmijpwtue019xoxc8bd06pb9y` | RAVASHEEN | "More from Ravasheen" + "See all 53 mods by Ravasheen" | 6 | 2 × `/creator/ravasheen/` | 5 | 1 |
| `cmim9obub00mzoxy7av4vowyr` | dreamgirl (2 mods) | "More from dreamgirl" | 2 | 0 | 5 | 1 |
| `cmim8wi8s00pcoxy8ltjr279a` | January 2024 Set 96368659 (junk) | none | 0 | 0 | 5 | 1 |
| `cmttzing200c6oxfe8rgp3xe3` | null | none | 0 | 0 | 5 | 1 |

## Before-snapshot

- `/creator/*` landing sessions (GA4): 40 (09-23), 28 (09-24). Page views on `/creator/*`: 41, 39.
- GSC clicks on `https://musthavemods.com/creator/*`: 0 on every day 09-18→09-22 (pages are 2 days old; no impressions yet).
- E85 baseline stands: `/creator/*` landing 0 on 09-23 pre-ship; keep rule ≥200 landing sessions in 28d to 10-21.
- Guardrails (must not fall): `/mods/*` GSC clicks 28d and mod-page session RPM ≥95% of the prior 4 weeks (E85's own guardrail — this PR touches the same page).

## Read on 2026-10-23 · Keep if

`/creator/*` landing sessions in the 7d to the read date ≥ 2× the 7d to 09-30 (first full week without this change is not available — use 09-23→09-29 as the pre-window, i.e. E85+E97 alone) **AND** ≥30 distinct `/creator/[slug]/` pages with ≥1 GSC impression, with `/mods/*` GSC clicks ≥95% of the 28d baseline and mod-page session RPM ≥95%. Else revert the three files (block back to client fetch is a one-commit revert; the pages themselves stay).

## Rollback

`git revert` of the squash commit — restores the client-fetched block. No data change, no schema change, no ad anchor touched.

— Nova, Creators & Supply
