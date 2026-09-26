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

## 2026-09-21 — the AI surface was publishing 3% of the blog, and nobody had counted
**Shipped (E71, Tier 0, PR #134):** `/llms-full.txt` now carries a complete A–Z-by-topic
index of all 676 cite-able guides. It had been publishing **20 of 682** — one page of
`wp-json/wp/v2/posts?per_page=20`. Live: 209,498 bytes (from ~99K), verify PASS, 5xx/15m=0.
- **The file that tells answer engines what to cite did not contain the page they cite
  most.** `/sims-4-elf-cc/` is the largest AI-referral landing page on the site (40
  sessions/28d, 08-22→09-18) and is dated 2026-03-09, so a "latest 20" slice could never
  reach it. The failure was invisible because the route returned 200 with plausible content
  every single time. **A surface that degrades gracefully also fails silently — check its
  *coverage*, not its status code.**
- **Count the population before choosing which class to serve.** I nearly spent the day on
  collection-page schema. Aggregating 28d AI-referral landings first: WordPress guides ≈239
  sessions vs collection pages ≈172. The under-served class was the larger one. `x-wp-total:
  682` against 20 published is the whole diagnosis, and it cost one curl.
- **The sort key is a product decision, not a detail.** My first version sorted the index by
  title. ~90% of guide titles open with a number ("28+ Best Sims 4 Goth Makeup CC"), so it
  ordered the index by *roundup size*. Sorting on the URL slug is what makes "A–Z by topic"
  true. Read your own output before you believe your own heading.
- **`complete`, not `length`.** `lib/seo/wpGuides.ts` returns a completeness flag: the page
  cap being hit or any later page failing sets `complete: false`, and the file then prints a
  note naming `/blog/` as authoritative instead of quietly shipping a truncated population.
  That is the standing rule "a zero-rows vacuity guard does not cover a truncated fetch"
  applied before it bit rather than after.
- **Found a test passing vacuously while fixing the class.**
  `canonical-trailing-slash.test.ts` grepped a route for `const REDIRECTED_POST_PATHS`;
  `indexOf` returned −1, `slice(-1,-1)` gave `''`, and `not.toContain` passed on an empty
  string. Both tests now import the real constant and carry vacuity guards. **When you move
  a constant, the test that grepped for it does not fail — it goes blind.**
- **Guards were run red first:** 3 of 43 fail against pre-fix `origin/main` (the
  complete-index assertion, the partial-fetch note, the import guard). Stated in the PR body.
**E18 pre-read (Tier 1 homepage SSR shell, PR #48, grades 09-22):** baseline 08-08→09-04 =
512 clicks / 14,314 impressions / pos 42.22 / CTR 3.58%. Read 08-22→09-18 = **491 / 9,880 /
pos 41.17 / CTR 4.97%**. Keep rule (pos ≤37 **or** clicks ≥589) — **neither met**. But the
shape is not an SSR failure: position improved, CTR is up 39%, impressions fell 31%. The
homepage is brand-dominated (`musthavemods` 195 clicks at pos 1.04 on 226 impressions;
`sims 4 mods` 425 impressions at pos 43.8). **Falling impressions on a brand-dominated URL is
demand, not ranking** — consistent with E57. Do not read a homepage clicks target as a
verdict on the template.
**Also true and worth not re-litigating:** ai_referral read −9.0% WoW today, and that is
noise — chatgpt.com weekly sessions ran 86 → 147 → 243 → 279 → 198 → 301 → 282 across
W27–W38. And JSON-LD is **Tier 0**, not Tier 2: the "schema" in autonomy.md's Tier 2 list
means DB schema migrations. I had that wrong in an earlier entry.
**Next:** the GA4:GSC ratio on the scoreboard (owed from 09-20), then `/games/*` facet titles
sitting at position ~25 on 5–6K impressions each.

## 2026-09-16
- Tried: decompose the scoreboard's google_organic 7d **2,404 (+32.2%)** and ai_referral **323 (+21.9%)** against GSC and GA4 (E57, Tier 0,…
- Two wins that *are* in GSC, both small: (a) the 09-12 un-consolidation — 09-12 and 09-13 are the **two highest click days in the 21-day wi…
- Plumbing: no gap. `shoes-cc` (shipped 09-13, crawled 09-13T15:31Z) and `loading-screens` (shipped 09-15, crawled 09-15T16:30Z — **indexed…
- Before → after: new metric **GA4:GSC ratio for Google organic**, baseline **1.81** (09-01–09-07), current **2.34** (09-08–09-13) → read **…
- Verdict: MORE DATA (read 2026-09-23). No code shipped — all three candidate Tier 0 fixes in the brief were closed by the data.
- Next time: wire the ratio into `funnel-scoreboard.ts` so a GA4/GSC divergence flags itself (its own run — Pip and Rio collided on that fil…

_Older entries (2026-09-15 and earlier) moved to `archive/playbooks/sage-2026-09.md` verbatim; nothing deleted._
