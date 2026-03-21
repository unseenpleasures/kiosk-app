# Project Research Summary

**Project:** ID Card Factory — Event Kiosk Catalogue PWA
**Domain:** Offline-first PWA kiosk, Shopify Storefront API, Safari/iPadOS, event exhibition technology
**Researched:** 2026-03-21
**Confidence:** HIGH (core stack and architecture), MEDIUM (Safari/iPadOS edge cases)

## Executive Summary

This project is an offline-first product catalogue kiosk for a convention exhibitor. It runs as a Safari PWA installed to the Home Screen of a 2015 iPad Pro (A9X chip, iPadOS 16 maximum). The recommended approach is a zero-dependency vanilla JS application with a Service Worker + IndexedDB + Cache API offline stack, querying the Shopify Storefront API (read-only GraphQL) during pre-event admin sync sessions. No frameworks, no build tools, no CDN dependencies — offline reliability is the single non-negotiable constraint, and every architecture decision follows from it.

The build is well-scoped: browse/filter/search a 950+ product catalogue offline, capture emails with GDPR consent, log analytics events on-device, and provide an admin panel behind a passcode for pre-event sync, post-event export, and event configuration. The feature list is tight — the research found no candidates to cut and only two candidates to defer (incremental sync and admin analytics summary), both of which are low-risk deferrals that do not affect the core kiosk experience.

