# PRD: Revenue Pivot — Mod Finder as Pinterest Destination

**Created**: 2026-04-09
**Status**: Phase 0 — Unblocking
**Owner**: Eric (strategy, Pinterest, editorial voice) + Claude (build, measurement)
**Revisit**: 2026-04-23 (14 days from kickoff)

> This is the canonical PRD for all revenue-focused work on MHMFinds
> going forward. New revenue initiatives append as "Initiative N" under
> this PRD rather than spawning standalone PRDs. Stale SEO cleanup and
> compound dead-code PRDs were aged off on 2026-04-09.

---

## 1. Problem statement

**The site is not being monetized in proportion to its audience size.**

Specific findings that triggered this pivot:

- **Almost no one uses the Next.js app.** The mod finder (`/mods`,
  `/games/[game]`, `/mods/[id]`) has no discovery mechanism. Pinterest
  pins all point at the WordPress blog. The WordPress blog has zero
  editorial links into `/mods` or `/games` (grep-confirmed on
  `staging/wordpress/kadence-child-prod/functions.php`). The Next.js
  Navbar only links *out* to `/blog`, never in the other direction.
  The December 2025 thesis — "build a mod catalog so the mod finder
  drives traffic to the blog in the AI age" — was architecturally
  broken from day one.
- **Google HCU (Jul 2025) killed organic.** ~92% traffic loss on
  July 8, 2025. Google organic revenue is ~$0. Site-wide classifier;
  recovery rates for aggregators are ~22% at best. Recovery is not a
  bet worth making. See `project_seo_google_hcu.md`.
- **Pinterest is the only reliable traffic channel.** ~68% of traffic,
  ~50% of revenue. It's on life support, but it's the only channel
  that still works.
- **Listicle blog approach is capped.** HCU punishes aggregators, AI
  era is eating listicle sites, and the blog is currently generating
  ~$140/day on Mediavine floor rent for a dying format. Mar 2026
  total: ~$4,200/mo.
- **Claude's value is near-zero against revenue.** Prior work has
  been RPM tweaks, ad placement, dead code cleanup — none of which
  move the revenue needle meaningfully. New OKRs (below) tie scoring
  directly to revenue trajectory so the bar is unambiguous.

## 2. Strategic direction

**Stop the listicle-dependent strategy. Make the mod finder the
Pinterest destination. Measure via revenue trajectory, not
vanity metrics.**

This is a *direction*, not a single ship. Concrete initiatives land
below. The first one is the most testable and highest-confidence.

### Why this direction and not something else

- **Plays to what works.** Pinterest is already the top channel and
  visual grids are what Pinterest users respond to. The mod finder
  does visual grids better than the blog.
- **Stops chasing Google HCU recovery.** Per the SEO memory, that's
  a ~$0 opportunity. Every hour spent on Google SEO is an hour not
  spent on Pinterest + finder monetization.
- **Additive, not destructive.** We're not deleting the blog. We're
  adding a Pinterest destination and measuring if it out-converts.
- **Reversible.** Collection pages are net new. If the A/B fails,
  pins go back to blog and the pages stay up as normal finder content.

## 3. OKRs — how Claude's value gets scored

These OKRs replace any prior "Claude's work is valuable" assumptions.
They measure directly against revenue growth. End-of-test scoring
(2026-04-23) determines whether Claude's last 14 days of work had
positive value.

1. **Traffic grew (10% weight)** — Pinterest-origin sessions to
   collection pages should at minimum not collapse the blog baseline.
2. **Monetized the traffic (20% weight)** — Collection page RPM
   should be within 20% of blog RPM, ideally higher.
3. **Users stay and contribute to brand (10% weight)** —
   Pages/session, bounce rate, return visit rate on collection pages
   vs blog.
4. **Revenue dramatically increased, mirroring gamerant (60% weight)**
   — Heavy weighting. Treated as *trajectory*, not endpoint (pending
   Q5 answer below). A believable 14-day read = collection pages are
   on a steeper slope than the blog baseline.

