# Phase 7: Integration Bug Fixes — Research

**Researched:** 2026-03-21
**Domain:** Vanilla JS PWA — Service Worker cache lifecycle, IndexedDB sync_meta schema, in-memory catalogue initialisation, CSS class definition
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAT-06 | Cards added since the previous sync are badged "NEW" | NEW badge logic in `catalogue.js:isNewCard()` uses wrong reference timestamp; fix requires storing `prevSyncAt` before overwriting `lastSyncAt` in `sync.js`, then reading it in `catalogue.js` |
| PWA-03 | All product JSON and optimised images are downloaded to device during sync; app functions fully offline | SW activate handler deletes `kiosk-v3` (image cache) on every version bump; fix requires adding `SYNC_CACHE_NAME` to the SW exclusion list |
| SYNC-04 | Previous cached catalogue remains fully usable if sync fails or is interrupted | Same root cause as PWA-03 — image cache is vulnerable to SW cleanup; fix is identical |
</phase_requirements>

---

## Summary

Phase 7 closes four cross-phase integration defects identified in the v1.0 milestone audit. All four bugs are fully diagnosed in the audit report; no exploratory investigation is needed. The fixes are surgical one-to-three-line edits to four existing files: `sw.js`, `src/sync.js`, `src/app.js`, and `styles/main.css`.

The most severe bugs are the cache name mismatch (destroys all product images on the next SW version bump) and the first-sync empty catalogue (catalogue appears blank after initial sync until the page is manually reloaded). The NEW badge timing bug means the badge never fires on any completed sync. The missing CSS rule is cosmetic but causes an unstyled stat element in the admin analytics panel.

No new dependencies, no schema migrations, no new stores, and no new files are needed. All fixes stay within the existing ES2017 / no-framework constraints.

**Primary recommendation:** Fix all four defects as four isolated tasks. Each task touches exactly one file and has a narrow, verifiable acceptance criterion.

---

## Bug Inventory

### Bug 1: Cache Name Mismatch (HIGH severity)
**Requirements:** PWA-03, SYNC-04
**Files:** `sw.js` line 5, `src/sync.js` line 14

**Root cause (verified by reading both files):**

`src/sync.js` stores product images in a named cache:
```javascript
var SYNC_CACHE_NAME = 'kiosk-v3';
```

`sw.js` activate handler deletes every cache that does not match `CACHE_NAME`:
```javascript
var CACHE_NAME = 'kiosk-v8';
// ...
keys.filter(function(key) { return key !== CACHE_NAME; })
    .map(function(key) { return caches.delete(key); })
```

On the next SW version bump (when `CACHE_NAME` increments to `kiosk-v9`), the activate handler will see `kiosk-v3` as a non-matching key and silently delete all cached product images.

**Fix strategy:** The cleanest fix is to add `SYNC_CACHE_NAME` to the activate exclusion list without renaming either constant — renaming `SYNC_CACHE_NAME` to match `CACHE_NAME` would cause the SW to evict images on every activate (wrong), and mixing images into the app shell cache creates a cache management problem. The correct model is: keep separate named caches, and teach the activate handler to preserve both.

```javascript
// sw.js — updated activate handler
self.addEventListener('activate', function(event) {
  var SYNC_CACHE_NAME = 'kiosk-v3';  // must match sync.js constant
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) {
            return key !== CACHE_NAME && key !== SYNC_CACHE_NAME;
          })
          .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});
```

**Important:** `SYNC_CACHE_NAME` must be defined inside `sw.js` as a local constant that mirrors the value in `sync.js`. There is no module system in this codebase — the service worker and the main thread are separate scopes. Keeping the literal value in sync between the two files is the only coupling point. A comment in both files documenting this dependency is appropriate.

---

### Bug 2: NEW Badge Timing (HIGH severity)
**Requirement:** CAT-06
**Files:** `src/catalogue.js` lines 72–74, `src/sync.js` lines 154–169

**Root cause (verified by reading both files):**

`isNewCard()` in `catalogue.js`:
```javascript
function isNewCard(product) {
  if (!_lastSyncAt) { return false; }
  return product.createdAt > _lastSyncAt;
}
```

