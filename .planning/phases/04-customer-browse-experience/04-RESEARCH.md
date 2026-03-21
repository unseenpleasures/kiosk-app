# Phase 4: Customer Browse Experience - Research

**Researched:** 2026-03-21
**Domain:** Virtual scrolling, in-memory filtering, IntersectionObserver, CSS Grid layout, analytics logging
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Grid layout**
- D-01: 5 columns, fixed for the 12.9" landscape iPad viewport
- D-02: Card cells are portrait aspect ratio (2:3 preferred)
- D-03: Each grid card shows: product thumbnail image + card name strip below image
- D-04: "NEW" badge overlaid on card thumbnail (top-right corner) for cards added since previous sync; detected via `createdAt` vs. `lastSyncAt` in `sync_meta`

**Search and filter bar**
- D-05: Single sticky header bar across top of catalogue screen — search field on left, category chips scrolling to the right on the same row
- D-06: Category chips are single-select toggle; tapping the active chip deselects it (no "All" chip)
- D-07: When both a category chip AND a search term are active: AND filter — show only cards matching both
- D-08: Search operates in-memory on the product array (Array.filter + String.includes) — no IDB query on each keystroke
- D-09: Categories derived from the `category` field on each synced product — do NOT hardcode; derive from in-memory product array at startup

**Card detail view**
- D-10: Full-screen takeover on card tap — replaces the grid view via `#/card/:id` route
- D-11: Detail view shows: large product image (centred, portrait) + card name (below, large) + two fixed pricing lines: "Standard — £7" and "Personalised — £10"
- D-12: Pricing is fixed for all cards — no per-card price from Shopify
- D-13: Exit via a dedicated back (←) button in detail view; global home button also returns to `#/`
- D-14: No swipe-to-dismiss, no tap-outside-to-dismiss — explicit button only

**Idle timer — email grace period (CAT-10)**
- D-15: Idle timer must NOT fire while user is on `#/email` route; suppress/extend countdown when hash is `#/email`. 3-minute grace period means idle timer does not start counting until user navigates away from email screen. Wire in `idle.js` using current route hash.

**Analytics logging**
- D-16: All analytics writes go through `db.js` using `dbAdd('analytics', {...})` — no direct IDB in catalogue.js
- D-17: Log card view: `{ type: 'card_view', cardId, cardName, timestamp, eventName }`
- D-18: Log category filter: `{ type: 'category_filter', category, timestamp, eventName }`
- D-19: Log search: `{ type: 'search', query, resultCount, zeroResult: boolean, timestamp, eventName }`
- D-20: `eventName` for all analytics events comes from `config.js` (`Config.getEventName()`)

**Home button state reset (app.js)**
- D-21: `initHomeButton` in `app.js` currently has a TODO at line ~172; Phase 4 must clear in-memory filter and search state on home button tap (set active category to null, clear search query string, reset the search input value)

**Virtual scroll**
- D-22: IntersectionObserver-based sentinel approach — maintain a visible window of ~80 DOM card nodes; prepend/append as user scrolls. Do NOT rely on `content-visibility: auto` (CONFIRMED NOT SUPPORTED in Safari 16 — only added in Safari 18.0)

