# Rio — Product & Revenue — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. "I think it worked" is not a learning. Covers revenue: Patreon tier changes and paid counts, membership conversion, sponsorship replies, affiliate EPC, ad-guardrail incidents.

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
- Tried: E40 — /go member CTA leads with the $3 perk-tier checkout, Connect second (T1, PR #83, branch `funnel/rio/go-cta-join-first`, merges 2026-09-13 unless stopped). New constants `PATREON_MEMBER_TIER_CHECKOUT_URL` (`/checkout/MustHaveModsOfficial?rid=24880520`) and `PATREON_MEMBER_TIER_PRICE_LABEL` in `lib/membership.ts`; signed-in non-members get "Not a patron yet? Join for $3/mo … Already a patron (or just joined)? Connect Patreon". GA4 source names, ad anchors and countdown unchanged; membership tests 20 → 22.
- Before → after: paid-and-connected patrons **0 of 27 linked** (linked accounts 1 → 27 between 09-08 and 09-12: 5/10/4/6/1 per day) while `patreon_click` ran 21/20/4/10 events (~35 users) — ~3 of every 4 clicking users connected and none paid, because the first link was "Connect". Paid 50 ($1×8, $3×41, $8×1) ≈ $139/mo; joins since 09-08: 6 in 4 d vs 17/mo baseline; cancels 1. → read 2026-09-19.
- Decision rule (written before the read): keep if paid-and-connected ≥ 3 OR $3-tier joins 09-13→09-19 ≥ 11, with session RPM within ±5% of $17.55; kill/revert if paid-and-connected still 0 AND joins < 8 AND patreon_click users/day < 50% of 8.75.
- Affiliate read (E5/E9, due 09-15) deliberately NOT pulled forward: 63 clicks/30d (grid 51, mod_page 8, interstitial 4), 0 `AffiliateEarning` rows across 1,203 clicks since 2026-01-26, and the Impact sync ran healthy on 09-11 ("0 earnings created"), so the $0 is a real zero — but a cut earns $0 by construction and would have competed with this PR for the one Tier 1 veto window. Rule for 09-15 stays: EPC still $0 → remove the mod_page + interstitial blocks (12 clicks/30d) first; the grid placement (51) is the homepage and needs its own before-snapshot.
- Guardrail: GREEN (09-10 $185.28 +3.5%, RPM $16.48 +9.2%, sessions −5.2%; 3-day +4.4%); every deploy in the window is docs/report code. E5 counter still 0/5. Mediavine MCP unavailable again; figures from guardrail/scoreboard files.
- Verdict: MORE DATA (read on 2026-09-19)
- Next time: (1) GA4's `source` event param is **not a registered custom dimension** — `customEvent:source` 400s in the Data API, so the E24 "by source" split is not queryable; split by date around the deploy instead, and ask for `source` to be registered as an event-scoped custom dimension (GA4 admin, operator); (2) `patreon-relaunch-read.ts` is the one-command read for paid-and-connected — run it, don't re-derive; (3) the `$5` tier's single patron pays $8 (custom amount), so "tier price" and "what patrons pay" differ — report both; (4) tier ids and checkout URLs come from `GET /campaigns/{id}?include=tiers&fields[tier]=url` and are public join links, safe to hardcode.

## 2026-09-10
- Tried: E35 — morning "operator did" probe (T0, `scripts/agents/operator-did-probe.ts` + `operator-did-probe-lib.ts`, runner step 0d, 23 unit tests). Read-only, names/titles/counts only, every output line through `redact()`: (1) Vercel Production env var NAMES via `vercel env ls production --cwd $MHM_OPERATOR_TREE` diffed against the 13 expected names (8 newsletter + 4 `PATREON_*` + membership flag); (2) Patreon tiers via `GET /campaigns/{id}?include=tiers` (title, price, published, patron_count, edited_at, perk-line and welcome-note phrase in `description`, `campaign.thanks_msg`); (3) `check-blog-sidebar.sh` exit code; (4) delta vs `reports/funnel/operator-did-<date>.json`. Exit 0/2/1, one line per run in `logs/operator-did.log`. Baseline 09-09 is a labelled reconstruction from the documented 09-09 observations, not a probe run.
- Before → after: digest asks repeated after the operator had already done the thing: **2** on 09-09 (SMTP vars, $3 perk line) → read 2026-09-17. First real run 2026-09-10 ~11:00Z, exit 0: env **11/13** required present — **+UNSUBSCRIBE_SECRET since 09-09**, still missing `EMAIL_POSTAL_ADDRESS` (hard blocker) and `NEXT_PUBLIC_SITE_URL`; tiers $0 Free 5,330 · **$1 Support Tier still published, 8 patrons** · $3 Tip Jar 40 (perk line present, edited 09-09T01:35:05Z, patrons 39 → 40) · $5 Extra Support 0; `campaign.thanks_msg` empty, no tier description carries the note phrase; blog markers ok. **Q4 step 1 still 1 of 3.** Non-ad $128/mo (48 paid).
- Guardrail: GREEN, demand-side — 09-08 $195.87 (+7.8% same-weekday), RPM $16.79 (+14.9%) on sessions −6.0%, 3-day revenue +27.0%, MV health ok; every deploy in the 72h window is newsletter/report/ingest code with no earning-page change. Source: guardrail JSON + scoreboard (mediavine-reporting MCP failed to connect again). E5 counter 0/5. Affiliate 15 clicks/7d, $0 — cut-or-kill read still 09-15.
- Verdict: MORE DATA (read on 2026-09-17 — keep if 0 repeated asks across the 7 digests 09-11→09-17; kill if the probe exits 2 on ≥3 of 7 mornings).
- Next time: (1) Patreon API v2 has **no per-tier welcome-note field** — the tier attribute list ends at `title/unpublished_at/url/user_limit`; never promise to verify a welcome note, report it "not observable via API" and use `tier.description` + `campaign.thanks_msg` as the proxies; (2) Patreon returns tier titles verbatim with trailing whitespace (`"Tip Jar - Curious Simmer "`) — trim before matching, or a reconstructed baseline reads as "tier removed + new tier"; (3) a reconstructed baseline with `edited_at: null` must compare edits against the baseline *date*, otherwise every tier's May edit reads as "changed today"; (4) a "32+ token chars" redaction regex eats dated filenames unless hyphens/dots are excluded — test `redact()` on a path like `patreon-welcome-note-2026-09-09.md`; (5) the worktrees are not Vercel-linked — `vercel env ls` needs `--cwd <operator tree>`, and `vercel` resets the shell cwd.

## 2026-09-09
- Tried: E30 — Patreon churn read + day-0 welcome-note draft (T0, `scripts/agents/patreon-churn-read.ts`, `reports/funnel/drafts/patreon-welcome-note-2026-09-09.md`). Read-only Members API pull, aggregates only (no emails/tokens printed).
- Before → after: 47 paid ($1×8, $3×39) $125/mo · 225 former · 17 declined · 5,116 free. Cancel cohort by charges paid (n=223): 1 → 88 (39%), 2 → 44 (20%), 3 → 33 (15%), 4–6 → 34, 7–12 → 17, 13+ → 7; ≤2 charges = 132 (59%), median 2. First-30-day churn 84/250 = 34%. Joins vs cancels Jun–Aug 56/29 (18.7 vs 9.7 per month); Sep to date 5/16. Site linkage: 11 `Account.provider='patreon'` rows (5 on 09-08), **0** belong to a currently paying patron, `isPremium`=2. E24 interim: `patreon_click` 27 events (~20 users, all on `/go/`), `member_skip_countdown` 1.
- Q4 step 1 via API: $3 tier description edited 2026-09-09T01:35Z (perk line applied, 6 min after PR #65 merged); $1 tier still `published=true` with 8 patrons; newest post is 09-08 "Y2K Belts Lookbook" — thank-you post not posted. 1 of 3 steps done.
- Guardrail: GREEN is demand-side. Source: repo Mediavine client (`earnings`), MCP unavailable. Daily eCPM $0.70–0.85 (08-31→09-04) → $0.91/$0.92/$0.95 (09-05/06/07) while paid imp/pageview stayed 11.1–13.1 and viewability 51.5–53.9% — price per impression moved, fill and layout did not. Same-path page RPM up on 100/109 paths 09-05→09-07 vs prior week (homepage $7.29→$15.12, not finalized). The +34.5% RPM read is against a 4-Monday base that includes the 08-31 $11.96 trough; every 09-08 deploy postdates the judged day. E5 counter 0/5 (09-01 $13.75 was the only sub-$14 weekday; 09-02→09-07 all ≥ $14.21).
- Verdict: MORE DATA (read on 2026-10-07 — keep the welcome note if post-note first-30-day churn ≤ 24%, or ≥ 1/3 of new paid patrons connect on-site within 7 days; kill by 2026-10-22 if neither).
- Next time: (1) attribute a green to demand only after checking eCPM vs imp/pv vs viewability separately — a layout change moves imp/pv, a demand change moves eCPM; (2) Mediavine `pages()` keys are `page_revenue`/`rpm`/`pageviews`/`cpm`/`impressions_per_page_view`, and the JWT lives in `scripts/mcp-mediavine/.env.local`; (3) a decision threshold set at 40% when the numbers land at 39%/34% is a threshold chosen after the fact — pick the rule from the question ("where is the leak") before the read, not from the first printout; (4) the Patreon posts endpoint paginates oldest-first, sort client-side.

## 2026-09-08
- Tried: Q5 end-to-end verification found the approved membership feature dark for visitors and fixed it forward (T1, PR #62, `032543e`, merged same day as a fix-forward on an approved Tier 2 package — Quinn flagged the skipped 24h veto in the digest). `isMembershipEnabled()` read the flag as `env[MEMBERSHIP_FLAG]`, which Next.js never inlines into client bundles, so the browser evaluated `undefined` for ~22h while `/api/auth/providers` listed `patreon` the whole time.
- Before → after: `/go` CTA / Connect button / patron link rendered on production: false → true (headless render 07:09, served chunk `page-c26189679e4c0033.js`); `patreon_click` / `member_skip_countdown` / Patreon-linked accounts 0 / 0 / 0 (09-06→09-08) → read 2026-09-15. Non-ad $126/mo gross (46 paid: $1×6, $3×40; Q4 ladder still not applied in Patreon). Homepage MV page RPM $9.88 (08-31→09-06) vs $8.73 prior 7d — the E18 read baseline. `/go` per-page RPM: source unavailable (Mediavine `/reports/pages` caps at the top 150 paths); ceiling by GA4 236 pv × $15.67/1000 ≈ $3.70/7d.
- Verdict: MORE DATA (read on 2026-09-15 — keep if ≥1 `patreon_click` on /go and session RPM within ±5% of $15.67)
- Next time: (1) any `NEXT_PUBLIC_*` flag must be read as a literal `process.env.NEXT_PUBLIC_X` on the client path — guard it with a source-level test; (2) day-1 verification of a client-facing feature means a logged-out headless render of production plus grepping the served chunk for the inlined value, not a curl of a server route; (3) when the ad-revenue read for a page is impossible, say "source unavailable" and use GA4 pageviews × site RPM as an explicit upper bound; (4) ESM scripts resolve `node_modules` from the script's directory, not `NODE_PATH` — run Playwright helpers from inside the worktree. E5 escalation counter 0/5 (09-03 $14.64, 09-04 ≈$16.30, 09-05 $18.05). Affiliate cut-or-kill read still 2026-09-15 (12 clicks/7d, $0 EPC, 56/30d).

## 2026-09-07
- Tried: membership via Patreon OAuth as a ready-to-approve T2 package (PR #52, branch funnel/rio/membership-patreon-oauth, not merged): Patreon provider in NextAuth + /go countdown skip + member badge, all behind NEXT_PUBLIC_MEMBERSHIP_ENABLED; pricing knob PATREON_MEMBER_MIN_CENTS. Package: reports/funnel/drafts/membership-patreon-oauth-2026-09-07.md → operator-queue Q5.
- Before → after: non-ad $127/mo gross (47 paid: $1×7, $3×40, $5×0; 5,268 free) → target $200/mo by 09-30 (Q4+Q5: relaunch A targets 90 patrons ≈ $475/mo). Ad-loss bound: /go/ 725 GA4 pageviews/28d × $15.60 = ≤ $11.31/mo for the whole page.
- Guardrail, first green since 09-02: 09-05 $269.49 (+12.0% same-weekday), RPM $18.05 (+1.8%), sessions +10.1%, 3-day +1.6%. 28d $5,628.24 (−7.6%) is the E9/E13 mechanical roll-through and is improving: −10.4% (09-04) → −9.7% (09-05) → −7.6% (09-07). E5 counter 0/5 (weekday RPM 09-03 $14.64, 09-04 ≈ $16.30 derived from the guardrail 3-day window, 09-05 $18.05). Mediavine MCP unavailable; figures from guardrail/scoreboard JSON + GA4.
- Finding: 0 Google/Discord-linked accounts ever (all 1,533 are credentials) — signIn pre-create + no allowDangerousEmailAccountLinking → OAuthAccountNotLinked. Separate T2.
- Verdict: MORE DATA (read on 2026-10-07, 30 days after the flag flips).
- Next time: pitch Q4 and Q5 as one decision.

## 2026-09-01
- Tried: nothing yet — team chartered today. Read `../charter.md`, `../autonomy.md`, `../operating-model.md`, `../targets.json`, and `reports/growth/fact-base-2026-09-01.md` before your first move.
- Before → after: baseline in `../targets.json`
- Verdict: —
- Next time: your first move should be the top item in your agent file's "levers" list unless the scoreboard shows a 🔴 in your area.
