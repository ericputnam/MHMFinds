# Experiments

Every shipped move lands here the day it ships. Quinn grades on Mondays.
Killed rows move to the kill log at the bottom and are never re-proposed
without stating what changed.

| ID | Shipped | Owner | Tier | Stage | Move | Metric | Before | Read on | Keep if | Result | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| E0 | 2026-09-01 | Quinn | 0 | --- | Team reset; scoreboard script; daily loop | owned adds/wk, non-ad $/mo | 63/wk, $100/mo | 2026-09-29 | adds >=120/wk | | |
| E2 | 2026-09-02 | Sage | 0 | AUDIENCE | Add explicit AI crawler allow rules to robots.txt: GPTBot, ChatGPT-User, ClaudeBot, Claude-Web, PerplexityBot, cohere-ai, Applebot-Extended, Google-Extended | ai_referral sessions 7d | 307/7d (2026-09-02) | 2026-09-30 | ai_referral >=385/7d (+25%) | | |
| E3 | 2026-09-02 | Nova | 0 | CONTENT | witch-cc collection page (PR #22) + keyword-fallback fix after theme tag matched 0 verified mods (PR #27, Quinn); first weekly writer brief W36 (5 GSC-ranked topics) | engaged sessions /games/sims-4/witch-cc 28d; brief adoption | page did not exist; 48 mods render from ~344 keyword matches (2026-09-02) | 2026-09-30 (brief: 2026-09-09) | >=200 sessions or 5+ favorites from page; writer adopts >=1 W36 topic | | |
| E4 | 2026-09-02 | Cass | 0 | CAPTURE | GA4 newsletter_signup event (by source) + email capture block on /go/[modId] interstitial as sibling of .mv-ads (PR #26) | email net adds 7d by source | footer=16, sign-in=1 total 17 (2026-09-02); newsletter_signup events 0 | 2026-09-16 | go-interstitial >=2 adds/1K /go sessions | | |
| E5 | 2026-09-02 | Rio | 0 | GUARDRAIL | Yellow-day diagnosis (PR #25): Aug 31 dip is demand-side/seasonal (RPM $11.96 late-Aug Sunday; 3-day RPM -0.1%; no deploy before judged day; MV health green). Verdict: no site change warranted. | September weekday session RPM | $11.96 on 2026-08-31 vs $14.29 expected | 2026-09-15 | RPM recovers >=$14.00 weekdays; escalate to Mediavine if <$14.00 for 5+ consecutive weekdays | | |
| E1 | 2026-09-02 | Pip | 0 | AUDIENCE | Pinterest read-back: GA4 landingPage x source (7d 2026-08-25 to 2026-08-31). Decisions: (a) (not set) landing label corrected -- ~61% is real Pinterest app traffic, not bots; (b) catalog pinning gap baselined -- 7 /games/* pages have zero Pinterest sessions. Next T0 move: queue catalog pins for the zero-session pages via pinner backlog. **Executed 2026-09-04**: 7 catalog URLs inserted into Supabase n8n_pinterest_posts backlog (IDs 11421-11427), drains at ~3 pins/hr. | Pinterest sessions/7d to /games/sims-4/* catalog pages | pregnancy-mods 812, female-clothes 695, male-clothes 137, body-presets 127, goth-cc 42, skin-details 42, cottagecore-cc 19; hair-cc/tattoos/holidays-cc/clutter/y2k-cc/vampire-cc/poses = 0 (baseline 2026-09-02) | 2026-09-16 | catalog pages with newly added pins show >=20 Pinterest sessions/7d within 14d of first pin | | |
| E6 | 2026-09-04 | Cass | 0 | CAPTURE | Newsletter capture block on all 16 collection pages (PR #33): NewsletterSignup source="collection-page" in CollectionPageClient.tsx, sibling of mod grid, outside all ad anchors; GA4 newsletter_signup fires per source | email net adds 7d, source=collection-page | 0 adds, 0 events; ~7K collection-page sessions/7d addressable (2026-09-04) | 2026-09-18 | >=2 adds per 1K collection-page sessions/7d | | |
| E7 | 2026-09-04 | Nova | 0 | CONTENT | makeup-cc collection page added to lib/collections.ts registry (PR #32) -- 922 verified mods across 6 content types (makeup/eyebrows/eyeliner/blush/lipstick/eyes); collection pages 15 -> 16 | engaged sessions /games/sims-4/makeup-cc 28d | 0 -- page did not exist (2026-09-04) | 2026-10-02 | >=200 engaged sessions by read date | | |
| E8 | 2026-09-04 | Sage | 0 | AUDIENCE | Google collapse diagnosis (PR #35, reports/growth/google-collapse-diagnosis.md): two core updates (2025-07-08 single-day cliff 1,179->571 clicks; Jan 2026 erased partial recovery), NOT indexing ("0/16,553 indexed" is a GSC sitemap-index UI artifact; 10/10 spot checks pass). Ranked fixes: homepage SSR (T1), canonical conflict fix in middleware (T0), ItemList schema top-20 posts (T0), internal links (T0). B3 diagnosis delivered 4 days early. | GSC clicks 28d | 2,106 (-1.2%) (2026-09-04) | 2026-10-02 | first shipped fix moves clicks WoW positive within 4 weeks | | |
| E10 | 2026-09-05 | Cass | 0 | CAPTURE | Newsletter capture block on mod detail pages (PR #38): NewsletterSignup source="mod-detail" in ModDetailClient.tsx after RelatedMods, sibling of all .mv-ads wrappers, aside#secondary untouched; sidebar-sticky 25/25 pass. Highest-traffic page type, previously zero capture. | email net adds 7d, source=mod-detail | 0 adds from mod-detail; 19 total subscribers; ~0/1K mod-detail sessions (2026-09-05) | 2026-09-19 | >=2 adds per 1K /mods/* sessions/7d | | |
| E11 | 2026-09-05 | Sage | 0 | AUDIENCE | Fix React #425 hydration errors on /mods/[id] (PR #41): pinned locale on toLocaleString, pinned timezone on toLocaleDateString, stabilized ReactMarkdown container. Ideas-inbox item from 2026-09-01. Post-deploy smoke-render: hydration errors 0 (was ~8/pageview). | hydration errors per /mods/[id] pageview (smoke-render) | ~8 errors/pageview since 2026-09-01 (baseline 2026-09-05) | 2026-09-08 | smoke-render shows errors=0 on next check | | |
| E12 | 2026-09-05 | Nova | 0 | CONTENT | W37 writer brief (PR #40, reports/funnel/writer-brief-2026-W37.md): 5 GSC-ranked topics (hospital build 50imp@9.1, Y2K, decor, dark-academia seasonal, teen-pregnancy 58imp@8.3). W36 adoption check: sims-4-social-media-mods (09-05) not a W36 topic -- 0/1 so far. | brief adoption rate (topics used / briefs delivered) | 0/1 briefs adopted (W36, as of 2026-09-05) | 2026-10-09 | writer uses >=1 of 5 W37 topics before 2026-10-09 | | |
| E13 | 2026-09-05 | Rio | 0 | GUARDRAIL | Yellow-day diagnosis #3 (PR #39): Sep-3 gap decomposes 89% sessions / 11% RPM; Pinterest taper stable not deepening; no earning-page deploy in window; 09-04 evening incident postdates judged day (network-level). Affiliate decision: HOLD all placements to 2026-09-15, then cut-or-kill on EPC ($0 on 53 clicks/30d). | MV 28d revenue + weekday RPM; affiliate EPC | $5,575.13 28d (-9.7%), RPM $14.64 on 09-03, E5 counter 0/5; affiliate $0/53 clicks (2026-09-05) | 2026-09-15 | weekday RPM holds >=$14.00 and 28d recovering; affiliate killed if EPC still $0 | | |
| E14 | 2026-09-05 | Pip | 0 | AUDIENCE | Pinner liveness check (PR #42, scripts/agents/check-pinner.sh): standalone T0 health check -- pinner staleness, backlog, live Pinterest token validity, refresh-token TTL, optional E1 catalog drain report. First run: pinner alive (posted 09-05, backlog 1,928, E1 pins 7/7 posted), stored access token 401 (auto-refresh covers next cycle; corroborates operator-queue Q2). Authored by Pip; finished/shipped by Quinn after Pip stream stalled. | Pinterest sessions 7d (guarded) | pinner health only visible via full scoreboard; token staleness invisible until a post failed (2026-09-05) | 2026-09-12 | runs clean from guardrail/evening check, 0 false FAILs in week one | | |
| E9 | 2026-09-04 | Rio | 0 | GUARDRAIL | 28d-breach + yellow-day diagnosis (PR #34): traffic-side (-10.6% sessions on judged day, Pinterest post-summer taper) + mechanical roll-through of August RPM compression into the 28d window; PR #26 /go impact confirmed clean; E5 escalation counter 0/5 weekdays below $14.00 RPM. Verdict: no site change. Patreon tier relaunch T2 package written (reports/funnel/drafts/patreon-tier-relaunch-2026-09-04.md) -> operator-queue Q4. | MV 28d revenue + weekday RPM | $5,590.26 (-10.4%), RPM $14.21 on 09-02 (2026-09-04) | 2026-09-15 | 28d RPM recovering toward $15+; escalate to Mediavine if 5 consecutive weekdays <$14.00 | | |

## Decisions written from E1 (2026-09-02)

### DQ-1: (not set) landing-page sessions are NOT primarily bot traffic

Source breakdown of 4,058 (not set)-landing sessions (7d 2026-08-25 to 2026-08-31):
- Pinterest organic: 2,485 (61%) -- GA4 known artifact: Pinterest app strips referrer before tag fires; sessions land as real pageviews but landing page is unattributable
- Bing organic: 802 (20%) -- remains unverified per baseline note; do not count as growth
- Yahoo organic: 103 (3%)
- Google organic: 67 (2%)
- True unassigned (source also not set): 59 (<2%)

Decision: relabel scoreboard note from "suspected bot/tag noise" to "Pinterest app + search tag misfire; ~61% are real Pinterest sessions, landing page unattributable." Bot/unverified signal is Bing organic (not set) 802 -- hold that separately per targets.json baseline note. Do not filter the full 4,058 block as noise; doing so understates real Pinterest reach by ~2,485 sessions/7d (~4%).

### DQ-2: Catalog pinning gap -- 7 /games/* pages have zero Pinterest sessions

All 15 /games/sims-4/* collection pages exist and are in the sitemap. Eight have Pinterest traffic this week. Seven have zero Pinterest sessions in the last 7 days, meaning the pinner has not queued them as direct-link pins.

Why the four working catalog pages get traffic: those pages (pregnancy-mods, female-clothes, male-clothes, body-presets) appear to receive Pinterest traffic because the pinner posted blog-post pins that link through to these pages via internal links or redirects, not because catalog-page URLs were directly pinned. Goth-cc (42) and skin-details (42) follow the same pattern. The zero-session pages have never had their URLs entered into the pinner queue.

Zero-session catalog pages (baseline 0 Pinterest sessions/7d, 2026-09-02):
1. /games/sims-4/hair-cc/ -- 1,780+ mods (largest collection, highest-demand keyword)
2. /games/sims-4/holidays-cc/ -- 926 mods (seasonal; strong Pinterest seasonal fit)
3. /games/sims-4/poses/ -- 573 mods (storytelling/screenshot audience = high Pinterest affinity)
4. /games/sims-4/clutter/ -- 148 mods
5. /games/sims-4/y2k-cc/ -- 147 mods (trend-aligned; active on Pinterest)
6. /games/sims-4/tattoos/ -- 107 mods
7. /games/sims-4/vampire-cc/ -- 57 mods

Next move (Pip, T0, 2026-09-03): add these 7 URLs to the pinner backlog queue with human-sounding descriptive titles. Measure Pinterest sessions to these pages by 2026-09-16. Keep if any page reaches >=20 Pinterest sessions/7d within 14 days of first pin.

Priority order for pinning: hair-cc (volume + demand), holidays-cc (Pinterest seasonal fit), y2k-cc (trend), poses (screenshot audience), clutter, tattoos, vampire-cc.

## Kill log (carried from the old team)

- **2026-06-24 -- Mediavine floor/CPM negotiation.** Operator pitched; Mediavine said no ("you have done everything we recommend"). Re-open only with a materially different traffic profile.
- **2026-08-16 -- GSC "quick wins" title/meta sweeps as a growth lever.** Measured value <$1/mo at current positions. Titles are hygiene (T0), not a bet.
- **2026-09-01 -- RPM as the primary growth metric.** Two months of decline on flat/rising sessions; demand-side. Guardrail only (SD-5).