### Claude's Discretion
- Exact virtual scroll window sizing and sentinel placement
- Debounce delay for search input (keep under 300ms total — 150ms debounce is reasonable)
- CSS Grid column template and gap values for the 5-column layout
- Transition/animation for detail view entry (keep lightweight for A9X — CSS only)
- Placeholder state while card images are loading (neutral background or skeleton)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAT-01 | Attendee can browse a full-screen thumbnail grid of all 950+ cards with lazy loading and virtual scrolling | IntersectionObserver sentinel pattern; windowed DOM of ~80 nodes; Cache API serves images |
| CAT-02 | Attendee can filter the grid by one of 8 categories instantly (< 100ms response) | In-memory Array.filter on pre-loaded product array; category chips derive from data not hardcode |
| CAT-03 | Attendee can search cards in real-time by name or character (results appear < 300ms) | In-memory Array.filter + String.includes; 150ms debounce stays well under 300ms budget |
| CAT-04 | All search queries including zero-result searches are logged with timestamp | dbAdd('analytics', ...) call on every search event; zeroResult boolean flag in schema |
| CAT-05 | Attendee can tap a card to view a larger image and card name | `#/card/:id` route replaces grid; detail view renders from in-memory product array |
| CAT-06 | Cards added since previous sync are badged "NEW" | Compare product.createdAt vs. sync_meta lastSyncAt loaded at boot; badge applied during render |
| CAT-10 | Email sign-up form has a 3-minute inactivity grace period | Route-aware check in idle.js; pauseIdleTimer()/resumeIdleTimer() already exist; wire to hashchange |
| ANALYTICS-01 | Every card detail view is logged with card ID, card name, and timestamp | dbAdd('analytics', { type: 'card_view', cardId, cardName, timestamp, eventName }) |
| ANALYTICS-02 | Every category filter selection is logged with category name and timestamp | dbAdd('analytics', { type: 'category_filter', category, timestamp, eventName }) |
| ANALYTICS-03 | Every search query is logged; zero-result searches flagged separately | dbAdd('analytics', { type: 'search', query, resultCount, zeroResult, timestamp, eventName }) |
</phase_requirements>

---

## Summary

Phase 4 is the primary customer-facing view of the kiosk. It replaces three stub functions in `router.js` with real screen renderers: a virtual-scrolled catalogue grid, a category+search filter bar, and a full-screen card detail view. All interactions are logged to IndexedDB via `db.js`. The idle timer is made route-aware to grant the email screen a 3-minute grace period.

The dominant technical challenge is virtual scrolling 950+ cards on 2015-era A9X hardware without dropping frames. The sentinel-based IntersectionObserver approach (already mandated in D-22) is the correct pattern. All data is pre-loaded from IndexedDB into an in-memory array at boot — no IDB queries on keystroke or scroll. Search and filter run on the in-memory array, making sub-100ms filter and sub-300ms search response straightforward.

A critical finding confirmed during research: `content-visibility: auto` is NOT available in Safari 16 — it only shipped in Safari 18.0 (Baseline September 2024). The project's A9X iPad runs iPadOS 16, which caps at Safari 16.x. The virtual scroll implementation must use the IntersectionObserver sentinel approach exclusively. No `content-visibility` shortcut.

**Primary recommendation:** Build a `catalogue.js` module that owns the in-memory product array, the virtual scroll state machine, the filter/search logic, and all analytics dispatches. Keep `router.js` as a thin dispatcher only.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| IntersectionObserver API | Browser-native (Safari 12.1+) | Sentinel detection for virtual scroll and image lazy load | No scroll event polling; GPU-efficient; supported on A9X |
| CSS Grid | Browser-native | 5-column thumbnail grid layout | Fixed columns + fixed aspect ratio cells = predictable row heights |
| Array.filter + String.includes | ES5 | In-memory search and category filtering | 950 items is trivially fast; zero async overhead on each keystroke |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| setTimeout (debounce) | Browser-native | Debounce search input keystrokes | 150ms delay keeps total search time well under 300ms budget |
| Cache API (caches) | Browser-native | Serve cached product images offline | Images were pre-cached during sync; served via SW cache-first strategy |
| requestAnimationFrame | Browser-native | Batch DOM mutations during scroll | Use when appending/removing nodes to avoid layout thrashing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| IntersectionObserver sentinel | Scroll event listener | Scroll events fire on every pixel; fires 60fps; defeats performance goal on A9X |
| IntersectionObserver sentinel | content-visibility: auto | NOT supported in Safari 16 (only Safari 18+); cannot use |
| In-memory Array.filter | IDB index query on each keystroke | Async IDB query has overhead; 950 items fit easily in memory; in-memory is faster |
| CSS Grid 5-column | Flexbox wrapping | Flexbox wrapping produces unequal final row; CSS Grid is authoritative for 2D layouts |

**Installation:** No packages. All browser-native APIs.

---

## Architecture Patterns

### Recommended File Structure