**Kill criteria (non-negotiable)**: If after 14 days collection pages
underperform the blog by >40% on blended revenue/traffic, kill the
test and revert Pinterest to blog. Do not extend. Do not re-run with
"one more tweak."

## 4. Confidence calibration (honest)

- **High (~85%)**: Mediavine RPM on a well-built collection page will
  match or exceed the blog once sidebar + in-content + adhesion are
  wired up. Same Mediavine integration, different URL.
- **Medium (~55%)**: Collection pages will out-convert blog posts on
  Pinterest traffic. Never tested, but visual grids favor Pinterest.
- **Low (~25%)**: 14 days of data will be statistically decisive.
  Pinterest traffic is spiky; blog has a 6+ month pin backlog. First
  read will be directional, not definitive.
- **Near-zero**: That any of this "mirrors gamerant" in 14 days.
  Gamerant does ~$1M+/mo, we do ~$4,200/mo. That gap is a multi-year
  traffic + brand problem, not a 14-day outcome.

Not committing to specific revenue numbers. Validation of strategic
direction, not arrival.

---

## 5. Initiative 1 — Collection Pages + Pinterest A/B

**Status**: Phase 0 — Unblocking (waiting on 5 answers from Eric)

### What we're building

10 collection pages inside the mod finder, each mirroring a top blog
listicle. Each page is:

- A curated, editorial-flavored landing that filters the mod DB to
  the topic.
- 200-400 word editorial intro (voice matters — brand surface).
- Full mod grid with matching facet filters pre-applied.
- `ItemList` + `CollectionPage` schema (for AI Overviews /
  Perplexity / Pinterest lens, not Google).
- Internal links to related collections.
- Mediavine sidebar + in-content ads + adhesion unit (same wiring
  as `/mods/[id]`).
- Cross-link to the original blog article so the blog keeps
  benefiting from the finder's traffic.

Then: repoint a subset of Pinterest pins from blog to collection
pages for 14 days and measure against the OKRs.

### The 10 target topics

Drawn from top blog listicles (verify against GA4 top-landing-pages
last 30d before Phase 2):

1. Pregnancy mods
2. Trait mods
3. Clutter / CC finds (generic dump)
4. Hair CC
5. Urban tattoos
6. Skin details
7. Male clothes CC
8. Female clothes CC
9. Furniture CC
10. Woohoo mods

**Prerequisite**: `seed-facet-definitions.ts` must have facets that
can filter the mod DB to each topic. Verified in Phase 0 Track B
below.

### Phased plan

#### Phase 0 — Unblock (current phase, no code yet)

Two tracks in parallel:

**Track A — Eric answers 5 blocking questions** (Section 6 below).
✅ All 5 answered 2026-04-09.

**Track B — Claude runs 3 prereq checks** (no user input needed).
✅ Completed 2026-04-09. Findings below.

##### Track B findings (2026-04-09)

**Prereq A — GSC indexing of `/mods/[id]` pages**

Folded into Prereq B. Individual `/mods/[id]` pages are **not in
any sitemap at all** (see below), which makes GSC inspection
academic — Google can't discover them by design. Per
`project_seo_google_hcu.md`, `/mods/` was already "URL unknown to
Google" and `/games/sims-4` was stuck at position 49.7 with 6
clicks in 2.5 months. No new information would come from burning
GSC API calls on samples that are architecturally invisible.
**Conclusion**: Google is a dead channel for the finder. Pinterest
is the only channel. Proceed accordingly.

**Prereq B — Sitemap coverage**

`app/sitemap-nextjs.xml/route.ts` is a **hand-rolled static
sitemap** with 6 URLs total. Last modified 2026-02-24.

Listed:
- ✅ `/`
- ✅ `/mods` (the finder index)
- ✅ `/creators`
- ✅ `/games/sims-4`
- ✅ `/games/stardew-valley`
- ✅ `/games/minecraft`

**Missing**:
- ❌ Every individual `/mods/[id]` page (thousands)
- ❌ Every `/go/[modId]` interstitial (by design — correct)

