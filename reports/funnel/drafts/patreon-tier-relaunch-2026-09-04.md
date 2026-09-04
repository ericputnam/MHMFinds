# Patreon Tier Relaunch — Q4 Package

**Status: QUEUED-T2** — operator must approve and post. Rio has drafted; Quinn to add to operator-queue.md.
**Written:** 2026-09-04 by Rio
**Bet:** B2 — 49 → 90 paid patrons at blended $4/mo ≈ $360/mo gross (from ~$127/mo today)
**Target live date:** operator's call; recommend before October 1 to capture Q4 engagement

---

## Current state (source: scoreboard 2026-09-04)

| Tier | Price | Count | Gross/mo |
|---|---|---|---|
| Support Tier | $1 | 7 | $7 |
| Tip Jar - Curious Simmer | $3 | 40 | $120 |
| Extra Support | $5 | 0 | $0 |
| **Total paid** | — | **47** | **$127** |
| Free members | — | 5,201 | $0 |

The $5 tier has zero patrons. The $1 tier has only 7 — it is not converting free members. The $3 tier is doing all the work but the name ("Tip Jar") undersells the value. There is no $10 tier capturing higher-intent fans.

---

## The problem: perks don't justify the price

The current tiers offer vague "support" framing with no concrete product attached. Free members get everything that matters: the lookbooks, the mod lists, the community. There is no clear answer to "what do I get that I can't get free?" This is fixable without building new infrastructure.

---

## Proposed tier structure (two pricing options)

### Option A — Conservative ladder ($3 / $5 / $10)

Keeps the existing $3 entry point. Restructures the $5 tier with real perks. Adds a $10 tier.

| Tier | Price | Name | Perks |
|---|---|---|---|
| Free | $0 | MHM Community | Access to the free member feed; first look at mod roundups |
| Tier 1 | $3/mo | Early Access | New lookbooks 48h before public; skip the download countdown on musthavemods.com (membership link); early notification of new first-party mod drops |
| Tier 2 | $5/mo | CC Curator | Everything in Early Access + monthly exclusive lookbook not published publicly + vote on the next first-party mod topic |
| Tier 3 | $10/mo | Sims Muse | Everything in CC Curator + your Sim featured in an upcoming lookbook + shoutout in the monthly mod roundup |

**Revenue math (target):**
- 25 at $3 = $75
- 50 at $5 = $250
- 15 at $10 = $150
- Total: 90 patrons, $475/mo gross (blended $5.28)
- Current: 47 patrons, $127/mo gross
- Uplift: +$348/mo gross

### Option B — Simplified ladder ($5 / $10)

Retires the $1 and $3 tiers (grandfather existing at current price). Anchors at $5.

| Tier | Price | Name | Perks |
|---|---|---|---|
| Free | $0 | MHM Community | Access to the free member feed; first look at mod roundups |
| Tier 1 | $5/mo | CC Curator | New lookbooks 48h before public; skip the download countdown on musthavemods.com; monthly exclusive lookbook; vote on first-party mod topics |
| Tier 2 | $10/mo | Sims Muse | Everything in CC Curator + your Sim in a lookbook + creator shoutout in mod roundup |

**Revenue math (target):**
- 60 at $5 = $300
- 20 at $10 = $200
- Total: 80 patrons, $500/mo gross (blended $6.25)
- Uplift: +$373/mo gross
- Risk: 40 existing $3 patrons may churn at forced $5 anchor (est. 50% churn = -20 × $3 = -$60/mo)
- Net uplift: ~$313/mo if 20 churn, ~$373/mo if none do

**Operator decision required:** Which option, or a hybrid (grandfather $3, close to new). Option A is lower churn risk; Option B achieves higher blended ARPU.

---

## Tier copy — ready to paste into Patreon

### Option A copy

**Tier: Early Access — $3/mo**

You love finding the best Sims 4 CC before anyone else. This is for you.

- New lookbooks 48 hours before they go public
- Skip the download countdown on MustHaveMods.com (member benefit — link sent when you join)
- First notification when new first-party mods drop

