# Phase 1: PWA Foundation - Research

**Researched:** 2026-03-21
**Domain:** Progressive Web App (PWA) — manifest, service worker, offline caching, iOS/Safari specifics, branding
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Derive icon artwork from theidcardfactory.co.uk — fetch and adapt existing branding rather than creating from scratch
- **D-02:** Square format (standard PWA icon) — works correctly with iPadOS home screen; no letterboxing
- **D-03:** Dark background on the icon, matching the app theme — cohesive appearance on the iPad home screen
- **D-04:** Generate both required sizes: 512×512 and 1024×1024 as PNG files in `assets/icons/`
- **D-05:** Derive exact hex values from the ID Card Factory website (theidcardfactory.co.uk) — fetch brand colors rather than guessing. Expected: dark navy/black base, gold accent
- **D-06:** Minimal palette for Phase 1 — ~5 CSS custom properties: `--color-bg`, `--color-surface`, `--color-accent`, `--color-text-primary`, `--color-text-secondary`
- **D-07:** All CSS custom properties defined in `:root` block of `styles/main.css` — single source of truth for all color tokens across the project
- **D-08:** Branded splash screen — logo centred on dark background, app name, and "Browse our collection →" as the primary CTA
- **D-09:** QR code visible on the splash screen from Phase 1 — placed consistently (bottom-right or corner) to match where it will appear in Phase 2 global chrome
- **D-10:** Splash screen routes to catalogue root on tap/click — navigation placeholder that will become functional in Phase 4
- **D-11:** "Sync required" blocking screen — minimal branded screen with clear message: "Catalogue data not found. Please sync before the event." No sync button. Dark background, gold accent text, ID Card Factory logo.
- **D-12:** Cache all Phase 1 app shell files at install time: `index.html`, `manifest.json`, `src/app.js`, `styles/main.css`, `assets/logo.svg`, `assets/qr-code.png`, icon PNGs
- **D-13:** SW uses `skipWaiting()` + `clients.claim()` to activate immediately
- **D-14:** SW version string in cache name (e.g., `kiosk-v1`) to allow manual cache busting

### Claude's Discretion

- Exact splash screen layout proportions and spacing
- Font choice for splash (must be locally bundled — no CDN; bold display font per brief)
- Loading/transition animation on app launch (CSS only, no JS animation libraries)
- Exact "Sync required" screen visual layout

### Deferred Ideas (OUT OF SCOPE)