`_lastSyncAt` is loaded from `sync_meta.lastSyncAt` at `initCatalogue()` time. This value was written at the END of the most recently completed sync:
```javascript
// sync.js — end of syncAll, after all products upserted
return dbPut('sync_meta', { key: 'lastSyncAt', value: new Date().toISOString() })
```

Since `lastSyncAt` is written AFTER all products are saved, every product will have `createdAt` (a Shopify ISO timestamp) older than `lastSyncAt` (the time the sync just finished). The comparison `product.createdAt > _lastSyncAt` will never be true for any product that was correctly synced.

**The correct semantics:** "NEW" should mean "this product was NOT in the catalogue at the time of the previous sync." The correct reference timestamp is therefore `lastSyncAt` from BEFORE the current sync ran — i.e., the timestamp written by the previous sync.

**Fix strategy:** In `sync.js`, before writing the new `lastSyncAt`, read the current `lastSyncAt` value and write it as `prevSyncAt`. The `isNewCard()` function in `catalogue.js` then reads `prevSyncAt` instead of `lastSyncAt`.

```javascript
// sync.js — end of syncAll, before overwriting lastSyncAt:
return dbGet('sync_meta', 'lastSyncAt').then(function(prev) {
  // Preserve the previous sync time before overwriting it.
  // catalogue.js uses prevSyncAt to detect NEW cards — products created
  // after the previous sync (not the current sync) show the NEW badge.
  var prevValue = prev ? prev.value : null;
  return dbPut('sync_meta', { key: 'prevSyncAt', value: prevValue });
}).then(function() {
  return dbPut('sync_meta', { key: 'lastSyncAt', value: new Date().toISOString() });
})
// ...rest of chain unchanged
```

```javascript
// catalogue.js — initCatalogue: also load prevSyncAt
function initCatalogue() {
  return Promise.all([
    dbGetAll('products'),
    dbGet('sync_meta', 'prevSyncAt')   // changed from 'lastSyncAt'
  ]).then(function(results) {
    _products = results[0];
    var syncMeta = results[1];
    _lastSyncAt = syncMeta ? syncMeta.value : null;
    _filtered = _products.slice();
    _categories = deriveCategoriesFromProducts(_products);
  });
}
```

`isNewCard()` itself does not need to change — it still compares `product.createdAt > _lastSyncAt`; the fix is in what value `_lastSyncAt` holds.

**Edge case — first sync ever:** On the very first sync, there is no previous `lastSyncAt`. `prevSyncAt` will be written as `null`. `isNewCard()` guards `if (!_lastSyncAt) { return false; }` — so no NEW badges appear after the first sync. This is correct: if there was no prior catalogue, no cards are "new relative to what was there before."

**Edge case — `prevSyncAt` key does not exist in older installs:** `dbGet('sync_meta', 'prevSyncAt')` will resolve `undefined` when the key has never been written. The `syncMeta ? syncMeta.value : null` guard in `initCatalogue()` handles this: `undefined` is falsy, so `_lastSyncAt` will be `null` and no badges will appear. Correct behaviour.

---

### Bug 3: First-Sync Empty Catalogue (HIGH severity)
**Requirements:** PWA-04 (indirectly), CAT-01
**Files:** `src/app.js` lines 224–234, `src/admin.js` lines 255–286

**Root cause (verified by reading both files):**

`app.js` boot path for no-catalogue:
```javascript
if (!hasCatalogue) {
  showSyncRequiredScreen();
  initAdminTrigger();
  window.addEventListener('hashchange', handleRoute);
  if (window.location.hash === '#/admin') { handleRoute(); }
  return;   // <-- returns here, never calls initCatalogue()
}

// Normal boot path:
await initCatalogue();   // <-- only reached when catalogue already exists
```

After a successful first sync in admin.js (the `.then(function(stats) {...})` handler), the code calls `loadAndRenderSyncStatus(statusArea)` but does NOT call `initCatalogue()`. When the admin navigates to `#/`, the router calls `renderCatalogue()`, which renders a grid from `_filtered`. But `_filtered` is derived from `_products`, which is still `[]` because `initCatalogue()` was never called in the no-catalogue boot path.