The primary risks are hardware-induced (A9X performance ceiling), iOS-specific (Safari's storage eviction policy and service worker lifecycle quirks), and data-safety (email and analytics loss between events). All three are mitigable through deliberate engineering patterns identified in the research: virtual scrolling from day one, a launch-time health check that detects storage eviction before the kiosk is put in front of attendees, and an explicit operator export-before-storage-away workflow. These must be first-class concerns, not retrofit work.

---

## Key Findings

### Recommended Stack

The stack is constrained to browser-native APIs on iPadOS 16 (Safari 16.x). ES2017 is the safe upper bound for JavaScript syntax on the A9X chip. Service Workers, IndexedDB v2, Cache API, Web Crypto, IntersectionObserver, and CSS Grid/Custom Properties are all fully supported. No library is needed for any task: routing is hash-based DOM switching, search is in-memory `Array.filter()`, GraphQL is plain `fetch()` POST, and passcode hashing is `crypto.subtle.digest('SHA-256')`.

The storage architecture splits responsibility cleanly: IndexedDB holds product metadata, emails, analytics, and sync state; Cache API (via Service Worker) holds all binary assets (app shell files and product images); localStorage holds only five small config values (passcode hash, event name, event date, timer setting, app version). The 1 GiB pre-iOS 17 quota is not a concern — estimated total storage is ~100–160 MB including all 950+ product images at 400px JPEG.

**Core technologies:**
- HTML5 / CSS3 / Vanilla JS (ES2017): App shell and all logic — no build step, no transpiler, no CDN
- Service Worker + Cache API: Offline serving of all assets, cache-first strategy, app shell cached on install
- IndexedDB (v2): Persistent storage for products, emails, analytics, sync metadata
- Web App Manifest (`display: standalone`): PWA Home Screen install, landscape orientation, kiosk chrome suppression
- Shopify Storefront API (GraphQL, 2024-07): Read-only product catalogue source, fetched via `fetch()` during admin sync
- Web Crypto API (`crypto.subtle`): SHA-256 admin passcode hashing, no library needed

See STACK.md for full version requirements, manifest field requirements, and 21 Safari/iPadOS-specific gotchas.

### Expected Features

All features in the original spec qualify as MVP. The only items to consider deferring if timeline is extreme are incremental sync (full re-download on each pre-event setup is tolerable initially) and the admin analytics summary view (raw data exists in IndexedDB even without the summary UI).

**Must have (table stakes):**
- Full-screen product grid with lazy-loaded thumbnails — the primary use case
- Category filter (tab/chip row, instant, no reload) — essential for 950+ products
- Real-time keyword search (<300ms on A9X, logged including zero-results)
- Product detail view (full-bleed card image, name, category)
- Complete offline operation — no network dependency during browse
- Fast home screen load (<2s from cache) — 10–30 second attention window from attendees
- Persistent QR code always visible — the only conversion mechanism
- Auto-return to home on idle (60s default, visible 10s countdown)
- Touch-friendly tap targets (60pt+ on product cards, 48pt+ on filter chips)

**Should have (differentiators):**
- Email capture with GDPR consent (dedicated screen, unchecked checkbox, consent text versioned)
- CSV export per event (Mailchimp-ready, tagged by event name)
- Analytics: search term logging including zero-result searches (product gap signal)
- Analytics: top viewed cards per event (franchise resonance by convention type)
- Per-event data tagging on all captured data
- "NEW" badge on recently added cards (rewards repeat attendees)
- Adjustable idle timer in admin (per-event footfall density)
- Discreet admin access trigger (5-tap hidden zone)
- Sync progress UI with page count and resumable cursor state

**Defer (v2+):**
- Incremental sync — full re-sync works fine initially; add after first event confirms pain point
- Admin analytics summary UI — raw data is in IndexedDB; defer the summary view if needed

**Explicit anti-features (never build):** Cart/purchase flow, user accounts, video content, push notifications, social sharing, favourites, ratings, live inventory, remote analytics/telemetry.

See FEATURES.md for full dependency tree, idle timeout pattern specification, and touch/kiosk UX cross-cutting requirements.

### Architecture Approach

The architecture is a single-page application with hash-based routing (`#/`, `#/category/:id`, `#/card/:id`, `#/email`, `#/admin`), mounted in a single `index.html` shell. A centralized DB Layer (`js/db.js`) is the only component that touches IndexedDB — views never open IDB transactions directly. A Config Layer (`js/config.js`) is the only component that touches localStorage. A Sync Layer (`js/sync.js`) is the only component that makes network requests. This strict separation is load-bearing for maintainability and testability on a zero-library codebase.

The in-memory product cache pattern is critical for A9X performance: all 950 product metadata records (~285KB) are loaded into a JS array at startup and after sync; filter and search operate against this array, not against IndexedDB queries. Virtual scrolling (maximum ~60–80 DOM nodes at any time) is the other mandatory performance pattern — it must be designed in from day one, not retrofitted.

**Major components:**
1. `sw.js` — Service Worker: cache-first for app shell and product images, network-only for Shopify API calls
2. `js/db.js` — DB Layer: all IndexedDB reads/writes, promise-based API, single schema version control point
3. `js/app.js` — App Controller: bootstrap, InactivityTimer service (used by all views), global event bus
4. `js/router.js` — Hash router: view lifecycle (mount/unmount), param extraction
5. `js/sync.js` — Sync Layer: Shopify GraphQL pagination, cursor checkpointing, image caching
6. `js/views/catalogue.js` — Customer View: virtual-scrolled grid, category filter, real-time search, card detail
7. `js/views/admin.js` — Admin View: passcode gate, event config, sync trigger, CSV export, analytics summary
8. `js/views/email.js` — Email Form: GDPR-compliant capture, 3-minute grace timer
9. `js/config.js` — Config Layer: localStorage wrapper (5 keys only)

See ARCHITECTURE.md for full IndexedDB schema (4 object stores with indexes), Service Worker cache strategy (3 strategies for 3 request types), data flow diagrams for all major flows, and the 7 anti-patterns to avoid.

### Critical Pitfalls

1. **Safari storage eviction (C1 + C4)** — iOS/iPadOS may silently delete all IndexedDB, Cache Storage, and SW registration if the app is not opened for ~7 days. Mitigation: run a health check on every launch (verify SW active, product count > 0, at least one image cached); display a "Sync required" blocking screen on failure; instruct operator to open app every 5 days and export emails immediately after every event. This is the single most catastrophic failure mode.

2. **Service Worker not updating on iOS (C2)** — Safari does not reliably activate new SW versions in standalone mode. Mitigation: implement `skipWaiting()` + `clients.claim()` + a `controllerchange` listener that forces `window.location.reload()`; provide an explicit "Check for app update" button in admin; display the current SW version in admin.

3. **A9X DOM performance collapse (M3)** — Rendering all 950+ product cards simultaneously causes scroll jank and potential app termination on A9X. Mitigation: virtual scrolling from day one (50–80 DOM nodes max), `content-visibility: auto` on row containers, `contain: strict` on cards. This must be a Phase 1 design decision — retrofitting it is a near-rewrite.

4. **Shopify sync failures: cursor loss + rate limits (C5 + C6)** — 20 sequential GraphQL pages with no checkpointing means a failure at page 19 restarts from page 1. Rate limits return HTTP 200 with `errors.THROTTLED` in the body (not a 4xx). Mitigation: persist cursor to IndexedDB after every page; use upsert semantics; add 500ms inter-page delay; parse `extensions.cost` fields; implement exponential backoff with 3 retries.

5. **GDPR pre-ticked checkbox (M2)** — Pre-ticking the consent checkbox is explicitly invalid under UK GDPR Article 7 (ICO-enforced). Mitigation: checkbox always unchecked by default, submit button disabled until checked, consent text versioned and stored alongside each email record, `consentTimestamp` stored per record. Non-negotiable on first implementation.

See PITFALLS.md for 6 critical pitfalls, 6 moderate pitfalls, 5 minor pitfalls, and a phase-specific warning matrix.

---

## Implications for Roadmap

Research points to a clear 6-phase build order driven by the dependency graph in ARCHITECTURE.md and the phase-severity matrix in PITFALLS.md.

### Phase 1: PWA Foundation and Boot Safety
**Rationale:** Service Worker, manifest, health check, and link interception must exist before anything else is built — they are cross-cutting infrastructure. SW and storage eviction bugs (C1, C2, C4) must be caught at the shell level, not bolted on later. The kiosk lockdown (Guided Access + link interception) belongs here.
**Delivers:** Installable PWA shell, offline-capable app skeleton, health check on launch, "Sync required" blocking screen, global link interceptor, SW version display in admin stub
**Addresses (features):** Offline operation, fast load from cache, kiosk lockdown
**Avoids:** C1 (eviction detected early), C2 (SW update pattern established), C4 (health check), M1 (link escape)

### Phase 2: Data Layer and Navigation Shell
**Rationale:** `db.js` is a prerequisite for every subsequent phase. Router and App Controller (including InactivityTimer) must exist before any view can be integrated. IndexedDB schema, virtual scroll architecture, and the "what goes where" storage rule must be established before any feature code is written — these cannot be retrofitted.
**Delivers:** Full IndexedDB schema (4 stores), Config Layer, hash router, InactivityTimer service, in-memory product cache warmup, placeholder catalogue view (static, no real data yet)
**Addresses (features):** Idle timeout, auto-return to home, touch-friendly architecture
**Avoids:** M3 (virtual scroll designed in from the start), M4 (localStorage misuse prevented by layer separation), Anti-Pattern 1–6 from ARCHITECTURE.md

### Phase 3: Shopify Sync Engine
**Rationale:** The catalogue cannot be browsed until products are synced. Sync is the most complex, highest-risk component (C3, C5, C6, M5). Building it as a discrete phase — with full cursor checkpointing, rate limit handling, quota checking, and error response filtering before moving to the browse UI — avoids the trap of discovering sync bugs after the catalogue view is already built.
**Delivers:** Full Shopify GraphQL pagination (50 products/page, cursor-persisted), image fetch and cache storage, `navigator.storage.estimate()` pre-sync check, per-product `imagesStored` flag, 500ms inter-page delay, retry with backoff, sync progress UI, admin panel sync trigger
**Addresses (features):** Admin panel, sync trigger, pre-event catalogue load, "NEW" badge foundation
**Avoids:** C3 (quota check before sync), C5 (cursor checkpointing), C6 (rate limit parsing), M5 (response.ok check before cache.put), m1 (CDN token stripping), m4 (sortKey specified)

### Phase 4: Customer Browse Experience
**Rationale:** With the data layer and sync working, the customer-facing browse UI can be built against real data. Virtual scroll implementation goes here, built on the architecture established in Phase 2. This is the core product — the reason the kiosk exists.
**Delivers:** Virtual-scrolled product grid, category filter (instant, in-memory), real-time keyword search (<300ms, debounced 150ms), product detail view, persistent QR code display, analytics logging (card views, category views, searches including zero-results)
**Addresses (features):** Product grid, category filter, search, product detail, QR code, analytics logging
**Avoids:** M3 (virtual scroll delivers on A9X performance), Anti-Pattern 2 (in-memory search, not IDB queries), Anti-Pattern 3 (no 950-node DOM render)

### Phase 5: Email Capture and Export
**Rationale:** Email capture has unique GDPR requirements (M2) and a distinct interaction pattern (3-minute grace timer, keyboard layout concerns). Keeping it isolated in its own phase ensures GDPR compliance is not deprioritised. CSV export depends on captured data existing.
**Delivers:** Email capture form with GDPR-compliant unchecked checkbox, versioned consent text storage, `consentTimestamp` per record, 3-minute grace timer via InactivityTimer.setGrace(), iOS keyboard layout tested on device, CSV export (per-event, Mailchimp-formatted), Blob download trigger
**Addresses (features):** Email capture, GDPR consent, per-event tagging, CSV export
**Avoids:** M2 (checkbox unchecked by default, enforced in JS), m3 (iOS keyboard layout handled)

### Phase 6: Admin Panel Polish and Analytics
**Rationale:** Admin features depend on data from all previous phases existing (emails, analytics events, sync metadata). "NEW" badge logic requires sync metadata from Phase 3. Analytics summary requires event data from Phase 4–5. This phase also adds the remaining operational reliability features (SW update button, storage readout).
**Delivers:** Full admin panel (event config, sync with progress, storage status readout, SW version + update button), analytics summary per event (top viewed cards, zero-result searches, email capture count), "NEW" badge on products added since last sync, adjustable idle timer control, passcode change flow, discreet 5-tap admin trigger
**Addresses (features):** Analytics summary, NEW badge, admin configuration, SW update mechanism
**Avoids:** C2 (SW update button + version display), m5 (SHA-256 + salt passcode), C1 (export prompt in admin)

### Phase Ordering Rationale

- Phases 1–2 are infrastructure that everything depends on. They cannot be parallelised with feature work.
- Phase 3 (sync) and Phase 4 (browse) share a dependency on Phase 2 being complete, but can be partially parallelised — sync engine and catalogue grid are independent modules once db.js exists.
- Phase 5 (email/export) has no dependency on Phase 4 except that analytics logging in Phase 4 provides the data it exports.
- Phase 6 (admin polish) is genuinely last — it aggregates data from all prior phases.
- The build order from ARCHITECTURE.md (`db.js` → `app.js` + `router.js` → `sync.js` + `catalogue.js` → `email.js` + `card-detail.js` → analytics hooks + admin summary) maps directly to Phases 2 → 3/4 → 5 → 6.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Sync Engine):** Verify current Shopify Storefront API version (bump from 2024-07 if needed), verify cursor expiry window (may have changed), verify GraphQL cost-per-query for the minimal field set. Shopify API docs must be consulted at implementation time.
- **Phase 1 (SW Lifecycle on iPadOS 16):** The `skipWaiting` + `clients.claim` + force-reload pattern should be validated on the actual target device before the rest of the build proceeds. Safari's SW activation behaviour is the most underdocumented area in the research.

