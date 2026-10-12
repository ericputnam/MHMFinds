<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
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

## 2026-10-12
- Tried: E191 — `/sign-in/` honors the save intent for `ref ∈ {mod-detail-save, mod-detail-favorite, go-save}` (save header, "Create account & save", creator block hidden, `signup_intent_view{source}`, `source` stamped on `sign_up`); rider: one-per-contentType first pass in `pickRecentPosts`. Tier 0, PR #287 `b74cc85`, guard 4/13 red pre-fix, verify PASS 07:15. (Entry landed by Quinn — Cass's Edit on this file was denied.)
- Before → after: 72 redirected users vs ≤4 offer-sourced sign_ups (≈6%) 14d 09-28→10-11 → read 2026-10-26. E130 EXTEND 0.57/1K (7/12,227); E138 on track KEEP (26 fav users); E152 trending KILL 0.66/1K (2/3,020).
- Verdict: PENDING (keep if ≥15% AND non-offer sign_ups ≥55/14d; EXTEND ≥10%).
- Next time: when click rate is healthy and completion is not, the leak is the form, not the surface — read the step after the redirect before copying an offer. GA4 `page_view` fires only on full loads here (/go 570 views vs 3,020 sessions): count sessions or events on client-navigated routes.

## 2026-10-07
- Tried: E179 — emailed `/set-password` link gets the trailing slash and `mode=reset|invite` (`passwordLinkUrl()` in authEmail.ts; 4/4 link tests red on pre-fix main, 30/30 green). PR #266 `afad9e1`, Tier 0 (lib/tests/reports only), merged after Rio's 07:12 CLEAR; verify SUPERSEDED-PASS 07:21. Also built newsletter issue 05 as a read-only draft (sent 0); #260 (E173) HELD-RED day 4, MERGEABLE.
- Before → after: bare `/set-password?token=` 308s in prod; GA4 14d 3 views / 2 `password_reset_complete`, all mode-less → read 10-21 with E123. Grades: E86 KEEP (46/98 = 46.9% opt-in, now 46 of 78 subscribers), E145 KEEP-inert (prod 401 w/o bearer, 0 weekly rows; Part B dropped as Q18), E73 below bar (3 home-hero rows lifetime, ≤1.9/1K) → Quinn KILL, replace with the account offer.
- Verdict: MORE DATA (read on 2026-10-21).
- Next time: an opt-in that reaches 47% on credentials sign-ups is worth nothing to the OAuth half (41 of 90 new accounts/7d) until #260 lands — count the population a surface can reach before quoting its rate.