```
src/
├── catalogue.js     # NEW — owns all browse logic (virtual scroll, filter, search, analytics)
├── router.js        # MODIFY — replace 3 stubs with real render calls
├── app.js           # MODIFY — add product array warm-up at boot + home button state reset
├── idle.js          # MODIFY — add route-aware email screen grace period
styles/
├── main.css         # MODIFY — add catalogue grid, card tile, filter bar, detail view CSS
```

### Pattern 1: In-Memory Product Array at Boot

**What:** Load all 951 products from IndexedDB once at app boot, cache in a module-level variable. Also load `lastSyncAt` from `sync_meta`. All subsequent operations (search, filter, virtual scroll rendering, NEW badge detection) read from this array — zero IDB queries during browsing.

**When to use:** Always. 951 products × ~200 bytes each = ~190 KB RAM — well within the A9X memory budget.

**Example:**
```javascript
// In catalogue.js
var _products = [];          // full product array, loaded once
var _filtered = [];          // currently filtered/searched subset
var _lastSyncAt = null;      // ISO string from sync_meta

function initCatalogue() {
  return Promise.all([
    dbGetAll('products'),
    dbGet('sync_meta', 'lastSyncAt')
  ]).then(function(results) {
    _products = results[0];
    var syncMeta = results[1];
    _lastSyncAt = syncMeta ? syncMeta.value : null;
    _filtered = _products.slice();
    // derive categories from data
    _categories = deriveCategoriesFromProducts(_products);
  });
}
```

### Pattern 2: IntersectionObserver Sentinel Virtual Scroll

**What:** The grid container holds ~80 card DOM nodes at any time (a visible window). Two invisible sentinel elements — one above the window (top sentinel) and one below (bottom sentinel) — are observed. When the bottom sentinel enters the viewport, append the next batch and remove an equal batch from the top. When the top sentinel enters the viewport, prepend from above and remove from the bottom. A spacer element at top and bottom uses CSS `height` to simulate the full scroll height of all items.

**When to use:** Any time the filtered set exceeds the window size (~80 nodes).

**Key variables:**
- `_windowStart`: index into `_filtered` of the first rendered card
- `_windowSize`: 80 (constant — 5 columns × 16 rows)
- `_batchSize`: 15–20 cards per scroll event (5 columns × 3–4 rows)
- `_cardHeight`: calculated from first rendered card height (fixed per 2:3 aspect ratio)

**Sentinel approach:**
```javascript
// Append sentinel triggers forward scroll
var _bottomSentinel = document.createElement('div');
_bottomSentinel.className = 'scroll-sentinel scroll-sentinel--bottom';

var _observer = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (!entry.isIntersecting) { return; }
    if (entry.target === _bottomSentinel) {
      appendNextBatch();
    } else if (entry.target === _topSentinel) {
      prependPrevBatch();
    }
  });
}, { rootMargin: '200px 0px' });  // 200px lookahead prevents pop-in

_observer.observe(_bottomSentinel);
_observer.observe(_topSentinel);
```

**Why rootMargin '200px 0px':** Triggers batch load before the sentinel reaches the visible edge, preventing the user from scrolling into an empty gap. 200px is approximately 2 portrait card rows at the expected card height.

### Pattern 3: Filter + Search State Machine

**What:** A single `applyFilters()` function computes `_filtered` from `_products` using the current `_activeCategory` and `_searchQuery` state. After each state change, `applyFilters()` is called, then the virtual scroll is reset and re-rendered from index 0 of the new `_filtered` array.

**When to use:** On category chip tap, on search input change (debounced), on home button tap (resets both to null/"").

```javascript
var _activeCategory = null;   // null = no filter
var _searchQuery = '';        // '' = no search

function applyFilters() {
  _filtered = _products.filter(function(p) {
    var categoryMatch = !_activeCategory || p.category === _activeCategory;
    var searchMatch = !_searchQuery ||
      p.title.toLowerCase().indexOf(_searchQuery) !== -1;
    return categoryMatch && searchMatch;
  });
  resetVirtualScroll();
  renderGrid();
}
```