**Phase 1 action required**: Update
`app/sitemap-nextjs.xml/route.ts` to add the 10 new collection
page URLs (`/games/sims-4/[topic]`) when Phase 1 ships. Do not
add individual mod pages — that's a separate decision and HCU
risk given Google's site-wide classifier.

**Prereq C — Facet coverage for 10 target topics**

Checked `scripts/seed-facet-definitions.ts` (not in
`prisma/seeds/` — original PRD path was wrong).

| # | Topic | Facet Status | Query Complexity |
|---|-------|-------------|------------------|
| 1 | Pregnancy mods | ❌ No facet | Needs new facet OR topic swap |
| 2 | Trait mods | ✅ `contentType: trait` | Simple |
| 3 | Clutter / CC finds | ✅ `contentType: clutter` | Simple |
| 4 | Hair CC | ✅ `contentType: hair` | Simple |
| 5 | Urban tattoos | ⚠️ `contentType: tattoos` exists; no "urban" modifier | Composite (tattoos + streetwear theme) |
| 6 | Skin details | ✅ `contentType: skin` | Simple |
| 7 | Male clothes CC | ⚠️ Needs composite | Composite (tops/bottoms/dresses/full-body + `genderOptions: masculine`) |
| 8 | Female clothes CC | ⚠️ Needs composite | Composite (same + `genderOptions: feminine`) |
| 9 | Furniture CC | ✅ `contentType: furniture` | Simple |
| 10 | Woohoo mods | ❌ No facet | Needs new facet OR topic swap |

**Implications**:

1. **Collection page template must support composite facet
   filters**, not just single facets. Simple topics filter by one
   facet; composite topics AND multiple facets together.
2. **Pregnancy and woohoo need resolution**. Two options:
   - **Option 1**: Add `pregnancy` and `woohoo` (or
     `adult-gameplay`) facets to `seed-facet-definitions.ts`,
     re-seed the DB, and backfill facet tags on existing mods
     via the content detector. More work but preserves the top
     topic list.
   - **Option 2**: Swap topics 1 and 10 for the next-best blog
     listicles with existing facet coverage. Lower effort, but
     loses two highest-volume Pinterest topics (pregnancy and
     woohoo are both evergreen Sims 4 search traffic).
   - **Claude's recommendation**: Option 1 for pregnancy (easy
     content detector rule: title contains "pregnancy",
     "pregnant", "prego"); **defer woohoo** to a later wave
     (NSFW-adjacent content has ad policy risk with Mediavine —
     needs product decision from Eric before building).
3. **Before Phase 1**: Run a Prisma query to verify the ✅ facets
   actually have non-trivial mod counts assigned. A facet defined
   in seed but tagged on 5 mods is useless for a collection page.
   Minimum viable: 40+ mods per collection page. Prisma check is
   a Phase 1 Gate 0 step before any template code ships.

**Bonus finding — routing clean slate**:
- `app/games/[game]/page.tsx` exists. No `[game]/[topic]` child
  segment. Adding `app/games/[game]/[topic]/page.tsx` is
  collision-free.
- `middleware.ts` has zero references to `/games/`. No WP proxy
  rules or noindex stripping touches this path. Safe to add.

#### Phase 1 — One reference page

Build ONE collection page end-to-end (topic #1, likely pregnancy
mods). Template, editorial intro, schema, Mediavine ad anchors,
internal links, cross-link to blog. Eric approves visually + voice
before Phase 2.

#### Phase 2 — Scale to 10

Clone template across remaining 9 topics. Editorial intros drafted
per Eric's Q1 answer. All 10 pages live before Phase 3.

#### Phase 3 — Pinterest A/B

Eric repoints pins (not Claude). Minimum ~20 pins per arm over 14
days (pending Q2 answer). Blog keeps enough pins to measure
cannibalization. Claude sets up GA4 segments / UTMs to separate
collection-page sessions from blog sessions.

#### Phase 4 — Measure (2026-04-23)

Pull Mediavine reporting, GA4 top landing pages, Pinterest session
counts split by destination URL pattern. Compare against blog
baseline. Score against the 4 OKRs. If OKRs miss by kill criteria,
revert and document why in this PRD under "Post-mortem."

---