Phases with well-documented patterns (skip research-phase):
- **Phase 2 (Data Layer):** IndexedDB schema design is fully specified in ARCHITECTURE.md; in-memory cache pattern is established; localStorage separation rules are clear.
- **Phase 4 (Browse UI):** Virtual scroll pattern is well-documented; in-memory filter/search is standard; all performance constraints are known.
- **Phase 5 (Email/GDPR):** GDPR requirements are legislative fact; form pattern is standard; only device-specific keyboard layout testing is needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core web APIs verified against MDN (fetched 2026-03-21); ES2017 on A9X/Safari 16.x is confirmed; Shopify Storefront API is MEDIUM (version needs verification at implementation time) |
| Features | HIGH | Derived directly from authoritative project spec plus established kiosk/retail domain patterns; anti-feature exclusions all have clear technical/legal rationale |
| Architecture | HIGH | All patterns are well-established web platform patterns; component boundaries are clean; data flow is explicit; iPadOS-specific notes flagged at MEDIUM confidence pending device verification |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls (storage eviction, SW lifecycle, A9X performance, GDPR) are well-documented with high confidence; Shopify-specific items (cursor expiry window, rate limit exact figures) need verification against current docs |

**Overall confidence:** HIGH for all decisions that determine build approach; MEDIUM for 4 specific iOS Safari edge cases that require device-level validation.

