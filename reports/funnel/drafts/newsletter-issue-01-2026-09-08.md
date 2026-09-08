# Newsletter issue #1 — send-ready draft (Cass, 2026-09-08)

**Status:** DRAFT. Nothing is sent by merging this file.
**Blocked on:** the 5 SMTP env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS`, `EMAIL_FROM`) existing in Vercel Production — 0 of 5 as of
2026-09-08 06:45 (operator-queue item 49, the ~10-minute BigScoots step).
**Send tier:** T1 (send to an opted-in list), announced with a 24h veto.

---

## Why this file exists

`scripts/agents/newsletter-preview.ts` (PR #49) renders an issue exactly as
`bulkMailer` would send it, but its sample body is the literal string
`[ issue body goes here — built from the week's posts ]`. This is that body,
written, with real links, checked against real data on 2026-09-08. The day the
SMTP vars land, issue #1 is a copy-paste and a preview run away — not a writing
session.

---

## Audience for issue #1

**20 people.** The whole `waitlist` table (verified 2026-09-08 by
`groupBy source`): footer 16, go-interstitial 2, collection-page 1, sign-in 1.

Nobody on this list has ever received an email from us. The oldest of them
opted in months ago. That fact governs the copy: issue #1 has to re-introduce
itself without apologising, and it has to be good enough that a stale
subscriber does not hit "report spam" — which, on a brand-new sending domain
with 20 recipients, would be ~5% complaint rate and would poison the IP
reputation before the list is worth anything.

**Registered accounts (1,562) are NOT in this send.** They never opted into
marketing. See `re-permission-email-2026-09-08.md`.

**Patreon free members (5,287) are NOT in this send.** They are reached through
Patreon posts, not by exporting their emails (operator-queue Q2 close note).

---

## One correction to the premise, found today

The footer form's success state says *"the best new finds are headed your way"*
and the standing value proposition has been *"new mods weekly."*

**Mods added to the catalog in the last 7 days: 0.** (Verified 2026-09-08:
`prisma.mod.count({ where: { createdAt: { gte: now - 7d } } })` → 0. The
catalog holds 15,888 mods; the scraper has not added a row this week.)

**Blog posts published in the last 7 days: 6.** That is where the new finds
actually come from.

So issue #1 is built from *the week's posts plus a hand-picked catalog page*,
and the promise in the copy is **"what's new on the site this week"**, not
"new mods added this week." We do not print a sentence that the database
contradicts. If the catalog resumes ingesting, a "new in the catalog" block
can be added in issue #3+ — do not promise it before it is true.

---

## Subject lines (pick one; A is the recommendation)

| # | Subject | Preheader | Why |
|---|---|---|---|
| **A** | `Your first MustHaveMods roundup — 6 new CC lists` | `Goth accessories, Cardi B CC, Y2K makeup, and the social media mods everyone asked for.` | Concrete count, names the sender, sets the cadence expectation. Best for a list that has never been mailed. |
| B | `31 goth accessories, 16 Cardi B pieces, 10 social media mods` | `Everything we published this week, in one email.` | Higher curiosity, weaker sender identification — riskier on a cold list. |
| C | `We finally started the newsletter you signed up for` | `Here's what you missed. Weekly from now on.` | Honest and disarming, but leads with our failure. Hold as the A/B challenger for issue #2, not #1. |

**Do not use:** anything with "🔥", "Don't miss", a fake deadline, or ALL CAPS.
No fake urgency (charter non-negotiable #4).

**From:** `MustHaveMods <news@musthavemods.com>` · **Reply-To:** a mailbox a
human actually reads. A newsletter whose replies bounce is a spam signal.

---

## Body — plain text (the source of truth; the HTML mirrors it)

```
Hi —

You signed up for MustHaveMods at some point and then heard nothing from us.
That was us, not you. This is issue #1; from here it's one email a week with
the CC and mods worth your download slot, and nothing else.

Here's everything we published this week.

1. 31+ Sims 4 Goth Accessories — jewelry, tattoos, spikes, stockings
   https://blog.musthavemods.com/sims-4-goth-accessories/

2. 16+ Sims 4 Cardi B CC for the ultimate Bardi makeover
   https://blog.musthavemods.com/sims-4-cardi-b-cc/

3. 10 Sims 4 social media mods for influencer gameplay
   https://blog.musthavemods.com/sims-4-social-media-mods/

4. 25+ Sims 4 Nicki Minaj CC — hair, skin overlay, sim download, shoes
   https://blog.musthavemods.com/sims-4-nicki-minaj-cc/

5. 24+ Sims 4 Y2K makeup CC for the ultimate 2000s look
   https://blog.musthavemods.com/sims-4-y2k-makeup-cc/

6. 24+ Sims 4 Y2K hairstyles for your Sim's Y2K era
   https://blog.musthavemods.com/sims-4-y2k-hairstyles/

--

One from the catalog

If you only click one thing: the full Makeup CC collection — 922 pieces
across makeup, eyebrows, eyeliner, blush, lipstick and eyes, all filterable
by pack and creator.
https://musthavemods.com/games/sims-4/makeup-cc/

--

Most-saved this week by everyone else

  2025 81 (tops) — 184 saves
  Sims 4 3D Eyelashes Ver 5 (makeup) — 165 saves
  Hair Collection (hair) — 144 saves
  Teen Space (furniture) — 144 saves

Browse and filter all 15,888: https://musthavemods.com/

--

Two small things

Save what you like. A free account keeps your finds in one place instead of
30 open tabs: https://musthavemods.com/sign-in/

Skip the download countdown. If you support us on Patreon at $3 or more, you
can connect Patreon on any download page and the 10-second wait disappears.
https://www.patreon.com/musthavemods

That's it. Next one lands in a week.

— The MustHaveMods team
```

## HTML notes

- Reuse the shell in `scripts/agents/newsletter-preview.ts` (`renderSample`):
  600px max-width, system font stack, `#1f2937` text, `#6b7280` preheader line,
  `<hr>` between blocks, 12px grey footer.
- Each numbered item: `<a>` on the title only, one line of description under
  it in `#6b7280`. No image grid in issue #1 — images on a cold send raise the
  spam score and half of clients block them anyway. Add images from issue #3
  once the domain has a sending history.
- **One link per line, all first-party.** No tracking redirector, no shorteners
  — link shorteners are the single fastest way onto a blocklist.
- Footer must contain, in this order: why they're receiving it, the physical
  or business identifier line CAN-SPAM requires, and the unsubscribe link from
  `ctx.unsubscribeUrl`. `bulkMailer` adds `List-Unsubscribe` and
  `List-Unsubscribe-Post` headers per recipient automatically.

---

## Wiring it (once the vars exist)

`sendBulk` from `lib/services/bulkMailer.ts` (PR #49), which takes
`recipients: string[]` and `build: (ctx: BulkSendContext) => BulkMessage`
where `ctx` gives `{ email, unsubscribeUrl, index }`. Recipients come from
`prisma.waitlist.findMany({ select: { email: true } })`. Defaults already
enforce dry-run, 20/batch and a 100/hour ceiling — 20 recipients is one batch.

---

## Send checklist — do all of it, in order

1. `npx tsx scripts/agents/newsletter-preview.ts --verify` → transport is
   `smtp`, all 5 vars `set`, verify `OK`.
2. `--out /tmp/issue-01.html`, open it, click every link. All nine URLs in
   this draft were curled on 2026-09-08 and return 200 (note: `/mods` is a
   308 to `/mods/` which redirects to `/` — link the homepage directly, and
   `/auth/signin` is a 404; the real path is `/sign-in/`). Re-check before
   every issue: a 404 in issue #1 is unrecoverable.
3. Send one copy to a mail-tester.com address. **Score must be ≥ 9/10.**
   Below 9 → fix SPF/DKIM/DMARC/content before anyone real gets it. This is
   the gate the operator asked for.
4. Send to yourself at Gmail **and** at Outlook/Hotmail. Confirm inbox, not
   Promotions-with-a-warning, not Junk. Confirm the "Unsubscribe" link Gmail
   renders from the header works.
5. Click the real unsubscribe link on that test address end-to-end.
6. Only then: `sendBulk` with `dryRun: false` to the 20.
7. Watch the mailbox for bounces for 24h. Any hard bounce → drop the row
   before issue #2. A 5% bounce rate on 20 addresses is 1 person; on the 788
   accounts later it is 39 and it matters.

**Read on 2026-09-21:** delivered ≥ 18/20, opens ≥ 30%, ≥ 1 click, 0 spam
complaints. Under 20% opens on a hand-picked list means the subject line or
the from-name is wrong, not the content.

---

## Cadence after issue #1

Weekly, Thursday morning. Same shape every week: the week's posts, one catalog
collection, the most-saved mods, the two small asks. The template is the
product; only the six links change. That is what makes issue #4 take fifteen
minutes instead of an afternoon.

— Cass, Capture
