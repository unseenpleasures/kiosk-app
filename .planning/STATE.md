---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: Completed 02-01-PLAN.md — db.js and config.js data layer complete
last_updated: "2026-03-21T08:12:39.604Z"
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 4
  completed_plans: 3
---

# Project State: ID Card Factory — Event Kiosk Catalogue App

## Project Reference

**Core Value:** Customers can browse and discover ID cards with zero friction — fast, visual, and fully offline — while the business captures emails and analytics data that persist across every event.
**Current Focus:** Phase 02 — data-layer-and-navigation

---

## Current Position

Phase: 02 (data-layer-and-navigation) — EXECUTING
Plan: 2 of 2

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

- **Phase 3**: Verify current Shopify Storefront API version at `https://shopify.dev/docs/api/storefront` before writing any sync code (research used 2024-07)
- **Phase 1**: Validate `skipWaiting` + `clients.claim` + force-reload SW pattern on the actual A9X device early
- **Phase 4**: Verify `content-visibility: auto` support on iPadOS 16 Safari before relying on it for scroll performance

### Open TODOs

- [ ] Verify Shopify Storefront API stable version before Phase 3
- [ ] Validate SW activation pattern on target A9X device in Phase 1
- [ ] Check `content-visibility: auto` on iPadOS 16 (caniuse / WebKit release notes) before Phase 4
- [ ] Confirm 7-day eviction window behaviour for installed (not in-browser) PWA on iPadOS 16.4+

---

## Session Continuity

**Last session:** 2026-03-21T08:12:39.599Z
**Stopped at:** Completed 02-01-PLAN.md — db.js and config.js data layer complete
**Next action:** Phase 1 verification, then proceed to Phase 2 (Data Layer and Navigation)

### To Resume Work

1. Read this STATE.md for current position and context
2. Read `.planning/ROADMAP.md` for Phase 2 details
3. Execute Phase 2 plans

---
*STATE.md created: 2026-03-21*
*Last updated: 2026-03-21 after roadmap creation*