- Animated logo on splash — Phase 1 uses CSS transition only; if user wants a more elaborate brand animation, that's a Phase 2+ decision
- Dark/light mode toggle — out of scope; kiosk is always dark
- Splash screen with "featured cards" preview — no catalogue data in Phase 1; deferred to Phase 4 home screen design

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PWA-01 | App installs as a PWA to iPad home screen with standalone display, landscape orientation, dark background theme, and 512×512 and 1024×1024 icons | Manifest fields verified; `orientation` field ignored by Safari — use CSS media query workaround; `apple-touch-icon` takes precedence over manifest icons on iOS |
| PWA-02 | Service worker caches the full app shell on first install; uses cache-first strategy for all app assets and product images | Cache-first pattern documented with MDN-verified code; `skipWaiting` + `clients.claim` + old cache cleanup pattern confirmed |
| PWA-04 | On every launch, app checks whether catalogue data is present in IndexedDB; if storage was evicted, a "Sync required" blocking screen is shown before the catalogue | IndexedDB open + object store count check pattern documented; eviction can happen silently — must check at every boot |
| PWA-05 | Home screen loads in under 2 seconds from cache on A9X hardware (iPad Pro 12.9" 1st Gen) | All Phase 1 files must be precached; CSS transition only (no JS animation libraries); minimal DOM at boot |

</phase_requirements>

---

## Summary

Phase 1 builds the PWA scaffold: a valid `manifest.json`, a service worker with cache-first strategy and immediate activation, a branded splash screen, and a boot health check that detects evicted IndexedDB data. There is no catalogue, no sync, no admin panel — the deliverable is a kiosk-ready shell that can be installed on the iPad today.

Two critical Safari/iPadOS-specific surprises must be planned for. First, the `orientation` manifest field is not respected by Safari on iPadOS — landscape lock must be enforced via a CSS media query that physically rotates the viewport when portrait is detected. Second, `apple-touch-icon` and `apple-touch-startup-image` meta tags take precedence over manifest icons/splash images on iOS — both the manifest icons AND the proprietary `<link>` tags are required for correct iPad home screen behaviour.

The ID Card Factory brand colors have been verified directly from the live site: dark navy `#0d0f1a`, gold `#f5c842`, off-white text `#f0f0f0`, deep blue `#0e1b4d`. The website uses Bebas Neue (display/headings) and Inter (body) — both are open-source Google Fonts that can be self-hosted as woff2 files for offline use. Safari storage eviction for installed PWAs (home screen web apps) operates on a least-recently-used policy, not a fixed 7-day window; however, eviction IS still possible under storage pressure, so the boot health check for IndexedDB is non-negotiable.

**Primary recommendation:** Build the manifest + SW + health check first, verify install on the actual iPad hardware early (Day 1 of implementation), then apply branding. The SW activation pattern (`skipWaiting` + `clients.claim` + `controllerchange` force-reload) must be validated on the physical A9X device before any other Phase 1 work is considered done.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS (ES2017) | ES2017 subset | App logic, SW registration, health check | Project constraint — no frameworks, no build tools |
| Web App Manifest | W3C spec | PWA install metadata, icons, display mode | Required for "Add to Home Screen" in Safari |
| Service Worker API | W3C spec | Cache-first offline strategy, app shell caching | Supported since Safari 11.1; fully functional in Safari 16.x |
| Cache API | W3C spec | Store app shell files (HTML, CSS, JS, assets) | Browser-native; pairs with SW; separate from IndexedDB quota |
| IndexedDB v2 | Browser-native | Health check target (check for catalogue presence) | Only Phase 1 usage is detection — full schema in Phase 2 |
| CSS Custom Properties | Living standard | Dark theme color tokens in `:root` | No preprocessing needed; supported on A9X/Safari 16 |

### Fonts (Self-Hosted — No CDN)

| Font | Format | Purpose | License | Source |
|------|--------|---------|---------|--------|
| Bebas Neue | woff2 | Display/headings, splash app name | SIL Open Font License | https://github.com/dharmatype/Bebas-Neue |
| Inter (400, 700) | woff2 | Body text, UI chrome | SIL Open Font License | https://gwfh.mranftl.com/fonts/inter |

### No Libraries Policy

Per CLAUDE.md: no external JS libraries. All features use browser-native APIs only.

**Installation:**

No npm packages. Fonts are downloaded as static files. Place in `assets/fonts/`:

```
assets/fonts/
├── bebas-neue.woff2
├── inter-400.woff2
└── inter-700.woff2
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 1 scope)

```
kiosk-app/
├── index.html               # App shell — SW registration, view container, meta tags
├── manifest.json            # PWA manifest — display, theme, icons, start_url
├── sw.js                    # Service worker — cache-first, skipWaiting, cleanup
├── src/
│   ├── app.js               # Boot coordinator — health check, view routing stub
│   └── config.js            # localStorage wrapper (stub — Phase 2 fills in)
├── styles/
│   ├── main.css             # CSS custom properties (:root), base reset, landscape fix
│   └── animations.css       # CSS transitions only (splash fade-in)
└── assets/
    ├── logo.svg             # ID Card Factory logo (extracted from brand site)
    ├── qr-code.png          # Static QR code → https://theidcardfactory.co.uk
    ├── icons/
    │   ├── icon-512.png     # Manifest icon + apple-touch-icon
    │   └── icon-1024.png    # High-res manifest icon
    └── fonts/
        ├── bebas-neue.woff2
        ├── inter-400.woff2
        └── inter-700.woff2
```

### Pattern 1: Manifest Configuration (Safari/iPadOS)

**What:** `manifest.json` with the fields Safari actually respects.
**When to use:** Every PWA. Note that `orientation` is ignored by Safari — do not rely on it alone.

```json
// Source: MDN PWA Installability + firt.dev/notes/pwa-ios
{
  "name": "ID Card Factory",
  "short_name": "ID Cards",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0d0f1a",
  "theme_color": "#0d0f1a",
  "orientation": "landscape",
  "icons": [
    {
      "src": "/assets/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/assets/icons/icon-1024.png",
      "sizes": "1024x1024",
      "type": "image/png"
    }
  ]
}
```

**CRITICAL:** On iOS/iPadOS, Safari ignores manifest icons in favour of `apple-touch-icon` meta tags in `<head>`. Both must be present.

### Pattern 2: iOS-Specific `<head>` Meta Tags

**What:** Proprietary Apple meta tags that Safari requires for correct home screen behaviour.
**When to use:** Every PWA targeting Safari/iPadOS. These are not optional.

```html
<!-- Source: web.dev/learn/pwa/enhancements + verified against firt.dev/notes/pwa-ios -->

<!-- Standalone mode (Safari uses this, not manifest display) -->
<!-- NOTE: apple-mobile-web-app-capable is deprecated — use manifest display:standalone instead -->
<!-- Safari 16.x on iPadOS respects manifest display:standalone without this tag -->

<!-- Status bar style — black-translucent renders over your bg-color -->
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

<!-- App name on home screen -->
<meta name="apple-mobile-web-app-title" content="ID Cards">

<!-- Home screen icon — takes precedence over manifest icons on iOS -->
<link rel="apple-touch-icon" sizes="1024x1024" href="/assets/icons/icon-1024.png">
<link rel="apple-touch-icon" sizes="512x512" href="/assets/icons/icon-512.png">

<!-- Splash screen for iPad Pro 12.9" 1st Gen (2048x2732 physical, 1024x1366 CSS, 2x DPR) -->
<!-- Landscape: physical dimensions are 2732w x 2048h for the splash image -->
<link rel="apple-touch-startup-image"
  media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
  href="/assets/splash-2732x2048.png">
<!-- Portrait: physical dimensions are 2048w x 2732h -->
<link rel="apple-touch-startup-image"
  media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
  href="/assets/splash-2048x2732.png">
```

### Pattern 3: Landscape Orientation Enforcement (CSS Workaround)

**What:** CSS media query that rotates the viewport 90° when the device is in portrait, creating a forced-landscape effect.
**When to use:** Because `manifest.json` `orientation: "landscape"` is ignored by Safari/iPadOS, this is the only reliable CSS workaround. A Guided Access kiosk on a fixed stand won't rotate, so this is a safety net only.

```css
/* Source: CSS-Tricks orientation lock pattern */
/* Rotate the entire app 90deg if someone holds device portrait */
@media (orientation: portrait) {
  body {
    transform: rotate(90deg);
    transform-origin: bottom left;
    width: 100vh;
    height: 100vw;
    overflow-x: hidden;
    position: absolute;
    top: -100vw;
    left: 0;
  }
}
```

**Note:** This is a defensive measure. The kiosk will be mounted in landscape and Guided Access will prevent rotation in most cases. However, Screen Orientation API lock (`screen.orientation.lock()`) is only "partial support" on iPadOS 16 and should NOT be relied upon.

### Pattern 4: Service Worker — Cache-First with Immediate Activation

**What:** SW precaches app shell on install, serves from cache first, activates immediately via `skipWaiting` + `clients.claim`, cleans old caches on activate.

```javascript
// Source: MDN Using_Service_Workers
const CACHE_NAME = 'kiosk-v1';

const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/app.js',
  '/src/config.js',
  '/styles/main.css',
  '/styles/animations.css',
  '/assets/logo.svg',
  '/assets/qr-code.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-1024.png',
  '/assets/fonts/bebas-neue.woff2',
  '/assets/fonts/inter-400.woff2',
  '/assets/fonts/inter-700.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Cache-first: serve from cache, fall back to network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful GET responses for future offline use
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
```

**CRITICAL for iPadOS standalone mode:** After SW update activates, the standalone app does not automatically reload. Add a `controllerchange` listener in `app.js` to force a page reload when the new SW takes control:

```javascript
// Source: STATE.md critical risk + MDN service worker lifecycle
// In src/app.js — run before any other init
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'activated' && navigator.serviceWorker.controller) {
          window.location.reload();
        }
      });
    });
  });

  // Also handle controller replacement (skipWaiting case)
  let controllerChanging = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!controllerChanging) {
      controllerChanging = true;
      window.location.reload();
    }
  });
}
```

### Pattern 5: Boot Health Check (PWA-04)

**What:** On every app launch, check whether IndexedDB contains catalogue data. If not (fresh install or eviction), show the "Sync required" blocking screen instead of the catalogue.

```javascript
// Source: MDN IndexedDB API pattern
// In src/app.js — called before rendering any catalogue view
async function checkCatalogueHealth() {
  return new Promise((resolve) => {
    const req = indexedDB.open('kiosk-db', 1);

    req.onupgradeneeded = () => {
      // Database did not exist — this is a fresh install or post-eviction state
      // onupgradeneeded fires when db is new (version 0 → 1)
      resolve(false);
    };

    req.onsuccess = (event) => {
      const db = event.target.result;
      // Check if the 'products' store exists and has records
      if (!db.objectStoreNames.contains('products')) {
        db.close();
        resolve(false);
        return;
      }
      const tx = db.transaction('products', 'readonly');
      const store = tx.objectStore('products');
      const countReq = store.count();
      countReq.onsuccess = () => {
        db.close();
        resolve(countReq.result > 0);
      };
      countReq.onerror = () => {
        db.close();
        resolve(false);
      };
    };

    req.onerror = () => resolve(false);
  });
}

