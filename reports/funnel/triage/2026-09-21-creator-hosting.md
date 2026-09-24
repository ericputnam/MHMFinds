# Triage memo: host creators' mods directly (Q14)

Idea (ideas-inbox.md, operator, 2026-09-01): "Host creators' mods directly
(files + profile + audience) so creators bring their fans." — Nova, 2026-09-21

## What exists today (real numbers)

- **Schema is ready, product is not.** `CreatorProfile` (handle, bio, website,
  socialLinks, isVerified, isFeatured) and `ModSubmission` (downloadUrl,
  sourceUrl, source, tags, images, price/isFree) already model a hosted
  creator upload end to end. No migration is needed to start.
- **The submission form that exists today does not host files.** Read
  `app/api/submit-mod/route.ts` in full: it accepts `modUrl, modName,
  description, category, submitterName, submitterEmail`, rate-limits 5/hr/IP,
  checks Turnstile, and writes a `ModSubmission` row with `status: 'pending'`.
  It never touches `downloadUrl`, never uploads a file, and has no storage
  call anywhere (no S3/Blob client, no multipart parsing). Today's "creator
  submission" is a URL pointer to a mod hosted elsewhere (Patreon, Tumblr,
  CurseForge) that a human then has to manually approve and re-host or link.
  "Hosting files" is new build, not a flag flip.
- **Usage: 4 submissions, ever.** `ModSubmission` has exactly 4 rows total
  (queried 2026-09-21): "Jane Hairstyle" and "Change Eyelash Color"
  (source="Creator Upload", no author, submitted by the operator/site owner
  testing the flow), "AM & PM Traditions" (source="Patreon", author
  SimwithShan), "eevee eyes - doree" (source="Tumblr", author dorée). No
  outside creator has used this flow unprompted.
- **20 `CreatorProfile` rows, 15 have ≥1 mod linked** — but these are backend
  matches from the scraper's author-string parsing, not creators who signed
  up. Zero of the 20 were created through a creator-facing signup flow;
  `app/creators`, `app/creators/submit`, `app/top-creators`,
  `app/admin/creators` exist as pages/routes but nothing recruits into them
  (this is the gap SD-1/charter already names).
- **Candidate creators, from our own download/favorite data** (author strings
  filtered for non-garbage, 2+ mods, 2026-09-21 snapshot):

  | Author (as stored) | Mods in catalog | Favorites | Downloads |
  |---|---|---|---|
  | Syboulette | 67 | 155 | 1,996 |
  | brandysims | 23 | 298 | 5,987 |
  | Cecesimsxo | 22 | 178 | 2,081 |
  | Seoulsoul-sims | 13 | 224 | 19,172 |
  | PolarBearSims | 11 | 146 | 7,767 |

  These are our best-performing creators by on-site engagement, not our
  biggest — a reasonable outreach shortlist.
- **Off-site audience size: not obtainable.** Patreon removed public
  patron/member counts from creator pages around 2020 (confirmed by fetching
  a live creator Patreon page directly — no follower count is rendered
  anywhere). Tumblr does not expose public follower counts either. We cannot
  size "the fans a creator brings" from outside data; the only audience
  number we can state honestly is the on-site one above (298 favorites is
  our best single data point, not a "how many people follow them" number).
  Any pitch to a creator about audience reach has to be framed as *our*
  traffic to *their* mods, not their following.
- **Precedent: `first-party-mod-launch-2026-07-03.md`.** Our one experience
  hosting a downloadable file ourselves (Main Character Energy trait pack)
  used `public/downloads/` + a one-line `middleware.ts` change, not Vercel
  Blob, because `BLOB_READ_WRITE_TOKEN` was stale. That's fine for files we
  author and QA ourselves. It is a materially different trust bar for files
  we didn't build: Sims 4 `.package` mods can carry Python script mods
  (arbitrary code the game's mod framework executes), and we have no
  scanning, sandboxing, or review pipeline today.

## Risk read

- **Legal/DMCA**: hosting third-party files makes us a host, not a linker.
  DMCA safe-harbor (17 U.S.C. §512) requires a registered agent, a
  notice-and-takedown process, and a repeat-infringer policy — none of which
  exist in the repo or ToS today. CC creators routinely reupload/derive from
  each other's meshes; a hosting model multiplies takedown surface area
  versus today's "we link to Patreon, Patreon owns the takedown."
- **Security**: Sims 4 script mods are executable. A malicious or compromised
  upload distributed from our domain is our incident, not Patreon's. No
  malware scanning exists today.
- **Ad revenue**: hosting doesn't change the current model (downloads already
  route through `/go/[modId]` regardless of where the file lives), so there's
  no incremental RPM upside from hosting itself — the upside is entirely
  "creator brings fans," which we can't size (see above), against real new
  legal/security surface.

## Recommendation: No-go on file hosting now. Go on a narrower MVP.

Don't build file storage. Build the **profile + recruitment + attribution**
layer that's 90% of the stated goal ("creators bring their fans") without the
DMCA/security exposure of hosting binaries:

**MVP (Tier 1 scope, ~1 week):**
1. A public creator profile page at `/creators/[handle]` (route already
   exists, unwired) showing their mods already in our catalog (join on
   `author`/`creatorId`), download/favorite counts, and their real off-site
   links (socialLinks field already on the schema).
2. `ModSubmission.downloadUrl`/`sourceUrl` used as designed: creators submit
   a URL to their existing host (Patreon/Tumblr/CurseForge/their own site);
   we index and cross-link, we never store the file. This is a one-line fix
   to `app/api/submit-mod/route.ts` (start actually writing the fields it
   already parses) — not a new subsystem.
3. Outreach (T1 sending from an operator-approved template, T2 for the
   template itself) to the 5 candidates above, offering a hosted profile +
   featured-creator newsletter/collection slot + their own traffic data — no
   file hosting, no revenue promise.

**Explicitly defer:** actual file storage/hosting is a Tier 2 decision on its
own (needs a DMCA agent + policy + malware scanning before any code), not
bundled into this MVP.

## Reply options

- **approve 14 mvp** — ship the profile-page + URL-submission MVP (Tier 1
  scope above), no file hosting.
- **approve 14 hosting** — go further and scope true file hosting (requires a
  separate legal/security spec before any code; Nova does not recommend this
  now).
- **reject 14** — do not build creator profiles/recruitment at this time.

Read on: 2026-10-19 (30 days after MVP ships, if approved) — creators
onboarded (profiles with ≥1 submission) ≥5, sessions to `/creators/*` ≥200/7d.