**Note:** `String.prototype.includes()` is ES2015 and IS supported in Safari 9+. Use it here. `indexOf() !== -1` is the ES5 fallback — either is safe, but `indexOf` matches the ES2017-conservative style already in this codebase.

### Pattern 4: Category Derivation (D-09)

**What:** At init time, build the list of unique category names from the in-memory product array. Sort alphabetically for consistent chip order.

```javascript
function deriveCategoriesFromProducts(products) {
  var seen = {};
  var categories = [];
  products.forEach(function(p) {
    if (p.category && !seen[p.category]) {
      seen[p.category] = true;
      categories.push(p.category);
    }
  });
  return categories.sort();
}
```

### Pattern 5: "NEW" Badge Detection (CAT-06)

**What:** Compare each product's `createdAt` ISO string against `_lastSyncAt`. A product is "new" if `createdAt > lastSyncAt`. Both values are ISO strings — lexicographic comparison works correctly.

```javascript
function isNewCard(product) {
  if (!_lastSyncAt) { return false; }
  return product.createdAt > _lastSyncAt;
}
```

**Note:** `sync_meta` stores `lastSyncAt` as `{ key: 'lastSyncAt', value: '2026-03-21T10:00:00.000Z' }`. The `dbGet('sync_meta', 'lastSyncAt')` call returns this object — access `.value` for the ISO string.

### Pattern 6: Debounced Search Input

**What:** Wire the search input's `input` event to a debounced handler. The debounce clears and resets a `setTimeout`. After 150ms of inactivity on the input, `applyFilters()` runs and the analytics event is logged.

```javascript
var _searchDebounceTimer = null;

function onSearchInput(event) {
  clearTimeout(_searchDebounceTimer);
  var query = event.target.value.toLowerCase().trim();
  _searchDebounceTimer = setTimeout(function() {
    _searchQuery = query;
    applyFilters();
    // Log search analytics (only log when debounce settles)
    dbAdd('analytics', {
      type: 'search',
      query: query,
      resultCount: _filtered.length,
      zeroResult: _filtered.length === 0,
      timestamp: new Date().toISOString(),
      eventName: Config.getEventName()
    });
  }, 150);
}
```

### Pattern 7: Route-Aware Idle Timer Grace Period (CAT-10, D-15)

**What:** The `#/email` route requires a 3-minute grace period — the idle countdown must not start while the user is on that screen. The existing `idle.js` already has `pauseIdleTimer()` and `resumeIdleTimer()` functions. The implementation approach is to hook into the router's `hashchange` event.

**Implementation:** In `idle.js`, add a `hashchange` listener that calls `pauseIdleTimer()` when the hash becomes `#/email` and `resumeIdleTimer()` when the hash changes away from `#/email`.

```javascript
// In idle.js — add after initIdleTimer()
function initEmailGracePeriod() {
  window.addEventListener('hashchange', function() {
    if (window.location.hash === '#/email') {
      pauseIdleTimer();
    } else if (_active === false) {
      // Only resume if we were paused for email (not admin)
      resumeIdleTimer();
    }
  });
}
```

**Caution:** The admin panel also uses `pauseIdleTimer()` (implicitly, since it was in scope). Check whether `idle.js` currently handles admin pause — if so, the hashchange handler must only resume from email pause, not admin pause. Research the existing idle.js: it has `pauseIdleTimer()` and `resumeIdleTimer()` but no built-in route awareness. The simplest safe approach is to track a `_pausedForEmail` boolean to distinguish email pauses from other pauses.

### Anti-Patterns to Avoid

