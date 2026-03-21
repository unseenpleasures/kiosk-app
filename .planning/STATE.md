---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: Phase 03 complete — admin panel verified, 951 products synced, ready for Phase 4
last_updated: "2026-03-21T10:00:41.103Z"
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 6
  completed_plans: 6
---

# Project State: ID Card Factory — Event Kiosk Catalogue App

## Project Reference

**Core Value:** Customers can browse and discover ID cards with zero friction — fast, visual, and fully offline — while the business captures emails and analytics data that persist across every event.
**Current Focus:** Phase 03 — sync-engine

---

## Current Position

Phase: 4
Plan: Not started

## Phase Summary

| Phase | Name | Status |
|-------|------|--------|
| 1 | PWA Foundation | Complete |
| 2 | Data Layer and Navigation | Not started |
| 3 | Sync Engine | Not started |
| 4 | Customer Browse Experience | Not started |
| 5 | Email Capture and Export | Not started |
| 6 | Admin Polish and Analytics | Not started |

---

## Performance Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Home screen load (cache, A9X) | < 2 seconds | — |
| Search results | < 300ms | — |
| Category filter | < 100ms | — |
| Max DOM card nodes (virtual scroll) | ~80 | — |

---
| Phase 01 P02 | 2 | 2 tasks | 3 files |
| Phase 02 P01 | 2 | 2 tasks | 2 files |
| Phase 02 P02 | 3 | 2 tasks | 6 files |
| Phase 03-sync-engine P01 | 2 | 1 tasks | 1 files |
| Phase 03 P02 | 8 | 2 tasks | 6 files |

## Accumulated Context

### Key Decisions Made

| Decision | Rationale | Phase |
|----------|-----------|-------|
| 6-phase structure | Derived from dependency graph: infrastructure before features, sync before browse, email/analytics as discrete concerns | Planning |
| PWA-03 (image/product storage) assigned to Phase 2 | The storage schema for product data must exist before Phase 3 sync can write to it | Planning |
| Email capture (Phase 5) depends on Phase 2, not Phase 4 | Email form only needs the data layer and inactivity timer — it is independent of the catalogue browse implementation | Planning |
| ADMIN-05/06 and ANALYTICS-04/05 deferred to Phase 6 | Adjustable timer, passcode change, and analytics summary all depend on data and features built in Phases 3-5 | Planning |
| Node.js PNG encoder used for icon/splash generation | Python not available in execution environment; pure Node.js zlib/deflate encoder generates all PNG assets with no external deps | Phase 01 P01 |
| Inter woff2 is a variable font | Google Fonts serves same file for weight 400 and 700; separate @font-face declarations with distinct font-weight values correctly select each weight at render time | Phase 01 P01 |
| function keyword throughout sw.js (no arrow functions) | Maximum Safari SW compatibility on A9X hardware — conservative ES2017 safety measure | Phase 01 P02 |
| controllerchange reload guard uses controllerChanging boolean | Prevents infinite reload loops when controllerchange fires multiple times in iPadOS standalone mode | Phase 01 P02 |
| onupgradeneeded resolves false for both fresh install and post-eviction states | Covers Safari 7-day silent eviction — same handling regardless of whether DB never existed or was evicted | Phase 01 P02 |
| Shopify Storefront API version confirmed as 2026-01 | Research verified current stable version; endpoint updated from 2024-07 assumption during planning | Phase 03 P01 |
| cacheImagesSequential uses reduce() chain for sequential image caching | Prevents parallel image fetch memory pressure on A9X chip; each image fetches/caches before next begins | Phase 03 P01 |
| syncAll .catch() preserves cursor checkpoint on failure | Enables resume from last completed page — cursor cleared only on full sync success | Phase 03 P01 |
| 7-tap hidden trigger on QR chrome element opens admin | Inconspicuous to customers, accessible to owner via muscle memory — no visible admin button needed | Phase 03 P02 |
| catch() added to syncAll() promise in admin.js | Without it, any network error before first onProgress call leaves sync button permanently disabled | Phase 03 P02 |

### Architecture Constraints (must carry forward)

- Virtual scrolling mandatory from Phase 4 day one — max ~80 DOM nodes, not retrofittable
- Images go in Cache API (not IndexedDB); IndexedDB stores product metadata and image URL keys only
- `db.js` is the only component that touches IndexedDB — views never open IDB transactions directly
- `config.js` is the only component that touches localStorage
- `sync.js` is the only component that makes network requests
- Hash-based routing: `#/`, `#/category/:id`, `#/card/:id`, `#/email`, `#/admin`
- In-memory product array warmed at startup for all search/filter operations
- ES2017 is the safe upper bound for JS syntax on A9X/Safari 16.x
- No frameworks, no build tools, no CDN dependencies — must run directly from filesystem

### Critical Risks

| Risk | Mitigation | Phase |
|------|------------|-------|
| Safari storage eviction (IndexedDB/Cache/SW silently deleted after ~7 days) | Boot health check before any catalogue is shown (PWA-04); operator workflow: export before storage | Phase 1 |
| SW not updating on iPadOS standalone mode | `skipWaiting()` + `clients.claim()` + `controllerchange` force-reload; SW version in admin | Phase 1 |
| A9X DOM performance collapse with 950+ cards | Virtual scroll from Phase 4 day one; `content-visibility: auto`; `contain: strict` | Phase 4 |
| Shopify sync cursor loss on failure | Persist cursor to IndexedDB after every page; upsert semantics | Phase 3 |
| GDPR pre-ticked checkbox invalidity | Checkbox unchecked by default, enforced in JS, submit blocked until checked | Phase 5 |

### Research Flags for Implementation

- **Phase 3**: ~~Verify current Shopify Storefront API version~~ — Resolved: 2026-01 confirmed in RESEARCH.md (was 2024-07 in planning)
- **Phase 1**: Validate `skipWaiting` + `clients.claim` + force-reload SW pattern on the actual A9X device early
- **Phase 4**: Verify `content-visibility: auto` support on iPadOS 16 Safari before relying on it for scroll performance

### Open TODOs

- [x] Verify Shopify Storefront API stable version before Phase 3 — confirmed 2026-01 in Phase 3 RESEARCH.md
- [ ] Validate SW activation pattern on target A9X device in Phase 1
- [ ] Check `content-visibility: auto` on iPadOS 16 (caniuse / WebKit release notes) before Phase 4
- [ ] Confirm 7-day eviction window behaviour for installed (not in-browser) PWA on iPadOS 16.4+

---

## Session Continuity

**Last session:** 2026-03-21T09:56:22.174Z
**Stopped at:** Phase 03 complete — admin panel verified, 951 products synced, ready for Phase 4
**Next action:** Execute Phase 4 (Customer Browse Experience) — virtual-scrolled catalogue grid, search, filter, card detail, analytics logging

### To Resume Work

1. Run `gsd:execute-phase` for Phase 4 (customer browse experience)

---
*STATE.md created: 2026-03-21*
*Last updated: 2026-03-21 after roadmap creation*
