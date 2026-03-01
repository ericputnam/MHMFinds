# PRD 7: Content Cannibalization Fix

**Created**: 2026-02-20
**Data source**: GSC search analytics (Feb 13-20, 2026) + URL Inspection API
**Priority**: High — consolidating split ranking signals is the highest-impact SEO fix remaining

---

## Problem

Multiple WordPress posts cover the same topic under slightly different slugs (often a `-2` suffix from WordPress auto-deduplication). Each page self-canonicalizes, so Google splits ranking signals between them instead of consolidating authority into one URL.

**Current state**: Every duplicate page has `<link rel="canonical" href="[itself]" />` — no cross-canonical is set. Google is forced to guess which URL to rank, and the result is weaker rankings for both.

---

## Identified Cannibalization Groups

### Group 1: Body Presets (3 competing URLs)

| URL | Clicks (7d) | Impressions (7d) | Position | Canonical |
|-----|-------------|-------------------|----------|-----------|
| `/sims-4-body-presets/` | 1 | 85 | 29.3 | self |
| `/sims-4-body-presets-2/` | 12 | 194 | 16.3 | self |
| `blog.musthavemods.com/sims-4-body-presets/` | 14 | 156 | 6.5 | musthavemods.com (correct) |

**Recommended primary**: `/sims-4-body-presets-2/` — currently winning on clicks and position.
**Action**: Set canonical on `/sims-4-body-presets/` pointing to `/sims-4-body-presets-2/`. The blog version is already deindexing (confirmed noindex Feb 20 crawl).

### Group 2: CC Clothes Packs (2 competing URLs)

| URL | Clicks (7d) | Impressions (7d) | Position | Canonical |
|-----|-------------|-------------------|----------|-----------|
| `/sims-4-cc-clothes-packs/` | 7 | 266 | 48.2 | self |
| `/sims-4-cc-clothes-packs-2025/` | 8 | 112 | 13.8 | self |

**Recommended primary**: `/sims-4-cc-clothes-packs-2025/` — much better position (14 vs 48), more clicks despite fewer impressions.
**Action**: Set canonical on `/sims-4-cc-clothes-packs/` pointing to `/sims-4-cc-clothes-packs-2025/`.

### Group 3: Goth CC (2 competing URLs)

| URL | Clicks (7d) | Impressions (7d) | Position | Canonical |
|-----|-------------|-------------------|----------|-----------|
| `/sims-4-goth-cc/` | 1 | 18 | 42 | self |
| `/sims-4-goth-cc-2/` | 1 | 45 | 26.1 | self |

**Recommended primary**: `/sims-4-goth-cc-2/` — more impressions, better position.
**Action**: Set canonical on `/sims-4-goth-cc/` pointing to `/sims-4-goth-cc-2/`.

### Group 4: Sims 4 CC Overview (2 competing URLs)

| URL | Clicks (7d) | Impressions (7d) | Position | Canonical |
|-----|-------------|-------------------|----------|-----------|
| `/sims-4-cc/` | 2 | 29 | 40.3 | self |
| `/sims-4-cc-2/` | 1 | 51 | 33.5 | self |

**Recommended primary**: `/sims-4-cc-2/` — more impressions, better position.
**Action**: Set canonical on `/sims-4-cc/` pointing to `/sims-4-cc-2/`.

### Group 5: Eyelashes CC (2 competing URLs)

| URL | Clicks (7d) | Impressions (7d) | Position | Canonical |
|-----|-------------|-------------------|----------|-----------|
| `/sims-4-eyelashes-cc/` | 0 | not in top 200 | — | self |
| `/sims-4-eyelashes-cc-2/` | 3 | 105 | 20.8 | self |

**Recommended primary**: `/sims-4-eyelashes-cc-2/` — the only one with search traction.
**Action**: Set canonical on `/sims-4-eyelashes-cc/` pointing to `/sims-4-eyelashes-cc-2/`.

### Group 6: Woohoo Mods (2 competing URLs)

| URL | Clicks (7d) | Impressions (7d) | Position | Canonical |
|-----|-------------|-------------------|----------|-----------|
| `/best-woohoo-mods-sims-4-ultimate-guide/` | 8 | 148 | 17.6 | self |
| `/15-must-have-sims-4-woohoo-mods-for-2025/` | 2 | 64 | 11.7 | self |

**Recommended primary**: `/best-woohoo-mods-sims-4-ultimate-guide/` — 4x clicks, 2x impressions.
**Action**: Set canonical on `/15-must-have-sims-4-woohoo-mods-for-2025/` pointing to `/best-woohoo-mods-sims-4-ultimate-guide/`.

---

## Implementation Approach

All fixes are WordPress/Rank Math configuration changes via SSH + WP-CLI.

### Step 1: Set Rank Math Canonical on Secondary Pages

For each secondary page, set the Rank Math canonical URL to point to the primary page:

```bash
ssh -i ~/.ssh/bigscoots_staging nginx@74.121.204.122 -p 2222

cd /home/nginx/domains/blogmusthavemodscom.bigscoots-staging.com/public

# Get post IDs for each secondary page
wp post list --post_type=post --fields=ID,post_name | grep "sims-4-body-presets$"
wp post list --post_type=post --fields=ID,post_name | grep "sims-4-cc-clothes-packs$"
wp post list --post_type=post --fields=ID,post_name | grep "sims-4-goth-cc$"
wp post list --post_type=post --fields=ID,post_name | grep "sims-4-cc$"
wp post list --post_type=post --fields=ID,post_name | grep "sims-4-eyelashes-cc$"
wp post list --post_type=post --fields=ID,post_name | grep "15-must-have-sims-4-woohoo"

# Set canonical for each secondary → primary
wp post meta update <ID> rank_math_canonical_url "https://musthavemods.com/<primary-slug>/"
```

### Step 2: Verify Canonical Tags

After setting Rank Math canonicals, verify they're being served correctly through the middleware:

```bash
curl -sL "https://musthavemods.com/<secondary-slug>/" | grep canonical
# Should show: <link rel="canonical" href="https://musthavemods.com/<primary-slug>/" />
```

### Step 3: Request Reindexing

Request reindexing in GSC web UI for all 6 secondary pages so Google picks up the new canonical tags faster.

---

## Acceptance Criteria

- [ ] `/sims-4-body-presets/` canonical → `/sims-4-body-presets-2/`
- [ ] `/sims-4-cc-clothes-packs/` canonical → `/sims-4-cc-clothes-packs-2025/`
- [ ] `/sims-4-goth-cc/` canonical → `/sims-4-goth-cc-2/`
- [ ] `/sims-4-cc/` canonical → `/sims-4-cc-2/`
- [ ] `/sims-4-eyelashes-cc/` canonical → `/sims-4-eyelashes-cc-2/`
- [ ] `/15-must-have-sims-4-woohoo-mods-for-2025/` canonical → `/best-woohoo-mods-sims-4-ultimate-guide/`
- [ ] All canonical tags verified via curl through production middleware
- [ ] Reindexing requested for all 6 secondary URLs

---

## Risks

- **Rank Math may override custom canonicals**: Rank Math sometimes auto-generates canonicals. Verify after setting that the custom canonical persists.
- **Staging vs production**: If doing on staging first, remember to replicate on production blog (`blog.musthavemods.com`) before changes take effect.
- **Content differences**: If the two pages have meaningfully different content (not just a refresh), consider whether a canonical is better than keeping both. Review content before applying.

## Out of Scope

- 301 redirects (canonical is less disruptive; can add redirects later if Google doesn't respect canonicals)
- Content merging/rewriting (separate editorial task)
- Internal link updates (low priority, can do later)