**Fix strategy:** After `syncAll().then()` resolves without `stats.aborted`, call `initCatalogue()` to warm the in-memory product array. This does not require any architectural changes — `initCatalogue()` is a pure data loader that can be called at any time.

```javascript
// admin.js — syncAll().then() handler, after the success branch renders:
}).then(function(stats) {
  // ... existing progress/result UI updates ...

  if (!stats.aborted) {
    // First-sync fix: warm in-memory product array so catalogue renders
    // immediately when admin navigates to #/ without a page reload.
    // initCatalogue() is idempotent — safe to call even if products
    // were already loaded (e.g. for a re-sync during normal operation).
    initCatalogue();
  }

  loadAndRenderSyncStatus(statusArea);
})
```

**Why `initCatalogue()` is safe to call from admin.js:** The function is defined in `catalogue.js` and is already in the global scope (same page). It loads from IndexedDB and overwrites the `_products`, `_filtered`, `_categories`, and `_lastSyncAt` module-level vars. Calling it after a sync is correct — the data in IndexedDB is now fresh and the in-memory array should reflect it.

**Why call it even on re-sync (not just first sync):** The admin may sync mid-event to pick up new cards. Calling `initCatalogue()` after every successful sync keeps the in-memory array in sync with the database. This is a no-op cost wise (a single `getAll` on a ~950-record store is fast).

---

### Bug 4: Missing `.admin-stat` CSS Rule (LOW severity)
**Requirement:** ANALYTICS-04 (cosmetic)
**Files:** `src/admin.js` line 541, `styles/main.css`

**Root cause (verified by reading both files):**

`admin.js` assigns the class:
```javascript
var emailStat = document.createElement('p');
emailStat.className = 'admin-stat';
emailStat.textContent = 'Emails captured: ' + emailCount;
```

A search of `styles/main.css` finds no `.admin-stat` rule. The nearby admin classes are `.admin-status-list`, `.admin-label`, `.admin-input`, and `.sync-result-detail`. The element renders with inherited styles only.

**Fix strategy:** Add a `.admin-stat` rule to `main.css`. Based on the context (a summary stat paragraph in the analytics section), the appropriate style is a visually prominent but not alarming format — accent colour, bold weight, same size as `sync-result-success` which is used for equivalent single-line summaries:

```css
/* admin.js analytics summary — email count stat paragraph */
.admin-stat {
  color: var(--color-accent);
  font-weight: var(--weight-bold);
  font-size: var(--text-body);
  margin-top: var(--space-sm);
}
```

Placement: add near the other admin stat rules (after `.sync-status-warning` at line 613, before the Catalogue Screen section comment).

---

## Standard Stack

No new libraries. This phase uses only existing project primitives.

### Core
| Module | File | Role in Phase 7 |
|--------|------|----------------|
| Service Worker | `sw.js` | Fix activate cache exclusion list (Bug 1) |
| Sync engine | `src/sync.js` | Write `prevSyncAt` before overwriting `lastSyncAt` (Bug 2) |
| Admin panel | `src/admin.js` | Call `initCatalogue()` after successful sync (Bug 3) |
| Catalogue | `src/catalogue.js` | Read `prevSyncAt` instead of `lastSyncAt` in `initCatalogue()` (Bug 2) |
| CSS | `styles/main.css` | Add `.admin-stat` rule (Bug 4) |
| IndexedDB | `src/db.js` | No changes — existing `dbGet`/`dbPut` primitives are sufficient |

**Installation:** None.

---

## Architecture Patterns

### No Changes to Module Boundaries
The existing architecture constraints from `STATE.md` must be preserved:
- `db.js` remains the only component touching IndexedDB
- `sync.js` remains the only component making network requests
- `config.js` remains the only component touching localStorage
- No new stores, no schema bumps

