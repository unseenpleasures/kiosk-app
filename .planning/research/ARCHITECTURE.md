# Architecture Patterns

**Project:** ID Card Factory — Event Kiosk Catalogue PWA
**Domain:** Offline-first PWA kiosk with Shopify sync
**Researched:** 2026-03-21
**Overall confidence:** HIGH — These are well-established patterns for this class of application. No network tools available to verify latest Safari-specific quirks; iPadOS 16 specifics flagged where uncertainty exists.

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    App Shell (HTML)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │  Customer   │  │    Admin     │  │  Email Form   │   │
│  │    View     │  │    Panel     │  │    Screen     │   │
│  └──────┬──────┘  └──────┬───────┘  └──────┬────────┘   │
│         └────────────────┴─────────────────┘            │
│                      Router (hash)                       │
│                          │                               │
│         ┌────────────────┴────────────────┐             │
│         │          App Controller          │             │
│         │  (state, events, inactivity)     │             │
│         └────────────────┬────────────────┘             │
│                          │                               │
│    ┌─────────────────────┼────────────────────┐         │
│    │                     │                    │          │
│  DB Layer            Config Layer         Sync Layer     │
│  (IndexedDB)         (localStorage)       (Shopify API)  │
└──────────────────────────────────────────────────────────┘
                           │
              ┌────────────┘
              │
┌─────────────▼──────────────────────────────────────────┐
│              Service Worker (sw.js)                     │
│   App Shell Cache │ Asset Cache │ Fetch Intercept       │
└────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

| Component | File(s) | Responsibility | Communicates With |
|-----------|---------|---------------|-------------------|
| App Shell | `index.html` | HTML skeleton, viewport, manifest link, SW registration | Loads all other components |
| Router | `js/router.js` | Hash-based view switching, history state | App Controller, all Views |
| App Controller | `js/app.js` | Bootstrap, inactivity timer, global event bus | All components |
| Customer View | `js/views/catalogue.js` | Grid render, category filter, search, card detail | DB Layer, Router |
| Admin Panel | `js/views/admin.js` | Passcode gate, event config, sync trigger, analytics summary, CSV export | DB Layer, Sync Layer, Config Layer |
| Email Form | `js/views/email.js` | Email capture form, GDPR checkbox, success screen | DB Layer |
| DB Layer | `js/db.js` | All IndexedDB reads/writes, single source of truth for persistent data | All views, Sync Layer |
| Config Layer | `js/config.js` | localStorage reads/writes for settings (passcode hash, event name, timer) | App Controller, Admin Panel |
| Sync Layer | `js/sync.js` | Shopify Storefront API GraphQL pagination, incremental diff, image fetch | DB Layer, Admin Panel |
| Service Worker | `sw.js` | Cache-first serving of shell + assets, fetch interception | Browser (no JS module access) |

**Hard rules:**
- Views never write to IndexedDB directly — always through DB Layer
- Service worker has no access to IndexedDB from within the worker (use postMessage if coordination needed)
- Sync Layer is the only component that makes network requests
- Config Layer is the only component that touches localStorage

---

## Data Flow

### Customer Browse Flow
```
User tap/gesture
  → Router (hash change: #catalogue, #category/anime, #card/123)
    → Customer View (reads filter/search params from URL hash)
      → DB Layer.getProducts({ category, search })
        → IndexedDB products store (indexed query)
          → Returns product array
            → Customer View renders virtual-scrolled grid
              → Service Worker serves cached images (cache-first)
                → Analytics: DB Layer.logEvent({ type: 'card_view', cardId, ts })
```

### Search Flow
```
User types in search input (debounced 150ms)
  → Customer View calls DB Layer.searchProducts(query)
    → IndexedDB: range scan on 'title' index (or in-memory filter on cached array)
      → Results rendered < 300ms
        → DB Layer.logSearchTerm({ query, resultCount, ts })
          → If resultCount === 0: flagged as zero-result in analytics store
```

