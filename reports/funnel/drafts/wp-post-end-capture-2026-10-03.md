# E167 — End-of-post email capture on WordPress single posts (Tier 2 package)

Cass, Capture · 2026-10-03 · branch `funnel/cass/e167-wp-post-end-capture` · **status: QUEUED-T2, not merged, not pushed to any server**

## The ask (one word)

Reply **"approve E167"** or **"reject E167 because …"**.
Recommendation: **approve, then apply only after Rio closes the 10-01 RED-RPM incident**, so the blog RPM read is not confounded.

## Why

WordPress article pages carry **no capture surface at all**. Every Next.js page above 1% of sessions already has one (10-02 audit). GA4, property 437117335, 2026-09-25 → 2026-10-01 (the scoreboard window):

| Bucket (landing page) | Sessions 7d | Share |
|---|--:|--:|
| All sessions (unduplicated) | 88,736 | 100% |
| Next.js prefixes + `/` + `(not set)` | 14,123 | 15.9% |
| WP archives (`/category/ /tag/ /author/ /page/ /blog /search /feed`) | 539 | 0.6% |
| … of which `/category/*` | 396 | 0.4% |
| **WP article landings (everything else)** | **74,074** | **83.5%** |

- Sessions that view at least one WP article page: 80,077 (90.2%). Pageviews: 115,576 of 142,827 (80.9%).
- The 83.5% is an upper bound. It also includes any WP static pages, and the card renders only on `is_singular('post')`.
- The 10-02 inbox line ("19 posts = 25.4%") counted only posts that each have more than 1% of sessions. The card covers the whole long tail as well.
- `/category/*` is **not** covered by this package (0.4% this window). It is left for a later item.

## What changes

The diff is append-only: +151 / −0 in each functions.php copy. The **same** block goes into both `staging/wordpress/kadence-child-prod/functions.php` and `staging/wordpress/kadence-child/functions.php`, so the staging marker check passes too.

- `mhm_post_end_capture()` is hooked to `kadence_single_after_inner_content`. In Kadence's `single-entry.php` that hook fires inside `.entry-content-wrap`, **after `</div><!-- .entry-content -->`** (checked against Kadence source and the live HTML of `/sims-4-trait-mods/`). The card is:
  - a **sibling after** `.entry-content`, so it is outside Mediavine's in-content zone and cannot change in-content ad count or placement;
  - inside `<article>`/`.content-wrap`, never in or near `<aside id="secondary">`, which is injected on `kadence_after_main_content`;
  - static and in-flow, with no `position`, no `overflow`, no modal, and nothing above the article;
  - free of `kadence_post_layout`;
  - titled with a `<p>`, not a heading, so the post outline and TOC are untouched.
- Copy (honest, no cadence promised, because the weekly cron is still Q18):
  - "**Get the best new Sims 4 CC by email**"
  - "We round up new mods and CC finds like the ones above and email you the best of them. Free. Unsubscribe anytime."
  - Fine print: "We only use your email for this newsletter." plus a link to the privacy policy.
  - The real unsubscribe path already exists at `/api/unsubscribe`.
- Form handling:
  - It POSTs JSON to the existing endpoint **`https://musthavemods.com/api/waitlist/`** (trailing slash), the same one the footer, home-hero and /go forms use, with `source=blog-post-end`. Probed today with an invalid address: `HTTP 400 {"message":"Invalid email address"}`, so the endpoint is reachable and no row was written.
  - It has a client-side honeypot and format check. "Already subscribed" gets its own message.
