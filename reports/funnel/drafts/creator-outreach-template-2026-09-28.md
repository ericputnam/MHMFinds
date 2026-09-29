# Creator outreach package (E137) — Tier 2, awaiting operator approval

Written 2026-09-29 by Nova (path keeps the 09-28 name the ideas-inbox line points at).
**Nothing has been sent.** Approval covers three things, all in this file: (A) the
template text, (B) the 20 rows below as the first batch, and (C) the `isCreator`
decision. Reply `approve E137` to approve all three as written. To approve only some,
reply e.g. `approve E137 A+B, C no`.

After approval, sending is Tier 1: max 20/week, from the approved text only, one
message per creator, no follow-up without a reply. Nothing here offers money, rev-share,
paid placement, exclusivity or any agreement. Those belong to Rio and are Tier 2 on their own.

## Why now

- The claim path works end to end: E122 claim form (`/submit-mod/?creator=<slug>`),
  E129 admin review, and promote → `/creator/<slug>/`. It has had 0 claims and 0
  submissions since it shipped on 09-28, because no creator has been pointed at it.
- `/creator/*` landing sessions were **558** for 09-22→09-28 (GA4, apex only), against
  116 the week before. The pages get traffic now, so there is real data to offer.
- Creators onboarded (profile with ≥1 submission): **0**. The December target is 10.

## (B) The first 20 — ranked by on-site download clicks, last 28 days

Source: `download_clicks` joined to `mods.author` slug, SFW only, restricted to the
`/creator/` hub population (534 slugs; platform names like simsfinds and TSR-as-author are
excluded). Read-only query, 2026-09-29. These 20 account for 202 of 1,408 28-day download
clicks site-wide (14.3%). "Lifetime" is `mods.downloadCount`. None of the 20 has a
`CreatorProfile` yet.

**Contact channel** is the host that the creator's own download links point to in our
catalog. It is public, it is already in our DB, and nothing was scraped. It shows
*where* the creator publishes. It is **not** a verified inbox or DM handle. The sender
uses the site's own public contact or DM route at send time and skips the row if there
isn't one. For TSR-only creators the route is TSR's member messaging, and TSR's terms
must allow it. If they don't, skip the row.

Page = `https://musthavemods.com/creator/<slug>/` · Claim = `https://musthavemods.com/submit-mod/?creator=<slug>`

| # | slug | display name | SFW mods | DL clicks 28d | lifetime | contact channel (catalog download host) |
|---|---|---|---|---|---|---|
| 1 | brandysims | brandysims | 23 | 26 | 6,251 | brandysimswebsite.wixsite.com (23/23) |
| 2 | seoulsoul-sims | Seoulsoul-sims | 15 | 19 | 19,562 | seoulsoul-sims.com (12), tumblr (2), patreon (1) |
| 3 | magichand | MagicHand | 68 | 15 | 1,101 | thesimsresource.com (68) |
| 4 | ali1 | ali1 | 13 | 14 | 1,227 | thesimsresource.com (13) |
| 5 | jius-sims | Jius-sims | 41 | 14 | 1,202 | patreon posts (38), jius-sims.tumblr.com (3) |
| 6 | polarbearsims | PolarBearSims | 11 | 11 | 7,928 | modthesims.info (10), polarbearsims.com (1) |
| 7 | lvndrcc | LVNDRCC | 59 | 11 | 639 | thesimsresource.com (59) |
| 8 | rebellesims420 | Rebellesims420 | 5 | 9 | 2,259 | tumblr.com (5) |
| 9 | ventastudio | VentaStudio | 49 | 9 | 1,980 | thesimsresource.com (48), tumblr (1) |
| 10 | ariyana-taylor | Ariyana Taylor | 9 | 9 | 215 | patreon posts (9) |
| 11 | xxblacksims | XxBlacksims | 22 | 8 | 2,191 | xxblacksims.com (13), patreon (8), tumblr (1) |
| 12 | cecesimsxo | Cecesimsxo | 22 | 8 | 2,155 | cecesimsxo.tumblr.com (11), cecesimsxo.com (5), patreon.com/CecesimsXO (1) |
| 13 | kiarasims4mods | KiaraSims4Mods | 41 | 7 | 1,469 | kiarasims4mods.net (21), curseforge (5) |
| 14 | msqsims | MSQSIMS | 59 | 7 | 1,016 | thesimsresource.com (59) |
| 15 | feyona | feyona | 68 | 7 | 286 | thesimsresource.com (68) |
| 16 | syboulette | Syboulette | 67 | 6 | 2,128 | s4cc.syboulette.fr (60), TSR (6) |
| 17 | nonvme-studios | NoNvme Studios | 11 | 6 | 1,011 | patreon posts (11) |
| 18 | sentate | Sentate | 16 | 6 | 759 | patreon posts (12), sentate.tumblr.com (1) |
| 19 | joan-campbell-beauty | Joan Campbell Beauty | 57 | 5 | 1,729 | thesimsresource.com (57) |
| 20 | simenapule | Simenapule | 20 | 5 | 1,393 | thesimsresource.com (20) |