### Sync Flow (Admin, pre-event)
```
Admin taps "Sync Now"
  → Sync Layer reads DB Layer.getSyncMetadata() → { lastCursor, lastSyncAt, productCount }
    → Shopify Storefront GraphQL: products(first: 50, after: cursor)
      → For each page: DB Layer.upsertProducts(page.products)
        → When all pages done: fetch new/changed product images
          → Images fetched as Blob, stored via Cache API (service worker cache)
            → DB Layer.setSyncMetadata({ lastSyncAt: now, productCount })
              → Admin Panel shows progress + final report
```

### Email Capture Flow
```
User navigates to email screen
  → Email Form renders (inactivity timer extended to 3 min)
    → User submits valid email + GDPR checkbox
      → DB Layer.saveEmail({ email, eventName, eventDate, capturedAt, gdprConsent: true })
        → Success screen shown
          → Inactivity timer reset to normal
```

### Admin Export Flow
```
Admin taps "Export Emails"
  → DB Layer.getEmailsForEvent(eventName)
    → Returns email array
      → Config Layer.getCurrentEvent() → { name, date }
        → Build CSV string in memory
          → Trigger download via Blob URL
            → Clean up Blob URL after 60s
```

---

## IndexedDB Schema

### Database: `kioskDB` (version 1 → increment on schema changes)

#### Object Store: `products`
```
keyPath: 'id'  (Shopify product ID, string)

Fields:
  id              string    Shopify product ID ('gid://shopify/Product/123')
  handle          string    URL slug from Shopify
  title           string    Card name (search target)
  category        string    One of 8 category slugs (e.g. 'anime-manga')
  imageUrl        string    Original Shopify CDN URL (for re-sync reference)
  imageCacheKey   string    Cache API key for the locally-stored image blob
  imageWidth      number    400 (fetched at fixed width)
  tags            string[]  Shopify tags (for future filter expansion)
  updatedAt       string    ISO 8601, from Shopify — used for incremental sync diff
  syncedAt        string    ISO 8601, when this device synced this record
  isNew           boolean   True if added since last sync (cleared on next sync)

Indexes:
  'by_category'   category              (non-unique) — category filter < 100ms
  'by_title'      title                 (non-unique) — search range query
  'by_updated'    updatedAt             (non-unique) — incremental sync diff
  'by_synced'     syncedAt              (non-unique) — stale record detection
```

**Why store imageUrl alongside cache key:** Allows re-fetching a specific image if the cache entry is evicted without requiring a full sync.

**Note on images:** Images are NOT stored in IndexedDB as blobs. They are stored in the Cache API (service worker cache) keyed by a predictable URL. IndexedDB stores only the cache lookup key (effectively the local URL pattern). This avoids IndexedDB size pressure and aligns with how service workers intercept fetch requests.

#### Object Store: `emails`
```
keyPath: 'id'  (auto-increment)

Fields:
  id              number    Auto-increment PK
  email           string    Customer email address
  eventName       string    Event name at time of capture (from config)
  eventDate       string    YYYY-MM-DD from config
  capturedAt      string    ISO 8601 timestamp
  gdprConsent     boolean   Must be true (enforced in form, double-checked on write)

Indexes:
  'by_event'      eventName             (non-unique) — per-event CSV export
  'by_email'      email                 (non-unique) — deduplicate check
```

#### Object Store: `analytics`
```
keyPath: 'id'  (auto-increment)

Fields:
  id              number    Auto-increment PK
  type            string    Enum: 'card_view' | 'category_view' | 'search' | 'zero_result_search' | 'email_capture'
  eventName       string    Event name at time of action
  eventDate       string    YYYY-MM-DD
  cardId          string?   Populated for card_view
  category        string?   Populated for category_view
  query           string?   Populated for search / zero_result_search
  resultCount     number?   Populated for search
  ts              string    ISO 8601 timestamp

Indexes:
  'by_event'      eventName             (non-unique) — per-event analytics summary
  'by_type'       type                  (non-unique) — filter by event type
  'by_type_event' [type, eventName]     (compound, non-unique) — summary queries
```

#### Object Store: `syncMeta`
```
keyPath: 'key'  (single-row pattern — key is always 'main')

Fields:
  key             string    Always 'main'
  lastSyncAt      string    ISO 8601 of last completed sync
  lastCursor      string?   GraphQL cursor if sync was interrupted mid-paginate
  totalProducts   number    Count of products after last sync
  previousTotal   number    Count before last sync (to calculate "new" badge count)
  shopifyVersion  string?   API version string from last response headers
```

