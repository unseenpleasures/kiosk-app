# Phase 3: Sync Engine - Research

**Researched:** 2026-03-21
**Domain:** Shopify Storefront API GraphQL pagination, Cache API image caching, admin passcode UI, sync state management
**Confidence:** HIGH

---

## Summary

Phase 3 builds two tightly coupled features: the admin panel (passcode gate, event config, sync trigger, sync status) and the sync engine itself (paginated Shopify GraphQL fetch, product upsert into IndexedDB, image caching into Cache API, cursor checkpointing for failure recovery). All foundation code from Phases 1-2 is in place — `db.js`, `config.js`, `router.js`, and the `#/admin` route stub are ready to be filled.

The Shopify Storefront API current stable version is 2026-01 (as of March 2026), up from the 2024-07 assumed during roadmap planning. The pagination pattern is cursor-based with a maximum of 250 products per page and no rate limits on the Storefront API. With 950+ products and 250 per page, expect 4-5 pages of GraphQL requests. Each page response includes product metadata and image URLs; images must then be fetched individually and stored in the Cache API.

The safe failure-recovery strategy is to checkpoint the GraphQL cursor after every page into `sync_meta` in IndexedDB. If sync is interrupted, the next run resumes from the last saved cursor, and existing product records are never deleted until the full sync completes successfully. A "commit on completion" pattern — upsert products to a staging area or use upsert semantics on the live store — ensures the catalogue remains browsable throughout.

**Primary recommendation:** Implement sync as a sequential async loop in `sync.js` — fetch page, upsert products, cache images, persist cursor, update UI progress — with full-sync semantics (not delta) for v1, matching REQUIREMENTS.md SYNC-V2-01 deferral.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SYNC-01 | Admin can trigger a full Shopify Storefront API catalogue sync with one tap | Admin panel "Sync" button calls `sync.js` syncAll() |
| SYNC-02 | Sync displays a progress indicator while running | Per-page callback updates progress bar DOM; page N of total estimate shown |
| SYNC-03 | Sync completion shows status report (products updated, new cards added, any errors) | Sync function returns stats object; admin panel renders summary |
| SYNC-04 | Previous cached catalogue remains fully usable if sync fails or is interrupted | Upsert semantics on `products` store; cursor checkpoint enables resume; no dbClear() until full success |
| ADMIN-01 | Admin panel accessible only via hidden discreet trigger and passcode entry | Multi-tap hidden trigger (e.g., 7 taps on logo corner) navigates to `#/admin`; passcode overlay gates full panel |
| ADMIN-02 | Admin can set event name and date (used for email tagging and analytics labelling) | Config.setEventName / Config.setEventDate already implemented in config.js |
| ADMIN-03 | Admin can trigger a full catalogue sync from within the admin panel | Sync button in admin panel wired to sync.js |
| ADMIN-04 | Admin can view sync status: last sync time, product count, and any sync errors | sync_meta store in IndexedDB holds lastSyncAt, productCount, lastError; read on admin panel render |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Shopify Storefront API | 2026-01 | Read product catalogue via GraphQL | Only approved data source; read-only, no backend proxy needed |
| fetch() | Browser-native | HTTP POST for GraphQL requests | Meets CLAUDE.md no-library policy |
| Cache API (window.caches) | Browser-native | Store product images for offline | Correct storage tier for HTTP response objects; available from main thread in secure context |
| IndexedDB (via db.js) | Browser-native | Store product metadata + sync state | Already implemented in Phase 2; upsert semantics via dbPut() |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto.subtle | Browser-native | SHA-256 passcode verification | Already implemented in config.js; use verifyPasscode() |
| Web Crypto API | Browser-native | No additional use needed | SHA-256 sufficient for admin passcode |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| window.caches from main thread | Postmessage to SW for caching | SW messaging adds complexity; window.caches works fine in secure context (PWA standalone = secure) |
| Sequential page fetching | Parallel batch fetching | Parallel risks memory pressure on A9X and makes progress reporting non-linear; sequential is safer |
| Full resync every time | Delta sync (updatedAt) | Delta sync is SYNC-V2-01 — explicitly deferred; full resync is the v1 requirement |