// Boot sequence in app.js
async function boot() {
  const hasCatalogue = await checkCatalogueHealth();
  if (!hasCatalogue) {
    showSyncRequiredScreen();
  } else {
    showSplashScreen();
  }
}
```

**Note:** In Phase 1, the `products` object store won't exist yet (Phase 2 creates the full schema). The `onupgradeneeded` branch correctly triggers and returns `false`, showing the "Sync required" screen. This is the correct behaviour for Phase 1 testing.

### Pattern 6: Brand Color Tokens (Verified from Live Site)

```css
/* Source: theidcardfactory.co.uk — fetched 2026-03-21 */
:root {
  --color-bg:             #0d0f1a;  /* Dark navy — primary background */
  --color-surface:        #0e1b4d;  /* Deep blue — cards, panels */
  --color-accent:         #f5c842;  /* Gold — CTAs, highlights, active states */
  --color-text-primary:   #f0f0f0;  /* Off-white — primary readable text */
  --color-text-secondary: #a0a8c0;  /* Muted blue-grey — secondary text (derived) */
}
```

### Pattern 7: Self-Hosted Font @font-face

```css
/* Source: Google Webfonts Helper (gwfh.mranftl.com) pattern */
@font-face {
  font-family: 'Bebas Neue';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/assets/fonts/bebas-neue.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/assets/fonts/inter-400.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/assets/fonts/inter-700.woff2') format('woff2');
}
```

### Anti-Patterns to Avoid

- **Using `apple-mobile-web-app-capable` meta tag:** Deprecated. Can harm install experience by bypassing `start_url` and `scope`. Safari 16.x respects `display: standalone` in manifest without this tag. Do not include it.
- **Relying on manifest `orientation` alone:** Ignored by Safari on iPadOS. Always pair with the CSS rotation media query as a fallback.
- **Storing fonts in IndexedDB:** Fonts belong in the Cache API (via SW precache), not IndexedDB. They are static assets.
- **Not cloning fetch responses before caching:** `response.clone()` is required — responses can only be consumed once.
- **Registering the SW inside a DOMContentLoaded handler without checking `serviceWorker in navigator`:** On older Safari the check is needed; always guard SW registration.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font loading | Custom font loading JS | CSS `@font-face` + `font-display: swap` | Browser handles this natively; swap ensures text visible during load |
| Cache versioning | Custom cache invalidation logic | Cache name version string (`kiosk-v1`) + delete-on-activate pattern | Simpler, well-understood, no edge cases |
| Storage estimation | Custom byte-counting logic | `navigator.storage.estimate()` (Storage API) | Browser-native; accurate; only needed if warning user about quota — skip for Phase 1 |
| QR code generation | `qrcode.js` library | Static pre-generated PNG (`assets/qr-code.png`) | URL never changes; library adds dependency; static image is simpler |

**Key insight:** The hardest parts of PWA setup on iOS are not logic problems — they are browser-specific configuration problems. The solution is correct metadata (manifest + meta tags), not custom code.

---

## Common Pitfalls

### Pitfall 1: Safari Ignores Manifest Icons — App Uses Generic Globe

**What goes wrong:** App installs to home screen with a generic Safari globe icon instead of the custom icon.
**Why it happens:** iOS/iPadOS Safari uses `apple-touch-icon` link tags from `<head>`, not manifest `icons` array, for the home screen icon.
**How to avoid:** Include `<link rel="apple-touch-icon" sizes="1024x1024" href="...">` in `index.html` `<head>`. The manifest icons are still needed for non-Apple browsers.
**Warning signs:** After "Add to Home Screen," the icon is the Safari globe or a page screenshot.

### Pitfall 2: SW Not Updating on Standalone Mode iPad

**What goes wrong:** New SW is deployed but the kiosk app keeps serving the old cached version indefinitely.
**Why it happens:** Standalone PWAs on iPadOS do not auto-reload when a new SW activates. Without `skipWaiting()` + `clients.claim()` + a `controllerchange` reload, the old SW controls the page until it's manually closed and re-opened.
**How to avoid:** Implement the full activation pattern (Pattern 4 above). `skipWaiting()` alone is insufficient — the `controllerchange` reload listener in the main thread is what triggers the fresh page load.
**Warning signs:** Code changes deployed but kiosk still shows old behaviour after re-opening.

### Pitfall 3: Black/White Screen on First Install Instead of Splash

**What goes wrong:** After installing the PWA and tapping the home screen icon, a black or white blank screen appears briefly before the app loads.
**Why it happens:** `apple-touch-startup-image` is not provided or uses wrong dimensions. Safari shows a white screen if no matching splash image is found.
**How to avoid:** Provide `apple-touch-startup-image` link tags with correct media queries for the iPad Pro 12.9" 1st Gen (device-width: 1024px, device-height: 1366px, DPR: 2). Create both portrait (2048×2732px) and landscape (2732×2048px) splash PNGs filled with `#0d0f1a`.
**Warning signs:** Momentary flash of white/black on launch.