**Single-row pattern rationale:** Sync metadata is a single logical record. Using a fixed key avoids the overhead of a query and simplifies reads to `store.get('main')`.

---

## Service Worker Cache Strategy

### Cache Names (versioned for clean deploys)
```
APP_SHELL_CACHE  = 'shell-v1'
PRODUCT_CACHE    = 'products-v1'
```

Increment version suffix on deploy to force cache invalidation. Old caches are deleted in the `activate` event.

### Strategy: App Shell — Cache-First with Hard Versioning

```
Files cached on SW install:
  /index.html
  /manifest.json
  /css/app.css
  /js/app.js
  /js/router.js
  /js/db.js
  /js/config.js
  /js/sync.js
  /js/views/catalogue.js
  /js/views/admin.js
  /js/views/email.js
  /sw.js  ← NOT cached (browser always fetches sw.js fresh)
  /icons/icon-512.png
  /icons/icon-1024.png
  /icons/qr-code.png  ← pre-cached, always available

Fetch handler: cache-first, no fallback to network for shell files.
If cache miss (should not happen after install): return offline.html.
```

### Strategy: Product Images — Cache-First, Populated During Sync

```
Image URL pattern: /product-images/{productId}.jpg
  (local URL, not Shopify CDN — images are fetched during sync and stored locally)

Sync Layer fetches images and puts them into PRODUCT_CACHE via:
  cache.put(request, response)

Fetch handler: cache-first for /product-images/* pattern.
If cache miss: return placeholder.jpg (pre-cached in APP_SHELL_CACHE).
Never fetch from network during browse — offline by design.
```

### Strategy: Shopify API Calls — Network-Only, Admin Context Only

```
Pattern: api.myshopify.com/* or fetch to Shopify GraphQL endpoint

Fetch handler: network-only, no caching.
These requests only happen from the Admin sync screen.
If network unavailable: Sync Layer catches the error and reports to Admin Panel UI.
```

### Image Fetch During Sync — Predictable Local URL Pattern

```
Shopify returns: https://cdn.shopify.com/s/files/.../product.jpg?width=400
Sync Layer:
  1. Fetch the Shopify CDN URL
  2. Store response in PRODUCT_CACHE under key: /product-images/{shopifyProductId}.jpg
  3. Store that local key in IndexedDB products[id].imageCacheKey

Customer View requests: /product-images/{productId}.jpg
Service Worker intercepts: matches PRODUCT_CACHE → returns blob response
```

This decouples the rendered URL from Shopify's CDN entirely. Images work completely offline.

### SW Registration

```javascript
// In index.html inline script or app.js bootstrap:
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(reg => {
      // Check for updates when app becomes visible again
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) reg.update();
      });
    });
}
```

**iPadOS 16 note (MEDIUM confidence):** Safari on iPadOS 16 supports service workers fully. Storage quota for PWAs installed to home screen on iPadOS is significantly more generous than in-browser Safari sessions. The app should be used after "Add to Home Screen" installation to guarantee persistent storage. Do not rely on storage persistence APIs (`navigator.storage.persist()`) — they behave inconsistently in Safari; instead document that the app must be added to home screen.

---

## Single-Page App Routing Without a Framework

### Hash-Based Routing (Recommended for this use case)

```javascript
// Routes map
const ROUTES = {
  '#/'              : views.catalogue,
  '#/category/:id'  : views.catalogue,   // same view, different filter
  '#/card/:id'      : views.cardDetail,
  '#/email'         : views.email,
  '#/admin'         : views.admin,       // passcode gate inside admin view
};

// Route matching
function resolveRoute(hash) {
  for (const [pattern, handler] of Object.entries(ROUTES)) {
    const params = matchRoute(pattern, hash);
    if (params !== null) return { handler, params };
  }
  return { handler: views.catalogue, params: {} };
}

window.addEventListener('hashchange', () => render(resolveRoute(location.hash)));
```

**Why hash routing:** No server required (app is served from filesystem in some configs), no history API edge cases on iPad when installed to home screen, navigation state survives page refresh without 404 risk. Safari PWA home-screen installs handle hash routing correctly.

