<!-- GSD:project-start source:PROJECT.md -->
## Project

**ID Card Factory — Event Kiosk Catalogue App**

A fully offline Progressive Web App (PWA) kiosk catalogue for The ID Card Factory, deployed on iPad Pros at UK comic cons and fan events. Customers browse 950+ custom printed ID cards, sign up for email updates, and scan a QR code to visit the website. The app is locked into kiosk mode via Apple Guided Access and requires internet only for pre-event catalogue syncing from Shopify.

**Core Value:** Customers can browse and discover ID cards with zero friction — fast, visual, and fully offline — while the business captures emails and analytics data that persist across every event.

### Constraints

- **Tech Stack**: Vanilla HTML/CSS/JS PWA — no build tools, no frameworks, no App Store. Must run in Safari on iPadOS 16.
- **Compatibility**: iPad Pro 12.9" 1st Gen (A9X chip), iPadOS 16 maximum. No features requiring newer iOS.
- **Performance**: A9X chip is 2015-era hardware. Bundle size, animation complexity, and memory usage must be constrained accordingly.
- **Offline**: Zero network dependency during events. All data must be pre-cached. No CDN fonts, no remote assets.
- **Storage**: IndexedDB for persistent data. localStorage for small config. Service worker cache for app shell + product assets.
- **GDPR**: Explicit opt-in checkbox mandatory on email capture. Data stays on-device until owner exports CSV.
- **Security**: Shopify Storefront API token is public/read-only by design — safe to include in client-side code. Admin passcode stored hashed in localStorage.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Runtime
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| HTML5 | Living standard | App shell, views, component markup | Browser-native, no transpilation needed |
| CSS3 | Living standard | Layout (Grid/Flexbox), animations, theming | Grid + CSS custom properties eliminate most JS layout logic |
| Vanilla JavaScript | ES2017 subset | All logic, data access, routing | ES2017 (async/await, Object.entries, etc.) is fully supported on A9X / Safari 10+. No transpiler needed. Stay away from ES2020+ optional chaining and nullish coalescing — the A9X chip runs iPadOS 16 max, which ships Safari 16.x supporting these, but be conservative: use ES2017 as the upper bound for safety. |
### PWA Layer
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Web App Manifest (`manifest.json`) | W3C spec | Home screen install, standalone mode, icons, orientation | Required for proper "Add to Home Screen" behaviour and standalone display mode in Safari 16.x |
| Service Worker | W3C spec | Offline caching, cache-first strategy for all assets | Supported since Safari 11.1; fully functional in Safari 16.x on iPadOS 16. Runs in background thread, survives app close. |
| Cache API (`caches`) | W3C spec | Store app shell HTML/CSS/JS + all product images | Pairs with Service Worker. Cache quota shares the origin quota (see Storage section below). |
#### Manifest required fields for iPadOS 16
### Storage Layer
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| IndexedDB | Browser-native (v2 API) | Product catalogue, email list, analytics events, sync metadata | The only browser-native store suitable for large structured datasets and binary blobs. Async API works in both main thread and service worker. |
| localStorage | Browser-native | Admin passcode (hashed), event name, inactivity timer setting | Synchronous, appropriate for small config strings. Do not use for anything over ~5 KB or arrays. |
| Cache API | Browser-native | App shell files + product images (via Service Worker) | Cache Storage is separate from IndexedDB quota but shares the same origin total. Use for HTTP-response-shaped data (images, HTML, JS, CSS). |
#### Safari Storage Quotas — Critical for This Project
- Initial quota: **1 GiB per origin**
- Exceeding 1 GiB requires **explicit user permission prompt**
#### IndexedDB Schema (recommended)
### Data Source
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Shopify Storefront API | 2024-07 (or latest stable) | Read product catalogue, images, categories | Read-only, free tier, built into the existing Shopify store. No custom backend required. |
| GraphQL via `fetch()` | Browser-native | Query products, paginate cursor-based | Use `fetch()` with `Content-Type: application/json` and `X-Shopify-Storefront-Access-Token` header. No GraphQL client library needed. |
#### Storefront API Access Pattern
### Security
| Concern | Approach | Implementation |
|---------|----------|----------------|
| Admin passcode | `bcrypt`-equivalent hash | Use `crypto.subtle.digest('SHA-256', ...)` — Web Crypto API, browser-native, no library needed |
| Shopify token | Read-only by design | Hardcode in JS. No backend proxy needed. |
| GDPR | Explicit checkbox, on-device storage | Data never leaves device until CSV export. No third-party analytics. |
| Kiosk lockdown | Apple Guided Access (OS level) | No browser-level solution needed — Guided Access prevents app switching and Safari navigation. |
### No-Library Policy
| Task | Approach |
|------|----------|
| Routing/views | Manual DOM show/hide + `location.hash` |
| Data fetching | `fetch()` API |
| GraphQL queries | Plain `fetch()` POST with JSON body |
| IndexedDB access | Wrap in Promises manually (25 lines of boilerplate) |
| CSV export | Build string manually + `Blob` + `URL.createObjectURL` |
| QR code display | Static SVG or `<img>` tag pointing to pre-generated QR PNG |
| Search | In-memory `Array.filter()` + `String.includes()` on cached product array |
| Image lazy loading | `IntersectionObserver` API (browser-native, supported Safari 12.1+) |
| Animations | CSS transitions only — no JS animation libraries |
| Hashing | `crypto.subtle.digest` |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| JS runtime | Vanilla ES2017 | TypeScript | Requires build toolchain (tsc). Violates the no-build-tools constraint. |
| JS runtime | Vanilla ES2017 | React/Vue/Svelte | All require either a build step or CDN load. CDN breaks offline requirement. |
| Storage | IndexedDB + Cache API | SQLite (via WASM) | WASM not reliably supported on A9X / iPadOS 16 without testing. More complex. No benefit over IndexedDB for this scale. |
| Storage | IndexedDB + Cache API | localStorage for all data | localStorage has ~5–10 MB limit and is synchronous (blocks UI). 950 products + images is far too large. |
| Images | Cache API (SW-managed) | Base64 in IndexedDB | Blobs in IndexedDB on older Safari had bugs (fixed Safari 14+). Cache API is cleaner for response objects. Avoid base64 — 33% size overhead. |
| Sync | Direct Storefront API fetch | Custom backend/proxy | Adds infrastructure cost and complexity. Storefront API is public/read-only — no proxy needed. |
| QR code | Static pre-generated PNG/SVG | `qrcode.js` library | Static image is simpler, eliminates a dependency, and the URL never changes. |
| Passcode hash | `crypto.subtle` (SHA-256) | `bcrypt.js` library | Library violates no-CDN/offline constraint. SHA-256 via Web Crypto is sufficient for a single-device admin passcode. |
| Offline strategy | Service Worker cache-first | AppCache | AppCache is deprecated and removed from all browsers. |
## Safari / iPadOS-Specific Gotchas
### Service Worker
### IndexedDB
### Web App Manifest / PWA Install
### Storage / Quota
### CSS / Layout
### Performance (A9X Chip)
## Installation
# Python 3 (quick local server — HTTPS not needed for localhost SW)
# Or use VS Code Live Server extension
## Sources
| Source | URL | Confidence | Date |
|--------|-----|------------|------|
| MDN Storage Quotas | https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria | HIGH | Fetched 2026-03-21 |
| MDN PWA Installability | https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable | HIGH | Fetched 2026-03-21 |
| MDN Service Worker Guide | https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers | HIGH | Fetched 2026-03-21 |
| MDN Cache API | https://developer.mozilla.org/en-US/docs/Web/API/Cache | HIGH | Fetched 2026-03-21 |
| Shopify Storefront API docs | https://shopify.dev/docs/api/storefront | MEDIUM | Training data, verify version |
| A9X chip specs | Apple / Anandtech public specs | MEDIUM | Training data |
| Safari PWA limitations | General WebKit knowledge | MEDIUM | Training data, cross-reference against https://webkit.org/blog/ |
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