## 2026-10-04
- Tried: E173 — DB split of new accounts by provider: since 09-23 credentials 80 (37 ticked signup-optin, 46%), Patreon OAuth 66 (2 subscribed, via other surfaces; 43 of 93 accounts in the last 7d). Patreon connect never shows the opt-in. Shipped a one-click "Email me weekly" on /go for signed-in ?patreon=connected returners (session address, source patreon-connect-optin, view event patreon_connect_optin_view), inside the mod card above .mv-ads (T0, PR #260, HELD-RED — touches app/go + components/, merges on the first non-red morning). GoClient cases 3/14 red pre-fix.
- Before → after: patreon-connect-optin rows 0; patreon_post_connect_view 93 ev / ≤62 users (09-21→10-03) → read 14d after merge.
- Verdict: PENDING. Pre-reads: E86 on track KEEP (37 rows, 46%); E73 below bar (≤1.9/1K vs ≥2); E145 prod cron 401 without bearer.
- Next time: split owned adds by account provider before choosing a surface. The biggest unasked group was Patreon OAuth accounts, not a missing placement. customEvent:ref is not registered, so read sign_up by source.

## 2026-10-02
- Tried: E159 — coverage read first: every Next.js group >1% of sessions already carries an offer (/mods/* 8.6%, / 3.6%, /games/* 2.8%, /go/* 1.7%); the 23 uncovered rows are all WordPress (27.9% of sessions). So shipped the offer-quality move: SaveFindsOffer copy split by useSession() status + saved state → FAVORITES_PATH, mirroring GoSaveOffer (T0, PR #246, 4ce2156, verify PASS 06:53). 4/19 red pre-fix.
- Before → after: favorite src=mod-detail-save 4 users / 7 events (14d, 09-18→10-01); /account/favorites/ 0 of 9 views referred from /mods/* → read 2026-10-16. Owned adds 7d 119, capture 1.30/1K.
- Verdict: PENDING. Keep if ≥8 signed-in offer-save users/14d OR ≥5 referred favorites views, with /mods/* RPM ≥95%.
- Next time: `customEvent:source` IS a registered GA4 dimension — read it instead of assuming params are invisible; it split signed-in offer saves from the heart's in one query. And `grep -l … | xargs`-style lists silently collapse to one file under vitest 4 — pass paths explicitly.

## 2026-10-01
- Tried: E152 — "Save this mod for later" account offer in the E4 /go email-box slot (sibling below `.mv-ads`, wrapper still 2 children), copy split by session status, saved → /account/favorites/; own ref go-save, events go_save_signin_redirect / go_save_after_signin, marker ?save=1 (T0, PR #238, 1902a23, verify PASS 06:53). 7/8 GoClient cases red pre-fix.
- Before → after: /go 2,931 sessions 14d (99% desktop; page_view only 15% of them); E4 0.68/1K GA4 14d, 1.45/1K DB 28d; go_save_* 0 → read 2026-10-15. Owned adds 7d 119 (28 email + 91 accounts) vs 200; capture 1.28/1K.
- Verdict: PENDING. Keep if ≥2.62/1K /go sessions AND /go RPM ≥95% same weekdays (watch 10-08).
- Next time: import a shared constant from its client-safe module (lib/favoritesPath.ts), never the Prisma-backed barrel. And `gh pr merge --delete-branch` exit 1 again meant MERGED — read state first.

## 2026-09-30
- Tried: E145 = E78 Part A. Shipped #144's cron route, `newsletterWeekly` and tests without `vercel.json` (T0, PR #226, 77c3a9e, verify PASS 06:55). Production returns 401 with no bearer. Auth now fails closed on an unset `CRON_SECRET` (#144 skipped auth in that case; 1/20 tests red against it). #144 is closed. Q18 now asks only for the cron line.
- Before → after: automated issues 0/wk, 56 subscribers, 1 issue ever. Read 10-07 (Q18 drop date).
- Verdict: PENDING. E54 KILL (2 of 387; 12 hard of 200 = 6.0%). E4 KILL (/go 3/1,734 = 1.73/1K extension, 6/4,125 = 1.45/1K 28d, < 2); replace it with an account offer.
- Next time: a test that exercises a real send path must mock `fs`. My first run appended 3 fake `live` rows to `newsletter-sends.jsonl` (reverted before commit).

## 2026-09-29
- Tried: E138 — made `/mods/[id]` load the real favorite state for signed-in visitors through a new read-only GET, with no request for anonymous visitors (T0, PR #219, 9101e51, verify PASS 07:33). 9/9 red pre-fix.
- Before → after: /mods/* `favorite` 6 users / 43 events over 14d, anonymous redirects 11 over 14d → read 2026-10-13. Owned adds 7d went 110 → 120 (target hit), capture 1.21 → 1.30/1K.
- Verdict: PENDING. Pre-reads 09-30: E4 KILL (1.49/1K < 2; extension window 1.73/1K; still above site 1.30/1K — replace, don't just drop). E54/E68 KILL (1.06 confirms per 100 vs ≥2; 2 of 387 yes; exclusion leg 0/12 re-attempted passes — keep `sendExclusions`).
- Next time: check the effective response headers with `next start` before trusting a route's `Cache-Control`. `next.config.js` sets `public, s-maxage=60` on every `/api/*` response and replaced my `no-store` locally.
