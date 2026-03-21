---
phase: 07-integration-bug-fixes
plan: 01
subsystem: service-worker, css
tags: [bug-fix, service-worker, cache, css, admin]
dependency_graph:
  requires: []
  provides: [preserved-sync-image-cache, admin-stat-styling]
  affects: [sw.js, styles/main.css, src/sync.js]
tech_stack:
  added: []
  patterns: [dual-cache-exclusion-filter, cross-file-comment-coupling]
key_files:
  created: []
  modified:
    - sw.js
    - styles/main.css
    - src/sync.js (comment-only)
decisions:
  - Inline two-condition filter chosen over Array.indexOf for simplicity with exactly two caches
  - Cross-file comment coupling used to document SYNC_CACHE_NAME dependency between sw.js and sync.js
metrics:
  duration: 87s
  completed: "2026-03-21"
  tasks: 2
  files: 3
---

# Phase 7 Plan 01: SW Cache Preservation and Admin Stat CSS Summary

SW activate handler updated to preserve sync image cache across version bumps; missing .admin-stat CSS rule added for email count display in admin analytics.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix SW activate handler to preserve sync image cache | 5f26840 | sw.js, src/sync.js |
| 2 | Add missing .admin-stat CSS rule | 8f67d54 | styles/main.css |

## What Was Built

### Task 1: SW Activate Handler — Dual-Cache Preservation

The service worker activate handler previously deleted every cache key that did not match `CACHE_NAME` (the app shell cache). This meant bumping `CACHE_NAME` from `kiosk-v8` to `kiosk-v9` would silently destroy `kiosk-v3` — the sync image cache containing all 950+ product images.

Fix applied:
- Added `var SYNC_CACHE_NAME = 'kiosk-v3';` as a local constant immediately before the activate event listener in `sw.js`, with a comment `// MUST match SYNC_CACHE_NAME in src/sync.js`
- Updated the filter from `.filter(function(key) { return key !== CACHE_NAME; })` to `.filter(function(key) { return key !== CACHE_NAME && key !== SYNC_CACHE_NAME; })`
- Added cross-reference comment to `src/sync.js` line 14 (comment-only change, no logic change)

### Task 2: .admin-stat CSS Rule

The `admin.js` analytics summary section (line 549) sets `emailStat.className = 'admin-stat'` but no CSS rule existed for this class. The email count paragraph rendered unstyled.

Fix applied: Added `.admin-stat` rule in `styles/main.css` immediately after `.sync-status-warning`, using only existing CSS custom properties:
- `color: var(--color-accent)` — gold/amber brand colour
- `font-weight: var(--weight-bold)` — 700 weight
- `font-size: var(--text-body)` — body size
- `margin-top: var(--space-sm)` — small top spacing

## Deviations from Plan

None — plan executed exactly as written.

Note: `src/sync.js` was found to already contain the cross-reference comment when staged, because a parallel agent (07-02) had already applied this change. The comment was present and correct — no conflict.

## Known Stubs

None — both fixes are complete and functional with no placeholder values or deferred wiring.

## Verification Results

- `grep "SYNC_CACHE_NAME" sw.js` — returns constant declaration and filter condition
- `grep "key !== CACHE_NAME && key !== SYNC_CACHE_NAME" sw.js` — confirmed
- `grep "MUST match" src/sync.js` — comment present on line 14
- `grep -A5 ".admin-stat" styles/main.css` — all four properties present

## Self-Check: PASSED