**Why NOT pushState:** Requires either a server rewriting all paths to index.html, or careful handling of direct URL loads. Unnecessary complexity for a single-device kiosk.

### View Lifecycle Pattern

```javascript
// Each view module exports: { mount(params), unmount() }
// Router calls unmount() on current view, then mount(params) on next view.
// Views manage their own DOM within a single #app-root container.
// No virtual DOM — direct DOM manipulation is fast enough for this scale.
```

---

## Admin / Customer Separation

### Separation Strategy: Single Codebase, Route-Gated

The admin panel is NOT a separate HTML file. It lives at `#/admin` within the same app shell, behind a passcode gate rendered by the admin view module itself.

```
Customer sees: #/, #/category/*, #/card/*, #/email
Admin sees:    #/admin (after passcode)

Trigger to reach #/admin: hidden tap zone (e.g. tap logo 5 times rapidly)
  → Router navigates to #/admin
    → Admin view renders passcode input
      → On correct entry: admin dashboard renders
        → Inactivity timer is SUSPENDED while admin panel is open
```

**Why single codebase vs separate HTML:** Avoids duplication of SW registration, DB initialization, and config loading. The admin panel needs access to all the same data layers as the customer view. Separation is enforced by the passcode gate and the hidden trigger — not by file separation.

**Passcode storage:** SHA-256 hash of passcode stored in localStorage key `kiosk_admin_hash`. On entry, hash the input and compare. Default passcode set at first launch via a setup screen.

---

## Patterns to Follow

### Pattern 1: DB Layer as Single Interface

All IndexedDB access goes through `db.js`. No view directly opens IDB transactions. This means:
- Schema version changes are isolated to one file
- Views never need to understand IDB transaction lifecycles
- DB Layer can be tested independently

```javascript
// db.js exposes a promise-based API:
export const db = {
  async getProducts({ category, search, limit, offset }) { ... },
  async upsertProducts(products) { ... },
  async saveEmail(emailRecord) { ... },
  async logEvent(analyticsRecord) { ... },
  async getSyncMeta() { ... },
  async setSyncMeta(meta) { ... },
  async getAnalyticsSummary(eventName) { ... },
  async getEmailsForEvent(eventName) { ... },
};
```

### Pattern 2: In-Memory Product Cache for Filter/Search Performance

On app start (and after sync), load all product metadata (NOT images) into a JS array in memory. 950 records at ~300 bytes each = ~285KB — comfortably fits in memory even on A9X. Filter and search operate against this in-memory array, not against IndexedDB queries. This achieves the < 100ms filter / < 300ms search targets.

```javascript
// app.js bootstrap:
let productCache = [];

async function warmProductCache() {
  productCache = await db.getAllProductMeta();
  // ~285KB array, loaded once, used for all filter/search operations
}

// After sync completes: call warmProductCache() again
```

IndexedDB is still used as the persistent store. The in-memory array is the read performance layer.

### Pattern 3: Sync Cursor Persistence for Resumable Sync

Shopify GraphQL pagination returns a cursor. After each page is processed and written to IDB, save the cursor to `syncMeta.lastCursor`. If sync is interrupted (network drop, user navigates away), the next sync attempt reads `lastCursor` and resumes from that page rather than starting over.

```javascript
// sync.js:
async function syncProducts(onProgress) {
  let cursor = (await db.getSyncMeta()).lastCursor || null;
  let pageCount = 0;

  while (true) {
    const page = await fetchProductPage(cursor);
    await db.upsertProducts(page.products);
    cursor = page.pageInfo.endCursor;
    await db.setSyncMeta({ lastCursor: cursor });

    pageCount++;
    onProgress({ pageCount, hasMore: page.pageInfo.hasNextPage });

    if (!page.pageInfo.hasNextPage) break;
  }

  await db.setSyncMeta({ lastCursor: null, lastSyncAt: new Date().toISOString() });
}
```

### Pattern 4: Virtual Scrolling for 950+ Card Grid

Rendering 950+ card thumbnails into the DOM simultaneously will cause jank on A9X hardware. Use a windowed rendering approach: only render the cards visible in the current viewport plus one page ahead/behind.