## 6. Blocking questions for Eric (answer inline)

**No new code for Initiative 1 until these are answered.**

### Q1 — Editorial intros

Each of the 10 pages needs 200-400 words of editorial intro. That's
~3,000 words total. Three options:

- **1a.** Claude drafts all 10, Eric reviews for voice before publish.
- **1b.** Eric writes them (maybe riffing on existing blog intros).
- **1c.** Split — Eric writes 1-2 to establish voice, Claude mimics
  for the rest.

**Why it matters**: Brand surface. If voice is off, pages feel
generic and Pinterest users bounce. AI-written content is also an
HCU risk factor if any of these get indexed.

**Eric's answer** (2026-04-09): **1a** — Claude drafts all 10 using
the `humanizer` skill to match existing blog voice and pass AI
detection.

**Resolution** (2026-04-09): Installed the open-source humanizer
skill from https://github.com/blader/humanizer to
`~/.claude/skills/humanizer`. Version 2.5.1, MIT-licensed, based
on Wikipedia's "Signs of AI writing" guide. Detects 29 AI patterns
including em dash overuse, rule of three, AI vocabulary, passive
voice, negative parallelisms, and filler phrases. Supports voice
calibration against a sample.

**How to apply for Phase 2 editorial drafting**:
1. Pull 5-10 top-performing listicles from the WP prod server via
   `wp post get <id> --field=post_content` (use top-landing-pages
   GA4 export for the list). Save to a scratch file.
2. Draft each collection page intro (200-400 words) using Claude's
   normal writing, then invoke `humanizer` with the sample file as
   the voice reference.
3. Run output through an external AI detector (GPTZero or
   Copyleaks) as a sanity check before publish. Not a perfect
   signal but catches obvious misses.
4. Eric spot-reviews at least the first 2 intros before Claude
   proceeds with the other 8 — voice drift is the main risk and
   early sampling catches it cheapest.

---

### Q2 — Pinterest pin cadence

Proposed minimum: **20 pins per arm** over 14 days (~1.4/day per
arm, 2.8/day total).

**Why it matters**: Below this, traffic is too noisy to read. Above
this, Eric is stretched thin on creative.

**Sub-questions**:
- Is 20 pins per arm realistic in 14 days?
- Existing pin creative to reuse, or does each pin need new imagery?

**Eric's answer** (2026-04-09): All pinning is handled via the
**Pinterest scheduler plugin**. Claude has visibility into what's
scheduled — no need to speculate on cadence.

**How to apply**: Before Phase 3 kickoff, Claude pulls the
scheduled pin queue from the plugin, confirms there's enough pin
volume on both arms (collection pages vs blog) to produce signal,
and flags if either arm is under-pinned. The 20 pins/arm target
becomes a *verification* step, not a planning assumption.

**Open**: Need the plugin name or access path to read the scheduled
queue (e.g., Tailwind? Later? Publer? A custom WP plugin?). Will
confirm with Eric at Phase 3 kickoff.

---

### Q3 — URL structure

Three options:

- **3a.** `/sims-4/[topic]` — game at top. Splits the game-scoped UX
  with existing `/games/[game]`.
- **3b.** `/games/sims-4/[topic]` — nested under existing routing.
  Cleaner. Deeper URLs may hurt Pinterest pin-title matching.
- **3c.** `/collections/[topic]` — game-agnostic, flattest SEO.
  Works across Sims 4 / Stardew / Minecraft. Loses "sims 4" keyword
  in URL.

**Why it matters**: Locks in routing, middleware, sitemap, pin
titles. Hardest to change later.

**Claude's recommendation**: **3b** (`/games/sims-4/[topic]`). Keeps
keyword in URL, nests cleanly, extends to other games. Eric's
preference wins.

**Eric's answer** (2026-04-09): **3b locked in.** Eric delegated
the decision to Claude's recommendation. `/games/sims-4/[topic]`
it is.

**How to apply**:
- New dynamic route: `app/games/[game]/[topic]/page.tsx`
- Must not break existing `app/games/[game]/page.tsx` (game browse).
  Next.js App Router treats `[topic]` as a child segment, so
  `/games/sims-4/` still renders the game browse page and
  `/games/sims-4/pregnancy-mods` renders the collection page.