**Installation:** No npm packages. All APIs are browser-native.

**Shopify API endpoint:**
```
POST https://{store}.myshopify.com/api/2026-01/graphql.json
Headers:
  Content-Type: application/json
  X-Shopify-Storefront-Access-Token: {read-only token}
```

---

## Architecture Patterns

### Recommended Project Structure additions for Phase 3

```
src/
├── db.js          # Existing — add no new functions; existing dbPut, dbGet, dbCount sufficient
├── config.js      # Existing — Config.getEventName/setEventName/getEventDate/setEventDate ready
├── sync.js        # NEW — exclusive network access module; all Shopify fetch calls live here
├── admin.js       # NEW — admin panel render + passcode overlay + event config form
├── router.js      # Existing — renderAdminStub() replaced by real renderAdmin() call
└── app.js         # Existing — showSyncRequiredScreen() gets a link to trigger admin entry
```

No other files need modification. `sw.js` CACHE_NAME bump to `kiosk-v3` adds `sync.js` and `admin.js` to the app shell precache list.

### Pattern 1: Shopify Storefront GraphQL Pagination

**What:** Cursor-based forward pagination using `pageInfo.hasNextPage` and `pageInfo.endCursor`. Request up to 250 products per page. With 950+ products: 4 pages at 250 = 1000, so 4 full pages plus possibly a partial 5th.

**When to use:** Always — no offset-based pagination exists in the Storefront GraphQL API.

**GraphQL query structure:**
```javascript
// Source: https://shopify.dev/docs/api/usage/pagination-graphql
// Source: https://shopify.dev/docs/api/storefront/2026-01/objects/Product
var PRODUCTS_QUERY = '\
  query ($cursor: String) {\
    products(first: 250, after: $cursor) {\
      nodes {\
        id\
        title\
        handle\
        productType\
        tags\
        createdAt\
        updatedAt\
        featuredImage {\
          url\
          altText\
          width\
          height\
        }\
      }\
      pageInfo {\
        hasNextPage\
        endCursor\
      }\
    }\
  }\
';
```

**Fetch call pattern:**
```javascript
// Source: CLAUDE.md — GraphQL via fetch()
function fetchProductPage(cursor) {
  return fetch('https://{store}.myshopify.com/api/2026-01/graphql.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
    },
    body: JSON.stringify({
      query: PRODUCTS_QUERY,
      variables: { cursor: cursor || null }
    })
  }).then(function(res) {
    if (!res.ok) { throw new Error('HTTP ' + res.status); }
    return res.json();
  });
}
```

### Pattern 2: Cursor Checkpointing for Failure Recovery

**What:** After processing each page successfully, persist the `endCursor` and page count to `sync_meta`. If sync aborts, the next run reads the saved cursor and resumes from that page.

**When to use:** Required — SYNC-04 demands the existing catalogue remain browsable on interruption.

**Checkpoint pattern:**
```javascript
// After each successful page:
// 1. Upsert products with dbPut (never dbClear before full completion)
// 2. Cache images (best-effort — failure should not abort the product upsert)
// 3. Persist cursor checkpoint
dbPut('sync_meta', { key: 'currentCursor', value: endCursor });
dbPut('sync_meta', { key: 'pagesComplete', value: pageNum });
```

**On sync start:**
```javascript
// Check for interrupted sync — read saved cursor
dbGet('sync_meta', 'currentCursor').then(function(saved) {
  var startCursor = saved ? saved.value : null;
  // startCursor null = start fresh; non-null = resume
});
```

**On full sync success:**
```javascript
// Write final metadata, clear the checkpoint cursor
dbPut('sync_meta', { key: 'lastSyncAt', value: new Date().toISOString() });
dbPut('sync_meta', { key: 'productCount', value: totalCount });
dbPut('sync_meta', { key: 'currentCursor', value: null }); // clears resume point
```

### Pattern 3: Image Caching from Main Thread

