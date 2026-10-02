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

## 2026-10-02 — E157 clothes-cc hub (Tier 0, shipped)
- Tried: ungendered union collection for the bare "sims 4 clothes cc" head term the two gendered hubs could not answer (neither surfaced once in 28d). PR #248 `0207a8c`, verify PASS 07:03; only `lib/collections.ts` changed.
- Before → after: page 404 / 0 impr → live 200 with 3,665 mods, 108 mod links, feed 50 items, in sitemap-nextjs + llms-full; read 10-16 / 10-30. E8 graded KEEP: 2,642 vs 2,106 clicks 28d (+25.5%), weekly 614 → 770, position ~42 → 12.5–15.
- Verdict: pending.
- Next time: (1) a `-c` grep counts lines, not matches — 1 looked like a broken grid, it was 108 links on one line; (2) `sitemap.xml` is an index — grep `sitemap-nextjs.xml` for collection URLs; (3) feeds live at `/feeds/<game>/<slug>/`; (4) merge-gate's 600 s ceiling is ~2.5 sibling merges — on a 4-agent day expect one retry, and read `gh pr view --json state` after the `--delete-branch` error; (5) `filterSpecificity` scores every contentType filter 0, so a union collection must sit *after* its gendered siblings in the registry or it steals every primary crumb.

