# Technology Stack

**Project:** ID Card Factory — Event Kiosk Catalogue PWA
**Researched:** 2026-03-21
**Constraint context:** Vanilla JS only, no build tools, no frameworks, no App Store. iPadOS 16 / Safari. A9X chip (iPad Pro 1st Gen, 2015 hardware).

---

## Recommended Stack

### Core Runtime

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| HTML5 | Living standard | App shell, views, component markup | Browser-native, no transpilation needed |
| CSS3 | Living standard | Layout (Grid/Flexbox), animations, theming | Grid + CSS custom properties eliminate most JS layout logic |
| Vanilla JavaScript | ES2017 subset | All logic, data access, routing | ES2017 (async/await, Object.entries, etc.) is fully supported on A9X / Safari 10+. No transpiler needed. Stay away from ES2020+ optional chaining and nullish coalescing — the A9X chip runs iPadOS 16 max, which ships Safari 16.x supporting these, but be conservative: use ES2017 as the upper bound for safety. |

**Confidence: HIGH** — iPadOS 16 ships Safari 16.x which supports ES2017+ fully. A9X/iPadOS 16 combination is the hard ceiling.

---

### PWA Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Web App Manifest (`manifest.json`) | W3C spec | Home screen install, standalone mode, icons, orientation | Required for proper "Add to Home Screen" behaviour and standalone display mode in Safari 16.x |
| Service Worker | W3C spec | Offline caching, cache-first strategy for all assets | Supported since Safari 11.1; fully functional in Safari 16.x on iPadOS 16. Runs in background thread, survives app close. |
| Cache API (`caches`) | W3C spec | Store app shell HTML/CSS/JS + all product images | Pairs with Service Worker. Cache quota shares the origin quota (see Storage section below). |

**Confidence: HIGH** — Service Workers fully supported in Safari since iOS 11.1. iPadOS 16 is Safari 16.x, well past the support threshold. Source: MDN Storage quotas page (fetched 2026-03-21).

#### Manifest required fields for iPadOS 16

```json
{
  "name": "ID Card Factory",
  "short_name": "ID Cards",
  "start_url": "/index.html",
  "display": "standalone",
  "orientation": "landscape",
  "background_color": "#0a0a1a",
  "theme_color": "#0a0a1a",
  "icons": [
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-1024.png", "sizes": "1024x1024", "type": "image/png" }
  ]
}
```

Safari reads `apple-touch-icon` meta tags alongside the manifest. Include both. The `display: standalone` field hides Safari chrome (address bar, navigation buttons) when launched from the Home Screen — this is essential for kiosk UX.

**Confidence: MEDIUM** — Safari 16.4 added full manifest `display` support. Pre-16.4 Safari requires `<meta name="apple-mobile-web-app-capable" content="yes">` as a fallback. Include both.

---

### Storage Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| IndexedDB | Browser-native (v2 API) | Product catalogue, email list, analytics events, sync metadata | The only browser-native store suitable for large structured datasets and binary blobs. Async API works in both main thread and service worker. |
| localStorage | Browser-native | Admin passcode (hashed), event name, inactivity timer setting | Synchronous, appropriate for small config strings. Do not use for anything over ~5 KB or arrays. |
| Cache API | Browser-native | App shell files + product images (via Service Worker) | Cache Storage is separate from IndexedDB quota but shares the same origin total. Use for HTTP-response-shaped data (images, HTML, JS, CSS). |

#### Safari Storage Quotas — Critical for This Project

Based on verified MDN documentation (Storage_quotas_and_eviction_criteria, fetched 2026-03-21):

**iPadOS 16 = iOS 16, which predates iOS 17. The pre-iOS 17 quota applies:**
- Initial quota: **1 GiB per origin**
- Exceeding 1 GiB requires **explicit user permission prompt**

**This is the binding constraint for this project.** With 950+ products at ~400px wide JPEGs (~80–150 KB each), total image cache could reach 80–150 MB. JSON catalogue data for 951 products: ~5–10 MB. App shell: <1 MB. Total estimated: ~100–160 MB — well within 1 GiB, no permission prompt needed.

**Safari 7-day eviction rule:** On iOS 16, Safari deletes all origin data if there has been **no user interaction (tap/click) within the last 7 days** when cross-site tracking prevention is enabled. For a kiosk installed as a PWA to Home Screen, this risk is mitigated — installed Home Screen apps are treated differently from browser tabs. However, pre-event data sync should always be performed regardless.

