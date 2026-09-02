# MustHaveMods — Funnel Strategy & Team Reset (2026-09-01)

_Companion to `reports/growth/fact-base-2026-09-01.md` (the numbers) and
`.claude/agents/mhm-funnel/charter.md` (the team). This is the argument._

---

## 1. What I think about all this (straight answer)

**The old framework failed for structural reasons, not effort.** "Grow revenue at
all costs" with agents that could only recommend, an operator who could only
approve at night, and a nightly pipeline that had been silently failing for
weeks meant nothing shipped. The one number the team optimized (session RPM) is
set by ad demand nobody in the building controls. Mediavine said so in writing.

**Ads cannot get you to millions.** August: 399K sessions, $6,066, $15.09 RPM.
At that RPM, $1M/yr is 5.5M sessions/month — 14× today — and Pinterest, which is
67% of traffic, does not scale linearly. $250K/yr from ads needs 1.4M sessions/mo
at today's RPM, which is a good three-year outcome, not a plan.

**The asset you actually have is under-used to an almost comic degree.**
400K sessions a month have produced 17 email subscribers, total. 5,144 people
follow you free on Patreon and 49 pay; nothing is sent to the 5,095. 1,522
accounts exist (245 new in August) and none has ever received an email. The
pinner posts every day and nobody reads Pinterest analytics back. That is not
a traffic problem. That is a funnel with no walls.

**The Pinterest nervousness is correct, and the answer is not "find another
Pinterest."** The answer is to convert Pinterest sessions into people you can
reach without Pinterest (email, Patreon, accounts, push) and to build a product
they pay for. Every session you capture is a session the algorithm cannot take.

**Two more things surfaced that the old team missed:**
- Google clicks fell 94% in 15 months (38,102 → 2,097/mo). GSC also claims 0
  of 16,550 sitemap URLs indexed. Nobody diagnosed it. That is a plausible
  eight-figure-sessions hole in the boat and Sage's first job.
- GA4 has zero conversion events. Nothing you care about (signups, Patreon
  clicks, premium interest) is measured, so nothing could be optimized.

**Verdict:** the business is worth far more than it is earning, but the path
runs through owned audience and product, not through another RPM tweak.

---

## 2. Honest ceiling math

| Path | What it takes | 12-month realistic | Ceiling |
|---|---|---|---|
| Ads only | 3× sessions at flat RPM | $8–12K/mo | ~$20K/mo without a Google recovery |
| + Google recovery | Fix indexing, homepage SSR, catalog titles | +100–200K sessions/mo | Was 38K clicks/mo in 2025; catalog of 15.9K pages is the asset |
| Owned audience → Patreon ladder | 2% capture rate × 400K = 8K emails/mo; 3–5% of engaged members pay $3–10 | $2–5K/mo by Q2 2027 | $10–20K/mo at 100K email list |
| Membership (no countdown, no interstitial ads, early mods) | Patreon OAuth gate on the site, 1,522 accounts to seed | $1–3K/mo | Scales with accounts, not sessions |
| Premium first-party mods / lookbooks | Writer already makes lookbooks 60 people tip for | $500–2K/mo | Catalog effect; each launch adds |
| Creator hosting / rev-share | Template, 20 outreach/wk, host mods on MHM | Slow (Q1 2027) | The real moat: supply + their audiences |
| Sponsorships | Media kit, 400K sessions, 94% desktop, US-heavy | $500–2K/mo per deal | Needs owned audience to price |

Stacked, a realistic 12-month picture is **$15–25K/mo total** with non-ad revenue
at $5–10K of it — not millions, but 3× today with a revenue mix the algorithm
can't zero out. Millions requires the creator-hosting flywheel working, which is
an 18–36 month build. The team is chartered to prove the first rung by
2026-12-31: owned-audience adds tripled, non-ad revenue ≥ $1,000/mo.

---

## 3. The team (what changed and why)