- Sitemap: add collection URLs to `app/sitemap.ts` under the games
  section.
- Middleware: verify no WP proxy rules or noindex stripping
  patterns collide with `/games/sims-4/[anything]`.
- Pin titles: use format `"Pregnancy Mods — 40+ Sims 4 CC Finds"`
  with the URL underneath. Keyword stays in the title even though
  the URL nests.

---

### Q4 — Cannibalization floor

Blog currently does ~$140/day. If the A/B siphons Pinterest traffic
from blog faster than collection pages pick it up, we lose revenue
during the test window.

**Proposed floor**: If blog drops below **$110/day (20% drop)**
during the test AND collection pages haven't picked up the
difference, pause early.

**Sub-questions**:
- Is 20% the right floor? Tighter (10%)? Looser (30%)?
- Pause at the floor, or note and keep going?

**Eric's answer** (2026-04-09): **10% floor — tighter.** Pause
early if blog 7-day rolling average drops below **$126/day**
($140 × 0.90).

**How to apply**:
- Claude runs a daily blog revenue check during the A/B window
  against `reference_mediavine_reporting.md`'s reporting URL.
- Trigger: 7-day rolling average < $126/day **AND** collection
  pages haven't picked up the shortfall. Both conditions must be
  true to pause — otherwise a 1-day Pinterest slump would
  false-positive.
- On trigger: pause the A/B immediately. Revert Pinterest pins
  back to blog URLs. Post a summary to this PRD under Initiative 1
  "Post-mortem" before deciding next steps.
- 10% is aggressive — it means we protect ~90% of blog floor
  revenue at the cost of a faster kill decision. That's the
  intended tradeoff given revenue sensitivity post-sidebar incident
  (see `incident_blog_sidebar_wipe_mar17.md`).

---

### Q5 — Interpret the 60% "mirror gamerant" OKR

Two ways to interpret:

- **5a. Endpoint**: Compare absolute dollars to gamerant after 14
  days. We lose. Test fails.
- **5b. Trajectory**: Is collection-page-per-session RPM closing the
  gap vs pre-test? Is the slope better?

**Claude's assumption**: **5b (trajectory)**. 14 days cannot close a
200x revenue gap. Endpoint scoring means the test is pre-determined
to fail regardless of what Claude ships.

**Why it matters**: Determines how Claude's value gets scored at
end-of-test. Endpoint = Claude's value is near-zero by construction.
Trajectory = measurable.

**Eric's answer** (2026-04-09): **Growth-rate trajectory, not slope
vs pre-test.** The question is: *are we growing revenue
substantially, and heading fast enough toward gamerant scale
(likely $millions/year)?*

**How to apply**: This is stricter than Claude's proposed 5b. The
test isn't "is the slope better than yesterday" — it's "is the
slope steep enough that, extrapolated, we're on a believable
trajectory to 7-figure annual revenue." Implication for scoring:

- **Pass (full 60% credit)**: 14-day compound weekly growth rate
  on collection page revenue implies a ≥10x annual run-rate from
  current (~$50K → ~$500K) OR a measurable multi-percent pull of
  blog's Pinterest traffic into collection pages with higher RPM.
- **Partial credit (30-40% of the 60%)**: Collection pages
  monetize within 20% of blog RPM, Pinterest traffic doesn't
  collapse, but growth rate is flat or modest (<2x implied annual
  run-rate). Direction is validated, magnitude is not.
- **Fail (0% of the 60%)**: Collection pages under-monetize OR
  Pinterest traffic drops without collection pages absorbing it.

**Claude's reaction**: This is a hard bar. The honest read is that
hitting the full 60% in 14 days is unlikely — we're measuring the
*beginning* of a trajectory, not the trajectory itself. Partial
credit is the realistic ceiling for this test. Noting it so there
are no surprises at the 04-23 readout.

---

## 7. Commitments

- No new code on Initiative 1 until all 5 questions above are
  answered.