- **Scroll event listener for virtual scroll:** `scroll` events fire synchronously on every pixel; use IntersectionObserver sentinels instead.
- **Clearing `#app` innerHTML on every filter change:** This destroys and rebuilds all 80 DOM nodes. Instead, update the `_filtered` array and re-render only when filter changes reset the window.
- **IDB query on each keystroke:** All filtering runs on `_products` in memory; IDB is only accessed once at boot.
- **Mutating DOM inside the IntersectionObserver callback:** Queue DOM changes via `requestAnimationFrame` to batch layout calculations.
- **`content-visibility: auto` on card tiles:** Not supported in Safari 16 — will silently do nothing, causing the planner to believe it's working when it is not.
- **Using ES2020+ optional chaining (`?.`) or nullish coalescing (`??`):** Established codebase convention is ES2017 subset; use explicit null checks.
- **`var` vs `let`/`const`:** Existing codebase uses `var` throughout. Follow the same convention.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debounce | Custom timer management with complex cleanup | Simple `clearTimeout` + `setTimeout` pattern (Pattern 6 above) | 10 lines is sufficient; no library needed |
| Virtual scroll | Full position-based virtual scroller with scroll position math | IntersectionObserver sentinel approach (Pattern 2) | Avoids continuous scroll event overhead; only fires on sentinel visibility change |
| Image lazy load | Manual scroll position calculation for images | IntersectionObserver on each `<img>` element | Browser handles viewport intersection; zero math required |
| Category list | Hardcoded array of 8 category names | Derived at runtime from product array (Pattern 4) | Hardcoding breaks if Shopify categories change between syncs |

**Key insight:** The in-memory product array is the performance foundation. 950 items are trivially fast for JavaScript array operations. The virtual scroll only exists to cap DOM node count — not because the data operations are slow.

---

## Common Pitfalls

### Pitfall 1: content-visibility: auto Does Nothing on Safari 16
**What goes wrong:** Implementing `content-visibility: auto` on card tiles believing it will improve scroll performance. It silently has no effect on Safari 16 (only added in Safari 18.0).
**Why it happens:** MDN and caniuse show green for modern browsers; the A9X target is frequently forgotten.
**How to avoid:** Do not use it. Virtual scroll via IntersectionObserver is the only viable approach on this device.
**Warning signs:** Performance profiler showing full DOM of 950+ nodes despite belief that content-visibility was constraining render work.

### Pitfall 2: IntersectionObserver Fires Before DOM Is Painted
**What goes wrong:** The observer is set up on sentinels before the grid container is appended to the DOM, or before card heights are known. The observer fires immediately with incorrect intersection state.
**Why it happens:** IntersectionObserver fires synchronously on the next microtask after `observe()` is called if the element is already intersecting.
**How to avoid:** Append the grid container to `#app` before calling `_observer.observe()`. Ensure the first batch of cards is rendered before the sentinels are observed.

### Pitfall 3: Spacer Height Calculation Error Causes Layout Jump
**What goes wrong:** The top spacer height is calculated from `_windowStart * cardHeight` but `cardHeight` is taken before layout has been calculated. The result is a wrong spacer height that causes the scroll position to jump when navigating back to the catalogue.
**Why it happens:** `offsetHeight` on a newly-created element returns 0 until it has been laid out.
**How to avoid:** Calculate `cardHeight` from an already-painted card node. Use `requestAnimationFrame` to defer spacer recalculation until after first paint.

### Pitfall 4: Filter/Search Reset Does Not Reset Scroll Position
**What goes wrong:** Applying a filter returns a smaller result set, but the grid scroll position is retained from before the filter. The user sees an empty area.
**Why it happens:** The scroll container `scrollTop` is not reset when `_filtered` changes.
**How to avoid:** On every `applyFilters()` call, reset `_windowStart = 0` and set the grid container's `scrollTop = 0` before re-rendering.

### Pitfall 5: Analytics Logged on Every Keystroke Instead of Debounce Settlement
**What goes wrong:** The search analytics event fires on every character typed, flooding the analytics store with partial queries.
**Why it happens:** The `dbAdd` call is placed inside the raw `input` event handler instead of inside the debounce callback.
**How to avoid:** Log analytics only inside the debounced callback after `applyFilters()` resolves (Pattern 6 above).

### Pitfall 6: Back Button Conflicts with Global Home Chrome Button
**What goes wrong:** The detail view back button is positioned at top-left, overlapping or competing visually with the `#chrome-home` button (position: fixed, top: 16px, left: 16px, z-index: 100).
**Why it happens:** The chrome home button is fixed-position at z-index 100 on every screen. The detail view back button cannot be placed at the same coordinates.
**How to avoid:** The CONTEXT.md specifics suggest "Back to browse" as text label placed further in from the edge, or position the back button at top-left but inside the detail screen flow below the chrome button. Use a text button at approximately `top: 80px, left: 16px` (clearing the 48px home button plus 16px gap). Alternatively use a text link style rather than an icon button to reduce visual conflict. The back button can also go below the card image rather than top-left.

