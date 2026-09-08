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
