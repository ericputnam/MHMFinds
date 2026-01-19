# PRD Index & Tracker

This document tracks all Product Requirements Documents (PRDs) for the MHMFinds project.

## Status Legend

| Status | Meaning |
|--------|---------|
| `Not Started` | PRD created, work not begun |
| `In Progress` | Currently being implemented |
| `In Review` | Implementation complete, awaiting review |
| `Completed` | Fully implemented and deployed |
| `On Hold` | Paused for dependencies or prioritization |
| `Cancelled` | No longer needed |

## PRD Tracker

### Bugs Fixed (No PRD Required)

| Issue | Priority | Status | Fixed | Notes |
|-------|----------|--------|-------|-------|
| Facet filter cache bug | Critical | **Completed** | 2025-01-13 | Cache key missing faceted filters - selecting Hair showed only 8 mods |

### Data Quality & Cleanup

| PRD | Priority | Status | Created | Completed | Notes |
|-----|----------|--------|---------|-----------|-------|
| [Age Category Cleanup](./PRD-age-category-cleanup.md) | High | Not Started | 2025-01-13 | - | Fix misfits in age filters (e.g., adult items in Child) |
| [Author Data Cleanup](./PRD-author-data-cleanup.md) | High | Not Started | 2025-01-13 | - | Research-first approach to fix author extraction |
| [Mod Categorization](./PRD-mod-categorization.md) | High | Not Started | 2025-01-13 | - | Fix contentType and facet population (~40-60% incomplete) |

### Scraper & Data Pipeline

| PRD | Priority | Status | Created | Completed | Notes |
|-----|----------|--------|---------|-----------|-------|
| [Scraper Facet Accuracy](./PRD-scraper-facet-accuracy.md) | High | Not Started | 2025-01-13 | - | Ensure new mods get accurate facets on import |

### Features & Functionality

| PRD | Priority | Status | Created | Completed | Notes |
|-----|----------|--------|---------|-----------|-------|
| [Trending Implementation](./PRD-trending-implementation.md) | Medium | Not Started | 2025-01-13 | - | Replace hardcoded trending with dynamic data |
| [Filter Visibility UX](./PRD-filter-visibility-ux.md) | High | Not Started | 2025-01-13 | - | Make active filters more obvious |
| [Pagination Per-Page](./PRD-pagination-per-page.md) | Medium | **Completed** | 2026-01-13 | 2026-01-13 | Allow users to select 20, 50, or 100 mods per page |

### Navigation & Testing

| PRD | Priority | Status | Created | Completed | Notes |
|-----|----------|--------|---------|-----------|-------|
| [Navigation Testing](./PRD-navigation-testing.md) | Medium | Not Started | 2025-01-13 | - | Fix broken nav + add unit tests |

### Monetization Agent

See [Monetization Agent PRD Index](./monetization-agent/PRD-00-overview.md) for the full system design.

#### Core Backend (Completed)

| PRD | Priority | Status | Created | Notes |
|-----|----------|--------|---------|-------|
| [PRD-01: Database Schema](./monetization-agent/PRD-01-database-schema.md) | P0 | **Completed** | 2026-01-13 | Foundation models for metrics, opportunities, actions |
| [PRD-02: GA4 Connector](./monetization-agent/PRD-02-ga4-connector.md) | P0 | **Completed** | 2026-01-13 | Traffic and event data ingestion |
| [PRD-04: Affiliate Detection](./monetization-agent/PRD-04-affiliate-detection.md) | P1 | **Completed** | 2026-01-13 | AI-powered opportunity detection |
| [PRD-05: RPM Analyzer](./monetization-agent/PRD-05-rpm-analyzer.md) | P1 | **Completed** | 2026-01-13 | Ad performance optimization |
| [PRD-06: Revenue Forecasting](./monetization-agent/PRD-06-revenue-forecasting.md) | P1 | **Completed** | 2026-01-13 | Predictive revenue models |
| [PRD-07: Action Queue](./monetization-agent/PRD-07-action-queue.md) | P0 | **Completed** | 2026-01-13 | Human approval workflow |
| [PRD-08: Orchestrator](./monetization-agent/PRD-08-orchestrator.md) | P0 | **Completed** | 2026-01-13 | Job scheduling and coordination |

#### Admin Interface (Completed)

