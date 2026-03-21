---
phase: 03-sync-engine
plan: 01
subsystem: api
tags: [shopify, storefront-api, graphql, indexeddb, cache-api, sync, pagination, cursor]

# Dependency graph
requires:
  - phase: 02-data-layer-and-navigation
    provides: dbGet, dbPut, openDB — IndexedDB CRUD helpers used for product upsert and cursor checkpointing

provides:
  - syncAll(onProgress) — full Shopify catalogue sync with cursor pagination, IndexedDB upsert, Cache API image caching, and progress callbacks
  - src/sync.js — exclusive network access module for the kiosk PWA

affects:
  - 03-sync-engine (plan 02 — admin.js wires syncAll to the UI)
  - 04-customer-browse (depends on products being populated in IndexedDB by sync)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Cursor-based GraphQL pagination via Shopify Storefront API 2026-01
    - Sequential image caching via Cache API to prevent memory pressure on A9X
    - Cursor checkpointing to sync_meta after every page for failure recovery
    - Upsert-only product writes — never dbClear() (SYNC-04 correctness requirement)
    - Promise chain reduce() pattern for sequential async iteration

key-files:
  created:
    - src/sync.js
  modified: []

key-decisions:
  - "Shopify Storefront API version confirmed as 2026-01 (not 2024-07 from planning) — use /api/2026-01/graphql.json endpoint"
  - "PRODUCTS_PER_PAGE = 250 — maximum allowed by Shopify; 4 pages for 950+ products"
  - "cacheImagesSequential uses reduce() chain pattern — prevents parallel image fetch memory pressure on A9X"
  - "syncAll .catch() preserves cursor checkpoint on failure — next call resumes from last successful page"
  - "SHOPIFY_STORE_DOMAIN and STOREFRONT_TOKEN left as TODO placeholders — owner must supply before first sync"

patterns-established:
  - "Pattern 1: fetchProductPage — POST to Shopify GraphQL with string concatenation URL (no template literals)"
  - "Pattern 2: cacheImagesSequential — urls.reduce() for sequential cache writes, errors array mutated in-place"
  - "Pattern 3: Resume detection — dbGet('sync_meta', 'currentCursor') at start of syncAll to detect interrupted sync"
  - "Pattern 4: Checkpoint pair — currentCursor + pagesComplete written to sync_meta after every page"
  - "Pattern 5: Stats object — { total, newProducts, errors } on success; adds { aborted, abortReason } on failure"

requirements-completed: [SYNC-01, SYNC-02, SYNC-03, SYNC-04]

# Metrics
duration: 2min
completed: 2026-03-21
---

# Phase 3 Plan 1: Sync Engine — Core Sync Module Summary

**Shopify Storefront API sync engine using cursor-based GraphQL pagination, sequential Cache API image caching, and per-page cursor checkpointing for failure recovery — all in ES2017 vanilla JS**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-21T08:42:21Z
- **Completed:** 2026-03-21T08:43:25Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments

- Created `src/sync.js` as the exclusive network access module (architecture constraint enforced)
- Implemented `syncAll(onProgress)` with full cursor-based Shopify GraphQL pagination (250 products/page, 4-5 pages for 950+ products)
- Implemented `cacheImagesSequential` using `reduce()` chain for A9X-safe sequential image caching
- Cursor checkpointed to `sync_meta` after every page — interrupted sync resumes from last saved page
- Products upserted with `dbGet`/`dbPut` — catalogue remains fully browsable throughout sync (SYNC-04)
- Progress callback fires per page with `{ page, products, newProducts }` for admin panel UI (SYNC-02)
- Stats object returned on both success and failure with error list (SYNC-03)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/sync.js — Shopify sync engine** - `f374a87` (feat)

**Plan metadata:** (pending — docs commit below)

## Files Created/Modified

- `src/sync.js` — Shopify sync engine: fetchProductPage, cacheImagesSequential, syncAll; exports syncAll for Plan 02 (admin panel) to wire to UI

## Decisions Made

- Shopify Storefront API version is 2026-01 (confirmed in RESEARCH.md — up from 2024-07 assumed during planning). Endpoint uses `/api/2026-01/graphql.json`.
- `SHOPIFY_STORE_DOMAIN` and `STOREFRONT_TOKEN` left as placeholder constants — owner must supply actual values before first live sync.
- `cacheImagesSequential` uses `urls.reduce()` chain — each image fetches and caches before the next begins. Prevents memory pressure on A9X chip.
- `syncAll` `.catch()` does NOT clear `currentCursor` — the checkpoint is intentionally preserved on failure so the next `syncAll()` call resumes from the last completed page.
- `dbPut('sync_meta', { key: 'currentCursor', value: null })` only called on full sync completion — this is the signal that no resume is needed.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `SHOPIFY_STORE_DOMAIN = 'theidcardfactory.myshopify.com'` — domain is a reasonable assumption from PROJECT.md context, but has a `// TODO: confirm exact domain` comment. No live sync can occur until confirmed.
- `STOREFRONT_TOKEN = 'REPLACE_WITH_STOREFRONT_TOKEN'` — explicit placeholder. Owner must replace with their read-only Storefront API token before syncing. Plan 02 (admin panel) may surface this as a setup requirement.

These stubs intentionally block live API calls until the owner supplies credentials. They do not prevent the plan's goal (creating the sync engine module) — Plan 02 wires the UI and Plan 02's admin panel can surface the token setup requirement.

## Issues Encountered

None.

## User Setup Required

Before the sync engine can connect to Shopify, the owner must:

1. Confirm the exact `.myshopify.com` domain (update `SHOPIFY_STORE_DOMAIN` in `src/sync.js`)
2. Obtain a read-only Storefront API access token from their Shopify admin → Sales Channels → Headless
3. Replace `REPLACE_WITH_STOREFRONT_TOKEN` in `src/sync.js` with the real token

The token is read-only and public-safe — hardcoding in client-side JS is Shopify's intended use pattern for the Storefront API.

## Next Phase Readiness

- `src/sync.js` exports `syncAll(onProgress)` ready for Plan 02 (admin.js) to call
- `sync_meta` IndexedDB keys are defined: `currentCursor`, `pagesComplete`, `lastSyncAt`, `productCount`
- Product schema written to `products` store matches Phase 4 (browse) requirements: `id, title, handle, category, imageUrl, tags, createdAt, updatedAt`
- Blocker: owner must supply Shopify credentials before first live sync test

---
*Phase: 03-sync-engine*
*Completed: 2026-03-21*