**What:** After each page's product metadata is saved to IndexedDB, fetch each product image URL and store the response in the Cache API. This runs from `sync.js` in the main thread — not from the service worker. The Cache API is accessible from `window.caches` in secure contexts (the installed PWA is a secure context).

**When to use:** Once per product image URL during sync. Re-sync should re-cache (overwrite existing entry).

**Image caching pattern:**
```javascript
// Source: MDN CacheStorage — https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage
// window.caches available in secure context (PWA standalone = secure)
function cacheImage(imageUrl) {
  return caches.open('kiosk-v3').then(function(cache) {
    return fetch(imageUrl).then(function(response) {
      if (response.ok) {
        return cache.put(imageUrl, response);
      }
    });
  }).catch(function(err) {
    // Image cache failure is non-fatal — log to sync errors, continue
    console.warn('Image cache failed:', imageUrl, err);
  });
}
```

**CRITICAL:** Image caching failures must NOT abort the product metadata sync. Log errors to a per-sync error list and include the count in the completion status report (SYNC-03).

### Pattern 4: Admin Passcode Hidden Trigger

**What:** ADMIN-01 requires the admin entry trigger to be non-obvious. The recommended pattern for a kiosk is a multi-tap on a non-interactive element — e.g., tapping the corner of the screen or the logo 7 times in rapid succession.

**When to use:** In the global chrome or sync-required screen — must be accessible regardless of catalogue state.

**Implementation approach:**
```javascript
// Hidden tap counter on an existing non-interactive element (e.g., the QR code area or logo)
var adminTapCount = 0;
var adminTapTimer = null;

function handleAdminTap() {
  adminTapCount++;
  clearTimeout(adminTapTimer);
  if (adminTapCount >= 7) {
    adminTapCount = 0;
    window.location.hash = '#/admin';
    return;
  }
  // Reset counter after 3 seconds of inactivity
  adminTapTimer = setTimeout(function() { adminTapCount = 0; }, 3000);
}
```

**Recommended trigger element:** The QR code div (`#chrome-qr`) in the global chrome — it is visible on all screens, rarely tapped by casual attendees, and has no existing tap handler. Alternatively, tapping the version/status text in the sync-required screen.

**Passcode overlay:** After navigating to `#/admin`, the admin view renders a full-screen passcode input (PIN-style or text field) before revealing the panel. Uses `verifyPasscode()` from `config.js`. If no passcode is set yet (first run), the first entry sets the passcode.

### Pattern 5: Sync Progress UI

**What:** SYNC-02 requires a live progress indicator. With 4-5 pages, a page counter ("Page 3 of ~4") is more accurate than a percentage (total unknown until done). Include a percentage based on an estimated total.

**Implementation:**
```javascript
// onProgress callback passed into syncAll()
function syncAll(onProgress) {
  var pageNum = 0;
  // After each page:
  pageNum++;
  if (onProgress) {
    onProgress({ page: pageNum, total: estimatedTotal, products: runningCount });
  }
}
```

**UI element:** A simple `<div>` with a progress bar (`<div style="width: X%">`) and text label updated via `.textContent`. CSS transition on width for smooth animation. No JS animation library needed.

### Anti-Patterns to Avoid

- **dbClear('products') before sync completes:** Wipes the browsable catalogue before new data arrives. Never clear the products store until full sync success is confirmed.
- **Fetching all images in parallel:** Memory pressure on A9X. Fetch images sequentially or in small batches (max 5 concurrent) per page.
- **Storing image blobs in IndexedDB:** The architecture constraint specifies Cache API for images, IndexedDB for metadata URLs only. Do not deviate.
- **Treating image cache failure as fatal:** Networks at event venues are unreliable. Image caching is best-effort; product metadata is the critical payload.
- **Navigating away from admin during sync:** The idle timer must be paused or the admin route must suppress the idle timeout while sync is running (sync is an admin operation, not an attendee session).
- **Making network requests from sw.js:** The architecture constraint is `sync.js` is the only module that makes network requests. The service worker only handles cache-first fetching of already-cached resources.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GraphQL pagination | Custom offset/page logic | Shopify cursor pattern (`pageInfo.hasNextPage` + `endCursor`) | Shopify has no offset-based pagination; cursors are the only API |
| Image storage | Base64 encode into IndexedDB | Cache API (`caches.open().put()`) | Architecture constraint; Safari IndexedDB blob bugs pre-14; 33% size overhead |
| Passcode hashing | Custom hash or plain text | `verifyPasscode()` from config.js (SHA-256 via Web Crypto) | Already implemented in Phase 2 |
| Sync resume | Re-fetching from page 1 always | Cursor checkpointing in `sync_meta` | 4 pages of 250 = ~1000 requests; partial failure should not restart from zero |
| Progress calculation | Counting known total products | Estimate from Shopify page responses | Total product count unknown until last page; estimate from 250/page |
| CSV export | Custom IndexedDB query | `dbGetAll('products')` then `.length` | `dbCount()` and `dbGetAll()` already exist in db.js |

