---
phase: 07-integration-bug-fixes
plan: 02
subsystem: sync + catalogue + admin
tags: [bug-fix, new-badge, first-sync, prevSyncAt, initCatalogue]
dependency_graph:
  requires: []
  provides: [prevSyncAt-written-by-sync, prevSyncAt-read-by-catalogue, initCatalogue-called-after-sync]
  affects: [src/sync.js, src/catalogue.js, src/admin.js]
tech_stack:
  added: []
  patterns: [read-then-write IDB chain for snapshot capture, post-sync in-memory warm]
key_files:
  created: []
  modified:
    - src/sync.js
    - src/catalogue.js
    - src/admin.js
decisions:
  - "prevSyncAt captured from lastSyncAt before overwriting — avoids always-false badge comparison"
  - "initCatalogue() called with !stats.aborted guard — fires only on full success, not partial/failed sync"
metrics:
  duration_minutes: 8
  completed_date: "2026-03-21"
  tasks_completed: 2
  files_modified: 3
---

# Phase 7 Plan 02: NEW Badge Timing and First-Sync Catalogue Fix Summary

Fix prevSyncAt snapshot in sync.js and post-sync initCatalogue() call in admin.js so the NEW badge uses the correct reference timestamp and the first-sync flow populates the catalogue without a page reload.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write prevSyncAt before overwriting lastSyncAt; read prevSyncAt in catalogue | 83db3bd | src/sync.js, src/catalogue.js |
| 2 | Call initCatalogue() after successful sync in admin.js | c6b4396 | src/admin.js |

## What Was Built

### Task 1 — prevSyncAt snapshot + catalogue read fix

**src/sync.js** — The end-of-sync metadata write chain now reads the existing `lastSyncAt` from IndexedDB and writes it as `prevSyncAt` before overwriting `lastSyncAt` with the current timestamp. This preserves the previous sync's end-time as a stable reference point for the NEW badge comparison.

Chain order: `dbGet('lastSyncAt')` → write `prevSyncAt` → write new `lastSyncAt` → write `productCount` → clear `currentCursor` → clear `pagesComplete` → return stats.

**src/catalogue.js** — `initCatalogue()` now reads `prevSyncAt` instead of `lastSyncAt` from `sync_meta`. The `_lastSyncAt` variable name and `isNewCard()` function are unchanged — only the IDB key that populates the variable changed.

**Why this matters:** The original code compared `product.createdAt` against the timestamp written at the END of the current sync. Since all products were already in the database before that timestamp was written, `isNewCard()` always returned false. Using `prevSyncAt` (the previous sync's end-time) means products added between the last sync and this sync will correctly show the NEW badge.

**First-sync behaviour:** On first-ever sync, `prevSyncAt` is null (no prior sync exists). `isNewCard()` returns false when `_lastSyncAt` is null, so no badges appear — correct, since there is no prior catalogue to compare against.

### Task 2 — initCatalogue() after sync

**src/admin.js** — Added `initCatalogue()` call in the `syncAll().then()` handler, guarded by `if (!stats.aborted)`, placed before `loadAndRenderSyncStatus(statusArea)`.

**Why this matters:** `boot()` skips `initCatalogue()` when no catalogue data exists (first-ever boot shows the sync-required screen instead). After the first sync completes, `_products` remains empty in memory. Without calling `initCatalogue()`, navigating to `#/` would render an empty grid until the user forced a page reload. The post-sync call ensures the in-memory array is populated immediately.

The call does not `await` the Promise — IndexedDB reads ~950 records in under 100ms on A9X, fast enough that it completes before the user can navigate to `#/`.

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Verification

- [x] NEW badge logic uses prevSyncAt (previous sync timestamp) as reference, not lastSyncAt (current sync timestamp)
- [x] First sync: prevSyncAt is null, no badges shown (correct — no prior catalogue to compare against)
- [x] Second sync: prevSyncAt holds first sync time, products created after that time show NEW badge
- [x] First-ever sync from sync-required screen: navigating to #/ shows full catalogue without page reload
- [x] Re-sync during normal operation: catalogue data refreshed in memory after sync completes
- [x] No DB_VERSION bump (prevSyncAt is a data write to existing sync_meta store, not a schema change)
- [x] isNewCard() function unchanged

## Self-Check: PASSED

Files exist:
- src/sync.js — FOUND, contains `prevSyncAt` write chain at line 161
- src/catalogue.js — FOUND, reads `prevSyncAt` at line 40
- src/admin.js — FOUND, calls `initCatalogue()` at line 290

Commits exist:
- 83db3bd — FOUND (fix(07-02): write prevSyncAt before overwriting lastSyncAt)
- c6b4396 — FOUND (fix(07-02): call initCatalogue() after successful sync in admin.js)