Implement a minimal virtual scroll without a library:
- Calculate item height (fixed — all cards same size)
- On scroll event (throttled to 16ms / ~60fps): recalculate visible window, update DOM
- Use `transform: translateY()` on a container div to position visible items
- Keep DOM node count to ~50-80 cards maximum at any time

This is the single most important performance pattern for the A9X target.

### Pattern 5: Inactivity Timer as a Central Service

The inactivity timer is a cross-cutting concern used by all views. Implement it in `app.js` as a service, not inside any individual view.

```javascript
// app.js:
const InactivityTimer = {
  _timeout: null,
  _duration: 60000,   // configurable, default 60s
  _graceOverride: null,

  set(durationMs) { this._duration = durationMs; },
  suspend() { clearTimeout(this._timeout); this._timeout = null; },
  resume() { this.reset(); },
  reset() {
    clearTimeout(this._timeout);
    if (this._graceOverride) return;
    this._timeout = setTimeout(() => showCountdownThenHome(), this._duration);
  },
  setGrace(ms) {
    this._graceOverride = true;
    setTimeout(() => { this._graceOverride = false; this.reset(); }, ms);
  },
};

// Touch/click events on document bubble up and call InactivityTimer.reset()
// Email form calls InactivityTimer.setGrace(180000) on mount
// Admin panel calls InactivityTimer.suspend() on mount, resume() on unmount
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Image Blobs in IndexedDB

**What:** Storing image binary data as blobs in IndexedDB object stores.
**Why bad:** IndexedDB is not optimised for binary blob storage at this scale (950 images). Reads are slower than Cache API for binary assets. Cache API is designed for this purpose and integrates directly with service worker fetch interception.
**Instead:** Store images in Cache API under predictable local URL keys. Store only the URL key string in IndexedDB.

### Anti-Pattern 2: Querying IndexedDB for Every Keystroke

**What:** Running a `getAll()` or cursor-based range scan on every search input event.
**Why bad:** IDB transactions have overhead. 150ms debounce + IDB query still risks missing the < 300ms target on A9X, and creates unnecessary IDB contention with write operations.
**Instead:** Warm an in-memory product array at startup (Pattern 2 above). Search operates on the array, not IDB.

### Anti-Pattern 3: Rendering All 950 Cards to DOM

**What:** `products.forEach(p => container.appendChild(createCard(p)))` for all 950 products.
**Why bad:** 950 DOM nodes with images will exhaust the A9X GPU memory budget and cause scroll jank.
**Instead:** Virtual scroll (Pattern 4 above). Only ~50-80 nodes in DOM at a time.

### Anti-Pattern 4: Network Requests During Browse

**What:** Fetching product images or data from Shopify during the customer browse session.
**Why bad:** Kiosk is used at events — wi-fi may be congested, captive portal, or unavailable. Any network dependency during browse creates visible failure states.
**Instead:** All assets pre-cached before event. Service worker returns cached asset or placeholder. Network errors are only possible during admin sync (correct and expected).

### Anti-Pattern 5: Multiple HTML Files / iframes for Admin

**What:** `admin.html` loaded in an iframe or as a separate page.
**Why bad:** Separate page means re-initialising IDB, re-registering SW, losing in-memory product cache, and complicating navigation back to customer view.
**Instead:** Admin as a route-gated view within the same SPA (see Admin/Customer Separation above).

### Anti-Pattern 6: localStorage for Product Data

**What:** Storing product records in localStorage.
**Why bad:** localStorage has a 5-10MB browser limit. 950 products + metadata will easily exceed this.
**Instead:** IndexedDB for all product, email, and analytics data. localStorage only for small config values (passcode hash, event name, timer setting).

### Anti-Pattern 7: Uncached Service Worker on iPadOS

**What:** Registering the service worker without accounting for Safari's aggressive SW lifecycle.
**Why bad:** Safari on iPadOS can terminate service workers during extended inactivity. If the app is left idle at an event and the SW is terminated, the next user interaction may trigger a brief re-activation delay.
**Instead:** Keep the service worker's `fetch` handler lightweight (cache-first is very fast). Accept that SW may re-activate from dormancy — this is transparent to users because the cache is still intact. Do not rely on SW in-memory state between fetch events.

---

## Suggested Build Order (Dependency Graph)

```
Phase 1: Foundation
  sw.js (cache shell files) ← no dependencies
  index.html + app shell CSS ← no dependencies
  manifest.json ← no dependencies
  js/db.js (IDB schema + API) ← no dependencies
  js/config.js (localStorage wrapper) ← no dependencies