### Pitfall 4: Precache `addAll` Failure Aborts Entire Install

**What goes wrong:** If any single file in the `addAll()` array returns a non-200 response, the entire SW install fails silently. The app loads from network each time.
**Why it happens:** `cache.addAll()` rejects if any fetch fails. On first install, all files must be available on the network.
**How to avoid:** Verify every file path in `APP_SHELL_FILES` is correct (exact case, exact path from root). Serve from a local server during development. Test install in Safari — not just Chrome — before claiming the phase is done.
**Warning signs:** SW installs but `caches.keys()` returns empty; offline mode still shows network errors.

### Pitfall 5: Boot Health Check Always Returns False in Phase 1

**What goes wrong:** Every launch shows "Sync required" even though the developer knows the app is working correctly.
**Why it happens:** In Phase 1, the IndexedDB schema doesn't exist yet. The `onupgradeneeded` handler fires correctly, returns `false`, and shows the blocking screen — this is CORRECT behaviour.
**How to avoid:** Understand this is expected. The "Sync required" screen is the correct Phase 1 state. Phase 2 creates the DB schema and populates products — after that, the health check can return `true`.
**Warning signs:** None — this is expected Phase 1 behaviour.

### Pitfall 6: Storage Eviction Silently Wipes IndexedDB

**What goes wrong:** The kiosk app worked before an event but now shows "Sync required" even though the operator never cleared anything.
**Why it happens:** Safari evicts all origin data (IndexedDB + Cache API + SW registration) under storage pressure, using a least-recently-used policy. Installed PWAs have separate storage from Safari browser, but eviction is still possible.
**How to avoid:** The PWA-04 boot health check is the mitigation. Operator workflow: always sync on event day. Note that Safari 17+ (iPadOS 17+) storage eviction improved significantly — but the target device runs iPadOS 16 max, so the old behaviour must be assumed.
**Warning signs:** App shows "Sync required" after the iPad sat idle for several days without being opened.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `apple-mobile-web-app-capable` meta tag for standalone mode | `display: standalone` in manifest.json | iOS 11.3+ (manifest support) | Old tag is deprecated; don't include it |
| AppCache for offline | Service Worker + Cache API | AppCache removed ~2021 | AppCache is gone; SW is the only option |
| 7-day hard eviction window for Safari storage | Least-recently-used eviction (storage pressure + ITP) | Safari 17 / WebKit 2023 blog | Eviction not on a fixed timer — but still happens; health check still mandatory |
| `Screen Orientation API lock()` for orientation | CSS `rotate + transform` workaround (or Guided Access) | iPadOS 16 "partial support" | `lock()` unreliable on iOS; CSS is the fallback |
| Base64 images in IndexedDB | Cached via Cache API (SW precache or dynamic caching) | Safari 14+ (IDB blob bug fixed) | Images belong in Cache API, not IDB |