### Pitfall 7: sync_meta lastSyncAt Object Shape
**What goes wrong:** `dbGet('sync_meta', 'lastSyncAt')` returns `{ key: 'lastSyncAt', value: '2026-03-21T...' }` — the full record object, not the ISO string. Code that compares `createdAt > lastSyncAt` when `lastSyncAt` is an object will always evaluate correctly as a string comparison against `'[object Object]'`, producing wrong NEW badge results.
**Why it happens:** The sync_meta store uses `{ key, value }` shape (established in Phase 2/3). Developers may assume `dbGet` returns the value directly.
**How to avoid:** Always access `.value` from sync_meta records: `var lastSyncAt = syncMeta ? syncMeta.value : null`.

### Pitfall 8: Category Chip Tap Logs Analytics Even When Same Chip Is Tapped Again
**What goes wrong:** Tapping the active chip deselects it (D-06). If the deselect tap also fires a category_filter analytics event with `category: null`, the analytics data contains meaningless deselect events.
**Why it happens:** The analytics log call is unconditional in the chip tap handler.
**How to avoid:** Only log `category_filter` analytics when a chip is being selected (not when deselected). Or log deselect as a separate noop. Simplest: only log when `category !== null` after state update.

---

## Code Examples

Verified patterns from codebase and browser APIs:

### CSS Grid: 5-Column Portrait-Ratio Grid
```css
/* Source: CONTEXT.md D-01, D-02 */
.catalogue-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-sm);   /* 8px — Claude's discretion */
  padding: var(--space-sm);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;  /* smooth momentum scroll on iOS */
}

.card-tile {
  position: relative;
  aspect-ratio: 2 / 3;   /* portrait — D-02 */
  background: var(--color-surface);
  border-radius: 4px;
  overflow: hidden;
}
```

**Note:** `aspect-ratio` is supported in Safari 15+. The A9X runs iPadOS 16 / Safari 16.x — safe to use.

### Card Tile Structure (DOM)
```javascript
/* Source: CONTEXT.md D-03, D-04 — established screen render pattern */
function createCardTile(product, isNew) {
  var tile = document.createElement('div');
  tile.className = 'card-tile';
  tile.dataset.id = product.id;

  var img = document.createElement('img');
  img.className = 'card-tile-image';
  img.alt = product.imageAlt || product.title;
  img.loading = 'lazy';            // native lazy load (belt)
  // src set after IntersectionObserver fires (suspenders)
  tile.appendChild(img);

  if (isNew) {
    var badge = document.createElement('span');
    badge.className = 'card-tile-badge';
    badge.textContent = 'NEW';
    tile.appendChild(badge);
  }

  var label = document.createElement('div');
  label.className = 'card-tile-label';
  label.textContent = product.title;
  tile.appendChild(label);

  tile.addEventListener('click', function() {
    window.location.hash = '#/card/' + product.id;
  });

  return tile;
}
```

### Screen Render Pattern (established in codebase)
```javascript
/* Source: router.js existing stub pattern — follow exactly */
function renderCatalogue() {
  var app = document.getElementById('app');
  app.innerHTML = '';
  var screen = document.createElement('div');
  screen.className = 'screen';
  screen.id = 'screen-catalogue';
  // ... add filter bar, grid container, sentinels ...
  app.appendChild(screen);
}
```

### Route Table Update (router.js)
```javascript
/* Source: router.js lines 10-14 */
// Change:
'#/':      renderCatalogueStub,
// To:
'#/':      renderCatalogue,

// And change the prefix match dispatchers:
// renderCategoryStub(categoryId) → renderCategory(categoryId)  [or fold into renderCatalogue]
// renderCardStub(cardId) → renderCard(cardId)
```

