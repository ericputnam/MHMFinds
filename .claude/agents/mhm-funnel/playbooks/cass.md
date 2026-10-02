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

## 2026-09-28
- Tried: E130 — "Save this find" account offer under the /mods/[id] hero image, E10 email box removed (T0, PR #203, cb271e4, verify PASS). Own ref/marker/event names so it reads apart from E107.
- Before → after: mod-detail waitlist rows 0 ever → surface removed; /mods/* 7,988 sessions/7d, 98 % desktop; favorite_after_signin 0/14d, favorite_signin_redirect 4/14d; save_finds_* 0 → read 2026-10-12. Owned adds 7d 110 (26 email + 84 accounts), capture 1.21/1K.
- Verdict: E10 KILL (0 rows in its whole life); E130 PENDING.
- Next time: grade a surface on its lifetime count, not the window you were told — "0 in 22 days" was "0 ever". Read device split before choosing a placement: 98 % desktop moved the offer from "below the sidebar wrapper" (~1,100 px) to "under the image" (~500 px). And read the copy against what the product actually has — no favorites page exists, so the offer promises only the stored favorite.

## 2026-09-26
- Tried: E118 — the ideas-inbox premise ("Google/Discord buttons drop callbackUrl") was false: `/sign-in/` has **no OAuth buttons** and never had (`git log -S "signIn('google'"` empty; live HTML has none). The real leak was the credentials path: both success branches did `router.push(searchParams.get('redirect') || '/')` — an open redirect, and everyone arriving from the Navbar (no param) went to `/`. Shipped `app/sign-in/returnTo.ts`: `redirect` → `callbackUrl` → same-origin `document.referrer` → `/`, same-origin relative paths only, auth pages never a target. Guard 2/25 red pre-fix.
- Before → after: page_views referred by /sign-in/ 09-12→09-25 = 11 on `/`, 1 elsewhere (1/12 off-home) while /sign-in/ views came mostly from collection/search pages; sign_up 28/7d (09-19→25, all on /sign-in/). Owned adds 7d **90** (14 email incl. signup-optin 9, 76 accounts), DB read 08:2x from the Cass tree. Read 2026-10-10.
- Verdict: PENDING. E39 graded: SHIPPED 09-12 (reachable 09-15 via E49), not "never shipped"; completed resets unmeasurable (tokens are deleted on consume, no GA4 event) — upper bound 5 `/set-password/` views/14d, 2 outstanding tokens → NO READ.
- Next time: verify an idea's premise against the live HTML and `git log -S` before building the fix it names — the inbox line described buttons that do not exist. And read the experiments ledger against `git log`, not against its own Status column: E39's row still said QUEUED-T2 two weeks after `9f3dc29` shipped it.

## 2026-09-25
- Tried: E107 — wired the /mods/[id] favorite button to the real API and turned its 401 into an account-capture path (own event names favorite_signin_redirect / favorite_after_signin, ref=mod-detail-favorite, resume marker ?fav=1 stripped after one attempt). PR #178, 56eb87f, deploy-verify PASS.
- Before → after: favorite on /mods/* 0/14d, sign_up 11/14d all on /sign-in/, accounts +68/7d → read 2026-10-09.
- Verdict: PENDING. E34 graded MISSED (2 vs ≥79 confirmed); endpoint stays for E54/E68.
- Next time: audit every capture CTA on the top-traffic page for a stub handler before building a new surface — the biggest capture leak today was a button that did nothing, not a missing placement. Give each placement its own event name; an event param is invisible without a custom dimension. When a PR ahead of you touches your file, `git merge-tree --write-tree` dry-run first, then rebase only after it merges and re-run its suite too. OAuth buttons on sign-in drop `redirect` — fix before reading any account-capture experiment that relies on returning to the page.