**Deprecated/outdated:**
- `apple-mobile-web-app-capable`: Deprecated by Apple. Provides inferior experience vs. manifest `display: standalone`. Omit entirely.
- AppCache: Removed from all browsers. Irrelevant.
- `device-aspect-ratio` media queries: Deprecated. Use `orientation: landscape` instead.

---

## Branding Reference (Verified 2026-03-21)

**Source:** https://theidcardfactory.co.uk — fetched directly

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg` | `#0d0f1a` | Primary background (dark navy) |
| `--color-surface` | `#0e1b4d` | Cards, surfaces (deep blue) |
| `--color-accent` | `#f5c842` | Gold — CTAs, active states, accent text |
| `--color-text-primary` | `#f0f0f0` | Body text (off-white) |
| `--color-text-secondary` | `#a0a8c0` | Secondary text (derived muted blue-grey) |

**Logo:** `https://theidcardfactory.co.uk/cdn/shop/files/id-card-factory-logo.svg` — download and save as `assets/logo.svg`

**Fonts used on the live site:**
- **Bebas Neue** — display/headings (confirmed on live site)
- **Inter** (400 + 700) — body text (confirmed on live site)

Both fonts are open source (SIL OFL). Download woff2 files from:
- Bebas Neue: https://github.com/dharmatype/Bebas-Neue (or https://gwfh.mranftl.com/fonts/bebas-neue)
- Inter: https://gwfh.mranftl.com/fonts/inter

