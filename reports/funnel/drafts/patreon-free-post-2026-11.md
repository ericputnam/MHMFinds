# Patreon post for all members, November 2026: "what's new on the site" (Cass, E294, 2026-10-30)

**Tier 2: a public post in the operator's voice. Cass drafts it. The operator edits and posts it, and the team posts nothing.**
Audience: **all members (free and paid)**. This is the first of the monthly "what's on the site" posts listed in Cass's levers (charter, lever 3).

## Why this post, and why now

- The Patreon page has **6,352 free members and 57 paid** (scoreboard 2026-10-30). That is about 23 times the email list (279 subscribers, 159 sendable after exclusions). It is the largest owned audience we have, and the only one that does not depend on Gmail inbox placement (Q31: no DKIM).
- Patreon already sends visitors without any posts. Over the 12 complete ISO weeks W32 to W43 (2026-08-03 to 2026-10-25), GA4 sessions with `sessionSource` containing "patreon" ran 138 to 256 per week, a **mean of 199/week** (W42 226, W43 246). None of that traffic is tagged, so nobody has measured what one post to every member can do.
- The site is 89,337 sessions/7d against a Nov line of about 16.7k/day, so the team is **about 4k sessions/day short** (operator watch 10-29). An email issue brings back 5 to 6 sessions per 100 sent (issue 07: run 1 5/100, run 2 6/100). If a post that reaches all 6,352 members did the same, it would be worth a few hundred sessions, and it costs the operator about 2 minutes.
- Every link below is tagged, so the read is exact and does not depend on the referrer.

## The ask (about 2 minutes: Patreon, then Create, then Post, audience "All members", public or members-only, your choice)

Paste it, change anything you like, and sign it. The voice rule from the growth plan applies: if a line sounds like an ad, cut it.

**Title:** New on the site: wedding CC, GShade presets, and the holiday pages are up

> Hi all, a quick update on what's new on musthavemods.com, since a lot of you only see us here.
>
> **Wedding CC has its own page now.** 118 finds (dresses, poses, venues) picked by what the mod is actually called, so no random sofas:
> https://musthavemods.com/games/sims-4/wedding-cc/?utm_source=patreon&utm_medium=post&utm_campaign=patreon-post-2026-11
>
> **GShade and ReShade presets.** 95 of them in one place:
> https://musthavemods.com/games/sims-4/gshade-presets/?utm_source=patreon&utm_medium=post&utm_campaign=patreon-post-2026-11
>
> **Holiday CC is ready early.** 500+ Christmas, winter and holiday finds for when your Sims start decorating:
> https://musthavemods.com/games/sims-4/holidays-cc/?utm_source=patreon&utm_medium=post&utm_campaign=patreon-post-2026-11
>
> **Best new mods of 2026.** The list we keep updated with mods that work on the current patch:
> https://musthavemods.com/new-sims-4-mods-2026/?utm_source=patreon&utm_medium=post&utm_campaign=patreon-post-2026-11
>
> One more thing: if you make a free account on the site, the heart button saves any mod to your list, so you can find it again when you're ready to download:
> https://musthavemods.com/sign-in/?mode=signup&ref=patreon-post&utm_source=patreon&utm_medium=post&utm_campaign=patreon-post-2026-11
>
> Thanks for being here.
>
> [your first name]

Notes on the copy:
- Counts come from the collection registry (`lib/collections.ts` `expectedCount`, 2026-10-30): wedding-cc 118, gshade-presets 95, holidays-cc 503. The page titles round these down (the wedding title says "100+"). Never round a count up.
- All six URLs returned 200 from production on 2026-10-30, at about 11:35Z. They keep the trailing slash (`trailingSlash: true`).
- The account link carries `ref=patreon-post`. GA4 does not register `customEvent:ref` (see the E173 note in `app/sign-in/page.tsx`), so accounts are counted as `sign_up` events in sessions whose `sessionCampaignName` is `patreon-post-2026-11`. The post does not ask anyone to pay. Rio owns paid conversion, and the E40/E65 read showed that leading with a checkout link cut clicks.
- The 2026 list is the WordPress post "Best New Sims 4 Mods 2026 (Recently Updated & Working)". The wedding page title reads "Dresses, Poses & Venues", and the copy says only that.
- The post shows no Halloween content because it is unlikely to go out before 10-31. Holiday CC is the seasonal page for November.

## Measurement (rule written before the post goes out)

- **Metric:** GA4 sessions with `sessionCampaignName = patreon-post-2026-11` in the 7 days starting on the day of the post. Secondary metrics: `sign_up` events in those campaign sessions, and the weekly total of all Patreon-source sessions.
- **Baseline:** 0 tagged sessions (the campaign does not exist yet). Untagged Patreon-source sessions averaged 199/week (W32 to W43, 2026-08-03 to 2026-10-25, GA4 property 437117335, read 2026-10-30).
- **Read:** D+7 after the post. If the post goes out on D, read it on D+7.
- **Keep (make it monthly):** at least 100 tagged sessions in 7 days. That is +50% on the 199/week the Patreon source brings with no post, so the post at least pays for the 2 minutes it costs.
- **More data:** 30 to 99 tagged sessions. Run a second post in December and grade the two together.
- **Kill:** fewer than 30. One post to 6,352 members bringing fewer than 30 sessions means the Patreon feed is not a traffic channel for us. Stop drafting monthly posts and put the time into the email list.
- **Guardrail:** none needed for ads. The post changes nothing on the site, and a returning session earns the same as any other session.
- **If nothing happens (silence default):** the team posts nothing and nothing changes. Under the 7-day rule the ask drops on 2026-11-06, and E294 closes as NOT-RUN.
