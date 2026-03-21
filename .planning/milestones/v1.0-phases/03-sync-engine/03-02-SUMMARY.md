---
phase: 03-sync-engine
plan: 02
subsystem: ui
tags: [admin, passcode, sync, indexeddb, service-worker, pwa, vanilla-js]

# Dependency graph
requires:
  - phase: 03-01
    provides: syncAll() function with cursor pagination and onProgress callback
  - phase: 02-02
    provides: IndexedDB schema, db.js helpers, config.js, idle.js, router.js

provides:
  - Admin panel screen accessible via 7-tap hidden trigger on QR code element
  - Passcode gate with first-run setup and subsequent login (SHA-256 via Web Crypto)
  - Event name and date configuration persisted via Config (localStorage)
  - Sync trigger wired to syncAll() with live progress bar and page counter
  - Sync result display showing totals, new products, and error count
  - Sync status section reading sync_meta from IndexedDB
  - Idle timer pause on admin entry, resume on exit
  - CSS styles for passcode overlay, admin panel, buttons, progress bar, sync status
  - SW cache bumped to kiosk-v3 with sync.js and admin.js in precache list

affects:
  - phase-04-browse-experience (admin trigger pattern established on QR element)
  - phase-05-email-capture (btn-primary / btn-secondary classes available for reuse)
  - phase-06-analytics (admin panel is the host for analytics summary section)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Admin gate via hidden tap counter on persistent chrome element
    - Passcode overlay rendered into #app as sibling to screen div
    - All admin DOM built with createElement — no innerHTML for dynamic content
    - syncAll() progress callback wired to visual progress bar

key-files:
  created:
    - src/admin.js
  modified:
    - src/router.js
    - src/app.js
    - index.html
    - styles/main.css
    - sw.js

key-decisions:
  - "7-tap threshold on QR chrome element chosen as hidden trigger — inconspicuous to customers, accessible to owner via muscle memory"
  - "script load order: sync.js then admin.js then router.js — router references renderAdmin which references syncAll, defer guarantees document-order execution"
  - "catch() added to syncAll() promise chain in admin.js — plan only specified .then() but network errors throw and would leave the sync button permanently disabled"

patterns-established:
  - "Admin panel pattern: pauseIdleTimer on entry, resumeIdleTimer on every exit path (Cancel, Exit Admin)"
  - "Passcode overlay: always appended to #app, removed from DOM on success — not toggled via display"
  - "Status refresh: loadAndRenderSyncStatus called both on initial render and after sync completes"

requirements-completed: [ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04]

# Metrics
duration: 8min
completed: 2026-03-21
---

# Phase 3 Plan 02: Admin Panel Summary

**Passcode-gated admin panel with 7-tap QR trigger, event config, live sync progress bar wired to syncAll(), and IndexedDB sync status display**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-21T08:46:19Z
- **Completed:** 2026-03-21T08:54:00Z
- **Tasks:** 3 of 3 complete (Task 3 human-verify: PASSED — 951 products synced)
- **Files modified:** 6

## Accomplishments

- `src/admin.js` (383 lines): full admin panel — passcode overlay (first-run setup + login), event config with save, sync trigger with live progress bar, sync result display, sync status from IndexedDB, idle timer lifecycle
- All 5 modified files updated: router wired to renderAdmin, app.js has initAdminTrigger, index.html has correct script order, sw.js bumped to kiosk-v3, CSS has all required admin styles
- Zero ES2017 violations: no arrow functions, no const/let, no template literals across all modified files

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/admin.js** - `ba10827` (feat)
2. **Task 2: Wire admin into routing, script tags, SW cache, CSS** - `d074799` (feat)
3. **Task 3: Human verify checkpoint** - `bd81f7d` (fix) — PASSED (951 products synced)

## Files Created/Modified