- GA4: `capture_impression` fires once, when the card is at least 50% in view. `newsletter_signup` fires on new rows only. Both send `{source:'blog-post-end'}`, and `customEvent:source` is a registered dimension.
- The inline script is excluded from Perfmatters delay-JS through its own filter callback. The existing exclusion callbacks are not edited.
- Scoped CSS runs on `wp_head` at priority 100300. Every selector sits under `#mhm-post-end-capture`, using the site palette (#151B2B / #334155 / #ec4899). `!important` is used only on properties that Kadence's form, button and type styles override.
- Guards:
  - `"mhm_post_end_capture|End-of-post email capture (E167, owned audience)"` is added to `CRITICAL_MARKERS` in **both** `push-blog-functions.sh` and `push-blog-functions-prod.sh`.
  - `'id="mhm-post-end-capture"|End-of-post email capture (E167)'` is added to `scripts/agents/check-blog-sidebar.sh`. It checks the markup id only, because the CSS uses the `#` form and so cannot satisfy it.

## Verification done

- `php -l` reports `No syntax errors detected` for both functions.php copies (PHP 8.5.4).
- `bash -n` passes on all three shell scripts.
- `npm run type-check` exits 0, and `npm run build` exits 0.
- Five vitest guard files pass (sidebar-sticky-health, canonical-trailing-slash, deploy-verify ×2, operator-did-probe), 130 tests in total.
- I rendered the block through a PHP harness with WP stubs:
  - Hooks registered: `kadence_single_after_inner_content@20`, `wp_head@100300`, and both Perfmatters filters.
  - On a single post the output is 5,061 B and contains the marker once. On a non-post it is 0 B.
- I ran the client script in jsdom with `fetch` and `gtag` mocked:
  - **new address**: one POST to `/api/waitlist/` with source `blog-post-end`, one `newsletter_signup` event, form hidden.
  - **already subscribed**: no GA event.
  - **invalid address**: no request.
  - **honeypot filled**: no request.
  - **429**: the server message is shown and the button re-enabled.
- `check-blog-sidebar.sh` from this branch against live production **fails on the new marker on both test URLs** (exit 1), while the three Mediavine markers stay OK. That is expected before the push: it shows the guard can go red.

## Numbers

- **Expected adds** on 74,074 WP-article landing sessions per week (10,582 a day):
  - at the site's email-only rate, 0.29 per 1K (26 email adds / 88,736 sessions): **~22 a week, ~3 a day**;
  - at the site's owned-audience rate, 1.27 per 1K: ~94 a week, ~13 a day;
  - at the /go email slot's rate (E4, 1.45 per 1K, DB 28d): ~107 a week, ~15 a day.
  - Owned adds were 115 over 7d against a target of 200. Even the conservative case closes about a quarter of that gap. The /go-rate case closes all of it.
- **Before, revenue to protect.** The Mediavine MCP is down, so these come from repo files:
  - Blog-article page RPM was **$14.88** for 09-21→09-27 (`reports/funnel/page-rpm-snapshot-2026-09-29-w0921-0927.md`, 145 paths, 52.3% revenue coverage). The one-sided floor at 95% is **$14.14**.
  - Site session RPM was $16.06 over 7d (09-25→10-01), against $17.34 the week before. On 10-01 it was $12.30 against $16.32 expected (RED, open).
- **Read on:** 14 days after the **confirmed cache purge**, not after the push.
- **Keep if** both of these hold, judged one-sided:
  - `waitlist` rows with `source=blog-post-end` reach **at least 0.59 per 1K** WP-article landing sessions over the 14 days. That is twice the site's email-only rate, roughly 87 or more rows on about 148K sessions.
  - Blog-article page RPM is **at least 95%** of the same weekdays in the 4 weeks before the push.
- **Kill if** the rate is below 0.29 per 1K (under the site email average), or the RPM floor is breached. Anything in between is MORE DATA, with 14 more days.
- **Cost of waiting:** about 3 to 15 email adds a day. That range runs from the site's email-only rate to the /go slot's rate.

## Apply (operator, after approval). The order matters.

Push **before** merging. If the branch is merged first, `main`'s `check-blog-sidebar.sh` will expect a marker production does not serve. The next `deploy-verify.sh` will then grade FAIL and its `restore_functions_php` will push the card unattended, with an incident row.

```bash
# from a clean worktree
git fetch origin && git checkout --detach origin/funnel/cass/e167-wp-post-end-capture
./scripts/staging/push-blog-functions.sh            # optional: staging first, view any post
./scripts/staging/push-blog-functions-prod.sh       # interactive; diff must read +151/-0
ssh <bigscoots> "cd /home/nginx/domains/blog.musthavemods.com/public && wp bs_cache purge_cache"   # REQUIRED: s-maxage=31536000 page cache; the script only flushes object cache
./scripts/agents/check-blog-sidebar.sh              # expect 4/4 OK on both URLs
# then land it:
./scripts/agents/merge-gate.sh && gh pr merge <N> --squash
./scripts/agents/deploy-verify.sh --after-merge --sha <mergeCommit oid from gh pr view N --json mergeCommit>
```

## Rollback

Rolling back is always allowed and needs no approval.

```bash
git revert <E167 merge sha>     # removes the block AND all three marker lines in one commit; land on main
./scripts/staging/push-blog-functions-prod.sh --yes
ssh <bigscoots> "… && wp bs_cache purge_cache"      # otherwise cached posts keep the card
./scripts/agents/check-blog-sidebar.sh
```

If the card was pushed but **not yet merged**, run `./scripts/staging/push-blog-functions-prod.sh --yes` from a clean `origin/main` checkout, then purge. Never remove the PHP block while leaving the `check-blog-sidebar.sh` marker on `main`: that state grades FAIL and the restore path pushes the card back.

## Q25 (for operator-queue.md)

```
### Q25 · End-of-post email capture on WordPress posts (Cass, E167, 2026-10-03) — Tier 2
- WP articles are 83.5% of landing sessions (74,074/88,736, GA4 09-25→10-01) and carry no capture surface. Package: PR <url> (+151/−0 functions.php, sibling after .entry-content, outside .mv-ads/#secondary, markers in both push scripts + check-blog-sidebar), memo reports/funnel/drafts/wp-post-end-capture-2026-10-03.md.
- Reply **"approve E167"** or **"reject E167 because …"**. Apply after the RED-RPM incident closes: push from the branch → `wp bs_cache purge_cache` → check-blog-sidebar → then merge (order matters, see memo).
- Keep if ≥0.59 blog-post-end rows/1K WP sessions in 14d AND blog page RPM ≥95% of same weekdays (floor $14.14). Rollback: revert + push --yes + purge.
- Cost of waiting: ~3–15 email adds/day. Silence: re-pitched once smaller on 2026-10-10, then dropped and logged.
```
