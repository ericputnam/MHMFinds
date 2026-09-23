# Q4 re-pitch, smaller scope — one Patreon post that moves paid-and-connected off 0 (Rio, 2026-09-22)

**Tier 2 — a public post in the operator's voice. Rio drafts; the operator edits and posts. Nothing here is posted by the team.** Experiment **E88**. Replaces the three-step Q4 "step 1" ask (unpublish $1 tier · paste welcome note · thank-you post), which has been open since 2026-09-08 (14 days, re-pitch rule in `autonomy.md`) with one ~2-minute action.

## The gate read today, and what it says (source: `reports/funnel/patreon-q4-gate-preread-2026-09-22.md`)

| Leg | Value 2026-09-22 | Result |
|---|--:|---|
| Paid joins since 2026-09-08 | 10 in 14.5 d = **21/mo** pace | ≥ 17/mo: PASS |
| Paid patrons connected on site (Patreon-id join) | **0 of 54** (0%) | ≥ 1/3: FAIL |
| Cancels since 2026-09-08 | 1 = 2.1/mo (a floor until the 10-01 charge run) | > 16/mo → revert copy: no |

**Decision: HOLD** — no tier renames, no $10 tier. Third consecutive HOLD (09-20, 09-21, 09-22) on the same failing leg.

## Why the failing leg cannot move on its own

- The only place on the site where anyone can connect Patreon is the Connect button on a `/go/<modId>/` download page (`app/go/[modId]/GoClient.tsx` is the sole `signIn('patreon')` call site). A paid patron who never lands on a download page never sees it.
- 59 site accounts have connected Patreon since 09-08. **53 of 59 (89.8%) were never in the campaign at all**, 6 are free members, **0 are paying**. The button is reaching strangers who happen to have a Patreon login, not the 54 people who pay. Its 09-21 fix (E74, PR #131) now asks those strangers to follow free — right for them, irrelevant to the 54.
- The 54 paid patrons have not been told the perk exists anywhere they look: the $3 tier description carries the perk line (edited 09-09), but the welcome note is not pasted, no post has gone out, and Patreon's own feed is the one channel that reaches every one of them.
- B2 (non-ad $200/mo by 09-30) sits at **$150.50/mo** with 8 days left. At the current 0.69 paid joins/day the 09-30 figure projects to roughly $165 — the line needs 17 new $3 patrons in 8 days, which only the 5,429 free followers can supply, and they too read the Patreon feed.

So the smallest operator action that can move paid-and-connected off 0 is a Patreon post with a direct link to a download page.

## The ask (~2 minutes, Patreon → Create → Post, audience: all members)

Paste, edit the sign-off, post. Text below is a draft in your voice — change anything.

**Title:** Your $3 now skips the download timer — one tap to switch it on

> Quick one for everyone in the tip jar.
>
> If you support MustHaveMods at $3 or more, the download countdown on the site is gone for you. You just have to connect your Patreon once, and the fastest way is:
>
> 1. Open this download page: https://musthavemods.com/go/cmim9obub00mzoxy7av4vowyr/
> 2. Tap **"Connect Patreon"** and approve.
> 3. You're back on the page with no timer — and it stays off on every download while you're signed in.
>
> Free member? The tip jar is $3 and this is what it buys, on top of keeping the lookbooks and CC lists coming: https://www.patreon.com/checkout/MustHaveModsOfficial?rid=24880520
>
> Thank you, genuinely. The tips pay for the hours these take.
>
> — [your first name]

Notes on the copy:
- The link is the most-downloaded mod of the last 30 days on the site (26 and 20 download clicks for the top two; the top one has a junk title, so the second — "Sims 4 3D Eyelashes Ver 5" — is used). Any `/go/<modId>/` page works; a concrete link converts better than "open any download page".
- The $3 checkout link is the tier's public join URL (tier id 24880520, from `GET /campaigns/{id}?include=tiers`). It is second, after the perk walk-through, on purpose: leading with checkout on `/go` cut `patreon_click` from 8.75 to 3.57 users/day (E40 → E65).
- Nothing on the site changes. No code, no env var, no price.

## Measurement (rule written before the post goes out)

- **Metric:** paid-and-connected patrons, Patreon-id join (`scripts/agents/patreon-q4-gate-preread.ts`, line "Paid-and-connected"). Same-day signal: GA4 `member_skip_countdown` events (last one fired 2026-09-08; 0 since).
- **Baseline:** 0 of 54 paid, 2026-09-22 (pre-read 10:51Z); `member_skip_countdown` 0 in the 14 days to 09-22.
- **Read:** 7 days after the post date (post on D → read D+7; if posted 09-22, read 2026-09-29 with the E55/E60 reads).
- **Keep / proceed:** paid-and-connected ≥ 18 of 54 (exactly 1/3, compare the exact fraction) → the Q4 gate's failing leg turns and the renames + $10 tier proceed on the pre-committed rule. ≥ 1 and < 18 → the channel works; keep the countdown-skip as the $3 perk and put the welcome note (E30) in as the second touch. **0 after 7 days** → the perk is not wanted by the people who pay; drop "skip the countdown" as the headline $3 perk and re-pitch Q4 around early lookbooks instead. Guardrail: session RPM ≥ 95% of the same-weekday 4-wk mean, one-sided.
- **Ad risk, bounded with a source:** the whole `/go/[modId]/` page type earned at most **$2.05 in 09-14→09-20** (GA4 187 pv × site page RPM $10.97; `reports/funnel/page-rpm-snapshot-2026-09-22-w0914-0920.md`). Even if every `/go` view became a member skip, the ceiling is under $9/mo. The Mediavine 28-day guardrail cannot see it.
- **If nothing happens (silence default):** nothing is posted by the team, nothing changes on the site; the re-pitch is dropped and logged on 2026-09-29 per the 7-day rule, and Q4 stays HOLD on the connected leg with the $3 perk unannounced.
- **Cost of waiting:** 0.69 paid patrons/day keep joining with no day-0 handover of the perk; 59% of all past cancels left after at most two charges (E30 churn read, 2026-09-09). The 10-01 charge run is the next churn event.

## Rollback

Delete the post. Nothing else to undo.

## Still open, no longer the ask

Unpublish the $1 "Support Tier" (9 patrons, still `published=true` on 09-22) and paste the welcome note from `reports/funnel/drafts/patreon-welcome-note-2026-09-09.md` into the $3 tier. Both are ~1 minute each and both help; neither moves paid-and-connected on its own, which is why the post comes first.

— Rio, Product & Revenue
