# Biweekly community vote — rules draft v1 (Nova, 2026-10-25)

**Status: DRAFT. Tier 2 — nothing here is live, posted or promised.** The prize is money and the
rules are legal wording, so the operator decides both (`autonomy.md` Tier 2: money; legal/ToS).
Source: `growth-plan.md` § "Run — creators and the community vote" (operator directive 10-24).
Queue row: `operator-queue.md` Q__ ("approve vote rules v1" / "vote prize $N" / "reject vote").

Nothing in this file may be copied into a public page, email, Patreon post or social caption until
the operator replies. When approved, the public copy is rewritten in the writer's/operator's voice
(SD-1); this draft is the mechanics, not the announcement.

## Sizing (production DB, read 2026-10-25 21:16Z)

| Fact | Number | Why it matters |
|---|---|---|
| SFW mods first listed in the last 14 days | 137 | the eligible pool per period |
| Distinct creators behind them | 106 | one creator per ballot line; ~100 names is too many to vote on — shortlist needed |
| Registered accounts | 2,269 | the voter universe before any floor |
| … with a verified email | 1,967 | floor 1 |
| … created ≥30 days ago | 1,740 | floor 2 |
| … created ≥30 days ago AND ≥1 favorite or download ever | **843** | the proposed "established account" electorate |
| Scripted-shaped sign-ups since W42 (E260 / Q33) | ~115 | the fraud these floors exist for; all are <30 d old today, so floor 2 alone excludes them until mid-November — floor 3 (activity) is what holds after that |
| Creators onboarded (profile with ≥1 submission) | 2 | the vote is a recruiting hook, not a reward for an existing roster |

## Proposed rules v1

### Schedule
- Period = 14 days, Monday 00:00 ET → Sunday 23:59 ET two weeks later. First period proposed to
  start **Monday 2026-11-10** (after the 11-07 social approval gate, so the announcement can ride
  the first approved social batch and the weekly newsletter).
- Voting opens the Monday after the period closes and runs 5 days (Mon–Fri). Fraud review Sat;
  winner announced the following Monday with the next period's shortlist.

### Eligibility — mods
- Only mods **first listed on MustHaveMods during the period** (`Mod.createdAt` inside the window,
  SFW, with a creator page or a verified profile). Re-listed or re-dated rows are out.
- Shortlist: the **12** most-favorited eligible mods in the period, max **1 per creator**, with any
  creator on the `creator-optout` list removed. Published with the ballot so the shortlist is a
  matter of record, not editorial.
- A creator who has won **cannot win again for 90 days** (their mods still appear; a win rolls to
  the runner-up). Mods flagged `isNSFW` never appear.

### Eligibility — voters
- One vote per person per period. Account must have: **verified email**, **created ≥30 days before
  voting opens**, **≥1 favorite or download before the period started**. Today that is 843 accounts.
- Votes are tied to the account, not the browser; the API rejects a second vote (409), never
  overwrites.
- Fraud review before announcing: the E260 shape rule (`lib/funnel/signupQuality.ts`), IP/UA
  clustering across the ballot, and any shortlisted creator whose votes are >50% from accounts
  created in one 72 h window. A review that voids votes is logged in `reports/funnel/creators/` with
  counts only — never addresses.

### Prize (operator decides the number — options, not a recommendation of amount)
- **Option A:** $25 gift card (Amazon / Steam / EA) + homepage "Community pick" slot for 2 weeks +
  a newsletter feature + a short (when the channel is live). ≈ $650/yr at 26 periods.
- **Option B:** $50 gift card + the same features. ≈ $1,300/yr.
- **Option C:** no cash — features only. Costs nothing; the plan's own wording ("cash or gift card
  + feature") suggests A or B.
- Paid as a gift-card code by email from the operator's own account, to the email on the verified
  creator profile. Never from an agent. If the winner cannot or does not want to receive it within
  30 days, it rolls to the next period (no cash alternative, no transfer).

### Official-rules items (operator's lawyer / judgement — flagged, not drafted as legal text)
- **No purchase necessary**; an account is free; voting is free.
- **Age:** entrants (creators) and voters must be **16+**, or the age of majority where they live if
  higher; under-18s need a parent's permission to accept a prize. Audience skews young — this is the
  line the plan asked for; the operator picks 13+/16+/18+.
- **Where void:** nowhere-void is simplest for a gift card; the operator may exclude jurisdictions
  that regulate sweepstakes (Quebec, Italy, etc.). A vote is a skill/popularity contest with no
  chance element, which keeps it out of most lottery rules — needs a one-line check.
- Sponsor: the operator's business entity. Not endorsed by EA / Maxis / any platform.
- Creators keep every right to their mods; we display a title, image and link we already list.
- Rules page lives at `/creators/vote/` (nested under the existing `creators` prefix — no new
  top-level route) and is linked from every ballot. **Not built until approved.**

## What ships after approval (and at what tier)
| Step | Tier | Owner |
|---|---|---|
| Rules page + shortlist generator (`createdAt` window, top-12 by favorites, 1/creator, opt-out, 90-day winner lock) with `--dry-run` | 1 (new page) | Nova |
| Ballot API (one vote/account, floors as above, 409 on repeat) | **2 — touches auth/accounts; Q33's gate decision first** | Nova packages, operator approves |
| Announcement copy (newsletter, Patreon, social) | 2 until 11-07, then per the plan | Cass / Pip draft, operator sends |
| Prize payment | operator only | — |

## What a reply looks like
- **"approve vote rules v1"** → rules as written; Nova opens the Tier 1 rules-page PR and files the
  ballot API as its own Tier 2 row.
- **"vote prize $25"** / **"vote prize $50"** / **"vote prize none"** → sets the prize line.
- **"vote age 18"** (or 13/16) → sets the age line.
- **"reject vote"** or silence → re-pitched once on 11-01, dropped 11-04 under the 7-day rule;
  the badge (E269) and the claim flow continue regardless.

— Nova, Creators & Supply
