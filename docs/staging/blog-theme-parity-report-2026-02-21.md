# Staging Blog Theme Parity Report (2026-02-21)

## Scope
This PR tracks the live WordPress staging theme implementation for visual parity work across:
- homepage
- game hub pages (`/sims-4/`, `/stardew-valley/`, `/minecraft/`)
- category/archive/search listings
- single post layouts
- header dropdown/interaction stability
- footer consistency

## Source of Truth
- Server: `blogmusthavemodscom.bigscoots-staging.com`
- Theme file: `wp-content/themes/kadence-child/functions.php`
- Synced snapshot in repo: `staging/wordpress/kadence-child/functions.php`

## Implemented Changes (Live)
- Unified games dropdown behavior and no-gap hover continuity.
- Hero section cleanup and style normalization on homepage.
- Width parity fixes:
  - archive/search/category listing pages matched to homepage frame.
  - single post page container matched to homepage frame.
  - single content column widened (removed restrictive internal cap).
- Footer cleanup to one-line layout system.
- Category/search template centering and sidebar constraint removal.
- Game hub hero image mapping for:
  - Sims 4
  - Stardew Valley
  - Minecraft
- Homepage background normalization to remove conflicting dark/gray artifact layers.

## Operations Included
- PHP lint validation (`php -l`) after each deployment.
- WP cache/transient flush after updates.
- Browser verification with Playwright on target URLs.

## Reproducible Workflow
Use the scripts in `scripts/staging/`:
1. `pull-blog-functions.sh`
2. edit `staging/wordpress/kadence-child/functions.php`
3. `push-blog-functions.sh`

## Notes
This repository does not currently track the WordPress theme as first-class app source; this PR adds an auditable staging snapshot and deployment tooling so future UI work can be reviewed through Git PR workflow.