- `src/admin.js` — Admin panel module: renderAdmin, showPasscodeOverlay, renderAdminPanel, loadAndRenderSyncStatus
- `src/router.js` — ROUTES table updated (#/admin → renderAdmin); renderAdminStub deleted
- `src/app.js` — initAdminTrigger() added; called in both boot paths (hasCatalogue and !hasCatalogue)
- `index.html` — sync.js and admin.js script tags added before router.js
- `sw.js` — CACHE_NAME bumped to kiosk-v3; sync.js and admin.js added to APP_SHELL_FILES
- `styles/main.css` — 249 lines added: passcode overlay, admin panel, form inputs, btn-primary, btn-secondary, btn-large, progress bar, sync result, admin-status-list
- `src/app.js` — hashchange listener added to sync-required boot path; immediate dispatch if hash already `#/admin` on load (Task 3 fix, commit bd81f7d)
- `src/sync.js` — placeholder store domain and storefront token replaced with real credentials; confirmed working (951 products synced)

## Decisions Made

- **catch() on syncAll()**: The plan specified only `.then()` on the syncAll promise. However, if syncAll throws (e.g. no network, API error before first progress), the catch was needed to re-enable the sync button and display the error. Added under Rule 2 (missing critical functionality — without it the button stays permanently disabled).
- **script load order**: sync.js before admin.js before router.js — chain of references requires this order for correct defer execution.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed admin routing unreachable from sync-required screen**
- **Found during:** Task 3 (human verification — admin panel not reachable on first install)
- **Issue:** The sync-required boot path in app.js set up the 7-tap trigger but did not add a hashchange listener or handle the case where `#/admin` was already in the URL on load. Navigating to `#/admin` from the sync-required screen did nothing.
- **Fix:** Added `window.addEventListener('hashchange', handleRoute)` and an immediate `handleRoute()` call when hash is already `#/admin` in the sync-required boot branch.
- **Files modified:** src/app.js
- **Commit:** bd81f7d

**2. [Rule 3 - Blocking] Added real Shopify credentials to sync.js**
- **Found during:** Task 3 (human verification — sync returned errors with placeholder token)
- **Issue:** sync.js had `REPLACE_WITH_STOREFRONT_TOKEN` and `TODO: confirm exact domain` placeholders. Verification required real credentials.
- **Fix:** Updated `SHOPIFY_STORE_DOMAIN` to `the-id-card-factory.myshopify.com` and `STOREFRONT_TOKEN` to the real read-only storefront token.
- **Files modified:** src/sync.js
- **Commit:** bd81f7d
- **Result:** 951 products synced successfully

**3. [Rule 2 - Missing Critical] Added .catch() handler to syncAll() promise chain**
- **Found during:** Task 1 (admin.js sync button handler)
- **Issue:** Plan specified only `.then()` on the syncAll() promise. If syncAll throws before calling onProgress (e.g. network error, API error on first fetch), the catch path was missing — the sync button would remain disabled forever.
- **Fix:** Added `.catch(function(err) { ... })` after `.then()` in sync button click handler; re-enables button, shows error message in result area.
- **Files modified:** src/admin.js
- **Verification:** Error path renders sync-result-error paragraph and re-enables button
- **Committed in:** ba10827 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 missing critical, 2 blocking)
**Impact on plan:** Essential for correct error handling — without it, a single network failure would permanently disable the sync button requiring a page reload.

## Issues Encountered

None — plan executed cleanly. Script order and passcode overlay DOM insertion required careful reading of existing code but no unexpected issues.

## Known Stubs

None — admin panel is fully wired. Sync will return errors with placeholder Shopify credentials (REPLACE_WITH_STOREFRONT_TOKEN in sync.js) but the error display path is implemented correctly.

## Next Phase Readiness

- Admin panel and sync engine complete — catalogue can be synced to device before Phase 4
- Phase 4 (browse experience) can now assume products exist in IndexedDB after operator sync
- btn-primary / btn-secondary CSS classes available for reuse in email capture (Phase 5)
- Human verification passed — 951 products synced, catalogue stub shown, passcode gate and event config confirmed working

---
*Phase: 03-sync-engine*
*Completed: 2026-03-21*
