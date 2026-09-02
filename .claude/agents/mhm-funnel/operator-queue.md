# Operator Queue

The only file the operator has to touch. Agents append packages; the operator
replies inline. Quinn processes replies every morning and removes closed items.

**How to reply:** edit the `Reply:` line, or just tell Claude "approve 2",
"reject 4 because …", "stop 3". Silence on a Tier 1 item = it ships when the
window closes. Tier 2 items older than 7 days get one smaller re-pitch, then
are dropped and logged.

---

## Tier 1 — shipping unless you say stop

_(none yet)_

## Tier 2 — needs your decision

### Q1 · Merge `feature/premium-intent-test` into `main` (2026-09-01)
- **Why:** `main` has been stale since 2026-07-31. Vercel production is 16 days old. The branch holds 15 commits plus ~210 uncommitted files (newsletter admin, forgot/reset password, `/play`, first-party mods, facets v2, the premium-intent banner). The team ships from `origin/main`, so until this lands every Tier 0 move is built on code the site isn't running.
- **Ask:** commit the working tree on the branch (Claude can stage and write the commit message on request), open the PR, review, merge. Note the `EmailSubscriber.unsubscribedAt` schema drift: production does not have that column, so `npm run db:deploy` (or `db:push`) must run before the merge deploys.
- **Risk:** medium (schema + auth changes). Rollback: `vercel rollback <previous deployment>`.
- **Reply:**

### Q2 · Grant read access so the team can measure Patreon and Pinterest (2026-09-01)
- **Patreon:** create a Creator Access Token at patreon.com/portal/registration/register-clients (client already exists — `PATREON_CLIENT_ID` is in `.env.local`) and add `PATREON_CREATOR_ACCESS_TOKEN` to `.env.local`. Read-only: member counts and pledge totals per tier. Until then the scoreboard scrapes the public page (paid count only, no $).
- **Pinterest:** the pinner's `PINTEREST_ACCESS_TOKEN` in `~/java_projects/MHMUtils/.env` can already read `/v5/user_account/analytics` and `/v5/pins/{id}/analytics` if the app has the `pins:read` + `user_accounts:read` scopes. Confirm the scopes (or regenerate with them) and copy the token into MHMFinds `.env.local` as `PINTEREST_ACCESS_TOKEN`.
- **Reply:**

### Q3 · Confirm the newsletter can send (2026-09-01)
- `NEWSLETTER_WEEKLY_ENABLED` is unset in Vercel; the cron exists. Cass will draft issue #1 and QA it. When it's ready it will appear above as a Tier 1 item. Nothing to do now except: is the SendGrid sender domain verified? (If you don't know, Cass will test with a send to your address.)
- **Reply:**

### Q4 · Patreon tier relaunch (arrives ~2026-09-05 from Rio)
- Placeholder: tier copy + free→paid announcement post will be attached here for you to paste into Patreon. Price choice will be two options with the math.
- **Reply:**

---

## Closed (last 30 days)

_(none)_
