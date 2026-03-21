# Phase 4: Customer Browse Experience - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the `renderCatalogueStub`, `renderCategoryStub`, and `renderCardStub` functions in `router.js` with real implementations. Deliver: a virtual-scrolled thumbnail grid of 950+ cards, a sticky search + category-filter bar, a full-screen card detail view, analytics event logging, and the idle-timer grace period for the email screen. Email capture itself (Phase 5) is out of scope here — only CAT-10 (idle grace period) is in scope.

</domain>

<decisions>
## Implementation Decisions

### Grid layout
- **D-01:** 5 columns, fixed for the 12.9" landscape iPad viewport
- **D-02:** Card cells are portrait aspect ratio (use 2:3 or 3:4 — 2:3 preferred)
- **D-03:** Each grid card shows: product thumbnail image + card name in a strip below the image
- **D-04:** "NEW" badge overlaid on the card thumbnail (top-right corner) for cards added since the previous sync; detected via `createdAt` vs. `lastSyncAt` stored in `sync_meta`

### Search and filter bar
- **D-05:** Single sticky header bar across the top of the catalogue screen — search field on the left, category chips scrolling to the right on the same row
- **D-06:** Category chips behave as a single-select toggle; tapping the currently active chip deselects it (no "All" chip)
- **D-07:** When both a category chip and a search term are active simultaneously: AND filter — show only cards that match the selected category AND the search term
- **D-08:** Search operates in-memory on the product array (Array.filter + String.includes) — no IDB query on each keystroke
- **D-09:** Categories come from the `category` field on each synced product — do not hardcode the 8 category names; derive them from the in-memory product array at startup

### Card detail view
- **D-10:** Full-screen takeover on card tap — replaces the grid view entirely via the `#/card/:id` route
- **D-11:** Detail view shows: large product image (centred, portrait) + card name (below image, large) + two fixed pricing lines: "Standard — £7" and "Personalised — £10"
- **D-12:** Pricing is fixed for all cards — no per-card price from Shopify needed
- **D-13:** Exit via a dedicated back (←) button in the detail view; the global home button (already in chrome) also returns to `#/`
- **D-14:** No swipe-to-dismiss, no tap-outside-to-dismiss — explicit button only

### Idle timer — email grace period (CAT-10)
- **D-15:** The idle timer must NOT fire while the user is on `#/email` route; extend or suppress the countdown when hash is `#/email`. 3-minute grace period means the idle timer does not start counting until the user navigates away from the email screen. Wire in `idle.js` using the current route hash.

### Analytics logging
- **D-16:** All analytics writes go through `db.js` using `dbAdd('analytics', {...})` — no direct IDB in catalogue.js
- **D-17:** Log card view: `{ type: 'card_view', cardId, cardName, timestamp, eventName }`
- **D-18:** Log category filter: `{ type: 'category_filter', category, timestamp, eventName }`
- **D-19:** Log search: `{ type: 'search', query, resultCount, zeroResult: boolean, timestamp, eventName }`
- **D-20:** `eventName` for all analytics events comes from `config.js` (localStorage `eventName` value)

### Home button state reset (app.js)
- **D-21:** `initHomeButton` in `app.js` currently has a TODO comment for Phase 4 to reset filter/search state. Phase 4 must clear in-memory filter and search state on home button tap (set active category to null, clear search query string, reset the search input value).

### Virtual scroll
- **D-22:** IntersectionObserver-based sentinel approach — maintain a visible window of ~80 DOM card nodes; prepend/append as the user scrolls. Do NOT rely solely on `content-visibility: auto` (verify support on iPadOS 16 Safari in RESEARCH.md before depending on it).

### Claude's Discretion
- Exact virtual scroll window sizing and sentinel placement
- Debounce delay for search input (keep under 300ms total — 150ms debounce is reasonable)
- CSS Grid column template and gap values for the 5-column layout
- Transition/animation for detail view entry (keep lightweight for A9X — CSS only)
- Placeholder state while card images are loading (neutral background or skeleton)

</decisions>

<specifics>
## Specific Ideas

