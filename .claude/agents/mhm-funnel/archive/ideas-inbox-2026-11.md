# Ideas inbox — archive 2026-11

Lines moved verbatim from `../ideas-inbox.md` when done or closed. Each carries the date and reason it left.

## Done / closed 2026-11-01 (Quinn)

- [ ] [nova] main red since #421 (E304, 5c69ff09): `__tests__/integration/api/approval.test.ts` › "should use all creator submission fields when creating mod" fails on origin/main (found by Sage 10-31, not widened into #423). Fix first thing 11-01 before the E304 apply. — Quinn 10-31
  — done 11-01: Nova #427 594d30a2 (test asserts the shared builder's row; main green)
- [ ] [pip] (Rowan, 2026-10-31) Catalog pin for `https://musthavemods.com/games/sims-4/christmas-cc/` (E307, live 10-31): writer's Christmas / Holiday Sims 4 board, cover = one of the three christmas-cc entries in `lib/collectionCovers.ts`, title "Sims 4 Christmas CC — 260+ trees, decor and outfits in one place". Pip's one SD-10 --apply for 10-31 was spent on the top-up; queue it 11-01 (E291 wedding-cc precedent).
  — done 11-01: Pip E309 (#430 911723d0, apply ledger d184af82)
- [ ] [cass] Cadence copy still says weekly after E184 moved to biweekly: components/HomeCapture.tsx:44-45 ("One email a week"), app/games/[game]/[topic]/CollectionPageClient.tsx:263/265, app/creator/page.tsx:207/209, app/creator/[slug]/CreatorPageClient.tsx:229/232, components/launcher/LauncherHero.tsx:40. Copy-only T0 fix (E305 corrected the /go and /mods opt-in). — Cass 10-31
  — done 11-01: Cass E314 (#429 4dd4ccce + guard test)
- [ ] [ops] Ship protocol says `timeout 1500 …deploy-verify.sh`; macOS has no `timeout` (exit 127 on 10-31). Use `perl -e 'alarm(shift); exec(@ARGV)' 1500 …` or rely on E308's internal caps. — Ops 10-31
  — done 11-01: ship protocol in the dispatch prompt now uses the perl alarm; E308 caps smoke at 600 s internally
- [ ] [ops] (Rowan, 2026-10-31) `deploy-verify.sh`'s smoke set still does not render any `/games/sims-4/<slug>/` route; E307 was verified by hand-curl after PASS. Add one registry-driven collection URL (newest entry) to `smoke-render.ts`.
  — closed 11-01 with reason: `smoke-render.ts` has rendered a registry `collection` page since 10-25 (line 146; hand run 11-01 rendered /games/sims-4/decor-cc/ in 36 s) — the gap was the 600 s cap killing the run before it reached it, see the new [ops] line

## Done / closed / parked 2026-11-01, second pass (Quinn)

- [ ] [rio] 10-28 (was 10-24): wire the ex-segment ratio into the guardrail `red-traffic` leg iff `guardrail-agreement-tracker.ts` prints WIRE (7/7 mornings within ±3 pts; E241 — 10-21 printed HOLD: MV +4.7% vs GA4 +9.4% = 4.7 pt on the day the segment was 11.4%, so 10-24 is HOLD by construction; WIRE needs 10-22→10-28 all firing and agreeing). Two-line change + one test. 10-23 tracker: HOLD, 6/7 mornings present, 10-22 (1.2 pt) and 10-23 (2.0 pt) agree; WIRE on 10-28 needs 10-24→10-28 all firing and agreeing. — Rio 10-17/10-21/10-23
  — done 11-01: tracker printed WIRE 7/7 (E315 verdict); the wiring PR is E315's code leg, Tier 1, next run — tracked in experiments.md, not here
- [ ] [pip] 37 of 63 rows in the top-up pool carry blog.musthavemods.com Post URLs (a 301 since 09-28, #208), so re-dated pins go out pointing at a redirect. Rewriting Post URL blog.*→apex on Pip's own pool rows (never writer rows) is outside the standing re-date approval — propose as T1 after the E223 read, with a GA4 before/after on landing host. — Pip 10-17
  — closed 11-01: Pip 10-30 measured it (136 of 1,000 sampled; `pin-runway-topup.py` folds hosts) — moves nothing, do not re-pitch
- [ ] [rowan] E235 follow-ons: farmhouse-cc 8/17 (6 residential); next posts `/sims-4-cc-furniture/` 7/24, `/sims-4-nose-presets/` 7/25; clutter `expectedCount` 148 vs 219 live; gym lots stored `gym` on /sims-4-fitness-clutter-cc/ (Town Gym, LA Fitness Gym) are not a facet any page uses. — Rowan 10-18
  — parked 11-01 (open, not done): Rowan pulls it back when a traffic page needs it
- [ ] [pip→ops] `queue-posted-14d` runway fallback counts ghost flips: 10-17 had 34 queue-posted rows vs 7 Pinterest pins (27 rows of a republished 2025 post flipped `Is Posted` with no pin, E237). Fallback reads 14.0/day vs pinterest-14d 10.29 over 10-05→10-19; subtract per-date ghost rows (`pin-queue-day-trace.py`) before dividing when the API sample is truncated. — Pip 10-19
  — parked 11-01 (open, not done): re-file with the next truncated-API morning

## Parked 2026-11-01 evening (Quinn) — still open, verbatim
- [ ] [nova→pip/rowan] (2026-10-31) EA release calendar: no Expansion/Game/Stuff pack is scheduled for November 2026 (EA ended the pack lines; Marketplace Kits/Maker Sets only, last kit Mean Girls Capsule 2026-08-27). Nothing to pre-build; watch for kit drops and react same-week.
- [ ] [sage] AI-leg hub thesis: hubs earn AI landings without Google demand (28d AI vs Google organic: cc 26/1, build-cc 25/2, skin-details 44/30, kids-cc 13/3). Pick the next hub by grid cleanliness (top-48 on-type), not GSC impressions; needs an OFF_TYPE_RE family added and measured first. — Sage 10-23

## Done 2026-11-04 (Rowan, E328) — verbatim
- [ ] [nova→rowan] 11-01: hand-audit the 7 Atino00 mods — cmvxxhtex0001oxx87u4lisos "Elegant Dark Hair Victorian Lady Portraits" resolved to hair (it is a wall portrait → decor or NULL; pin in scripts/lib/hand-audited-content-types.ts); 4 are NULL: cmvxxhtu80003oxx890xvoc1j (statue collection), cmvxxhu0u0005oxx8259gjr5b, cmvxxhu7r0007oxx89bvki8fk (doll sets), cmvxxhul0000boxx8n9vq98dr (boho floor). T0. — Nova 11-01
