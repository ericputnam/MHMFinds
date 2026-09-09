# Patreon day-0 welcome note — draft for the operator (Rio, 2026-09-09)

**Tier 0 draft. The operator pastes it; nothing here is posted by the team.**
Experiment **E30**. Companion to Q4 step 1 (countdown-skip perk on the $3 tier) and E24 (Patreon-linked site accounts).

## Why this, and why now (source: `scripts/agents/patreon-churn-read.ts`, 2026-09-09)

- 225 former vs 47 active patrons. Of 223 dated cancellations, **88 (39%) paid exactly once** and **132 (59%) paid at most twice**. Median charges before leaving: **2**.
- Of 250 paying relationships older than 60 days, **84 (34%) never paid a second month**.
- Joins are fine: 18.7/mo over Jun–Aug vs 9.7 cancels/mo. The bucket fills; it leaks in the first two cycles.
- Today a new patron gets nothing between the charge and the next public lookbook. The only perk that runs itself is the site countdown skip (live since PR #52/#62), and the tier text now mentions it — but **0 of the 11 accounts that connected Patreon on the site so far belong to a currently paying patron**. The people who pay are not being told how to collect.

So the first retention touchpoint is a **welcome note that hands over the perk with the exact steps on day 0**. Patreon sends it automatically to every new patron of the tier (and shows it on the thank-you screen), so it costs the operator one paste.

## Where to paste it (~2 minutes)

Patreon → **Membership → Tiers → "Tip Jar - Curious Simmer" ($3) → Edit → Welcome note**. Save. (Also add it to the $5 "Extra Support" tier if it stays published.) Do not put it on the $1 tier — that tier is being unpublished for new joins under Q4 step 1.

## Welcome note — paste as-is, edit the sign-off

> Thank you — genuinely. The tip jar is what pays for the hours the lookbooks and CC lists take.
>
> One thing to do right now so you actually get something back: open any download page on musthavemods.com, tap **"Patrons skip the wait"**, and connect this Patreon account. From then on the download timer is gone whenever you're signed in. It takes about 20 seconds and you only do it once.
>
> New lookbooks land here two or three times a week. If you ever want a theme covered, reply to this message — I read every one.
>
> If the connect button doesn't recognise you, reply here with the email you use on Patreon and I'll sort it.
>
> — [operator's first name]

Plain-text alternative for the thank-you screen (Patreon strips formatting there):

> Thank you! To skip the download timer on musthavemods.com: open any download page, tap "Patrons skip the wait", connect this Patreon account. Once. Done. New lookbooks here 2–3× a week — reply if you want a theme covered.

## Optional: the day-20 post (before the second charge) — Tier 2, operator's voice, same rule as Q4's thank-you post

Title: **This month in the tip jar**

> Quick roundup for everyone supporting the site this month: [N] lookbooks went up ([list 3 titles]), and the download-timer skip is live on musthavemods.com — if you haven't connected Patreon on a download page yet, it's one tap. Next month: [one line on what's coming]. Thank you for keeping this running.

Post it around the 20th–25th so it lands before the monthly renewal. This is the recurring version of the welcome note; it is the second move, not the first.

## Measurement (E30)

- **Metric:** first-30-day churn of paid pledges started after the note is live (Members API, `patreon-churn-read.ts` first-cycle block re-run on the post-note cohort) and Patreon-linked site accounts that belong to a currently paying patron (`Account.provider='patreon'` ∩ active patron emails).
- **Baseline (2026-09-09):** first-30-day churn 34% (84/250); 39% of cancels after one charge; 11 linked accounts, 0 currently paid; 47 paid, $125/mo gross.
- **Read on:** 2026-10-07 (first cohort has had ≥28 days), then 2026-10-22.
- **Keep if:** post-note cohort first-30-day churn ≤ 24% (≥10 pts better) OR ≥ 1/3 of new paid patrons connect Patreon on the site within 7 days of joining. Kill the note if neither by 2026-10-22 and move to the day-20 post as the primary lever.
- **Rollback:** delete the welcome note in the tier editor (one field).

_— Rio, Product & Revenue_