- Pricing on detail view: two lines, "Standard — £7" and "Personalised — £10". Fixed — not fetched from Shopify.
- Category chips: horizontal scroll row, single-select, tap-to-deselect pattern (no "All" chip). Chips styled using existing `.btn-primary` / `.btn-secondary` classes or a new `.chip` variant.
- Back button on detail view: a `←` or `‹ Back` button in the top-left area of the detail screen. Should not conflict with the fixed chrome home button (which is already top-left at z-index 100) — consider placing it inside the detail screen flow or using a text "Back to browse" label.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing source files (Phase 4 modifies or extends these)
- `src/router.js` — Contains stub functions to replace: `renderCatalogueStub`, `renderCategoryStub`, `renderCardStub`. Route table and `handleRoute` logic must be understood before modifying.
- `src/app.js` — `initHomeButton` has a Phase 4 TODO at line ~172; `boot()` warms the DB and wires router. Phase 4 adds in-memory product array initialisation here.
- `src/db.js` — Exclusive IDB gateway. `dbGetAll('products')`, `dbGetAllByIndex('products', 'category', value)`, `dbAdd('analytics', ...)`, `dbGet('sync_meta', 'lastSyncAt')` are the relevant calls.
- `src/idle.js` — Idle timer implementation; Phase 4 must add email-screen grace period logic.
- `src/config.js` — Source of `eventName` for analytics event tagging.

### Design system
- `styles/main.css` — All CSS custom properties (colors, spacing, typography tokens), established button classes (`.btn-primary`, `.btn-secondary`, `.btn-large`). New Phase 4 CSS must use these tokens throughout.
- `.planning/phases/01-pwa-foundation/01-UI-SPEC.md` — Full design contract: color palette, typography scale, spacing scale, touch target minimum (48px). Canonical reference for all visual decisions.

### Requirements
- `.planning/REQUIREMENTS.md` — CAT-01 through CAT-10, ANALYTICS-01 through ANALYTICS-03. Every requirement in this phase must be traceable to a plan task.

### Architecture constraints
- `.planning/STATE.md` §Architecture Constraints — virtual scroll mandatory (~80 DOM nodes max), in-memory product array, db.js exclusivity, config.js exclusivity, ES2017 upper bound.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `db.js:dbGetAll` — Load full product array into memory at boot; use for search/filter operations
- `db.js:dbGetAllByIndex('products', 'category', ...)` — Already built for Phase 4 category filtering; however, in-memory filtering is faster than IDB index queries for 950 items — prefer in-memory after initial load
- `db.js:dbAdd('analytics', ...)` — Analytics event writes
- `db.js:dbGet('sync_meta', 'lastSyncAt')` — Used to detect NEW cards (compare product `createdAt` vs. `lastSyncAt`)
- `styles/main.css:.btn-primary / .btn-secondary` — Reuse for filter chips; add a `.chip` class variant if pill shape is needed
- `app.js:initHomeButton` — Already wired; Phase 4 just adds state reset logic to the existing click handler

### Established Patterns
- Screen render functions: each creates a `div.screen` with a unique `id`, clears `#app`, then appends — follow this exact pattern for catalogue, category, and card detail screens
- ES2017 syntax enforced throughout: `function` keyword, `var` declarations, no arrow functions, no optional chaining
- CSS class naming: `kebab-case`, prefixed by component (e.g. `catalogue-grid`, `card-tile`, `card-detail`)
- All analytics event fields use camelCase; `eventName` sourced from `config.js`

### Integration Points
- `router.js:ROUTES['#/']` → replace `renderCatalogueStub` with real `renderCatalogue`
- `router.js:ROUTES['#/category/:id']` → replace `renderCategoryStub` with `renderCategory(categoryId)`
- `router.js:ROUTES['#/card/:id']` → replace `renderCardStub` with `renderCard(cardId)`
- `app.js:initHomeButton` click handler → add `resetCatalogueState()` call
- `idle.js` → add route-aware suppression for `#/email` (3-minute grace period, CAT-10)

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-customer-browse-experience*
*Context gathered: 2026-03-21*