---

## Device Specifications (Target Hardware)

**iPad Pro 12.9" 1st Generation (A1652 / A9X chip)**

| Property | Value |
|----------|-------|
| CSS viewport (portrait) | 1024 × 1366 px |
| CSS viewport (landscape) | 1366 × 1024 px |
| Physical resolution | 2048 × 2732 px |
| Device pixel ratio | 2 (Retina) |
| Max iOS | iPadOS 16 |
| Safari version | 16.x |
| `device-width` CSS media query | `1024px` |
| `device-height` CSS media query | `1366px` |
| `-webkit-device-pixel-ratio` | `2` |

**Splash image dimensions (physical pixels):**
- Portrait: 2048 × 2732 px
- Landscape: 2732 × 2048 px

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual / browser-based (no automated test framework in scope for Phase 1) |
| Config file | None |
| Quick run command | `python3 -m http.server 8080` then open Safari on device |
| Full suite command | Manual checklist against 5 success criteria |

**Rationale:** Phase 1 deliverables (installability, offline behaviour, orientation, load time) require physical iPad hardware and Safari for verification. There is no meaningful automated test that can verify "app installs to home screen" or "loads in under 2 seconds on A9X." The validation must be done manually on the target device.

### Phase Requirements → Test Map

| Req ID | Behaviour | Test Type | Verification Method | Automatable? |
|--------|-----------|-----------|---------------------|--------------|
| PWA-01 | App installs to iPad home screen in standalone landscape with dark theme and correct icons | Manual | Install via Safari → Add to Home Screen → verify icon, orientation, chrome-free display | No — requires physical device |
| PWA-02 | Service worker caches app shell; cache-first strategy; offline loads fully | Manual + DevTools | Enable Airplane Mode → reload app → no network errors; check SW registration in Safari Web Inspector | Partially — offline check on desktop Safari |
| PWA-04 | Empty/evicted IDB shows "Sync required" blocking screen | Manual | Clear site data → open app → verify blocking screen appears | Manual |
| PWA-05 | Home screen loads < 2s from cache on A9X | Manual | Time load on physical iPad with Airplane Mode on and cached SW active | No — requires physical device |