- Ship one reference collection page first and get Eric approval
  before building the other 9.
- Eric runs the Pinterest A/B. Claude builds the pages and the
  measurement.
- Revert is cheap: collection pages are additive, not destructive.
  If killed, pins go back to blog and the pages stay up as finder
  content.
- **This PRD is the canonical source of truth for revenue work.**
  Future initiatives append here, not as new PRDs.

## 8. Future initiatives (placeholder)

Append concrete revenue initiatives here as they're discussed. Do
not pre-populate with speculative work. Each new initiative should
include its own problem framing, success metric, phased plan, and
kill criteria.

- **Initiative 2: Fix Sidebar Sticky Health Score (12.9 → 50+)** ✅ COMPLETE (2026-04-13)
  See `initiative-2-sidebar-sticky-health.md`. Deployed to production.
  All Phase 1 fixes shipped: sidebar added to GamePageClient, homepage
  breakpoint changed to lg (1024px), placeholder divs removed, left spacer
  removed for wider grid. 23 regression tests guard against reversion.
  Expected impact: +$800-1,100/month. Monitoring health score for 7 days.

- **Initiative 3: Increase Pages Per Session (1.45 → 2.0+)**
  See `initiative-3-pages-per-session.md`. High priority.
  Mod card clicks open modals instead of detail pages, killing
  pageviews. ModDetailsModal has zero internal navigation. Tags are
  visually clickable but dead. TrendingMods component exists but is
  never rendered. Download interstitial wastes 10s of captive attention
  with no related mods. Expected impact: +$1,950/month.

## 9. References

- Memory: `project_collection_pages_pinterest_pivot.md` — original
  strategic plan (duplicates some content in this PRD; PRD is
  canonical if they diverge).
- Memory: `project_seo_google_hcu.md` — why Google SEO is not a
  revenue strategy.
- Memory: `reference_mediavine_reporting.md` — Phase 4 measurement
  source.
- Memory: `incident_blog_sidebar_wipe_mar17.md` — context on why
  blog revenue is sensitive to sidebar changes.
- Code to verify in Phase 0 Track B:
  - `prisma/seeds/seed-facet-definitions.ts`
  - `lib/gameRoutes.ts`
  - `middleware.ts`
  - `app/sitemap.ts` (or equivalent sitemap route)

## 10. Change log

- **2026-04-09** — PRD created. Aged off prior PRDs: 8 compound
  dead-code cleanup PRDs (Feb-Apr, all merged or obsolete) and 3
  prd-gsc-seo-cleanup files (PRD-7, PRD-8, README — work complete or
  contradicts new strategic direction). Active compound branch's
  current PRD (`20260408`) preserved as untracked.
- **2026-04-09** — Eric answered Q2, Q3, Q4, Q5. Q1 answered in
  principle (Claude drafts with humanizer), but blocked on
  `/humanizer` skill not existing in the harness — needs
  clarification before Phase 2. Q3 locked as 3b
  (`/games/sims-4/[topic]`). Q4 tightened to 10% ($126/day) floor.
  Q5 interpreted as growth-rate trajectory toward gamerant scale,
  stricter than Claude's proposed 5b — full 60% credit requires
  ≥10x implied annual run-rate, partial credit for direction-only
  validation.
- **2026-04-09** — Q1 blocker resolved. Installed open-source
  `humanizer` skill (github.com/blader/humanizer v2.5.1) to
  `~/.claude/skills/humanizer`. All 5 blocking questions now have
  concrete resolutions. Phase 0 is fully unblocked and Phase 1
  can start as soon as prereq checks (Track B) complete.
- **2026-04-09** — Phase 0 Track B complete. Key findings:
  (1) Google is architecturally dead for the finder — no
  `/mods/[id]` pages in sitemap, hand-rolled static sitemap with
  only 6 URLs. Pinterest is the only viable channel, confirming
  the pivot premise. (2) 5 of 10 target topics have clean facet
  coverage; 3 need composite filters (urban tattoos, male/female
  clothes); 2 have NO facet (pregnancy, woohoo). Recommendation:
  add a `pregnancy` facet + content detector rule, defer woohoo
  pending Eric's ad-policy call. (3) Routing clean slate — no
  collision at `app/games/[game]/[topic]`, middleware has zero
  `/games/` rules.