### Pattern: sync_meta Key Expansion
`sync_meta` already holds `lastSyncAt`, `productCount`, `currentCursor`, `pagesComplete`. Adding `prevSyncAt` is a natural extension — same keyPath pattern, same `dbPut`/`dbGet` access.

No `DB_VERSION` bump is needed. The `sync_meta` store already exists; adding a new key to an existing store is a data write, not a schema change.

### Pattern: SW Activate Exclusion List
The activate handler currently filters out caches by a single name. Extending to a list-of-allowed-caches is the standard pattern for multi-cache SW architectures:

```javascript
// Canonical pattern — exclude multiple named caches from cleanup
var ALLOWED_CACHES = [CACHE_NAME, SYNC_CACHE_NAME];
keys.filter(function(key) { return ALLOWED_CACHES.indexOf(key) === -1; })
```

Alternatively, the inline `key !== CACHE_NAME && key !== SYNC_CACHE_NAME` two-condition filter is equally correct and avoids an array allocation. Either works; the inline form is marginally simpler given only two caches.

### Anti-Patterns to Avoid
- **Do not rename `SYNC_CACHE_NAME` to match `CACHE_NAME`:** Images and app shell should remain in separate caches. Merging them means any SW version bump invalidates all images, defeating the sync-once-offline-forever model.
- **Do not add a DB_VERSION bump for `prevSyncAt`:** It is a data write to an existing store, not a schema change. Bumping DB_VERSION to add a key would trigger `onupgradeneeded` unnecessarily and risk confusing the upgrade path.
- **Do not call `initCatalogue()` before the sync completes:** Call it in the `.then()` handler after `syncAll` resolves, not before. If called before, `_products` will be empty (sync not done) and `renderCatalogue()` will show an empty grid anyway.

---

## Don't Hand-Roll

| Problem | Use Instead | Why |
|---------|-------------|-----|
| Multi-cache SW exclusion | Inline array check in activate handler | Standard SW pattern, no library needed |
| Previous timestamp capture | Read then write in Promise chain | Standard IDB pattern already in use |
| Post-sync catalogue reload | Call existing `initCatalogue()` | Function already exists and does exactly this |

---

## Common Pitfalls

### Pitfall 1: SW File Caching Prevents Bug 1 Fix Taking Effect
**What goes wrong:** The SW itself is in the app shell precache (`/sw.js` is in `APP_SHELL_FILES`). After editing `sw.js`, the browser may serve the old cached version.
**Why it happens:** Cache-first strategy returns the cached `/sw.js` before the network copy.
**How to avoid:** SW registration uses the browser's built-in SW update algorithm — browsers always re-fetch `/sw.js` from the network on each page load (bypassing cache) specifically to detect updates. The SW file is fetched byte-for-byte and compared. Any change triggers `updatefound`. The existing `skipWaiting` + `controllerchange` force-reload pattern in `app.js` handles the rest.
**Verification:** After deploying the fix, trigger a SW update (hard reload in dev, or wait for the next normal page load on device). The activate handler will run with the new exclusion list.

### Pitfall 2: `prevSyncAt` Null on First Sync — Badge Behaviour
**What goes wrong:** On the first-ever sync, `prevSyncAt` is written as `null`. After `initCatalogue()`, `_lastSyncAt` is `null`. `isNewCard()` returns `false` for all products. No NEW badges appear.
**Why it happens:** By design — there is no "previous" catalogue to compare against.
**How to avoid:** This is correct behaviour. Document it in a comment near `isNewCard()`.

### Pitfall 3: `initCatalogue()` Called in Both Boot Paths After Fix
**What goes wrong:** After Bug 3 fix, `initCatalogue()` is called in two places: (a) normal boot path in `app.js` when `hasCatalogue` is true, and (b) after successful sync in `admin.js`. On a re-sync during normal operation, both will have been called (boot first, then admin after sync). The second call overwrites `_products` with fresh data. This is safe — `initCatalogue()` is idempotent.
**Why it happens:** Intentional — post-sync refresh is needed for both first-sync and re-sync flows.
**How to avoid:** No special guard needed. The function reads from IndexedDB and writes to module vars. It can be called any number of times.