**Key insight:** The Storefront API cursor pattern is mandatory — there is no `count` field or total available before pagination completes. Build the progress UI to handle an estimated total (update estimate as pages arrive) rather than a known denominator.

---

## Common Pitfalls

### Pitfall 1: Wiping Products Before Sync Completes
**What goes wrong:** Calling `dbClear('products')` at the start of sync, then experiencing a network failure mid-way, leaves the device with zero products. The "Sync Required" screen blocks attendees from seeing anything.
**Why it happens:** Developers clear first to avoid stale data.
**How to avoid:** Use `dbPut()` (upsert) throughout sync. Only call `dbClear()` — if ever needed — after the final `lastSyncAt` is written. For v1, upsert semantics mean old cards stay visible with their old data until overwritten.
**Warning signs:** `dbClear()` call appearing before the pagination loop starts.

### Pitfall 2: Cursor Lost on Interruption
**What goes wrong:** Sync starts at page 1 every time, even after failure. On a slow connection, this wastes the setup window before an event.
**Why it happens:** Cursor only held in a local variable, not persisted.
**How to avoid:** Write cursor to `sync_meta` via `dbPut('sync_meta', { key: 'currentCursor', value: endCursor })` after every page completes. Read it at sync start.
**Warning signs:** No `sync_meta` writes inside the pagination loop.

### Pitfall 3: Idle Timer Interrupting Sync
**What goes wrong:** Admin starts sync, walks away to check something, and 60 seconds later the idle timer fires and navigates to home — aborting the active fetch loop.
**Why it happens:** The idle timer is global and not aware of admin/sync state.
**How to avoid:** Either (a) suspend idle timer when `#/admin` is the current route, or (b) reset the idle timer programmatically during each sync page fetch. Option (a) is cleaner — idle timer's `initIdleTimer()` could check current hash.
**Warning signs:** No idle timer suppression logic in admin/sync code paths.

### Pitfall 4: Image URL Transform Parameters Break Cache Lookup
**What goes wrong:** The Shopify image `url` field may include transform parameters (width, format). If the service worker intercepts a slightly different URL variant (e.g., with `?v=...` or width transforms), it won't match the Cache API key.
**Why it happens:** Shopify `image.url` can include Shopify CDN parameters. The `url` field without transform arguments returns the original — use this.
**How to avoid:** Store and cache the bare `image.url` field (no `ImageTransformInput` applied in the query). The existing sw.js cache-first handler will intercept the same URL on fetch.
**Warning signs:** Images showing as broken after offline use despite cache appearing populated.

### Pitfall 5: window.caches Undefined on Non-Secure Origin
**What goes wrong:** `caches.open()` throws `TypeError: Cannot read properties of undefined` if the page is served over plain HTTP.
**Why it happens:** `window.caches` requires a secure context (HTTPS or localhost).
**How to avoid:** The installed PWA is always a secure context. Development on `localhost` (via `python -m http.server`) is also a secure context. This pitfall only applies if someone tests over plain HTTP on a non-localhost domain — warn in code comments.
**Warning signs:** `window.caches` is `undefined` in the browser console.

