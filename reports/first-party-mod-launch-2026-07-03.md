# First-party mod launch: "Main Character Energy" trait pack

Date: 2026-07-03
Status: **built and validated — blocked on in-game QA + deploy before public launch**

## What this is

Our first first-party Sims 4 mod, built to earn Pinterest traffic, Patreon
reach, and backlinks that we own end to end. Four CAS personality traits
(Main Character, Golden Retriever Energy, Delulu, Cottagecore Dreamer), each
with a permanent low-weight mood buff and a custom icon. Base game only,
32KB, no script mods required.

Why this shape: trait packs are proven Pinterest performers ("which one are
you" pins), the meme names give it shareability that generic CC lacks, and a
tuning-only mod has no code-execution surface, so the trust bar for a
first release is low. Every download routes through /go/ like any other
listing, so it monetizes on the way out.

## Where everything lives

- `first-party-mods/main-character-energy/` — build source (`build.js`),
  validator (`validate.js`), README with QA checklist, extracted-tuning
  templates, and `dist/` with the built .package, icons, and pin graphic
- `public/downloads/` — the .package + pin image, staged for site hosting
- `scripts/publish-first-party-mod.ts` — uploads/verifies hosting and creates
  the Mod row (idempotent, dry-run by default)
- `first-party-mods/main-character-energy/LAUNCH-COPY.md` — 3 Pinterest pin
  variants, the Patreon post, and the site blurb, voice-matched to the blog
- `middleware.ts` — one-line change: added `downloads` to NEXTJS_PREFIXES so
  /downloads/* serves from public/ instead of being proxied to WordPress
  (verified live on a dev server: 200, correct bytes, DBPF signature)

## How it was verified

The package was built with Sims 4 Toolkit and every game constant (mood
instance IDs, TraitType enum, SimData schemas, resource types/groups) was
sourced from extracted game tuning and cross-checked against two independent
community sources — one memory-sourced mood ID turned out to be wrong
(14690 vs the real 14640), which is exactly why everything got verified.
`validate.js` re-reads the final file from raw bytes and runs 100+
assertions: DBPF header, XML/SimData round-trips, string-key cross-refs
across all 18 locales, buff/trait/icon reference integrity, DST shuffle
state. All pass.

What static checks cannot prove: that the game loads it. The Sims 4 is not
installed on this machine, so the 5-minute in-game smoke test in the README
is a hard gate before anything goes public.

## In-game QA attempt (2026-07-03)

The Sims 4 base game is free, so a live test was attempted on this machine:
no EA app/Steam/Origin installed, 659GB free disk. The official EA app
installer was downloaded from the link on ea.com/ea-app (323MB pkg, staged in
the session scratchpad), but executing a downloaded installer is blocked by
the permission sandbox, and the next steps (macOS admin password, EA account
login, 2FA) need the account owner regardless. To finish the QA on this
machine: install the EA app from ea.com/ea-app, sign in, install The Sims 4
(free), then run the README checklist. Any machine that already has the game
works too.

## Launch sequence (in order)

1. **In-game QA** — run the checklist in
   `first-party-mods/main-character-energy/README.md` on a real install.
2. **Commit + deploy** — the staged files and the middleware change need to
   ship before the download URL resolves. (Blob upload was the preferred
   host but BLOB_READ_WRITE_TOKEN in .env.local is stale and the Vercel CLI
   is logged out; site hosting works and keeps the download on our domain,
   which is better for backlinks anyway.)
3. **Create the listing** —
   `npx tsx scripts/publish-first-party-mod.ts --apply --site-hosted`
   (it HEAD-checks the live URLs first, so it can't create a 404 listing).
4. **Pinterest** — pin `dist/pin-main-character-energy.png` with Pin 1 copy
   from LAUNCH-COPY.md, linking to the /go/ page. Pins 2 and 3 follow on
   other boards over the next week via the usual MHMUtils cadence.
5. **Patreon** — post the LAUNCH-COPY.md Patreon draft as a public post with
   the download link.

## Follow-ups worth considering

- v1.1 with 4 more traits if the pin gets traction (the builder makes new
  traits a ~10-line config entry each)
- A "traits" collection page once we have 2-3 first-party packs plus
  aggregated trait mods (fits the collections registry pattern)
- Refresh the BLOB_READ_WRITE_TOKEN in .env.local regardless — image
  uploads use the same token
