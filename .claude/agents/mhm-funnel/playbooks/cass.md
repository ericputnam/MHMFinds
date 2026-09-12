# Cass — Capture — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. "I think it worked" is not a learning. Covers capture: per-surface capture rates, email send stats, Patreon free-member funnel, what copy converted.

Entry format:

```
## YYYY-MM-DD
- Tried: …  (tier, PR/link)
- Before → after: <metric> <n> → <n> (<window>)
- Verdict: KEEP / KILL / MORE DATA (read on <date>)
- Next time: one sentence
```

## Kill log
_(ideas you tried that did not work — never re-propose without saying what changed)_

---

## 2026-09-12
- Tried: cherry-picked the operator's forgot/reset-password flow onto a fresh branch as its own **Tier 2 (auth) PR, not merged** (Q1 a, E39) - six untracked files from the operator tree (`app/forgot-password/`, `app/set-password/`, `app/api/auth/forgot-password/`, `app/api/auth/reset-password/`, `lib/services/authEmail.ts`, `lib/auth/credentials.ts`) plus the sign-in "Forgot password?" link, copied verbatim with sha256 recorded, then 5 review fixes in a separate commit and 28 offline tests in `__tests__/unit/password-reset.test.ts`.
- Before -> after: **0 password-recovery paths** on main for 1,620 accounts (1,575 credentials rows; OAuth linking has never worked). Design held up: 256-bit random token, SHA-256 stored in the existing `VerificationToken` table (present in production, 0 rows - **no schema change**), 1 h TTL, single-use, generic response on every branch. Two real leaks found and fixed: the raw token was being written to `notification_logs.body` via `EmailNotifier.send()` (fixed with `skipLog: true`), and the no-transport path would console-preview the body (now returns before building it). Also `@admin.local` guard, `NEXT_PUBLIC_SITE_URL` base-URL chain, trailing-slash fetches. SMTP is live in Vercel (11/13 vars) so the email actually sends once merged.
- Verdict: QUEUED-T2 (merge ask "approve 1a merge") - MORE DATA (read 2026-09-26: successful resets/wk, sign-ins after reset)
- Next time: three residuals the operator should know before merging, none blocking: existing JWT sessions survive a reset (30 d, needs a `passwordChangedAt` column to fix = schema), the token rides in a GET query string so it appears in Vercel request logs for its 1 h life, and the per-IP limiter is per-instance. Then measure: `NotificationLog` is deliberately skipped, so count resets from `verification_tokens` churn or add a GA4 `password_reset` event on the set-password success screen.