**Confidence: HIGH** — Quota numbers sourced directly from MDN documentation page (fetched 2026-03-21). Safari 7-day rule is a well-documented behaviour affecting browser tabs primarily; Home Screen PWAs are partially exempt but this should be validated per-device.

#### IndexedDB Schema (recommended)

```
Database: "kiosk-db" (version: 1)

Stores:
  products       keyPath: id       indexes: [category, title, updatedAt]
  emails         keyPath: id       indexes: [eventId, capturedAt]
  analytics      keyPath: id       indexes: [eventId, type, timestamp]
  syncMeta       keyPath: key      (simple key-value: lastSyncCursor, lastSyncDate, version)
```

Store images as Cache API entries (fetched URLs), not as blobs in IndexedDB. Cache API is optimised for Response objects and performs better for large binary reads.

**Confidence: MEDIUM** — Schema is a design recommendation, not a researched constraint. IndexedDB blob storage in Safari has had historical bugs (fixed in Safari 14+); storing image URLs in IndexedDB and images in Cache Storage is the safer pattern.

---

### Data Source

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Shopify Storefront API | 2024-07 (or latest stable) | Read product catalogue, images, categories | Read-only, free tier, built into the existing Shopify store. No custom backend required. |
| GraphQL via `fetch()` | Browser-native | Query products, paginate cursor-based | Use `fetch()` with `Content-Type: application/json` and `X-Shopify-Storefront-Access-Token` header. No GraphQL client library needed. |

#### Storefront API Access Pattern

```javascript
// Vanilla fetch — no library required
const query = `
  query GetProducts($cursor: String) {
    products(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id title handle
          tags
          images(first: 1) {
            edges { node { url(transform: { maxWidth: 400 }) altText } }
          }
          collections(first: 5) {
            edges { node { title handle } }
          }
        }
      }
    }
  }
`;

const resp = await fetch('https://STORE.myshopify.com/api/2024-07/graphql.json', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Storefront-Access-Token': 'YOUR_TOKEN'
  },
  body: JSON.stringify({ query, variables: { cursor } })
});
```

**Token security:** The Storefront API token is public by design. It grants read-only access to published product listings. Safe to hardcode in client-side JS. This is Shopify's documented intended use case.

**API versioning:** Shopify deprecates API versions quarterly. Use a named version (e.g., `2024-07`) rather than `unstable`. At next annual review, bump to current stable version.

**Confidence: MEDIUM** — GraphQL query shape is based on training knowledge of Storefront API v2 schema. The `url(transform:)` argument for image resizing is a Storefront API feature. Version `2024-07` was current as of training data (August 2025). Verify the latest stable version before implementation at `https://shopify.dev/docs/api/storefront`.

---

### Security

| Concern | Approach | Implementation |
|---------|----------|----------------|
| Admin passcode | `bcrypt`-equivalent hash | Use `crypto.subtle.digest('SHA-256', ...)` — Web Crypto API, browser-native, no library needed |
| Shopify token | Read-only by design | Hardcode in JS. No backend proxy needed. |
| GDPR | Explicit checkbox, on-device storage | Data never leaves device until CSV export. No third-party analytics. |
| Kiosk lockdown | Apple Guided Access (OS level) | No browser-level solution needed — Guided Access prevents app switching and Safari navigation. |

**Confidence: HIGH** — Web Crypto API (`crypto.subtle`) is supported in Safari 11+.

---

### No-Library Policy

This project uses zero external libraries. Everything below is "vanilla — no library needed":

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

---

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

---

## Safari / iPadOS-Specific Gotchas

### Service Worker

1. **Scope**: Service Worker scope defaults to its directory. Place `sw.js` at the root (`/sw.js`) to cover the entire app.
2. **Update on reload**: Safari does not update a SW on every reload by default. Add `self.skipWaiting()` and `clients.claim()` to activate new SW versions immediately.
3. **No background sync on iOS 16**: The Background Sync API is NOT supported in Safari on iOS 16. All syncing must happen while the app is in the foreground. **Confidence: HIGH** (well-established limitation).
4. **No push notifications on iOS 16**: Web Push was added in iOS 16.4 only, and only for Home Screen PWAs. This project doesn't need push, but relevant to know the boundary.
5. **HTTPS required**: Service workers only run on HTTPS origins (or localhost). For local development, serve via `localhost` or a self-signed cert.

