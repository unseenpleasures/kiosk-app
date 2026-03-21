---
phase: 04-customer-browse-experience
plan: 02
subsystem: ui
tags: [virtual-scroll, card-detail, router, idle-timer, analytics, indexeddb, pwa]

# Dependency graph
requires:
  - phase: 04-01
    provides: renderCatalogue, resetCatalogueState, initCatalogue, applyFilters in catalogue.js

provides:
  - renderCard(cardId) — full-screen detail view with large image, name, fixed pricing, NEW badge, analytics
  - renderCategory(categoryId) — pre-selects category chip and renders catalogue grid
  - Router dispatching to real functions (not stubs) for #/, #/card/:id, #/category/:id
  - initCatalogue() called in boot sequence before splash screen
  - resetCatalogueState() wired to home button click handler
  - initEmailGracePeriod() — idle timer suppressed on #/email screen

affects:
  - 05-email-capture (depends on idle timer grace period being in place)
  - 06-admin-polish (depends on analytics card_view events being logged)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Detail view redirects to #/ on unknown product (defensive guard)
    - Analytics fire-and-forget (dbAdd not awaited in UI functions)
    - Email grace period uses separate _pausedForEmail flag to avoid conflicting with admin pauses
    - renderCategory uses redirect-to-catalogue pattern (no separate screen)

key-files:
  created: []
  modified:
    - src/catalogue.js
    - styles/main.css
    - src/router.js
    - src/app.js
    - src/idle.js

key-decisions:
  - "renderCategory redirects to catalogue grid with chip pre-selected rather than maintaining a separate screen — simpler state, same UX"
  - "_pausedForEmail flag isolated from admin panel pauses — allows admin to pause/resume independently"
  - "detail-back button at top:72px (below chrome home at top:16px+48px+8px) avoids touch target overlap"

patterns-established:
  - "Pattern: Analytics fired as fire-and-forget (dbAdd not awaited) in render functions to avoid blocking UI"
  - "Pattern: Detail view guards unknown product IDs with redirect to #/ to prevent blank screens"

requirements-completed: [CAT-05, CAT-10, ANALYTICS-01]

# Metrics
duration: 2min
completed: 2026-03-21
---

# Phase 4 Plan 02: Wire Card Detail View, Router, Boot, and Idle Grace Summary

**Card detail view with analytics logging, real router dispatch replacing all catalogue/category/card stubs, initCatalogue in boot sequence, and email screen idle timer grace period**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-21T10:36:46Z
- **Completed:** 2026-03-21T10:39:08Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- renderCard(cardId) renders full-screen detail with large image, card name, fixed pricing (Standard £7 / Personalised £10), and NEW badge, then logs card_view analytics to IndexedDB
- detail-back button positioned at top:72px to avoid overlap with chrome home button (top:16px + 48px + 8px gap)
- Router ROUTES table updated to renderCatalogue (from renderCatalogueStub); prefix matches updated to renderCard and renderCategory; three stub functions removed; renderEmailStub preserved for Phase 5
- boot() now awaits initCatalogue() before showSplashScreen() — in-memory product array warmed before any screen renders
- Home button calls resetCatalogueState() to clear search/filter state on every tap
- initEmailGracePeriod() added to idle.js — hashchange listener pauses timer on #/email, resumes on navigation away using isolated _pausedForEmail flag

## Task Commits

Each task was committed atomically:

1. **Task 1: Add card detail view and renderCategory to catalogue.js with detail CSS and analytics** - `dde7291` (feat)
2. **Task 2: Wire router stubs, boot sequence, home button reset, and idle email grace period** - `26279da` (feat)

## Files Created/Modified

- `src/catalogue.js` - Added renderCard() and renderCategory() functions
- `styles/main.css` - Added .screen-card-detail, .detail-back, .detail-image-container, .detail-image, .detail-badge, .detail-title, .detail-pricing, .detail-price-line CSS
- `src/router.js` - Replaced stubs with real functions; removed renderCatalogueStub, renderCategoryStub, renderCardStub
- `src/app.js` - Added await initCatalogue() in boot(); wired resetCatalogueState() to home button
- `src/idle.js` - Added _pausedForEmail, initEmailGracePeriod(), called from initIdleTimer()

## Decisions Made

- renderCategory uses redirect-to-catalogue pattern (pre-selects chip then calls renderCatalogue) rather than a separate screen — simpler state management, no new screen type needed
- _pausedForEmail tracks email-screen pauses separately from admin panel pauses — both can coexist without one clobbering the other's state
- detail-back button at top:72px (chrome home is top:16px, 48px tall, 8px gap) — tested arithmetic matches the CSS chrome positions from context

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

- `src/router.js` `renderEmailStub` — email capture screen not yet implemented; Phase 5 will replace this. Does not block browse flow (this plan's goal).

## Next Phase Readiness

- Full browse flow is live: grid -> card detail -> back -> grid
- Router dispatches to real functions for all catalogue routes
- Analytics card_view events are being logged on every detail view open
- Email screen idle grace period in place — Phase 5 email capture can rely on it
- Phase 5 (email capture) is next — renderEmailStub in router.js is the replacement hook

---
*Phase: 04-customer-browse-experience*
*Completed: 2026-03-21*