### Pitfall 6: Shopify API Version Mismatch
**What goes wrong:** Code written against 2024-07 may use deprecated field names (e.g., `image.src` instead of `image.url`). Both may work initially but `src` is deprecated.
**Why it happens:** Training data used 2024-07; current version is 2026-01.
**How to avoid:** Use `image.url` (current) not `image.src` or `image.originalSrc` (deprecated). Use endpoint `/api/2026-01/graphql.json`.
**Warning signs:** Deprecation notices in GraphQL response extensions.

### Pitfall 7: Safari Standalone Mode Storage Quota
**What goes wrong:** Caching 950 product images at typical JPEG sizes could approach or exceed Safari's soft storage threshold. Safari may silently evict the Cache storage without warning.
**Why it happens:** Safari's storage quota for a PWA origin starts at 1 GiB; exceeding it requires user permission. Images at 400px wide average ~30-80 KB each — 950 images = ~28-76 MB, well within quota. But monitor total.
**How to avoid:** Query Shopify's `featuredImage` only (not full `images` connection), with no width transform in the query, which returns the stored image at its original resolution. For 400px thumbnails the stored size is already appropriate. Log total image count in the sync completion report.
**Warning signs:** Cache entries disappearing between events; `storage.estimate()` showing high usage.

---

## Code Examples

Verified patterns from official sources:

### Complete Pagination Loop
```javascript
// Source: https://shopify.dev/docs/api/usage/pagination-graphql
// Sequential page fetching with cursor checkpoint
function syncAll(onProgress) {
  var cursor = null;
  var pageNum = 0;
  var totalProducts = 0;
  var newProducts = 0;
  var errors = [];

  function fetchNext() {
    return fetchProductPage(cursor).then(function(data) {
      var productsData = data.data.products;
      var nodes = productsData.nodes;
      var pageInfo = productsData.pageInfo;

      pageNum++;

      // Upsert each product into IndexedDB
      var upsertPromises = nodes.map(function(product) {
        // Track new vs updated
        return dbGet('products', product.id).then(function(existing) {
          if (!existing) { newProducts++; }
          totalProducts++;
          return dbPut('products', {
            id: product.id,
            title: product.title,
            handle: product.handle,
            category: product.productType,
            tags: product.tags,
            imageUrl: product.featuredImage ? product.featuredImage.url : null,
            imageAlt: product.featuredImage ? product.featuredImage.altText : null,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt
          });
        });
      });

      return Promise.all(upsertPromises).then(function() {
        // Cache images for this page (best-effort, sequential)
        return cacheImagesSequential(nodes.map(function(p) {
          return p.featuredImage ? p.featuredImage.url : null;
        }).filter(Boolean), errors);
      }).then(function() {
        // Checkpoint cursor
        cursor = pageInfo.endCursor;
        return dbPut('sync_meta', { key: 'currentCursor', value: cursor });
      }).then(function() {
        // Progress callback
        if (onProgress) {
          onProgress({ page: pageNum, products: totalProducts, newProducts: newProducts });
        }

        if (pageInfo.hasNextPage) {
          return fetchNext(); // recurse to next page
        }
        // All pages done — write final metadata
        return dbPut('sync_meta', { key: 'lastSyncAt', value: new Date().toISOString() })
          .then(function() { return dbPut('sync_meta', { key: 'productCount', value: totalProducts }); })
          .then(function() { return dbPut('sync_meta', { key: 'currentCursor', value: null }); })
          .then(function() {
            return { total: totalProducts, newProducts: newProducts, errors: errors };
          });
      });
    });
  }

  // Check for interrupted sync (resume support)
  return dbGet('sync_meta', 'currentCursor').then(function(saved) {
    cursor = (saved && saved.value) ? saved.value : null;
    return fetchNext();
  });
}
```

### Sequential Image Caching (A9X-safe)
```javascript
// Fetch and cache images one at a time — avoids memory pressure on A9X
// Source: MDN CacheStorage https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage
function cacheImagesSequential(urls, errors) {
  return urls.reduce(function(chain, url) {
    return chain.then(function() {
      return caches.open('kiosk-v3').then(function(cache) {
        return fetch(url).then(function(response) {
          if (response.ok) {
            return cache.put(url, response);
          }
        });
      }).catch(function(err) {
        errors.push({ url: url, error: err.message });
      });
    });
  }, Promise.resolve());
}
```