### IndexedDB

6. **Transactions are auto-committed**: In Safari, IndexedDB transactions commit as soon as all requests complete and there are no more pending microtasks. Do not `await` unrelated Promises inside a transaction — this can cause "transaction is finished" errors. Complete all IDB operations synchronously within a transaction callback.
7. **No blob URL generation in SW**: `URL.createObjectURL()` is not available in Service Worker scope in Safari. Generate blob URLs in the main thread only.
8. **Schema migrations**: IDB `onupgradeneeded` fires when version changes. Always increment the version integer when changing object store structure — never attempt to delete/recreate a store in the same version.

### Web App Manifest / PWA Install

9. **Pre-16.4 `display` quirk**: On iPadOS 16.0–16.3, `display: standalone` may not fully suppress the Safari chrome. Include `<meta name="apple-mobile-web-app-capable" content="yes">` as a belt-and-braces fallback. iPadOS 16.4 fixed manifest `display` handling.
10. **Landscape orientation on iPad**: `orientation: landscape` in manifest is respected when installed as a Home Screen app. In-browser, orientation lock is not available without DeviceOrientation permission (requires HTTPS + user gesture). Guided Access can force orientation at OS level.
11. **Status bar style**: Add `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` for full-screen dark kiosk appearance.
12. **No "install banner"**: Safari never shows an automatic PWA install prompt. "Add to Home Screen" is always a manual user action via the Share menu. For a kiosk, this is a one-time setup — not an issue.

### Storage / Quota

13. **1 GiB hard limit pre-iOS 17**: iPadOS 16 (pre-iOS 17) enforces a 1 GiB quota before prompting the user. With ~150 MB estimated total cache (images + JSON + app shell), this project is safely under the limit.
14. **7-day eviction (browser tabs only)**: Safari deletes data from origins with no user interaction in 7 days. Home Screen PWAs are largely exempt from this in practice, but always re-sync before events regardless.
15. **`StorageManager.estimate()`**: Use this API during sync to check available quota before beginning large image downloads. Fail gracefully if quota is low.

### CSS / Layout

16. **`100dvh` not available on older Safari**: Use `100vh` with a JS fallback for viewport height on Safari 16.x. The dynamic viewport units (`dvh`, `svh`, `lvh`) were added in Safari 15.4 — so `dvh` IS available on iPadOS 16. Use `100dvh` to handle the safe-area-inset correctly.
17. **`position: fixed` in standalone mode**: On Home Screen PWA, `position: fixed` elements may jump when the virtual keyboard appears. For this kiosk (landscape, no keyboard except email form), test that the email capture screen handles the keyboard gracefully.

### Performance (A9X Chip)

18. **A9X is 2015-era hardware**: 2 cores, ~2 GHz, 4 GB RAM. Avoid:
    - CSS `filter: blur()` or complex `backdrop-filter`
    - Animating `box-shadow` (triggers composite + paint)
    - Large `will-change` declarations across many elements
    - Synchronous JS blocking the main thread during catalogue rendering
19. **Use `transform` and `opacity` for animations only**: These are GPU-composited on A9X and will be smooth. Avoid animating `width`, `height`, `top`, `left`, `background-color`.
20. **Lazy-load images with `IntersectionObserver`**: Do not set `src` on all 950+ images at once. Use IO to load only visible cards. Set `loading="lazy"` as well for belt-and-braces.
21. **Batch IndexedDB writes**: When syncing 951 products, write in batches of 50–100 within a single transaction rather than one transaction per product. Dramatically reduces overhead.

---

## Installation

No package manager or build tools. This is a served-from-filesystem PWA.

```
Project structure:
/index.html        — App shell
/manifest.json     — PWA manifest
/sw.js             — Service Worker (at root)
/css/              — Stylesheets
/js/               — Vanilla JS modules (use <script type="module">)
/icons/            — icon-512.png, icon-1024.png, apple-touch-icon.png
/data/             — (optional) fallback JSON if pre-bundled catalogue needed
```

**Serving for development:**
```bash
# Python 3 (quick local server — HTTPS not needed for localhost SW)
python -m http.server 8080

# Or use VS Code Live Server extension
```

**Deployment:** Copy files to any static host (GitHub Pages, Netlify free tier, or serve from a laptop's local IP during events as a fallback). The app must be served over HTTPS for Service Worker to activate.

---

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