**Note on `#/category/:id`:** CONTEXT.md D-05 specifies that the filter bar is on the catalogue screen itself — not a separate screen per category. The `#/category/:id` route may remain as a stub or be redirected to `#/` with the category chip pre-selected. Confirm this during planning — the safest approach is to route `#/category/:id` back to `#/` and programmatically set the active category filter.

### Idle Timer Email Grace Period
```javascript
/* Source: idle.js — pauseIdleTimer() and resumeIdleTimer() already exist */
// Add to idle.js:
var _pausedForEmail = false;

function initEmailGracePeriod() {
  window.addEventListener('hashchange', function() {
    var hash = window.location.hash;
    if (hash === '#/email') {
      _pausedForEmail = true;
      pauseIdleTimer();
    } else if (_pausedForEmail) {
      _pausedForEmail = false;
      resumeIdleTimer();
    }
  });
}
```

### Analytics Write (via db.js)
```javascript
/* Source: CONTEXT.md D-16 through D-20, db.js dbAdd signature */
function logCardView(cardId, cardName) {
  dbAdd('analytics', {
    type: 'card_view',
    cardId: cardId,
    cardName: cardName,
    timestamp: new Date().toISOString(),
    eventName: Config.getEventName()
  });
  // Fire-and-forget — do not block render on analytics write
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Scroll event listeners for lazy load | IntersectionObserver | Safari 12.1 (2018) | No scroll event overhead; fires only on visibility change |
| content-visibility: auto for render perf | IntersectionObserver windowing | N/A — content-visibility Safari 18 only | Cannot use content-visibility on target device |
| Separate route per category (`#/category/:id`) | Filter state on catalogue screen | CONTEXT.md D-05 decision | Simpler UX — no page reload on chip tap |

**Deprecated/outdated:**
- `content-visibility: auto`: Added Safari 18 only — completely unavailable on Safari 16 target. Do not use.
- Polling with `setInterval` for scroll position: Replaced by IntersectionObserver.
- `window.onscroll` for virtual scroll: Fires too frequently; use IntersectionObserver sentinels.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected in project |
| Config file | None — no jest.config.*, no vitest.config.*, no pytest.ini found |
| Quick run command | Manual browser test on local dev server (`python3 -m http.server 8080`) |
| Full suite command | Manual verification checklist per success criteria |

No automated test infrastructure exists in this project. The no-library, no-build-tools constraint means standard JS test frameworks (Jest, Vitest) are not in use. Validation is manual, browser-based.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAT-01 | Grid renders 950+ cards without DOM holding >80 nodes | manual | DevTools Element Inspector: count `.card-tile` nodes while scrolling | N/A |
| CAT-02 | Category filter returns results in <100ms | manual | DevTools Performance: measure time from chip tap to grid repaint | N/A |
| CAT-03 | Search shows results in <300ms | manual | DevTools Performance: measure time from debounce settle to grid repaint | N/A |
| CAT-04 | Zero-result searches logged with zeroResult:true | manual | IndexedDB viewer in Safari DevTools: inspect analytics store after zero-result search | N/A |
| CAT-05 | Card tap opens detail view with large image and name | manual | Tap a card tile; verify detail screen renders with image, name, pricing | N/A |
| CAT-06 | NEW badge appears on cards created after lastSyncAt | manual | Set `_lastSyncAt` to a future date temporarily; verify badges appear | N/A |
| CAT-10 | Idle countdown does not fire on #/email | manual | Navigate to #/email stub; wait 65 seconds; verify no countdown appears | N/A |
| ANALYTICS-01 | card_view written to analytics store on card tap | manual | Safari DevTools IndexedDB viewer: inspect analytics after tapping a card | N/A |
| ANALYTICS-02 | category_filter written on chip selection | manual | Safari DevTools IndexedDB viewer: inspect analytics after tapping a chip | N/A |
| ANALYTICS-03 | search event written with zeroResult flag | manual | Safari DevTools IndexedDB viewer: inspect analytics after searching | N/A |

### Sampling Rate
- **Per task commit:** Load app in browser, verify the implemented feature renders without JS errors in console
- **Per wave merge:** Full manual checklist against all 10 requirements above
- **Phase gate:** All 6 success criteria from ROADMAP.md verified as TRUE before `/gsd:verify-work`