| Old | New | Why |
|---|---|---|
| Sterling (CEO) fanning out to advisors | **Quinn** (GM) running a loop that ships | Advisory → executing |
| Max (RPM) | **Rio** owns the ad *guardrail* and builds product | RPM is a floor, not a lever |
| Tim (SEO) | **Sage** (Search & AI) | Adds AI-answer-engine discoverability, owns the Google-collapse diagnosis |
| Mark (finance persona) | `funnel-scoreboard.ts` (a script) | Numbers are deterministic; agents argue about moves, not facts |
| Ivy (affiliates) | folded into Rio (background) | $0 in 10 weeks; not a top-3 bet |
| — | **Pip** (Distribution) | Pinterest read-back, next channel, launch amplification |
| — | **Nova** (Content & Creators) | Collection pages at scale, writer briefs, creator program |
| — | **Cass** (Capture) | The missing stage: 17 emails from 400K sessions |
| Ask-then-act, everything gated | **Tiered autonomy, default-ship** (`autonomy.md`) | "I don't want to be the limitation" |
| Weekday 8am reporting pulse | Daily 6:30am *execution* loop in a clean worktree | Silence was being read as green |

Full rules: `.claude/agents/mhm-funnel/{charter,autonomy,operating-model}.md`.

---

## 4. First 30 days (what ships, in order)

**Week 1 — instrument and unblock**
1. Cass: GA4 events `newsletter_signup`, `account_signup`, `patreon_click`,
   `premium_intent` (T0). Nothing else is measurable without this.
2. Sage: Google-collapse diagnosis (`reports/growth/google-collapse-diagnosis.md`):
   reconcile "0 indexed", inspect 20 top URLs, check robots/canonicals/render (T0).
3. Pip: Pinterest read-back — which pins/boards drive sessions, pin freshness
   monitor (T0). Scoreboard already flags a stalled pinner.
4. Rio: Patreon paid ladder proposal with perks the writer can actually deliver
   ($3 / $5 / $10) — package to `operator-queue.md` (T2).
5. Nova: first writer brief pack (T0) and +5 collection pages (T0).

**Week 2–3 — capture everywhere (SD-3)**
- Email capture on `/`, `/go/[modId]` (below the CTA, outside ad zones),
  collection pages, blog post footer via the WP proxy (T1).
- Turn on the weekly newsletter to opted-in subscribers (T1, `NEWSLETTER_WEEKLY_ENABLED`).
- Patreon free-member CTA on every mod page; account signup after 3 favorites (T1).
- First re-engagement email to 1,522 accounts (draft T0 → send T1).

**Week 3–4 — product**
- Membership v1: Patreon OAuth link → skip countdown + no interstitial ads +
  early first-party mods (T1 for the code, T2 for the pricing/perk copy).
- `llms-full.txt`, AI-crawler robots rules, feed + schema on collection pages (T0).
- Homepage SSR shell so Google/LLMs see mods, ad anchors unchanged (T1).

Success at day 30: capture rate measurable, ≥120 owned adds/week, Google
diagnosis with a fix list, Patreon relaunch package on the operator's desk.

---

## 5. What only you can do (the operator queue, `operator-queue.md`)

1. **Merge `feature/premium-intent-test` into main** (or tell Quinn to). The
   scoreboard shows `waitlist.unsubscribedAt` schema drift that needs `db:deploy`.
2. **Tokens:** Patreon creator access token (`PATREON_CREATOR_ACCESS_TOKEN`) so
   Rio/Cass can read members and post drafts; Pinterest analytics scopes so Pip
   can read pin performance instead of scraping.
3. **Newsletter sender:** confirm the SendGrid sender/domain so Cass can send.
4. **The writer:** 15 minutes a week with Nova's brief pack; approve the Patreon
   tier perks Rio proposes. Nothing public goes out in her voice without her.
5. **Costs:** Vercel / Prisma / OpenAI monthly numbers, once, into `targets.json`.
   The old team asked five times. It matters only for the P&L line, not for moves.

Everything else the team does on its own. Reply "stop N" to veto, "approve N" to
release, or say nothing and Tier 0/1 keeps shipping.

---

## 6. Risks I am accepting on your behalf

- **Default-ship will occasionally ship something you dislike.** Rollback is one
  `vercel rollback`; every PR carries a rollback line. Ad-layout, money, auth,
  schema, and public voice remain human-gated.
- **Capture surfaces cost a little RPM.** SD-3 forbids them inside ad anchors;
  the 28-day Mediavine guardrail (≥95% of prior) kills any surface that dips it.
- **Bing organic (18K/wk) may be bots.** It is reported separately and excluded
  from targets until proven.
- **Patreon numbers are scraped from the public page** until the creator token
  exists; free/paid counts can lag a day.

— Quinn, GM (drafted by Claude for the operator, 2026-09-01)