## 2026-09-10
- Tried: built the consent endpoint the re-permission email points at (T1, PR #76, E34) — `app/api/subscribe/confirm/route.ts` + `lib/services/subscribeConfirm.ts`. Token design: a new `signPurposeToken(purpose, email)` in `unsubscribe.ts` HMACs `<purpose>:<email>` with the same key, so the confirm token and the unsubscribe token are domain-separated and neither can do the other's job (asserted in both directions); the existing unsubscribe derivation is deliberately unchanged so links already in inboxes still verify. GET is read-only, POST upserts idempotently, a racing P2002 counts as success, any other DB error is a 500 rather than a false "you're subscribed". **No schema change**: consent = a `waitlist` row with `source='re-permission'`, with `ipAddress`/`userAgent`/`createdAt` as the audit trail — all columns that already existed. 20 new tests; build clean (`λ /api/subscribe/confirm`); type-check clean.
- Before -> after: re-permission rows **0 -> 0** (the endpoint is unreachable until an email links to it — that is the honest reading). What changed is that the "YES, SEND IT" button stopped being `t=PREVIEW-NOT-LIVE` and became a signed link. Baseline: 21 subscribers (footer 17, go-interstitial 2, collection-page 1, sign-in 1), owned adds 76/7d against 120, 1,599 accounts of which ~788 have >=1 favourite, 0 emails ever sent. Operator set `UNSUBSCRIBE_SECRET` in Vercel Production **and** `.env.local` overnight, so the HMAC now verifies across environments — the 09-08 dead-link failure is closed. Remaining blockers are exactly two names: `EMAIL_POSTAL_ADDRESS` (hard — `sendBulk` throws) and `NEXT_PUBLIC_SITE_URL` in `.env.local` (soft — scripts build localhost links without it).
- Verdict: MORE DATA (read 2026-09-24; EXTEND rather than KILL if no send has happened by then, because the blocker is an env var, not the code)
- Next time: verified the round-trip offline before claiming it works — signed a token with the local secret, verified it with the same function, and checked each purpose rejects the other's token; **no email sent, no secret value read**. The remaining ask on the operator is now two names, not eight, and repeating a stale "N of M vars" count is its own documented failure mode — only state what was checked today. Do not add a fifth capture surface: E4/E6/E10 are still unread and the constraint is a list nobody has ever mailed.

## 2026-09-09
- Tried: made the send path refuse an illegal send before the operator's 10 minutes unlock it (T0, PR #70, E29) - `lib/services/bulkMailer.ts` gained a CAN-SPAM postal-address guard alongside the existing unsubscribe-link guard: `resolvePostalAddress()` reads `EMAIL_POSTAL_ADDRESS`; a real send with no address throws; a real send whose rendered body does not carry the address throws (HTML-escaped or raw); and a **bracketed placeholder throws even on a dry run**, because the dry run is what a human signs off. `scripts/agents/newsletter-send-test.ts` no longer hardcodes `[postal address required by CAN-SPAM - operator to supply]`, and its `/api/subscribe/confirm` link got the trailing slash `trailingSlash: true` requires. 8 missing env vars added to `env.example`. 10 new tests (24 -> 34).
- Before -> after: the shipped example-send script would have rendered a **non-compliant** email - the placeholder sat in the footer of both the issue and the re-permission draft, and `bulkMailer`'s "refuses to render" guard checked only the unsubscribe URL. After: no code path can send a commercial message without a real postal address in the body. Baseline unchanged elsewhere: 20 subscribers (footer 16, go-interstitial 2, collection-page 1, sign-in 1), owned adds 57/7d, `newsletter_signup` events 3/7d, 0 emails ever sent. `env.example` documented 4 of the 12 vars `lib/services/` actually reads; now 12.
- Verdict: KEEP (the guard is unconditional and offline-tested) - MORE DATA on the send itself (read 2026-09-21 with E16/E23)
- Next time: the operator's list is **8 vars, not 5**. `UNSUBSCRIBE_SECRET` must be the *same value in both* `.env.local` and Vercel (the fallback to `NEXTAUTH_SECRET` is why every unsubscribe link in the 09-08 test send was dead), and `EMAIL_POSTAL_ADDRESS` is now a hard blocker rather than a footnote in a report. Then build the `/api/subscribe/confirm/` consent endpoint - it is the only remaining code between 20 subscribers and ~788 addressable ones.

## 2026-09-08
- Tried: wrote the two emails the SMTP path exists to send (T0, PR #59) — `reports/funnel/drafts/newsletter-issue-01-2026-09-08.md` (issue #1 for the 20 subscribers: subject A/B/C, full plain-text body from the week's 6 real posts, HTML notes, 7-step send checklist gated on mail-tester ≥ 9/10) and `reports/funnel/drafts/re-permission-email-2026-09-08.md` (the one-time consent ask to registered accounts, warm-up plan, kill rule, consent-endpoint spec). Deliberately did **not** add a fifth capture surface: E4/E6/E10 are all unread.
- Before → after: 20 subscribers (footer 16, go-interstitial 2, collection-page 1, sign-in 1 — re-verified by `groupBy source` 2026-09-08), 0 emails ever sent, 0 of 5 SMTP vars. Two DB facts changed the copy: **0 mods added to the catalog in the last 7 days** (so "new mods weekly" is a promise the DB contradicts — issue #1 says "what's new on the site this week" and is built from the 6 blog posts), and **788 of 1,562 accounts have ≥1 favourite** (that, not all 1,562, is the re-permission audience). Also: no marketing-consent column exists anywhere, so consent = a `waitlist` row with `source='re-permission'` — no schema change, and the scoreboard attributes the campaign for free.
- Verdict: MORE DATA (read on 2026-09-21 — issue #1 delivered/opens; re-permission reads 14 days after its day-1 batch)
- Next time: build the one-click consent endpoint (`/api/subscribe/confirm`, HMAC token reusing `unsubscribe.ts`, idempotent `waitlist.upsert`, GA4 `newsletter_signup` source=`re-permission`) — Tier 1, ~1 route + 1 page + 4 tests, and the only thing besides the operator's 10 minutes between 20 subscribers and ~800 addressable ones. Also curl every URL before writing copy: `/auth/signin` is a 404 and `/mods/` redirects to `/`.

## 2026-09-07
- Tried: built the BigScoots SMTP sending path per the operator's 2026-09-05 decision (T1, PR #49) — nodemailer transport in `lib/services/emailNotifier.ts` used whenever `SMTP_HOST` is set (SendGrid demoted to fallback), `lib/services/bulkMailer.ts` (dry-run by default, 100/hour hard ceiling, 20/batch, per-recipient List-Unsubscribe + One-Click, plain-text alternative), `lib/services/unsubscribe.ts` (HMAC token, no schema change), `scripts/agents/newsletter-preview.ts`, 24 offline unit tests.
- Before → after: email subscribers 20 (footer 16, go-interstitial 2, sign-in 1, collection-page 1); `newsletter_signup` events 2/7d; **emails ever sent to those 20 people: 0**. SMTP env vars in Vercel production: **0 of 5** (checked 2026-09-07 — 37 production vars exist, none `SMTP_*`), so the send path is built but cannot fire.
- Verdict: MORE DATA (read on 2026-09-21 — first issue open rate, once the operator's ~10-minute BigScoots step lands)
- Next time: the capture surfaces are not the constraint any more. 44 owned adds/7d with 41 of them accounts means the email list grows ~3/wk from ~88K sessions. Before adding a fifth capture surface, make the existing four worth joining — a list nobody has ever mailed converts at 0.003%. Ship the first issue, then re-test the copy.

## 2026-09-01
- Tried: nothing yet — team chartered today. Read `../charter.md`, `../autonomy.md`, `../operating-model.md`, `../targets.json`, and `reports/growth/fact-base-2026-09-01.md` before your first move.
- Before → after: baseline in `../targets.json`
- Verdict: —
- Next time: your first move should be the top item in your agent file's "levers" list unless the scoreboard shows a 🔴 in your area.