### Wave 0 Gaps
None — no test infrastructure to create. All validation is manual and browser-based per project conventions.

---

## Open Questions

1. **How should `#/category/:id` route be handled?**
   - What we know: CONTEXT.md D-05 places filtering on the catalogue screen, not separate screens. The route `#/category/:id` is currently a stub in `router.js`.
   - What's unclear: Should `renderCategory(categoryId)` pre-select the chip and show the catalogue grid, or should the `#/category/:id` route redirect to `#/` and programmatically set category state?
   - Recommendation: Redirect `#/category/:id` to `#/` during planning and set `_activeCategory = categoryId` before rendering. This avoids maintaining a separate screen render function for essentially the same view.

2. **Back button placement vs. home chrome button**
   - What we know: The home chrome button is `position: fixed; top: 16px; left: 16px; width: 48px; height: 48px; z-index: 100`. The detail view back button must not overlap it.
   - What's unclear: Exact position is at planner/implementer discretion per CONTEXT.md.
   - Recommendation: Position detail view back button at `top: 72px; left: 16px` (home button bottom edge ~64px + 8px gap), or use "‹ Back to browse" text below the top chrome area. Document the chosen coordinates in the plan.

3. **Virtual scroll row height for spacer calculation**
   - What we know: CSS Grid with `aspect-ratio: 2/3` and `repeat(5, 1fr)` means card width = `(viewportWidth - padding - gaps) / 5` and card height = `cardWidth * 3/2`. At 1366px viewport with 8px padding and 8px gaps: card width ≈ (1366 - 16 - 32) / 5 = 263.6px, card height ≈ 395px. Row height = 395px + label strip height.
   - What's unclear: Exact label strip height (product name text, one line, Inter 14px ≈ 21px + padding).
   - Recommendation: Calculate `cardHeight` from a live DOM measurement after first batch renders. Store as `_rowHeight`. Use `_rowHeight` for spacer math. Do not hardcode.

---

## Sources

### Primary (HIGH confidence)
- Caniuse.com (fetched 2026-03-21) — `content-visibility: auto` Safari support: Safari 18.0+ only, NOT Safari 16
- MDN IntersectionObserver API (fetched 2026-03-21) — Baseline widely available since March 2019; rootMargin parameter behaviour
- `src/router.js` (read directly) — Existing stub functions, route table, handleRoute dispatch logic
- `src/app.js` (read directly) — Boot sequence, initHomeButton TODO at line ~172, initIdleTimer wiring
- `src/idle.js` (read directly) — pauseIdleTimer/resumeIdleTimer API, _active flag, timer state
- `src/db.js` (read directly) — dbGetAll, dbGet, dbAdd signatures and sync_meta key-value schema
- `src/config.js` (read directly) — Config.getEventName() confirmed as source of eventName for analytics
- `src/sync.js` (read directly) — Product schema confirmed: id, title, handle, category, tags, imageUrl, imageAlt, createdAt, updatedAt
- `styles/main.css` (read directly) — All design tokens, existing button classes (.btn-primary, .btn-secondary, .btn-large)
- `.planning/phases/01-pwa-foundation/01-UI-SPEC.md` (read directly) — Touch target minimum 48px, color palette, typography, interaction constraints

### Secondary (MEDIUM confidence)
- WebSearch: IntersectionObserver sentinel pattern for infinite scroll — corroborates MDN API docs; consistent across multiple developer resources (DEV Community, SitePoint, GeeksforGeeks)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all browser APIs verified against MDN and caniuse; no external libraries
- Architecture: HIGH — patterns derived directly from existing codebase conventions and locked decisions in CONTEXT.md
- Pitfalls: HIGH — content-visibility finding verified against caniuse; other pitfalls derived from reading actual source code
- Virtual scroll sizing: MEDIUM — row height calculation is approximate; exact value must be measured from live DOM

**Research date:** 2026-03-21
**Valid until:** 2026-09-21 (stable APIs; no external service dependencies in scope)
