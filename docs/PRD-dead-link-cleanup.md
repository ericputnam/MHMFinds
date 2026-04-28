# PRD: Dead-Link Catalog Cleanup

**Status:** Phase 1 (probe) complete · Phase 2+ Not Started
**Created:** 2026-04-28
**Owner:** Scraper / catalog quality
**Scope:** Detect and hide mods whose download URLs no longer resolve.

---

## Problem Statement

Spot-checking a recently-scraped article ("CAS Handclose Mod") revealed a dead Patreon link presented to users as a working download. Anecdote suggested the catalog might have many more — every dead link is a dead-end click that erodes trust in the site.

A 1,000-mod stratified random probe (script: [`scripts/probe-link-health.ts`](../scripts/probe-link-health.ts)) on 2026-04-28 sized the problem:

| Status | Count | % | Catalog-wide est. (13,692 mods) |
|---|---|---|---|
| Live | 933 | 93.3% | ~12,775 |
| Paywalled (Patreon ViewForbidden) | 12 | 1.2% | ~165 |
| **Dead** | **25** | **2.5%** | **~342** |
| Blocked (Cloudflare/CurseForge) | 29 | 2.9% | ~397 (probe limitation, not real death) |
| Unknown | 1 | 0.1% | ~14 |

**Headline:** dead rate is ~2.5%, much lower than feared. ~342 catalog-wide is a one-time cleanup, not an ongoing crisis.

A larger UX win surfaced during the probe: **135 of 1,000 mods (~13.5%) are flagged `isFree: false` but the destination URL is publicly accessible** — likely creators who released early-access posts to the public after the original Patreon window closed. Extrapolated, ~1,850 catalog mods may be mislabeled as paid when they're actually free.

---

## Probe findings — by host

| Host | Sample | Dead% | Notes |
|---|---|---|---|
| patreon.com | 447 | 2.7% | 12 api-404 (deleted posts). Paywalled is a separate, expected state. |
| thesimsresource.com | 337 | 0.3% | Very stable. |
| tumblr.com | 27 | 3.7% | Small individually but ~50 unique tumblr subdomains in the catalog. |
| brandysimswebsite.wixsite.com | 3 | **100%** | Creator deleted blog. |
| goppolsme/nolan-sims/oshinsims/c0ldglitt3r/etc. | each 1 | 100% | Likely abandoned creator accounts. |
| curseforge.com | 20 | 0% (blocked) | Probe needs CurseForge-specific strategy (Cloudflare blocks generic HEAD/GET). |

Top affected articles in the sample:
- `/sims-4-werewolf/` (2/3 dead in sample)
- `/sims-4-mermaid-cc/` (1/3)
- `/sims-4-short-hair-cc/` (1/5)
- `/black-sims-4-cc/` (1/5)
- `/sims-4-gallery-poses/` (1/5)

---

## Goals

1. **Hide dead-link mods from the catalog** without deleting rows (preserve history for the admin queue and SEO redirects).
2. **Flag mismatched `isFree`** so subscribed/free toggles match reality.
3. **Give the writer a per-article TODO list** so blog posts can be updated with replacement creators.
4. **Re-probe periodically** so death over time doesn't accumulate.

### Non-Goals

- Building a full admin review/replace UI (Phase 4 — defer until rate justifies it).
- Auto-replacing dead links with similar mods (too risky without human review).
- Probing CurseForge accurately — needs their public API. Defer.

---

## Approach (lighter-weight than original 4-phase plan)

Given the 2.5% dead rate, full schema migration + admin review queue UI is overkill. Use the existing `Mod.isVerified` flag (already gated by the catalog API) instead of adding a new `LinkStatus` enum.

### Phase 1 — Catalog-wide probe ✅ scope-only

Run `scripts/probe-link-health.ts --all` to enumerate every dead URL. Output a CSV grouped by article:

```
sourceUrl, modId, title, downloadUrl, status, detail, isFree
https://musthavemods.com/sims-4-werewolf/, ..., DEAD, api-404, true
...
```

Estimated runtime: ~2 hours wall clock. Run overnight.

### Phase 2 — Bulk-hide dead mods (no schema change)

