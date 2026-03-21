---
phase: 02-data-layer-and-navigation
plan: 01
subsystem: database
tags: [indexeddb, localstorage, web-crypto, sha-256, pwa, safari, es2017]

# Dependency graph
requires:
  - phase: 01-pwa-foundation
    provides: App shell, service worker, IndexedDB kiosk-db initially opened at v1 in checkCatalogueHealth
provides:
  - IndexedDB kiosk-db v2 schema with 4 object stores (products, emails, analytics, sync_meta)
  - Promise-wrapped CRUD helpers: dbGet, dbPut, dbAdd, dbGetAll, dbCount, dbDelete, dbClear, dbGetAllByIndex
  - localStorage wrapper with 4 typed key pairs (passcode hash, event name, event date, idle timeout)
  - SHA-256 admin passcode hashing via Web Crypto API (hashPasscode, verifyPasscode)
affects:
  - 02-02 (boot coordinator will call openDB via db.js)
  - 03-sync-engine (sync.js writes products via dbPut, tracks cursor via sync_meta)
  - 04-browse-experience (catalogue reads products via dbGetAll and dbGetAllByIndex category filter)
  - 05-email-capture (email form writes via dbAdd to emails store)
  - 06-admin-panel (reads Config for event name/date, calls verifyPasscode for auth)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "openDB connection caching via module-level _db variable — prevents redundant IDB opens"
    - "onupgradeneeded with contains() guards — safe schema upgrade from any prior version"
    - "Promise-wrapping of IDB requests — consistent async interface for all callers"
    - "KEYS constant object with prefixed localStorage keys — avoids key collision"
    - "Array.from(Uint8Array).map(b => b.toString(16).padStart(2,'0')).join('') — SHA-256 hex encoding compatible with Safari 16.x (no toHex())"

key-files:
  created:
    - src/db.js
    - src/config.js
  modified: []

key-decisions:
  - "DB_VERSION = 2 bumps from Phase 1 implicit v1 to trigger onupgradeneeded for all 4 stores"
  - "contains() guards in onupgradeneeded prevent duplicate store errors on partial upgrade scenarios"
  - "getPasscodeHash returns null (not empty string) on fresh install — lets callers distinguish no-passcode from empty-passcode"
  - "dbGetAllByIndex uses IDBIndex.getAll(value) for category filter — avoids cursor iteration overhead"

patterns-established:
  - "db.js pattern: module-level _db cache + openDB() Promise + 8 CRUD helpers (all future IDB access follows this)"
  - "config.js pattern: KEYS object + typed getters/setters (all future localStorage access follows this)"

requirements-completed: [PWA-03, PWA-06]

# Metrics
duration: 2min
completed: 2026-03-21
---

# Phase 2 Plan 01: Data Layer Foundation Summary

**IndexedDB kiosk-db v2 schema with 4 object stores plus localStorage wrapper with SHA-256 passcode hashing — complete data layer foundation for all subsequent phases**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-21T08:10:00Z
- **Completed:** 2026-03-21T08:11:27Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `src/db.js` — exclusive IndexedDB gateway opening kiosk-db at version 2 with all 4 object stores (products with category+createdAt indexes, emails, analytics, sync_meta) and 8 Promise-wrapped CRUD helpers
- Created `src/config.js` — replaced Phase 1 stub with full localStorage wrapper: 4 KEYS constants, 8 typed getter/setter methods on Config object, plus standalone hashPasscode and verifyPasscode functions using Web Crypto API
- Both files use ES2017-safe syntax throughout (function keyword, var declarations, no arrow functions, no optional chaining, no nullish coalescing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create db.js — IndexedDB schema and CRUD helpers** - `5f5702c` (feat)
2. **Task 2: Create config.js — localStorage wrapper and SHA-256 hashing** - `e9b85e1` (feat)

## Files Created/Modified

- `src/db.js` — IndexedDB access module: openDB(), schema upgrade handler, 8 Promise-wrapped CRUD helpers (dbGet, dbPut, dbAdd, dbGetAll, dbCount, dbDelete, dbClear, dbGetAllByIndex)
- `src/config.js` — localStorage wrapper: KEYS object, DEFAULT_IDLE_TIMEOUT, Config object with 8 typed methods, hashPasscode(), verifyPasscode()

## Decisions Made

- DB_VERSION bumped to 2 to trigger onupgradeneeded on all existing Phase 1 installations that opened kiosk-db at implicit v1
- `contains()` guards protect against duplicate createObjectStore errors in any partial-upgrade edge case
- `getPasscodeHash()` returns `null` (not `''`) on fresh install — callers can distinguish "no passcode set" from "empty passcode", which Phase 3 admin panel uses for first-use flow
- `dbGetAllByIndex` uses `IDBIndex.getAll(value)` rather than a cursor — simpler code path, no performance difference at 950-record scale
- `Uint8Array.prototype.toHex()` explicitly avoided — not available in Safari 16.x; `Array.from(...).map(...)` pattern used instead

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `src/db.js` is ready for Plan 02 (boot coordinator) to call `openDB()` and replace the inline `checkCatalogueHealth` IDB access in `app.js`
- `src/config.js` is ready for the idle timer (`Config.getIdleTimeout()`) and admin panel (`hashPasscode`, `verifyPasscode`)
- Both modules satisfy the STATE.md architecture constraint: all IDB access goes through `db.js`, all localStorage access goes through `config.js`
- No blockers for Plan 02 execution

---
*Phase: 02-data-layer-and-navigation*
*Completed: 2026-03-21*

## Self-Check: PASSED

- FOUND: src/db.js
- FOUND: src/config.js
- FOUND: .planning/phases/02-data-layer-and-navigation/02-01-SUMMARY.md
- Commit 5f5702c (db.js) verified in git log
- Commit e9b85e1 (config.js) verified in git log