### Gaps to Address

- **Shopify API version:** Verify the current stable Storefront API version at `https://shopify.dev/docs/api/storefront` before writing any sync code. The research used 2024-07; this may have advanced.
- **Shopify cursor expiry window:** The research cites ~1 hour but flags this as needing verification against current Shopify developer changelog.
- **SW force-reload on iPadOS 16:** The `controllerchange` + `window.location.reload()` pattern for SW activation is the recommended approach but must be tested on the actual A9X device early — behaviour differs across Safari minor versions.
- **7-day eviction on installed Home Screen PWA:** Apple adjusted this in iOS 16.4+. The exact current behaviour for an installed (not in-browser) PWA on iPadOS 16 should be verified on-device. The app's health check mitigates this regardless.
- **`content-visibility: auto` support on iPadOS 16:** Research indicates Safari 15+ support but recommends verification at `caniuse.com` / WebKit release notes before relying on it for scroll performance.
- **`navigator.wakeLock` in Safari PWA standalone mode on iPadOS 16:** Not reliably supported; the recommendation is to use the OS Auto-Lock setting instead. Verify on device.

---

## Sources

### Primary (HIGH confidence)
- MDN Storage Quotas and Eviction Criteria — fetched 2026-03-21 — quota figures, Cache API, eviction behaviour
- MDN PWA Installability Guide — fetched 2026-03-21 — manifest fields, Home Screen install
- MDN Service Worker API / Using Service Workers — fetched 2026-03-21 — SW lifecycle, cache strategies
- MDN Cache API — fetched 2026-03-21 — `cache.put()`, `response.ok` pattern
- Apple Human Interface Guidelines — minimum 44pt touch target (documented fact)
- UK GDPR / ICO guidance — Article 7 explicit consent, pre-ticked checkbox invalidity (legislative fact)
- PROJECT.md — authoritative project specification (The ID Card Factory, 2026-03-21)

### Secondary (MEDIUM confidence)
- Shopify Storefront API docs — GraphQL schema, cursor pagination, cost-based rate limiting — training data (verify version before implementation at `https://shopify.dev/docs/api/storefront`)
- Apple/Anandtech public specs — A9X chip (2 cores, ~2 GHz, 4 GB RAM)
- WebKit blog / iOS 15.4–16.4 release notes — PWA storage persistence changes, manifest `display` support
- Community post-mortems on iOS PWA storage eviction — multiple sources agree on 7-day window and Home Screen PWA exemption (partial, version-dependent)

### Tertiary (LOW confidence — verify before implementation)
- Shopify cursor expiry window (~1 hour) — training knowledge, check Shopify developer changelog
- `content-visibility: auto` on iPadOS 16 Safari — caniuse.com / WebKit release notes
- `navigator.wakeLock` in iPadOS 16 Safari PWA standalone — test on device

---
*Research completed: 2026-03-21*
*Ready for roadmap: yes*