For every row with `status=dead`:
- Set `isVerified: false` (catalog already filters on this in `app/api/mods/route.ts`).
- Add `lastScrapedNote: 'dead-link-detected:YYYY-MM-DD'` (free-form metadata field if available, or just `description` prefix).

### Phase 3 — Fix `isFree` mismatches

For every row with `status=live` but `isFree=false`:
- Spot-check ~20 to confirm the heuristic is reliable (creator likely opened the post).
- Bulk-flip `isFree: true` if the API/page shows public access.

For every row with `status=paywalled` but `isFree=true` (8 in sample):
- Already handled by the existing paywalled-Patreon backfill path.

### Phase 4 — Writer hand-off

Generate a per-article CSV that the writer can use to replace dead mods in the original blog posts. Format:

```
article_url, dead_count, total_count, dead_mod_titles
https://musthavemods.com/sims-4-werewolf/, 2, 3, "Werewolf Eyes; Eddie Munson CC Pack"
```

### Phase 5 — Periodic re-probe (recurring)

Add a quarterly cron / manual run of `probe-link-health.ts --all` so death over time doesn't accumulate silently. If the dead rate creeps above 5%, revisit the admin-queue plan.

---

## Out of Scope (deferred — Phase 4+)

- **`LinkStatus` enum + dedicated DB column.** Use `isVerified` for now.
- **Admin review UI** at `/admin/dead-links` with replace-URL form. Defer until manual SQL is too painful.
- **Scrape-time link checking** for new mods. The live scraper is already fast; adding probes per mod would 5–10× the runtime. Better to catch deaths in the periodic re-probe.
- **CurseForge-specific probe** using their public API. Roughly 20% of the catalog is CurseForge; a Cloudflare-aware probe is a separate small project.

---

## Acceptance Criteria

- [ ] `--all` probe has run and produced a CSV listing all dead mods (~342 expected).
- [ ] All dead mods have `isVerified: false` and are no longer visible in the catalog.
- [ ] `isFree` mismatches (paywalled-but-free, live-but-paid) have been reviewed and fixed.
- [ ] Writer has a per-article TODO list grouped by `sourceUrl`.
- [ ] Quarterly re-probe is scheduled (manual reminder or CronCreate).

---

## Risks

| Risk | Mitigation |
|---|---|
| Probe gets rate-limited mid-`--all` run | Per-host throttle is already 1s; cookie-auth not needed. Resume by re-running (idempotent — script just reads). |
| Hiding `isVerified=false` breaks existing user-facing collection pages | The catalog API at `app/api/mods/route.ts` already filters on `isVerified: true` — toggling the flag is a no-op for already-hidden flows. |
| Live-but-paid bulk flip is too aggressive | Spot-check 20 random rows manually before bulk update. If <90% are correctly free, defer the flip and ticket per-row review. |
| Patreon "paywalled" reads as "dead" later | Paywalled is a separate status — keep the extracted `isPaywalled` signal authoritative. Tier-2 cookie auth (PRD-paywalled-patreon-isfree.md R4) recovers paywalled author info. |
| CurseForge blocked in probe → undercount | Don't extrapolate the dead rate to CurseForge mods until a CF-specific probe exists. |

---

## Implementation Notes

- **Why not a `LinkStatus` enum?** Schema migrations have a cost (rebuild types, refactor consumers, run migration in prod). For a one-time 342-row cleanup, a column + admin UI is overkill. `isVerified` already exists, already gates the catalog, and is what the existing infrastructure expects.
- **Why a stratified random sample for the probe?** With 13,692 mods and per-host throttling, `--all` is ~2 hrs. The 1,000-mod sample took 7.5 min and is statistically sufficient (~3% margin on the largest host). Use `--all` only when committing to the cleanup.
- **Patreon "paywalled" vs "dead":** `code_name: "ViewForbidden"` (HTTP 403) means the post + creator both exist; the user lacks subscription. Hiding paywalled mods would lose value for users who DO subscribe to that creator. Treat as a separate status.
- **Why defer the admin UI?** ~342 dead mods is one bulk SQL update + one writer hand-off CSV. Building a UI adds 1–2 days of work to save 30 min of SQL. Wait until the rate justifies it.
