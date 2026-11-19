# Quinn — pending `.claude/agents/mhm-funnel/` rows, 2026-11-19

Edits to `.claude/` were denied in the Quinn session and in the Nova, Ops and Rio worktrees (Q43). Paste these rows and entries verbatim. Rio's rows are in `rio-pending-2026-11-19.md`. Cass's E436 row already landed on `main` in #567.

## experiments.md — new rows (insert at the top of the Active table)

| E435 | 2026-11-19 | Nova | 0 | AUDIENCE | `lib/creatorOfficialLinks.ts`: creator's own Patreon/Tumblr/TSR/site from the page mods' URLs (exact host, deny list, one identity per platform) → hero "Find X on …" row + Person `sameAs` + GA4 `creator_link_click` (#570 27a2cb5, INCONCLUSIVE → hand smoke 15/15 OK) | /creator/* organic+AI landings 7d; GSC creator-page CTR 28d; `creator_link_click` events | 503 organic+AI of 980 (11-11→11-17), 1,390/28d; GSC 47 clk / 5,939 impr (0.79%) 10-22→11-18; pages with an off-site link 23 → 445 of 799 author strings | 2026-12-03 | /creator/* organic+AI 7d ≥478 (95% guard) AND ≥1 `creator_link_click`/day AND CTR ≥0.79%; kill (`git revert`) if the guard fails two reads | | PENDING |
| E439 | 2026-11-19 | Ops | 1 | OPS | smoke-render per-page wall budget (90 s / retry 130 s via withDeadline; newPage/evaluate/close had no timeout) + 420 s run budget so the JSON always lands and reached pages are judged; ad pages first; deploy-verify smoke cap counts AWAKE seconds (host slept most of 11-17 06:47–07:58); </dev/null on every vercel call (#572 af6aff3, INCONCLUSIVE; hand smoke 15/15 pass in 72 s) | after-merge rows "smoke-render timed out … killed" | 11-17: 3 of 8 merges; pre-fix local repro stuck 400 s, no JSON | 2026-11-26 | 0 "timed out … killed" rows in 7 days of merges AND 0 rollbacks caused by a budget-abandoned page | tests 21/21 new (18 red pre-fix); own verify: host asleep 1000 s not counted, not killed, JSON graded; run budget is wall-clock (12/15 not rendered) | MORE DATA |

| E431 | 2026-11-19 | Pip | 0 | AUDIENCE | `/sitemap-mods.xml`: every `<url>` carries its thumbnail (= page og:image) as `<image:image>` + escaped `<image:title>` (`lib/seo/sitemapImage.ts`); query moved to `lib/seo/sitemapMods.ts`, paged 2,000 rows — one 6-column select was 5.61 MB and `next build` failed on Accelerate's 5 MB cap (P6009); prerender 6.97 MB (#573 bcd05aac) | GSC type=image clicks on `/mods/*` 28d + pages with image impr; guard `/mods/*` web clicks | 116 clk / 18,484 impr / 1,447 pages (10-20→11-16); web 997 clk / 5,255 pages; ceiling 5,255 × 66 impr × 0.63% ≈ 2,190/28d (1.7% of gap), floor +305 | 2026-12-19 | image clicks ≥174 AND pages ≥2,500 AND web clicks ≥95% × trend; kill <116 with coverage flat; `git revert` | | SHIPPED |
| E432 | 2026-11-19 | Pip | 0 | AUDIENCE | `/sitemap-nextjs.xml`: each of 51 hubs lists its first 12 card images (hub page's where + downloadCount/createdAt order via `collectionHubImages`), none on DB error (#573 bcd05aac) | GSC type=image clicks on `/games/*` 28d | 36 clk / 6,393 impr / 45 pages (10-20→11-16); ceiling 52 × 266 impr × 0.63% ≈ 90/28d | 2026-12-19 | ≥72; kill ≤36; `git revert` | | SHIPPED |

| E433 | 2026-11-19 | Sage | 0 (Quinn: operator veto to 11-21 — Q45 dropped unanswered, merged before the hold reached Sage) | AUDIENCE | "Browse the full Sims 4 <topic> collection" box injected by middleware.ts at the end of .entry-content on the 95 registry-companion WordPress guides not covered by functions.php (test re-derives the map from SIMS4_COLLECTIONS and parses mhm_collection_crosslink_map so no guide gets two boxes) (#574 824b335, SUPERSEDED-PASS) | /games/* organic+AI landings 28d; GSC /games/sims-4/* clicks | 5,996/28d; 337 clk / 8,844 impr (10-20→11-16); ceiling +1,500/28d (1.15% of gap) | 2026-12-17 (interim 12-03) | landings ≥6,596 AND clicks ≥371; Rio session-RPM watch on the 95 treated guides one-sided ≥95% vs 11-12→11-18 (control: 19 functions.php guides); rollback = revert #574 | | MORE DATA |

E434 was held for Sage and not used (second move stopped by Quinn); E440 unused. Both are released.

## experiments.md — graded cells

- E340 Result / Verdict: `159 sessions 11-06→11-19 (Direct 66, Organic 50, AI 42); 20/21 pages 200 + in sitemap, kiarazurk 308 → kiara-zurk (E293 fold)` / `KEEP (Nova 11-19)`
- E327 Result / Verdict: `10 sessions on the 3 URLs 11-05→11-18 (2/4/4); pending 3 → 0; 10/10 Atino00 mods isVerified; plan applied ids unrecorded` / `KEEP (Nova 11-19)`

## playbooks/quinn.md — new entry (newest at the top, after the Kill log `---`)

```
## 2026-11-19 (Thursday)
- Tried: breaker green, day line WATCH 96.6% / ramp BELOW LINE 72.5% → AUDIENCE re-weighting; 7 specialists in parallel; ids pre-held E431–E440 (0 collisions).
- Before → after: host Maintenance Sleep (pmset 09:15→09:32) stalled 5 agent streams at the 600 s watchdog (Rowan, Pip, Nova ×2, Ops) and turned 2 of the first 3 code verifies INCONCLUSIVE (smoke killed while asleep); `caffeinate -i -s -t 10800` from 09:32 → 0 further stalls. history.json on main was missing 5 measured days (11-13→11-17) only because no daily PR landed after 11-15.
- Verdict: KEEP caffeinate as a run step; the daily PR is the history backfill, so it ships every day, not only on clean days.
- Next time: start caffeinate before step 4, and hand-run smoke-render on any INCONCLUSIVE row before writing the digest.
```

## playbooks/nova.md — new entry (archive 10-18→10-23 to `archive/playbooks/nova-2026-10.md` first; 10,000 B cap)

```
## 2026-11-19 — E435 official links on creator pages (T0, #570 27a2cb5)
- Tried: derive the creator's own Patreon vanity / Tumblr blog / TSR member page / own domain from the page mods' downloadUrl+sourceUrl; hero row + Person sameAs + creator_link_click. E340 KEEP (159 ≥ 100), E327 KEEP (10 ≥ 7, pending 3→0).
- Before → after: pages with an off-site link 23 → 445 of 799 author strings with ≥5 SFW mods (tumblr 211, TSR 199, patreon 101, site 38). /creator/* organic+AI 503/7d, 1,390/28d; GSC 0.79% CTR on 5,939 impr.
- Verdict: MORE DATA (read 2026-12-03). Ceiling ≈215 sessions/28d, 0.2% of the gap.
- Next time: the author backfills are mined out (483 remaining junk authors are E370's nsfw-campaign skips) — the next creator-page lift is entity signal, not more pages. Record `applied` ids in every plan file at apply time.
```

## playbooks/sage.md — new entry (archive the 11-04 block first; file is 9,095 of 10,000 B)

```
## 2026-11-19 — E433 guide→hub crosslink box at the proxy for 95 registry guides (Tier 0, #574)
- Tried: Q45 wanted `mhm_collection_crosslinks` extended in functions.php (Tier 2, dropped 11-18). Same box, same place, via `middleware.ts` (the E429 mechanism): static Edge-safe map in `lib/seo/guideCollectionCrosslinks.ts`; test re-derives it from `SIMS4_COLLECTIONS` and parses the PHP map so the 19 PHP-covered slugs never get a second box. Hubs 28d (10-20→11-16): 5,996 organic+AI landings, 337 clk / 8,844 impr at pos 10–38; the 95 guides carry ≥20,219 organic+AI landings and linked to no hub. Rejected for E434: glasses hub (56/110 title-supported, "Derro Walls", "Boho Rugs" in top 48), poses∩romantic 64 / poses∩wedding 25 (couple-poses guide at pos 2.8–4.5 — cannibalizes), tattoos/cc/hair-cc retitles (no query >15 impr, head terms at pos 44+).
- Before → after: /games/* organic+AI landings 5,996/28d; GSC 337 clk → read 2026-12-17, interim 12-03.
- Verdict: MORE DATA (keep if ≥6,596 and ≥371; Rio RPM watch ≥95%).
- Next time: GA4 `landingPage` has no trailing slash — a FULL_REGEXP ending in `/$` returns 0 rows silently; use PARTIAL_REGEXP on the prefix. And `gh pr merge` exit 1 on `--delete-branch` is not "not merged" — read `state` before acting on a hold.
```

## Rio — new watch (from Sage)

E433 session-RPM watch: treated set = the 95 keys of `GUIDE_COLLECTION_CROSSLINKS` (`lib/seo/guideCollectionCrosslinks.ts` on `main`; GA4 `landingPage` values lack the trailing slash). Baseline 11-12→11-18, read daily through 11-26, one-sided ≥95% vs the 19 functions.php-covered guides (control).