| PRD | Priority | Status | Created | Notes |
|-----|----------|--------|---------|-------|
| [PRD-10: Admin Navigation](./monetization-agent/PRD-10-admin-navigation.md) | P0 | **Completed** | 2026-01-14 | Add Monetization to admin sidebar, dashboard hub |
| [PRD-11: Agent Control](./monetization-agent/PRD-11-agent-control.md) | P0 | **Completed** | 2026-01-14 | Manual job triggering, live status display |
| [PRD-12: API Configuration](./monetization-agent/PRD-12-api-configuration.md) | P1 | **Completed** | 2026-01-14 | Env var status, connection testing |
| [PRD-13: Queue Management](./monetization-agent/PRD-13-queue-management.md) | P0 | **Completed** | 2026-01-14 | Individual & bulk approve/reject |
| [PRD-14: Agent History](./monetization-agent/PRD-14-agent-history.md) | P1 | **Completed** | 2026-01-14 | Run history, filtering, stats |
| [PRD-15: Mediavine MCP](./monetization-agent/PRD-15-mediavine-mcp.md) | P0 | **Completed** | 2026-01-14 | Browser automation with TOTP 2FA |
| [PRD-16: Forecasts Dashboard](./monetization-agent/PRD-16-forecasts-dashboard.md) | P1 | **Completed** | 2026-01-14 | View forecasts, accuracy tracking |

#### Agent Intelligence (NEW - Not Started)

| PRD | Priority | Status | Created | Notes |
|-----|----------|--------|---------|-------|
| [PRD-17: Objectives & Strategy](./monetization-agent/PRD-17-objectives-strategy.md) | P0 | Not Started | 2026-01-14 | Mission, KPIs, opportunity rules, seasonal calendar |
| [PRD-18: Auto-Execution Engine](./monetization-agent/PRD-18-auto-execution.md) | P1 | Not Started | 2026-01-14 | Tiered execution, safe action auto-execution |
| [PRD-19: Notifications System](./monetization-agent/PRD-19-notifications.md) | P2 | Not Started | 2026-01-14 | Slack alerts, email digests, batching |
| [PRD-20: Impact Tracking & Learning](./monetization-agent/PRD-20-impact-tracking.md) | P1 | Not Started | 2026-01-14 | Measure actual impact, learn from outcomes |

#### Deprecated/Replaced

| PRD | Priority | Status | Created | Notes |
|-----|----------|--------|---------|-------|
| [PRD-03: Mediavine Connector](./monetization-agent/PRD-03-mediavine-connector.md) | P0 | Replaced | 2026-01-13 | Replaced by PRD-15 (browser automation) |
| [PRD-09: Admin Dashboard](./monetization-agent/PRD-09-admin-dashboard.md) | P2 | Replaced | 2026-01-13 | Replaced by PRD-10 through PRD-16 |

### UI/UX Polish

| PRD | Priority | Status | Created | Completed | Notes |
|-----|----------|--------|---------|-----------|-------|
| [Search Box Focus Ring](./PRD-search-box-focus-ring.md) | Low | **Completed** | 2025-01-13 | 2025-01-13 | Added focus:ring-0 to input |
| [Hero Width Alignment](./PRD-hero-width-alignment.md) | Medium | **Completed** | 2025-01-13 | 2025-01-13 | Restructured Hero layout - title centered, search/filters full width |

---

## Summary

| Category | Total | Not Started | In Progress | Completed |
|----------|-------|-------------|-------------|-----------|
| Bugs Fixed | 1 | 0 | 0 | 1 |
| Data Quality | 3 | 3 | 0 | 0 |
| Scraper | 1 | 1 | 0 | 0 |
| Features | 3 | 2 | 0 | 1 |
| Navigation | 1 | 1 | 0 | 0 |
| UI/UX | 2 | 0 | 0 | 2 |
| **Monetization Backend** | **7** | **0** | **0** | **7** |
| **Monetization Admin UI** | **7** | **0** | **0** | **7** |
| **Monetization Intelligence** | **4** | **4** | **0** | **0** |
| **Total** | **29** | **11** | **0** | **18** |

---

## Implementation Priority Order (Recommended)

### Phase 1: Critical Fixes
1. **Filter Visibility UX** - Users confused by hidden filters
2. **Search Box Focus Ring** - Quick win, 5 min fix
3. **Hero Width Alignment** - Visual polish, 30 min fix

### Phase 2: Data Quality
4. **Mod Categorization** - 40-60% of mods missing contentType
5. **Age Category Cleanup** - Misfits causing filter issues
6. **Author Data Cleanup** - Research first, then implement

### Phase 3: Scraper Improvements
7. **Scraper Facet Accuracy** - Prevent future data issues

### Phase 4: Features
8. **Trending Implementation** - Replace hardcoded trending
9. **Navigation Testing** - Fix nav + add test coverage

---

## How to Update This Document

When starting work on a PRD:
1. Change status to `In Progress`
2. Add any relevant notes

When completing a PRD:
1. Change status to `Completed`
2. Add completion date
3. Update the summary counts

When creating a new PRD:
1. Add file to appropriate section above
2. Update summary counts