Phase 2: Navigation Shell
  js/router.js ← needs index.html
  js/app.js (bootstrap, event bus, inactivity timer) ← needs router, config

Phase 3: Data Sync
  js/sync.js (Shopify GraphQL pagination) ← needs db.js
  js/views/admin.js (sync trigger, progress) ← needs sync.js, db.js, config.js

Phase 4: Customer View
  js/views/catalogue.js (grid, filter, search) ← needs db.js, in-memory cache from app.js
  Virtual scroll implementation ← needs catalogue view

Phase 5: Supporting Views
  js/views/email.js (email capture) ← needs db.js, config.js
  js/views/card-detail.js (single card view) ← needs db.js

Phase 6: Analytics & Polish
  Analytics logging in all views ← needs db.js in all views (hook in)
  Admin analytics summary ← needs db.js analytics queries
  Export CSV logic ← needs db.js email queries
  "NEW" badge logic ← needs syncMeta from db.js
  Inactivity countdown UI ← needs app.js InactivityTimer service
```

**Critical path:** `db.js` must be complete before any view can be built. `app.js` (including inactivity timer) must be complete before views are integrated into the shell. Sync and customer view can be built in parallel after Phase 2.

---

## Scalability Considerations

This is a fixed-scale kiosk application. Scalability is not a concern in the traditional sense. Instead, the constraints are hardware ceiling and storage budget:

| Concern | Current (950 products) | At 2000 products | Mitigation |
|---------|----------------------|-----------------|------------|
| In-memory product array | ~285KB — fine | ~600KB — fine | No change needed |
| DOM node count | 50-80 (virtual scroll) | 50-80 (virtual scroll) | No change needed |
| Cache storage (images) | 200-400MB | 400-800MB | Monitor; iPad Pro has 128GB+ storage |
| IDB write time on full sync | ~10-20 seconds | ~20-40 seconds | Acceptable for pre-event sync |
| IDB read on search | In-memory, not IDB | In-memory, not IDB | No change needed |
| Analytics store growth | ~1KB per session event | Unbounded over years | Add analytics pruning to admin (keep last N events) |

---

## iPadOS 16 / Safari Specific Notes

**Confidence: MEDIUM** — Based on documented Safari PWA behaviour through 2024; verify against current Safari release notes before implementation.

- **Storage quota:** Installed PWAs (home screen) on iOS 16+ get up to ~50% of available disk space as quota. 200-400MB for images is well within this. In-browser Safari sessions have much lower quotas — irrelevant if installed to home screen.
- **IDB persistence:** Safari no longer deletes PWA data after 7 days if the PWA is installed to home screen (this restriction was lifted in iOS 16.4+). Verify this applies to iPadOS 16 on the specific device.
- **Service worker scope:** Must be served from the same origin. File:// protocol does not support service workers — the app must be served via a local HTTP server or HTTPS. For static file serving from the filesystem, use a minimal local server (e.g. Python http.server during dev; for production, serve via a simple web server or host on a static host).
- **Cache API in Safari:** Fully supported on iPadOS 16. Cache API storage shares the same quota as IDB.
- **Guided Access compatibility:** Service workers and IndexedDB continue to function normally under Guided Access — Guided Access only restricts user navigation, not browser APIs.

---

## Sources

- Confidence basis: Web Platform documentation, MDN Web Docs, web.dev offline cookbook patterns (HIGH confidence for all established web platform APIs)
- Safari PWA storage behaviour: Medium confidence — based on iOS 15.4+ release notes and community reports through 2024. Verify against current WebKit release notes.
- A9X performance characteristics: Medium confidence — based on published Apple specs and community benchmarks for iPad Pro 1st Gen (2015 hardware)
- Shopify Storefront API GraphQL pagination pattern: HIGH confidence — stable, well-documented API