Send order: rows 1, 2, 5, 6, 11, 12, 13 and 16 first. They have their own site, Patreon
or Tumblr, so they have a public contact route. The 8 TSR-only rows (3, 4, 7, 9, 14, 15,
19, 20) go out only after the TSR-messaging check.

Per-row 28-day numbers are small, 5 to 26 clicks. The template quotes the creator's
**lifetime** figure and their page, and states the 28-day figure plainly. It does not
round up.

## (A) Template (one message; `{…}` filled per row from the table, nothing else changes)

> **Subject / first line:** Your Sims 4 CC has a page on MustHaveMods
>
> Hi {display name},
>
> I'm reaching out from MustHaveMods (musthavemods.com), a Sims 4 CC discovery site.
> Your CC is already listed in our catalog: {SFW mods} of your items are there, and
> every download button links straight to your own {contact channel host} page. We
> don't host or re-upload your files.
>
> Your mods have picked up {lifetime} download clicks on our site so far
> ({DL clicks 28d} in the last 28 days). They all sit on one page:
> https://musthavemods.com/creator/{slug}/
>
> If you'd like that page to be yours, you can claim it here:
> https://musthavemods.com/submit-mod/?creator={slug}
> (sign in with Google or Discord, then fill out a short form). After we confirm it's
> you, you can add your own links and submit new releases so they show up on your page.
> We're also happy to share the traffic numbers for your mods.
>
> If you'd rather not be listed, or you want something corrected, just reply and we'll
> take care of it.
>
> Thanks for making great CC,
> The MustHaveMods team

Deliberately absent: any offer of money, rev-share, featured or paid placement,
newsletter slot, exclusivity, or deadline. The "featured creator" slot from the charter
is not offered, because it doesn't exist yet. The newsletter cron (E78, PR #144) is
still flag-off, and a collection-page slot needs Rowan. Add it to the template only
after one of those ships, and that re-opens T2.

The opt-out line is a commitment. If you approve A, you approve honoring it: remove the
creator's page and stop linking their name, within 7 days of the reply.

## (C) Operator decision bundled with this: should promoting a claim also set `User.isCreator`?

**Recommendation: yes.** Promote currently changes only the handle
(`app/api/admin/creator-claims/[id]/route.ts`, header comment line 26: "Neither action
touches User.isCreator"). A claimed creator therefore still can't open `/creators/*`
(dashboard, submissions, `/api/creator/mods/[id]/edit`), and the Navbar hides the
creator links. That leaves the page they just claimed with nothing to do on it. Setting
the flag does **not** skip moderation: `POST /api/mods` still creates rows with
`isVerified: false`, and `/api/submit-mod` still goes to the review queue.

The change, in the promote branch, replaces the single `creatorProfile.update` with one
transaction. Add `userId: true` to the `findUnique` select first:

```ts
await prisma.$transaction([prisma.creatorProfile.update({ where: { id: profile.id }, data: { handle: decision.handle } }), prisma.user.update({ where: { id: profile.userId }, data: { isCreator: true } })]);
```

Caveat: `isCreator` reaches the JWT only at sign-in (`lib/authOptions.ts:159`), so the
creator has to sign out and back in once. The approval email or DM should say so. The
change is Tier 1 once C is approved: `app/api/admin`, auth scanner, and a test for the
planner. It ships as its own PR.

## Measurement (E137)

- Metric: creators onboarded (CreatorProfile promoted from `pending-*` with ≥1 linked
  submission). Secondary: claims submitted and reply rate.
- Baseline 2026-09-29: onboarded 0, pending claims 0, claim submissions 0, `/creator/*`
  landing sessions 558 (09-22→09-28).
- Read 2026-10-13, two weeks after the first batch goes out.
- Keep if ≥2 claims from 20 sends (10%) **and** ≥1 creator onboarded. Kill the
  template (not the channel) if 0 replies from 20. The next batch is ranks 21–40 from
  the same query.