### Admin Passcode Overlay
```javascript
// Full-screen overlay rendered before admin panel content is shown
// Uses verifyPasscode() from config.js (already implemented)
function renderPasscodeOverlay(onSuccess) {
  var overlay = document.createElement('div');
  overlay.className = 'passcode-overlay';

  var input = document.createElement('input');
  input.type = 'password';
  input.className = 'passcode-input';
  input.placeholder = 'Enter passcode';

  var submitBtn = document.createElement('button');
  submitBtn.textContent = 'Unlock';
  submitBtn.className = 'passcode-submit';

  submitBtn.addEventListener('click', function() {
    var isFirstRun = Config.getPasscodeHash() === null;
    if (isFirstRun) {
      // First run: set passcode
      hashPasscode(input.value).then(function(hash) {
        Config.setPasscodeHash(hash);
        onSuccess();
      });
    } else {
      verifyPasscode(input.value).then(function(valid) {
        if (valid) {
          onSuccess();
        } else {
          input.value = '';
          input.placeholder = 'Incorrect — try again';
        }
      });
    }
  });

  overlay.appendChild(input);
  overlay.appendChild(submitBtn);
  return overlay;
}
```

### sync_meta Read for Admin Status Display
```javascript
// Source: db.js dbGet() — Phase 2 CRUD helper
function loadSyncStatus(callback) {
  Promise.all([
    dbGet('sync_meta', 'lastSyncAt'),
    dbGet('sync_meta', 'productCount'),
    dbGet('sync_meta', 'currentCursor'),
    dbCount('products')
  ]).then(function(results) {
    callback({
      lastSyncAt: results[0] ? results[0].value : null,
      productCount: results[1] ? results[1].value : 0,
      interruptedCursor: results[2] ? results[2].value : null,
      liveProductCount: results[3]
    });
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Shopify REST Admin API for products | Storefront GraphQL API | ~2020 | No Admin API credentials needed; read-only token is public-safe |
| `image.src` field on Image object | `image.url` field | Deprecated in recent API versions | Use `url`, not `src` or `originalSrc` |
| Storefront API 2024-07 (planned) | 2026-01 (current stable) | March 2026 | Endpoint URL version segment must be updated |
| 50 products/page (old Liquid limit) | 250 products/page max | Shopify changelog | Fewer pages needed; 4 pages for 950 products |

**Deprecated/outdated:**
- `image.src`: Deprecated, replaced by `image.url`. Do not query `src` in the products GraphQL query.
- `image.originalSrc`, `image.transformedSrc`: Deprecated. Use `image.url` with optional `ImageTransformInput`.
- Storefront API 2024-07: Not the current stable. Use 2026-01.

---

## Open Questions

1. **Exact Shopify store domain and token**
   - What we know: CLAUDE.md says token is hardcoded in JS; research confirms this is safe for read-only Storefront tokens
   - What's unclear: The actual `.myshopify.com` store domain and token value — not available in research context
   - Recommendation: Planner should note these as constants to be filled in `sync.js`; use placeholder `SHOPIFY_STORE_DOMAIN` and `STOREFRONT_TOKEN`

2. **Product category field mapping**
   - What we know: The app has 8 categories (CAT-02 refers to "8 category chips"); Shopify uses `productType` for category
   - What's unclear: Whether the 8 categories map 1:1 to Shopify `productType` values or require a mapping layer
   - Recommendation: Plan should store `productType` as-is; the category filter in Phase 4 can build the mapping. For now, `category: product.productType` in the IndexedDB record is correct.

3. **Total number of images to cache**
   - What we know: 950+ products; each has a `featuredImage`; estimated 28-76 MB at typical JPEG sizes
   - What's unclear: Whether some products share image CDN URLs or have null featuredImage
   - Recommendation: Handle null `featuredImage` gracefully (skip caching for that product); storage estimate well within Safari 1 GiB quota

4. **Idle timer suppression during sync**
   - What we know: `idle.js` `initIdleTimer()` wires a global timer; sync can take 1-3 minutes
   - What's unclear: Whether the current `idle.js` implementation exposes a pause/resume API
   - Recommendation: Plan should include either extending `idle.js` with a pause function or checking `window.location.hash` in the idle callback before triggering auto-return

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test config files found in repo |
| Config file | None — Wave 0 must create test harness if validation required |
| Quick run command | Manual browser test (open app, run sync, verify) |
| Full suite command | Manual end-to-end test checklist |

**Note:** This is a vanilla JS PWA with no build tools. Automated unit testing would require adding a test runner (e.g., a simple test script) or relying entirely on manual browser verification. Given the no-build-tools constraint, manual testing is the primary validation approach. The planner should define a manual verification checklist rather than automated tests.

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| ADMIN-01 | Hidden trigger + passcode gate blocks admin access | Manual | n/a — touch interaction | n/a |
| ADMIN-02 | Event name/date saved and survive restart | Manual | n/a | n/a |
| ADMIN-03 | Sync triggered from admin panel | Manual | n/a | n/a |
| ADMIN-04 | Sync status shows last sync time, product count, errors | Manual | n/a | n/a |
| SYNC-01 | Full sync downloads all products | Manual | n/a | n/a |
| SYNC-02 | Progress indicator updates per page | Manual — visual | n/a | n/a |
| SYNC-03 | Completion report shows counts and errors | Manual — visual | n/a | n/a |
| SYNC-04 | Interrupted sync leaves catalogue browsable | Manual — simulate offline mid-sync | n/a | n/a |

### Wave 0 Gaps
No automated test infrastructure exists or is appropriate for this no-build-tools project. The planner should define a manual verification checklist task as a Wave 0 deliverable — a `VERIFICATION.md` that operators and developers can follow on the actual device.

---

## Sources

### Primary (HIGH confidence)
- Shopify Storefront API docs — https://shopify.dev/docs/api/storefront — version, endpoint, auth headers
- Shopify pagination guide — https://shopify.dev/docs/api/usage/pagination-graphql — cursor structure, hasNextPage, endCursor, 250 max
- Shopify Product object — https://shopify.dev/docs/api/storefront/2026-01/objects/Product — fields: id, title, handle, productType, tags, createdAt, updatedAt, featuredImage
- Shopify Image object — https://shopify.dev/docs/api/storefront/latest/objects/image — url (not src), altText, width, height
- Shopify API limits — https://shopify.dev/docs/api/usage/limits — no rate limits on Storefront API
- MDN CacheStorage — https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage — available from main thread (window.caches) in secure context
- MDN Window.caches — https://developer.mozilla.org/en-US/docs/Web/API/Window/caches — baseline widely available since April 2018
- Project codebase — db.js, config.js, router.js, app.js, sw.js — existing Phase 2 APIs confirmed

### Secondary (MEDIUM confidence)
- Shopify changelog on pagination limits — https://shopify.dev/changelog/new-pagination-limits-for-liquid-storefront-graphql-api — 250 per page confirmed
- MDN PWA Caching guide — https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching — cache available in both main thread and SW
- Image deprecated fields — https://community.shopify.dev/t/updates-to-image-type-on-storefront-graphql-api/30986 — src/originalSrc/transformedSrc deprecated

### Tertiary (LOW confidence)
- iOS PWA limitations guide — https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide — 7-day eviction, Cache API limit notes (general web knowledge, not iPadOS 16 specific)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs are browser-native or Shopify official; current version verified
- Architecture: HIGH — derived from existing Phase 2 code structure and confirmed architecture constraints
- Shopify API fields: HIGH — verified against 2026-01 docs
- Pitfalls: HIGH for cursor/clear pitfalls (architecture reasoning); MEDIUM for image URL transform (derived from deprecation notices)
- Safari Cache API from main thread: MEDIUM — MDN says widely available; Safari-specific notes from search results are mixed; the installed PWA secure context requirement is the key constraint

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (Shopify API stable versions rotate quarterly; verify version again if implementation is delayed beyond Q2 2026)