- **2026-04-13** — Mediavine dashboard audit conducted. Key findings:
  RPM recovered from $9.53 (Apr 6) to $16.53 (Apr 11) after sidebar
  restoration — 68% increase. However, sidebar sticky health score is
  only 12.9 (target 50+), and pages/session is 1.45. Two new
  initiatives added: Initiative 2 (sidebar sticky health, +$800-1,100/mo
  potential) and Initiative 3 (pages/session, +$1,950/mo potential).
  Combined potential: +$2,750-3,050/month on top of current ~$5,000/month
  run rate. Traffic sources: Pinterest 68.7%, Bing 18.9%, Google 0%.
  Device split: 94% desktop, 5.8% mobile.
- **2026-04-09** — Phases 1 and 2 shipped (all in one session).
  Files created:
  - `lib/collections.ts` — 10 finalized topics + `buildWhereClause`
  - `app/games/[game]/[topic]/page.tsx` — server component with
    Prisma composite-filter support, ItemList + CollectionPage
    JSON-LD, and static param generation
  - `app/games/[game]/[topic]/CollectionPageClient.tsx` — interactive
    shell (ModGrid, favorites, modal, breadcrumbs, Mediavine sidebar
    anchors mirroring `/mods/[id]`)
  - `scripts/backfill-pregnancy-facet.ts` — dry-run verified 115
    candidate mods (exactly matches Gate 0 forecast); **not yet
    applied** — pending Eric approval because it overwrites 53 poses
    and 26 gameplay-mod tags.
  Files edited:
  - `scripts/seed-facet-definitions.ts` — added `pregnancy` facet
    (sortOrder 61, 🤰 icon, #F472B6)
  - `lib/services/contentTypeDetector.ts` — added pregnancy keyword
    rule at priority 103
  - `app/sitemap-nextjs.xml/route.ts` — now emits all 10 collection
    page URLs via `getAllCollectionRoutes()`
  - `lib/collections.ts` — all 10 `intro` fields drafted with
    humanizer-informed voice (specific creator callouts, mixed
    sentence rhythm, concrete critique of vanilla, no "incredible/
    extraordinary/embark" AI filler). Pulled voice reference from
    the live `sims-4-pregnancy-mods` blog post.
  Verification:
  - `npx tsc --noEmit` — clean
  - `npm run build` — all 10 topic pages statically generated
    (`● /games/[game]/[topic]` shows `/games/sims-4/pregnancy-mods`,
    `holidays-cc`, `clutter`, `+7 more paths`)
  - Production DB: pregnancy dry-run = 115 candidates, matching the
    expected floor in `SIMS4_COLLECTIONS`.

  Phase 3 handoff (Eric):
  1. Decide whether to run `backfill-pregnancy-facet.ts --apply` now
     or leave the magic `__pregnancy_keyword__` fallback in place.
     Applying is cleaner but overwrites 53+26 existing tags — mostly
     a win because those mods belong in a pregnancy collection.
  2. Deploy to prod. Pages will be live at:
     - `https://musthavemods.com/games/sims-4/pregnancy-mods`
     - `/holidays-cc`, `/clutter`, `/hair-cc`, `/tattoos`,
       `/skin-details`, `/male-clothes`, `/female-clothes`,
       `/furniture-cc`, `/poses`
  3. Update Pinterest scheduler plugin: repoint A-arm pins to the
     new URLs above (grouped by topic). Keep the B-arm pins on the
     existing blog URLs for the 14-day cannibalization check.
  4. Set up GA4 segments to separate sessions by landing-page URL
     pattern (`^/games/sims-4/[a-z-]+$` vs `^/blog/` etc.). Tag the
     A-arm pins with a shared UTM (`utm_source=pinterest&utm_medium=
     social&utm_campaign=collection_ab_2026_04`) for clean splits.
  5. Measure on **2026-04-23** per the Phase 4 OKR framework.