### Sampling Rate

- **Per feature commit:** Load app in desktop Safari and verify no JS errors in console
- **Per wave merge:** Run through manual checklist on iPad (or desktop Safari as proxy where possible)
- **Phase gate:** All 5 success criteria must pass on physical iPad Pro 12.9" before `/gsd:verify-work`

### Wave 0 Gaps

- No existing test files — Phase 1 is greenfield
- No test framework needed for Phase 1 (all verification is manual/device-based)
- Create `tests/CHECKLIST.md` as a structured manual verification checklist covering all 5 success criteria

*(No automated test framework installation needed for this phase)*

---

## Open Questions

1. **Safari orientation lock reliability in standalone mode on iPadOS 16**
   - What we know: `manifest.json` `orientation` is ignored; Screen Orientation API is "partial support" on iPadOS 16.4; CSS rotation workaround is the documented fallback
   - What's unclear: Whether the CSS rotation workaround causes any rendering artifacts on A9X with the specific viewport dimensions
   - Recommendation: Implement CSS rotation workaround as specified; validate on physical device in Phase 1 verification. Since kiosk is physically mounted in landscape and Guided Access is active, the rotation scenario is unlikely in production.

2. **Safari 17 storage policy improvements vs. iPadOS 16 target**
   - What we know: Safari 17 (iPadOS 17) improved storage quotas and eviction behaviour significantly. The target device maxes at iPadOS 16 (Safari 16.x).
   - What's unclear: Exact eviction conditions on Safari 16.x for an installed standalone PWA under storage pressure
   - Recommendation: Treat eviction as always possible. Boot health check is mandatory regardless. Operator workflow must include: sync on event day, never leave device idle for weeks.

3. **`apple-touch-startup-image` necessity for iPadOS 16 installed PWA**
   - What we know: Without it, a white screen appears on launch. With correct dimensions it shows a branded splash.
   - What's unclear: Whether a single splash PNG can serve both orientations via CSS media queries, or whether two separate images are strictly required
   - Recommendation: Provide both portrait and landscape splash images as two separate PNGs (safest approach). Both can be generated from the same brand template at the correct pixel dimensions.

---

## Sources

### Primary (HIGH confidence)
- MDN — Using Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
- MDN — Storage Quotas and Eviction Criteria: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- MDN — Making PWAs Installable: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- WebKit Blog — Updates to Storage Policy: https://webkit.org/blog/14403/updates-to-storage-policy/
- web.dev — PWA Enhancements (Apple meta tags): https://web.dev/learn/pwa/enhancements
- theidcardfactory.co.uk — Brand colors, fonts, logo (fetched 2026-03-21)

### Secondary (MEDIUM confidence)
- firt.dev/notes/pwa-ios — iOS PWA Compatibility matrix (verified against WebKit blog)
- YesViz — iPad Pro 12.9" viewport specs: https://yesviz.com/devices/ipadpro/
- google-webfonts-helper for Inter self-hosting: https://gwfh.mranftl.com/fonts/inter
- dharmatype/Bebas-Neue GitHub — Bebas Neue woff2: https://github.com/dharmatype/Bebas-Neue

### Tertiary (LOW confidence — manual validation required)
- CSS orientation rotation workaround pattern (multiple sources agree on approach; exact behaviour on A9X/iPadOS 16 not confirmed without device testing)
- `apple-touch-startup-image` exact media query dimensions for iPad Pro 1st Gen (older sources, cross-referenced with yesviz viewport data)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — browser-native APIs, no library choices to evaluate
- Architecture: HIGH — file structure from KIOSK_APP.md, patterns from MDN verified sources
- Brand colors: HIGH — fetched from live site 2026-03-21
- Pitfalls: HIGH — most are verified against WebKit blog, MDN, and firt.dev iOS compat notes
- Orientation workaround: MEDIUM — documented pattern but requires device validation
- Splash image dimensions: MEDIUM — cross-referenced but older source material; verify on device

**Research date:** 2026-03-21
**Valid until:** 2026-06-21 (stable PWA specs; Safari iOS compatibility notes may shift with new iPadOS releases, though target is capped at iPadOS 16)