That's it. No fluff. Just early access to the good stuff.

---

**Tier: CC Curator — $5/mo**

You're the person your friends ask for CC recommendations. Let's make it official.

Everything in Early Access, plus:

- A monthly exclusive lookbook published only for patrons — never on the public site
- Vote on the theme of our next first-party Sims 4 mod

Your vote actually determines what we build. One patron, one vote.

---

**Tier: Sims Muse — $10/mo**

You don't just play The Sims — you make it look good. We want to feature your Sim.

Everything in CC Curator, plus:

- Your Sim appears in an upcoming MHM lookbook (send us your save file and we'll handle the rest)
- Shoutout in our monthly mod roundup, seen by thousands of Sims players

Spots are limited. We can only feature a handful of Sims per month so the lookbooks stay curated.

---

### Option B copy (simplified $5/$10)

**Tier: CC Curator — $5/mo**

Early lookbooks. An exclusive monthly lookbook that never goes public. Skip the download countdown on the site. Vote on our next mod. One price, no tiers to puzzle over.

---

**Tier: Sims Muse — $10/mo**

Everything in CC Curator. Plus your Sim featured in an upcoming MHM lookbook, and a shoutout in our monthly roundup. Send your save file — we'll handle the rest.

---

## Free-to-paid announcement post (operator posts this)

**Title:** We just rebuilt our Patreon tiers — here's what changed (and why)

---

Hey MHM fam,

Quick update: I've rebuilt the Patreon tiers from scratch because the old ones honestly didn't make sense.

The "Tip Jar" name was embarrassing. You weren't tipping — some of you have been here for months supporting this site. You deserved actual perks, so here's what's new:

**What you get now:**

At $3/mo (Early Access): New lookbooks 48 hours before they go public. Skip the countdown timer on the download pages. First heads-up on new mods.

At $5/mo (CC Curator): Everything above, plus a monthly exclusive lookbook that lives only on Patreon — never published publicly. Plus a vote on what first-party mod we build next.

At $10/mo (Sims Muse): Everything above, plus your actual Sim featured in an upcoming lookbook. Send me your save file. I'll make it look good.

**For existing patrons:** Your current pledge is grandfathered. Nothing changes unless you choose to upgrade.

If you've been on the fence about joining, this is the version that's actually worth it.

[Link to Patreon page]

Thanks for keeping this site alive. I mean it.

— [writer's name]

---

## Membership site link (dependency)

The "skip the countdown" perk requires a mechanism to verify Patreon membership on musthavemods.com. This is the Tier 1 membership build (Patreon OAuth via `PATREON_CLIENT_ID`). That feature is not yet shipped. **Options:**

1. **Launch tiers now without the countdown perk** — simpler, less powerful. The lookbook perks alone justify $3-5.
2. **Hold until membership build ships (T1)** — stronger value prop but delayed by weeks.
3. **Hybrid:** launch tiers now, promise countdown skip "coming soon," ship T1 within 30 days.

Operator decision required. Recommend Option 3: the lookbooks and exclusive content are sufficient to launch, and the countdown skip becomes the upgrade hook when T1 ships.

---

## Measurement

- **Baseline:** 47 paid patrons, $127/mo gross (2026-09-04, scoreboard)
- **Read date:** 2026-10-04 (30 days post-launch)
- **Keep if:** paid count >= 60 and gross >= $200/mo
- **Kill if:** no change in paid count after 30 days (demand signal is absent)
- **Source:** scoreboard public Patreon scrape (daily)

---

## What operator needs to do

1. Choose Option A or Option B (or tell Rio to build a hybrid)
2. Edit the tier copy above if anything doesn't match your voice
3. Update tiers in Patreon dashboard (copy-paste from above)
4. Post the announcement (copy-paste the post draft above, add your name, add the Patreon URL)
5. Decide on the countdown-skip timing: launch now without it, or wait for T1

Rio will track paid count and gross from the daily scoreboard. No further action needed from the operator after launch.

---

_Rio, Product & Revenue — 2026-09-04_
