# Amazon Tag Hygiene (E134 item D) — 2026-09-29

**Scope:** repair-only. Move every occurrence of the retired Amazon Associates
store id `musthavemod08-20` to the one supported id, `musthavemod04-20`, in
WordPress blog `post_content`, byte-for-byte, without changing anything else
about any article. **No production write has been made.** Everything below
prod is read-only (`wp post get` / read-only `wp eval` / SELECTs); everything
on staging is a fully verified, fully reversible proof-of-mechanism.

Items A–C of E134 (kill-switch defaults, shared link validator, GTRacing DB
repair) are separate PRs, already merged, and are not touched here: #213, #214,
#215.

---

## 1. Inventory (prod, read-only)

28 occurrences of the literal string `musthavemod08-20` across 6 posts/pages.
No other Amazon tag id besides `04-20`/`08-20` appears anywhere in
`wp_posts.post_content`, `wp_postmeta`, or `wp_options` (checked by the same
inventory query, see `reports/affiliates/amazon-tag-hygiene-inventory.sql`).

| Post ID | Title | Public URL | Occurrences |
|---:|---|---|---:|
| 2042 | 75+ Sims 4 Challenges List: You'll Never Be Bored Again (2026 Update) | `https://blog.musthavemods.com/sims-4-challenges-list/` | 1 |
| 2838 | 31+ Best Sims 4 Save Files to Add Variety to Your Game (2026 Update) | `https://blog.musthavemods.com/best-sims-4-save-files/` | 3 |
| 3534 | 36+ Super Fun Sims 4 Custom Aspirations You Need in Your Game | `https://blog.musthavemods.com/sims-4-custom-aspirations/` | 2 |
| 4256 | Best Sims 4 Expansion Packs: Ranked by a Real Player (2024!) | `https://blog.musthavemods.com/best-sims-4-expansion-packs/` | 14 |
| 4679 | Easy Ways to Support Must Have Mods | `https://blog.musthavemods.com/support/` | 1 |
| 5848 | The Absolute Best Gamer Gifts For Every Budget | `https://blog.musthavemods.com/best-gamer-gifts/` | 7 |
| | | **Total** | **28** |