### Pitfall 4: `SYNC_CACHE_NAME` Drift Between sw.js and sync.js
**What goes wrong:** If a future developer bumps `SYNC_CACHE_NAME` in `sync.js` but forgets to update it in `sw.js`, Bug 1 reappears.
**Why it happens:** Two files share a constant without a module system to enforce the link.
**How to avoid:** Add a prominent comment in both files: `// MUST match SYNC_CACHE_NAME in src/sync.js` (in sw.js) and `// MUST match the SYNC_CACHE_NAME constant in sw.js activate handler` (in sync.js). This is the only mitigation possible in a no-build-tools context.

---

## Code Examples

All examples verified by reading the live source files.

### Bug 1 Fix — sw.js activate handler
```javascript
// sw.js — activate event handler (replace existing)
// Source: sw.js line 44, bug identified in v1.0-MILESTONE-AUDIT.md
var SYNC_CACHE_NAME = 'kiosk-v3';  // MUST match SYNC_CACHE_NAME in src/sync.js

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) {
            return key !== CACHE_NAME && key !== SYNC_CACHE_NAME;
          })
          .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});
```

### Bug 2 Fix — sync.js prevSyncAt write (inside syncAll, end-of-sync chain)
```javascript
// src/sync.js — replace the existing lastSyncAt write (line 155)
// Source: sync.js line 154-169, bug identified in v1.0-MILESTONE-AUDIT.md
return dbGet('sync_meta', 'lastSyncAt').then(function(prev) {
  // Capture current lastSyncAt as prevSyncAt BEFORE overwriting.
  // catalogue.js reads prevSyncAt to determine which products are "NEW"
  // relative to the previous sync, not the current sync.
  // MUST match the key read in catalogue.js initCatalogue().
  var prevValue = prev ? prev.value : null;
  return dbPut('sync_meta', { key: 'prevSyncAt', value: prevValue });
}).then(function() {
  return dbPut('sync_meta', { key: 'lastSyncAt', value: new Date().toISOString() });
}).then(function() {
  return dbPut('sync_meta', { key: 'productCount', value: totalProducts });
}).then(function() {
  return dbPut('sync_meta', { key: 'currentCursor', value: null });
}).then(function() {
  return dbPut('sync_meta', { key: 'pagesComplete', value: null });
}).then(function() {
  return { total: totalProducts, newProducts: newProducts, errors: errors };
});
```

### Bug 2 Fix — catalogue.js initCatalogue (read prevSyncAt)
```javascript
// src/catalogue.js — replace existing initCatalogue
// Source: catalogue.js line 37-48, bug identified in v1.0-MILESTONE-AUDIT.md
function initCatalogue() {
  return Promise.all([
    dbGetAll('products'),
    dbGet('sync_meta', 'prevSyncAt')  // was 'lastSyncAt' — see Bug 2 fix
  ]).then(function(results) {
    _products = results[0];
    var syncMeta = results[1];
    _lastSyncAt = syncMeta ? syncMeta.value : null;
    _filtered = _products.slice();
    _categories = deriveCategoriesFromProducts(_products);
  });
}
```

### Bug 3 Fix — admin.js syncAll success handler (call initCatalogue)
```javascript
// src/admin.js — inside syncAll().then(function(stats) {...})
// Add after the success/error result UI is built, before loadAndRenderSyncStatus
// Source: admin.js line 255-286, bug identified in v1.0-MILESTONE-AUDIT.md
if (!stats.aborted) {
  // Warm in-memory product array after successful sync.
  // Required for first-sync flow: boot() skips initCatalogue() when no catalogue
  // exists, so the first sync must trigger it. Also correct for re-sync: keeps
  // _products current without requiring a page reload.
  initCatalogue();
}
loadAndRenderSyncStatus(statusArea);
```

