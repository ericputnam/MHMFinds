# Re-permission email to registered accounts — send-ready draft + consent spec (Cass, 2026-09-08)

**Status:** DRAFT. Nothing is sent by merging this file.
**Blocked on:** (1) the 5 SMTP vars (operator-queue 49), and (2) the one-click
consent endpoint specified in §4 below, which does not exist yet.
**Send tier:** T1 (one-time re-permission to people who gave us their address),
announced with a 24h veto, sent in the warm-up order in §5.

---

## 1. The problem this solves, with the number

There are **1,562 registered accounts** and **788 of them have saved at least
one favourite** (verified 2026-09-08 against production). None of them ever
agreed to receive marketing email — they typed an address to create an account
and save mods. The email list is **20 people**.

So the largest owned-audience asset we have is unreachable, and the fastest
available path to a real list is not a fifth capture surface on the site (the
three inline surfaces shipped since 09-02 have produced 4 subscribers between
them). It is asking the 788 engaged account-holders one time whether they want
the weekly email. Even a conservative 15% yes-rate on the engaged segment is
~118 subscribers — a 6× list in one send, from people who have already
demonstrated they like the content enough to save it.

That is the whole case. It is also the single riskiest email we will ever
send, which is why §2 and §4 exist.

## 2. The rules this send obeys

- **It asks; it does not assume.** One email. If they do nothing, they never
  hear from us again and we delete nothing — their account still works.
  "Silence = subscribed" is not consent and we do not do it.
- **It is not a newsletter.** No six links, no mod roundup. Sending the actual
  newsletter and calling it a permission request is the dark pattern version
  of this move.
- **One send, never a sequence.** No "just checking in" follow-up. A second
  re-permission email to someone who ignored the first is spam.
- **Warm-up order.** Engaged first, dormant last, batched (§5). Never all
  1,562 in one day — that is the fastest way to burn a brand-new sending
  domain.
- **It states plainly why they are getting it.** People who do not remember
  signing up mark mail as spam. The first sentence has to make them remember.

## 3. Copy

**Subject (recommendation):** `Do you want the weekly Sims 4 finds email?`
**Preheader:** `You have an account at MustHaveMods. We've never emailed you. Only click if you want us to start.`

Alternate subject for the dormant batch: `One question about your MustHaveMods account`
(higher open rate on people who have forgotten us; keep the body identical).

**Plain text:**

```
Hi —

You created a free account at musthavemods.com and saved some CC. We have
never sent you anything, and we are not going to start without asking.

We're launching a weekly email: the CC and mods worth your download slot,
one email a week, nothing else. Want it?

  YES, SEND IT: {{CONFIRM_URL}}

If you don't click, nothing happens. You stay signed up for the site, your
saved finds stay where they are, and you will not get this email again.

— The MustHaveMods team

You're receiving this one message because you have an account at
musthavemods.com. This is not a marketing email and there is nothing to
unsubscribe from — we're asking permission before there is.
{{ADDRESS_LINE}}
```

**HTML notes:** same 600px shell as issue #1. The confirm link is a real
`<a>` styled as a button, and the raw URL appears once underneath as text for
clients that strip styling. Nothing else in the email is a link — one action,
one click. No images.

**Do not write:** "You're already subscribed, click here to opt out."
"We'll assume yes unless you tell us otherwise." "Confirm your account."
Any of those turns a permission request into a trick.

## 4. Consent mechanism — how the YES is recorded (no schema change needed)

There is **no marketing-consent column anywhere in the schema** (checked
2026-09-08: `User` has no opt-in field; `waitlist` has `id/email/source/
ipAddress/userAgent/createdAt/notified` and no consent or `unsubscribedAt`
column — the `EmailSubscriber.unsubscribedAt` drift noted in operator-queue Q1
still is not in production). Adding one is a Tier 2 migration.

We do not need one. **Consent is the existence of a `waitlist` row.** The
confirm click creates it with `source = 're-permission'`, which means the
existing scoreboard line "Subscribers by source" attributes the whole campaign
for free, exactly like `footer` / `go-interstitial` / `collection-page` do.

Spec for the endpoint (Cass's next move, Tier 1 — a new non-ad route + page,
no auth change, no schema change):

- `GET /api/subscribe/confirm?e=<email>&t=<token>`
  - `t` is an HMAC of the email using the same secret and helper shape as
    `lib/services/unsubscribe.ts` (PR #49) — that file already proves the
    pattern works without a schema change. An unsigned or mismatched token is
    a 400; this is what stops anyone from subscribing a stranger by editing a
    query string.
  - On valid token: `prisma.waitlist.upsert({ where: { email }, create: {
    email, source: 're-permission' }, update: {} })`. Idempotent — a double
    click is not a double subscribe, and it never downgrades an existing row's
    source.
  - Redirect to `/subscribed/` with a one-screen confirmation, and fire the
    GA4 `newsletter_signup` event with `source: 're-permission'` so the
    campaign shows up in capture events, not just the DB.
- The link is generated per recipient at send time, like `ctx.unsubscribeUrl`
  in `bulkMailer`. **The email address is never in a query string in plain
  text without its HMAC** and the endpoint does no lookup on `e` alone.
- Ship it *before* the send, verify it on a throwaway address, and confirm the
  row lands with the right source.

Estimated size: one route file, one small page, ~4 unit tests reusing the
`unsubscribe.ts` token tests. It is Tier 1 only because it is a new public
route; it touches no ad anchor, no auth, no schema.

## 5. Warm-up plan (do not compress this)

| Day | Segment | Size | Gate to continue |
|---|---|---|---|
| 1 | Accounts with ≥1 favourite, created in the last 90 days | ~100 | bounce < 3%, complaints 0 |
| 3 | Rest of the accounts with ≥1 favourite | ~688 | bounce < 3%, complaints < 0.1% |
| 7 | Accounts with 0 favourites, created in the last 180 days | remainder of ~774 | only if days 1 and 3 were clean |
| — | Accounts with 0 favourites, dormant > 180 days | ~ | **do not send.** A dormant address that never engaged is a spam-trap risk that costs more than it can return. |

`bulkMailer`'s 100/hour ceiling and 20/batch default already enforce the pace
inside a day. Between days, a human reads the bounce mailbox — that is the
gate, and it is not automatable yet.

## 6. Measurement

- **Metric:** `waitlist` rows with `source = 're-permission'`, and total
  subscribers.
- **Before (2026-09-08):** 20 subscribers total — footer 16, go-interstitial 2,
  collection-page 1, sign-in 1. Zero re-permission rows; the endpoint does not
  exist. 1,562 accounts, 788 with ≥1 favourite. Emails ever sent: 0.
- **Read on:** 14 days after the day-1 batch.
- **Keep if:** ≥ 10% of the engaged segment says yes (≥ 79 new subscribers
  from ~788) **and** spam complaints stay under 0.1% **and** bounces under 3%.
- **Kill if:** complaints ≥ 0.3% at any batch — stop the campaign mid-flight,
  do not send the next segment, and report it the same day. Deliverability
  damage compounds; a paused campaign is recoverable, a burned domain is not.

## 7. What this does to headline metric #1

Owned-audience net adds are running 46/7d against a 120/wk target, and 43 of
those 46 are account registrations that we cannot reach. A successful
re-permission campaign does not add new humans — it converts humans we already
have into humans we can contact, which is the entire point of the metric.
Report it honestly: it is a **one-time conversion of existing audience**, not
recurring weekly acquisition, and the weekly run-rate afterwards still has to
come from the capture surfaces.

— Cass, Capture