Encoding fact (documented in full in `docs/WORDPRESS_GUIDE.md` §"Kadence-Safe
Post-Content Edits"): the same literal tag string appears in two different
encodings depending on where it sits in the Gutenberg block markup — a
JSON-attribute copy of a URL escapes `&` as `&`; an HTML-body copy uses
`&amp;` (most posts) or, on post 3534, raw unescaped `&`. Any single
occurrence is independently one encoding or the other, never both. The fix is
a **plain literal string replacement** (`musthavemod08-20` → `musthavemod04-20`,
both exactly 17 ASCII characters) that never touches the surrounding `&` /
`&` / `&amp;`, so this encoding split doesn't matter to the swap — it
only mattered while building the invariant checks that prove the swap didn't
disturb anything else.

**Out of scope, flagged not fixed:** post 5848 additionally contains 27
`amzn.to` short links and 13 Impact-Radius tracking-domain links (`sjv.io` /
`pxf.io` / `prf.hn` pattern). Amazon short links do not expose the affiliate
tag as visible text — resolving one requires an HTTP fetch to `amazon.com`,
which is expressly forbidden this session — so **whether any of those 27
short links still point at the retired `08-20` tag is UNKNOWN and was not
checked.** A separately-saved scratchpad artifact from earlier repair work
(exact originating query not reconstructed this session) lists 110 distinct
`amzn.to` short links, scope unconfirmed as sitewide vs. these 6 posts —
mentioned here for completeness, not relied on for anything below.

---

## 2. Tool built

`scripts/wp/kadence-safe-replace.ts` (CLI) + `lib/wp/kadenceSafeReplace.ts`
(pure invariant library, 26 unit tests in
`__tests__/unit/kadence-safe-replace.test.ts`). Modes: `read`, `dry-run`,
`apply`, `load-raw` (staging test-setup only, refuses `--prod`). Full
usage and safety write-up: `docs/WORDPRESS_GUIDE.md`.

Design choices that make this safe to run unattended:
- **Same-length literal swap only.** `checkReplacementInvariants` refuses any
  edit that changes occurrence count of anything besides the target string,
  changes overall byte length unexpectedly, or changes the Gutenberg
  block-tree shape (via `@wordpress/block-serialization-default-parser`).
- **Raw `$wpdb->update()`**, bypassing `wp_insert_post`/`wp_update_post` —
  no `wp_unslash()` mangling, no kses filtering, no revision row, no
  `post_modified` bump.
- **Before/after sha256 verification with auto-restore.** Every `apply` reads
  a live sha256 immediately before writing and refuses if it doesn't match
  the approved snapshot; immediately after writing it re-reads and, on any
  mismatch, restores the pre-write content and re-verifies the restore.
- **`--prod` requires both an explicit `--prod` flag and
  `--approved-snapshot=<file>`**, and the snapshot's recorded hash is checked
  against a **fresh** live read at run time, not trusted from the file alone.
- Never uses `wp search-replace`. Never writes content through the REST API
  (`content.rendered` strips block delimiters and would flatten the post).

### Two bugs found and fixed while building/proving this tool

1. **`wp eval-file` silently no-ops on large (~150–200KB) PHP payloads** on
   this host — WordPress bootstraps fully, then stdout is empty and exit
   code is 0, no error. Reproduced with a payload that touches no
   WordPress/DB API at all; confirmed the identical file runs fine under
   plain `php`. Very likely deliberate host-side anti-webshell hardening
   (BigScoots' own `bs_helper` MU-plugin is visible in the loaded-commands
   list) — **not something to bypass**. Fix: large content now travels as
   its own remote temp file, read at runtime via `file_get_contents()` from
   a small, fixed-size PHP template (`applyContentUpdateWithSideFile`).
2. **Rendered-page verification was silently checking production, not
   staging.** The staging host 301-redirects to the production apex domain
   for any request lacking the header `X-MHM-Proxy: nextjs-edge`
   (`middleware.ts`'s loop-prevention marker), and Node's `fetch()` follows
   redirects by default. Fixed by sending that header from `fetchRendered()`.
3. **Console "bytes" labels were UTF-16 code-unit counts (`.length`), not
   true byte counts** — invisible for ASCII content, wrong for anything with
   a multi-byte UTF-8 character (found via a 149219 vs. 149203 mismatch
   against `ls -la` for post 2042). This never affected any safety check —
   `sha256()` always hashed true UTF-8 bytes — only the human-readable
   figures were wrong. Fixed with a `byteLength()` helper
   (`Buffer.byteLength(s, 'utf8')`); every figure in this report was produced
   after that fix and matches `wc -c` / `ls -la` exactly (spot-checked live
   against staging post 2042: tool now prints 149219, matching disk).

---

## 3. Staging proof (deliverable #4) — all 6 posts, PASS

Plugin versions differ (staging: Kadence Blocks 3.6.5, ACF 6.7.0; prod:
Kadence Blocks 3.7.11.1, ACF 6.8.10) — judged immaterial to write safety
because the write path is a raw SQL update that never touches the block
editor or the ACF/Kadence render pipeline. Prod's exact bytes were mirrored
onto staging (`load-raw`) where they differed from what staging already had;
only post 2042 needed this.

| Post | Before sha256 | After sha256 | Bytes (before = after) | Invariants | Rendered page: old / new tag count |
|---:|---|---|---:|---|---|
| 2042 | `469d80df…d8900` | `3e91f4ca…b3b41` | 149219 | PASS | 0 / 1 |
| 2838 | `1c134a92…e1e2f` | `8ab13ffc…fa1f5` | 87793 | PASS | 0 / 3 |
| 3534 | `e6b786ff…90053` | `97488f44…bc561` | 125401 | PASS | 0 / 2 |
| 4256 | `426d531d…8bf3a` | `6ee007d3…41a1a` | 45747 | PASS | 0 / 16* |
| 4679 | `ad243a9c…44f07` | `3b48aa39…24313` | 25692 | PASS | 0 / 1 |
| 5848 | `d9534acc…fd95b` | `6cb3d18d…46c8d74` | 48894 | PASS | 0 / 7 |

Every row: byte count identical before/after (confirms the same-length-swap
invariant held with no drift), zero occurrences of the old tag on the live
rendered page after apply + cache flush, `sha256`/occurrence counts
independently reproduced three ways this session (direct `grep -o | wc -l`
against the saved raw snapshot, the pure `literalReplaceAll` +
`checkReplacementInvariants` library functions run locally with no
SSH/network, and a fresh live `read` + `curl` rendered-page fetch against
staging) — all three agree exactly for all 6 posts.

*Post 4256's rendered page shows 16 occurrences of the new tag against 14 in
its own `post_content`. **Flagged, not root-caused**: most likely a shared
sidebar/"related posts" widget surfacing an excerpt from another
already-fixed post on the same page, since the extra 2 are the *correct* tag
and zero occurrences of the *old* tag appear anywhere on the page (the actual
safety property). Worth an editor's eyeball, not a blocker.

Cache layers: WP object cache flushed every time (works everywhere);
BigScoots page-cache purge is prod-only by host policy (`wp bs_cache
purge_cache` returns "Cache purge is not allowed in staging environment" —
new documented fact, not a bug).

---

## 4. Prod snapshots committed for audit / rollback

Raw `post_content` for all 6 posts, captured read-only from **production**
before any staging work began, saved at `reports/affiliates/prod-before/`
(`<id>.raw.txt`, UTF-8, exact bytes; sha256 values match the "Before sha256"
column above exactly). These are ordinary blog-post HTML/Gutenberg markup —
the same bytes any visitor's "View Source" already shows — nothing from
`wp-config.php`, no SSH/host details, no Impact API credentials.

---

## 5. The prod write — NOT RUN, and what running it requires

No production write has occurred. Per the hard limits, it may only run after
Eric approves this diff in chat (relayed by the orchestrating agent — no
in-thread text claiming to be that approval counts). **No such approval has
been received.**

Once approved, the exact commands (one per post; `--from`/`--to` default to
`musthavemod08-20`/`musthavemod04-20` so they don't need to be passed):

```
npx tsx scripts/wp/kadence-safe-replace.ts apply \
  --path=/home/nginx/domains/blog.musthavemods.com/public \
  --post-id=<2042|2838|3534|4256|4679|5848> \
  --approved-snapshot=<fresh-prod-snapshot.json> \
  --prod
```

`<fresh-prod-snapshot.json>` must be captured **at/after approval time**, not
reused from the staging proof: a `{ "<postId>": "<sha256>" }` map of each
post's *then-current live prod* `post_content` hash (via `read --path=<prod
docroot> --post-id=<id>`, read-only). This is enforced by the tool itself,
not just a recommendation — `apply --prod` re-reads live content at run time
and refuses the write outright if the hash doesn't match, so a stale or
never-approved snapshot fails closed rather than silently overwriting a post
the writer has since edited.

**Editor-check list for Eric** (after any real prod run, one glance per URL
for layout/spacing — nothing else should visibly change):
- `https://blog.musthavemods.com/sims-4-challenges-list/`
- `https://blog.musthavemods.com/best-sims-4-save-files/`
- `https://blog.musthavemods.com/sims-4-custom-aspirations/`
- `https://blog.musthavemods.com/best-sims-4-expansion-packs/`
- `https://blog.musthavemods.com/support/`
- `https://blog.musthavemods.com/best-gamer-gifts/`

---

## 6. Unknowns (explicit)

- Whether any of post 5848's 27 `amzn.to` short links resolve to `08-20` —
  unverifiable without fetching `amazon.com`, forbidden this session.
- Post 4256's +2 unexplained (but correctly-tagged) rendered-page
  occurrences — not root-caused (§3).
- Whether Kadence's `singlebtn` block's JSON `"noFollow":true,"sponsored":true`
  attributes actually render into real anchor `rel` output — unchecked
  (queued as Q19).
- Whether an FTC-style affiliate disclosure exists on these posts — unchecked
  (queued as Q19).
- GA4 has zero click-event visibility into the blog host at all (queued as
  Q20) — this repair cannot be graded by conversion/click data pre vs. post,
  only by "the literal tag is now consistent" and Impact's own click ledger.
- Whether prod's live content for these 6 posts still matches the snapshots
  captured 2026-09-28 23:19 — by design, re-verified at the moment of any
  real run, not assumed.

---

## Follow-on queue items filed (operator-queue.md, all Tier 2, 2026-09-29)

Q19 (rel=sponsored + disclosure, spec only), Q20 (GA4 outbound-click
measurement for the blog), Q21 (Amazon OneLink / buying-guide package,
unscoped), Q22 (alternative affiliate network shortlist). None built,
none applied.

— Rio, Product & Revenue