### Bug 4 Fix — main.css admin-stat rule
```css
/* styles/main.css — add after .sync-status-warning block (~line 614) */
/* Source: admin.js line 541, bug identified in v1.0-MILESTONE-AUDIT.md */
.admin-stat {
  color: var(--color-accent);
  font-weight: var(--weight-bold);
  font-size: var(--text-body);
  margin-top: var(--space-sm);
}
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual verification (no automated test infrastructure in this project) |
| Config file | None |
| Quick run command | Load app in browser, follow verification steps |
| Full suite command | Follow phase VERIFICATION.md checklist |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PWA-03 | Product images survive SW version bump | manual | Bump CACHE_NAME, reload, verify images load | N/A — manual |
| SYNC-04 | Cached catalogue usable after sync failure | manual | Check kiosk-v3 cache present after SW update | N/A — manual |
| CAT-06 | NEW badge appears on cards added since previous sync | manual | Perform two syncs, verify badge on new cards | N/A — manual |
| ANALYTICS-04 (CSS) | Email count stat styled with accent colour | manual | Open admin analytics, verify gold text | N/A — manual |

### Sampling Rate
- **Per task commit:** Visual inspection in browser DevTools (check Cache Storage for kiosk-v3, check admin-stat styling)
- **Per wave merge:** Full manual flow test — first sync, catalogue render, admin analytics, SW update simulation
- **Phase gate:** All four success criteria from phase description verified before marking complete

### Wave 0 Gaps
None — no new test infrastructure required. All four fixes are verifiable through manual inspection of the running app.

---

## Open Questions

1. **`prevSyncAt` on devices with existing `lastSyncAt` data**
   - What we know: After the fix lands, the first time `syncAll` runs on a device that already has products, `prevSyncAt` will be set to the existing `lastSyncAt` value. On the next sync, `prevSyncAt` will hold the timestamp of that first post-fix sync.
   - What's unclear: Whether the business wants NEW badges to appear after the first post-fix re-sync (they will, correctly), or whether the lack of badges until then is acceptable.
   - Recommendation: This is correct behaviour. The first post-fix sync properly initialises the two-timestamp scheme. No special migration needed.

2. **`initCatalogue()` called after aborted sync (Bug 3)**
   - What we know: The fix guards `if (!stats.aborted) { initCatalogue(); }` — aborted syncs do not trigger a reload.
   - What's unclear: Whether a partially-completed first sync leaves enough products in IndexedDB to render a useful catalogue.
   - Recommendation: The existing upsert-semantics guarantee (SYNC-04) means any products fetched before the abort are persisted. On the next boot, `dbCount('products') > 0` will be true and the normal boot path will call `initCatalogue()`. No change needed.

---

## Sources

### Primary (HIGH confidence)
- `sw.js` — live source, read directly. CACHE_NAME = 'kiosk-v8', activate handler verified
- `src/sync.js` — live source, read directly. SYNC_CACHE_NAME = 'kiosk-v3', lastSyncAt write location confirmed at line 155
- `src/catalogue.js` — live source, read directly. isNewCard() logic verified at lines 72-74, initCatalogue() at lines 37-48
- `src/app.js` — live source, read directly. No-catalogue boot path verified at lines 224-234
- `src/admin.js` — live source, read directly. syncAll().then() handler verified at lines 255-286; emailStat.className='admin-stat' at line 541
- `src/db.js` — live source, read directly. sync_meta schema confirmed, no DB_VERSION bump needed
- `styles/main.css` — live source, searched. No `.admin-stat` rule exists; nearby rules at lines 575-615 provide design token context
- `.planning/v1.0-MILESTONE-AUDIT.md` — primary bug specification, all four defects documented with file references

### Secondary (MEDIUM confidence)
- `MDN Service Worker API` — SW activate lifecycle and cache deletion behaviour is standard spec; the fix pattern (exclusion list in activate) is canonical

---

## Metadata

**Confidence breakdown:**
- Bug diagnosis: HIGH — all four bugs verified by reading live source files against audit findings
- Fix strategy: HIGH — fixes are minimal, follow existing patterns, no new dependencies
- Edge cases: HIGH — prevSyncAt null case, idempotent initCatalogue(), SW cache drift all considered

**Research date:** 2026-03-21
**Valid until:** Phase lifetime (fixes are one-time; no time-sensitive APIs involved)