## 2026-10-01
- Tried: E150 (T0, PR #235 `b20ca3b`). The site-wide WebPage JSON-LD (`/#webpage`, emitted by the root layout on every page) now uses `HOME_SHELL_LASTMOD` = APP_LASTMOD `2026-09-08` (`lib/seo/siteLastmod.ts`, kept Prisma-free; a test fails if the two drift). Before, `dateModified` was `new Date()`. The E143 scanner now also fails on a bare `new Date()`/`Date.now()` in a content date. Pre-fix tree: 2 of 11 tests red, with exactly 1 offender.
- Before → after: live `dateModified` on `/` and hair-cc `2026-10-01` (render day) → `2026-09-08` at 06:49 (verify SUPERSEDED-PASS, 5xx 0). Graded E95 KEEP: bing/organic landings on /creator/* were 61 (09-24→30, prior 0); bing_organic 16,844 = 107.8% of 15,623. Credit is shared with E97 hub and E115.
- Verdict: MORE DATA (read 2026-10-03: both pages still `2026-09-08`).
- Next time: no eligible mod has been created since 09-26 10:42:55Z (16,524 = live sitemap count). Ingest stalled, which is why IndexNow says mods=0, and it made candidate (b), a force-dynamic mod sitemap, a vacuous read today. Check the newest createdAt before choosing a freshness move.

## 2026-09-29
- Tried: E136 (T0, PR #221 `72c8841`): /sitemap-mods.xml <lastmod> from max(createdAt, lastScraped) via lib/seo/modLastmod.ts. Mod.updatedAt is @updatedAt and counter writes bump it: 685 rows "updated" in 24h with 0 created, 3,377/7d vs 50, 6,070/28d vs 673 (16,524 eligible). E37 fixed this class on the collection sitemap on 09-12 and left the 16.5K-URL mod sitemap on updatedAt. 3 of 11 tests red pre-fix.
- Before → after: live lastmod-in-28d 6,070 → 673 of 16,524 (7d 50, 1d 0, newest 09-26); /mods/* clicks 28d 614 (08-30→09-26) → read 10-13, keep ≥584. Pre-read 09-30: ai_referral 7d 356 (+21.1%; chatgpt 323 / 90.7%): E2 not met (<385), E27 KEEP (≥300, share −0.5 pt), E42 EXTEND.
- Verdict: MORE DATA (read 2026-10-13; the "change took" half of the keep rule is already met).
- Next time: "exactly 27 every day" was one ingest batch (09-26 10:42:21–10:42:55Z) sitting inside a 48h window for three 24h-spaced runs — read the batch timestamps before calling a counter a bug. And read the build legend: /sitemap-mods.xml is ○ static, so lastmod is only as fresh as the last deploy.

## 2026-09-28
- Tried: E128 (T0, PR #199 `45addf4`). The IndexNow key GET and submit now time out at 15 s and 30 s; a timeout grades COULD-NOT-RUN, never FAIL. A source scan requires a timeout on every `fetch(`.
- Before → after: fetches with a timeout 1 of 3 → 3 of 3; 8 of 55 tests red before the fix; dry run same 30 URLs. Graded: E47 and E52 KILL — Bing 7d 16,337 against the 17,032 target with IndexNow OK on all 13 days, so a working sitewide push did not move Bing. E32 KEEP: collections 169 clicks at position 23.9, `/mods/*` 596. E18 EXTEND: position 37.49, 0.49 short of the ≤37 rule.
- Verdict: MORE DATA (read 2026-10-05: 7/7 runner lines present, 0 new FAIL).
- Next time: a `beforeEach` that returns `mock.mockClear()` returns the mock itself; vitest treats a returned function as teardown and hung until the 10 s hook timeout — always write hooks with braces. In GSC, a page-filtered query broken down by country summed to 129 `/mods/*` clicks while the date breakdown summed to 596: grade a clicks guard with the same breakdown as its baseline.

## 2026-09-26
- Tried: E114 (T0): registry→surface scanner `collection-surfaces-llms-sitemap-feeds.test.ts` — every collection slug on llms.txt / llms-full.txt / sitemap-nextjs.xml / per-collection feed / IndexNow with one identical canonical URL; all 26 green pre-fix (kitchen-cc was already on all four live — the surfaces are registry-driven), seen red by dropping one slug. E115 (T0): explicit IndexNow `--apply --creators --days 3` → 596 URLs http=200 (report `reports/funnel/indexnow-2026-09-26.md`). Network was degraded: MCP calls hung twice; Quinn ordered no further GA4/GSC calls. Pattern: **get the breakdown in the first call and stop** — the chatgpt-only drop (304→248, every other AI source flat) was known 5 minutes in.
- Before → after: ai_referral 7d 274 (09-18→09-24; prev 329) → read 10-03 / 10-10, keep if ≥300 or kitchen-cc ≥5 landings/7d; Bing /creator/* landings 0 → read 10-03 with E95 (≥20).
- Verdict: MORE DATA. Two findings with numbers: (a) IndexNow never pushes blog guides — the class that is 16,250/16,434 Bing sessions; 10 guides modified 09-04→09-17 earned 66 Bing sessions the next week (inbox, next move). (b) `blog.musthavemods.com/robots.txt` is an nginx 404 and Google indexes ~17% of blog clicks (424/2,482 28d) on the blog host despite apex canonicals — T2, inbox. GSC sitemap API "0 indexed" is the index entry only (17,765 submitted; children never submitted separately) — an API artifact, not a coverage fact.
- Next time: ship the `--guides` IndexNow leg first thing; do not spend MCP calls re-deriving the AI breakdown — it is noise unless a non-chatgpt source moves.

## 2026-09-25
- Tried: E104 (T0, PR #176 `0492290`): `/llms-full.txt` names the top 40 of 534 creators with `/creator/{slug}/` URLs and links a mod's creator page only when its author slug is in `listHubCreators()` — the hub (E97) and leaves (E85) had been live two days with 0 `/creator/` URLs in the AI surface. Pattern: when a new page class ships, grep llms-full.txt for its path the same day; the test mocks `@/lib/creators` (a `$queryRaw` the prisma mock cannot serve) and keeps the real slug helpers via `importActual`. Second slot: E37 pre-read → KEEP (hair-cc "Submitted and indexed", crawled 09-24T02:12Z) and the `/games/*` title-fix candidate killed with numbers (all pos 24–32, exposed query rows < 20% of impressions, no title-miss cluster).
- Before → after: AI-referral sessions landing on `/creator/*` 28d 0 (08-26→09-22) → read 2026-10-09 / 10-23, keep if ≥10 or ≥3 distinct pages with ai_referral 7d ≥250. Live file 0 → 130 creator URLs.
- Verdict: E104 MORE DATA; E37 KEEP; title-set fix KILLED (no data supports it — re-propose only at pos ≤15 on a non-brand query ≥200 impr).
- Next time: `gh pr merge --delete-branch` fails on the local `main` checkout when another agent's worktree holds `main` — the merge still lands; check `gh pr view --json state,mergeCommit` and delete the remote branch by hand. Next: E18 final read 10-06; hair-cc needs inbound links from the hair blog posts (T2 package), not titles.

## 2026-09-24
- Tried: E95 (T0, PR #167 `6b525b5`): IndexNow `--creators` mode — 541 creator pages pushed in one POST (590 URLs, http=200). Pattern: when a sitemap and a push script select the same population, move the query into the lib (`listCreators()`) and make both consume it; guard the sitemap file for the import and against `regexp_replace`. Ceiling lifts only with the flag; new kinds append last so the cap truncates them before the daily payload.
- Before → after: Bing-organic sessions landing on `/creator/*` 7d: 0 (09-17→09-23; 39 landing sessions, all direct) → read 2026-10-01, keep if ≥20 with bing_organic ≥95% of 15,623. Move 2 (E96 `/creator/` hub) was shipped by Nova as E97 (#168) 13 min before I could branch; ai_referral 312→287 is −19 chatgpt.com sessions inside its normal band, not structural.
- Verdict: E95 MORE DATA; E96 NOT SHIPPED (pre-empted).
- Next time: check the other agents' in-flight PRs before choosing move 2 — E97 shipped my E96 while E95 was in the merge gate. Next: homepage SSR shell (T1) as a single full-session move.

_Older entries (up to 2026-09-21) live verbatim in `archive/playbooks/sage-2026-09.md`; nothing deleted._
