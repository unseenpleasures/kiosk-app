# Phase 2: Data Layer and Navigation - Research

**Researched:** 2026-03-21
**Domain:** IndexedDB schema, localStorage config, SHA-256 hashing, hash-based routing, inactivity timer, global UI chrome (QR code + home button)
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PWA-03 | All product JSON and optimised images are downloaded to device during sync; app functions fully offline | Phase 2 creates the IndexedDB schema that Phase 3 sync writes to. The object stores (products, sync_meta) must be defined here. Image caching via Cache API (SW-managed) is architecturally confirmed. |
| PWA-06 | Admin passcode stored hashed (SHA-256) in localStorage; event name, event date, and timer setting stored in localStorage | `crypto.subtle.digest` pattern verified from MDN. `config.js` is the exclusive localStorage wrapper (STATE.md constraint). |
| CAT-07 | QR code linking to https://theidcardfactory.co.uk is always visible on every screen | Implemented as fixed-position chrome injected into `#app` at boot, outside any screen `<div>`. QR image already exists at `/assets/qr-code.png` from Phase 1. |
| CAT-08 | Floating home button fixed to top-left on every screen; tapping it resets search, filter, and returns to catalogue grid | Fixed-position chrome element, same injection pattern as QR code. Hash navigation to `#/` resets all in-memory state (Phase 4 will read). |
| CAT-09 | App automatically returns to home after 60 seconds of inactivity, preceded by a 10-second visual countdown with cancel option | `setTimeout` + `setInterval` inactivity timer. Touch events reset the timer. Timer lives in a dedicated `idle.js` module. |

</phase_requirements>

---

## Summary

Phase 2 establishes the three foundations every subsequent phase builds on: the full IndexedDB schema, the config/settings layer, and the navigation + UI chrome skeleton. No feature code — just infrastructure that can be written, tested, and locked down before Phase 3 starts writing product records to the database.

The most important architectural decision already made (STATE.md) is module ownership: `db.js` exclusively owns IndexedDB, `config.js` exclusively owns localStorage, and `sync.js` (Phase 3) exclusively owns network calls. Phase 2 creates `db.js` and fleshes out `config.js`. The hash-based router (`router.js`) and the inactivity timer (`idle.js`) are also new Phase 2 modules.

The global UI chrome (QR corner + home button) must be injected once at boot as persistent fixed-position elements, not re-created on each screen transition. This is the only reliable way to guarantee "always visible on every screen" — if individual screens render their own QR corners, any screen that forgets the element breaks CAT-07.

**Primary recommendation:** Build `db.js` first (schema creation), then `config.js` (localStorage wrapper + SHA-256), then the router, then the chrome elements, then the inactivity timer — in that dependency order. Each is independently testable before wiring them together.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| IndexedDB v2 API | Browser-native | Persistent structured storage for products, emails, analytics, sync metadata | Project constraint; only store suitable for 950+ record datasets; async; survives offline |
| localStorage | Browser-native | Small config values: passcode hash, event name, event date, timer setting | Synchronous, appropriate for < 5 KB; wrapped exclusively by `config.js` |
| Web Crypto API (`crypto.subtle`) | Browser-native | SHA-256 hash for admin passcode | Project constraint from CLAUDE.md; browser-native; no library needed |
| `location.hash` + `hashchange` event | Browser-native | Hash-based client-side routing | Project constraint from STATE.md; no framework; Safari-native |
| `setTimeout` / `setInterval` | Browser-native | Inactivity timer countdown | Browser-native; simpler than any library |
| CSS `position: fixed` | Living standard | Persistent QR corner + home button chrome | GPU-composited layer; survives DOM screen swaps without re-rendering |

### No Libraries Policy

Per CLAUDE.md: no external JS libraries. All features use browser-native APIs only. No router library, no state management library, no timer utility.

---

## Architecture Patterns

### Recommended File Structure (Phase 2 additions)

```
kiosk-app/
├── index.html              # Add chrome elements to DOM at load time (see Pattern 1)
├── src/
│   ├── app.js              # Extend: init chrome, init router, init idle timer after boot
│   ├── config.js           # Flesh out: localStorage wrapper with all config keys
│   ├── db.js               # NEW: IndexedDB schema, open/upgrade, CRUD helpers
│   ├── router.js           # NEW: hashchange listener, view show/hide dispatcher
│   └── idle.js             # NEW: inactivity timer, countdown overlay
└── styles/
    └── main.css            # Add: chrome element styles, countdown overlay styles
```

### Pattern 1: Persistent Global Chrome (CAT-07, CAT-08)

**What:** QR code corner and floating home button injected into `#app` as fixed-position elements at boot time, once. They persist across all screen swaps.

**When to use:** Any UI element that must appear on "every screen." Do not recreate it in each screen's render function — inject once and leave it in the DOM.

**How:** Add the chrome markup directly to `index.html` (it's always present in the DOM) OR inject it via JS in `app.js` boot sequence after the `#app` div exists. The `index.html` approach is simpler and avoids any timing issues.

```html
<!-- In index.html, inside <body>, alongside #app -->
<div id="app"></div>

<!-- Global chrome — always visible, fixed-position, outside screen divs -->
<div id="chrome-qr" class="chrome-qr" role="img" aria-label="QR code to theidcardfactory.co.uk">
  <img src="/assets/qr-code.png" alt="Visit theidcardfactory.co.uk">
  <span class="chrome-qr-label">Visit our website</span>
</div>

<button id="chrome-home" class="chrome-home" type="button" aria-label="Return to catalogue home">
  <!-- House icon or text -->
  <span class="chrome-home-icon">&#8962;</span>
</button>
```

```css
/* Fixed chrome — GPU composited layer, no repaints during screen transitions */
.chrome-qr {
  position: fixed;
  bottom: var(--space-lg);
  right: var(--space-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  z-index: 100;
}

.chrome-qr img {
  width: 96px;
  height: 96px;
}

.chrome-qr-label {
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--color-text-secondary);
}

.chrome-home {
  position: fixed;
  top: var(--space-md);
  left: var(--space-md);
  width: 48px;
  height: 48px;
  min-height: var(--touch-target-min);
  background: rgba(14, 27, 77, 0.85);  /* --color-surface with alpha */
  border: 1px solid var(--color-accent);
  border-radius: 8px;
  color: var(--color-accent);
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
}

.chrome-home:active {
  opacity: 0.8;
}
```

**Important:** The splash screen from Phase 1 rendered a `.qr-corner` element inside its screen `<div>`. In Phase 2, the global chrome replaces this. The splash screen's inline QR corner should be removed — the fixed chrome element takes over. The `.qr-corner` CSS class can remain as dead code or be cleaned up.

**CAT-07 note on tapping the QR code:** The requirement says tapping "does not navigate away from the app." Since this is a `<div>` (not an `<a>` tag), there is no default navigation behaviour. No `href` or click handler is needed on the QR element. It is purely decorative/informational.

### Pattern 2: Hash-Based Router

**What:** A `hashchange` event listener that maps URL hash fragments to screen render functions.

**When to use:** Every screen transition. The router is the single dispatcher — no screen knows about other screens.

```javascript
// src/router.js
// Source: MDN hashchange event + STATE.md architecture constraint

var ROUTES = {
  '#/':              showCatalogueScreen,
  '#/email':         showEmailScreen,
  '#/admin':         showAdminScreen,
};
// Note: '#/category/:id' and '#/card/:id' have dynamic segments — handled with prefix matching

function handleRoute() {
  var hash = window.location.hash || '#/';

  // Exact match first
  if (ROUTES[hash]) {
    ROUTES[hash]();
    return;
  }

  // Prefix match for parameterised routes
  if (hash.indexOf('#/category/') === 0) {
    showCategoryScreen(hash.replace('#/category/', ''));
    return;
  }
  if (hash.indexOf('#/card/') === 0) {
    showCardScreen(hash.replace('#/card/', ''));
    return;
  }

  // Fallback — unknown hash goes to catalogue root
  window.location.hash = '#/';
}

function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  // Run once on init to handle direct load with a hash
  handleRoute();
}
```

**Note:** `showCatalogueScreen`, `showEmailScreen`, `showAdminScreen`, `showCategoryScreen`, `showCardScreen` are stubs in Phase 2 — each renders a placeholder `<div>` with the screen name. The real implementations come in Phases 3–5.

**Home button wiring:**

```javascript
// In app.js init or router.js init
document.getElementById('chrome-home').addEventListener('click', function() {
  window.location.hash = '#/';
  // Phase 4: also reset in-memory filter/search state here
});
```

### Pattern 3: IndexedDB Schema (db.js)

**What:** Single module that opens `kiosk-db`, creates all object stores on `onupgradeneeded`, and exports Promise-wrapped CRUD helpers.

**When to use:** Every database access. Views and other modules never open IndexedDB transactions directly (STATE.md constraint).

**DB name and version:** `kiosk-db`, version `1` (Phase 1 already uses this name and version). Phase 2 must upgrade to version `2` to add the new stores, using `onupgradeneeded` with version guard.

```javascript
// src/db.js
// Source: MDN IndexedDB API — Using IndexedDB

var DB_NAME = 'kiosk-db';
var DB_VERSION = 2;  // Bump from Phase 1's implicit v1 to v2 to add new stores
var _db = null;

// Schema definition — reference for onupgradeneeded
// Object stores:
//   products     — keyPath: 'id' (Shopify product ID string)
//                  index: 'category' (for filter queries)
//                  index: 'createdAt' (for NEW badge detection)
//   emails       — keyPath: 'id' (auto-increment), fields: email, eventName, eventDate, consentAt
//   analytics    — keyPath: 'id' (auto-increment), fields: type, data, timestamp, eventName
//   sync_meta    — keyPath: 'key' (e.g., 'lastSyncAt', 'lastCursor', 'productCount')

function openDB() {
  return new Promise(function(resolve, reject) {
    if (_db) {
      resolve(_db);
      return;
    }
    var req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = function(event) {
      var db = event.target.result;
      var oldVersion = event.oldVersion;

      // Version 1 → 2: create all stores (Phase 1 only opened the DB to check health;
      // if products store exists from a Phase 1 health check that called onupgradeneeded,
      // guard each createObjectStore with a contains() check)
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('products')) {
          var productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('category', 'category', { unique: false });
          productStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('emails')) {
          db.createObjectStore('emails', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('analytics')) {
          db.createObjectStore('analytics', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('sync_meta')) {
          db.createObjectStore('sync_meta', { keyPath: 'key' });
        }
      }
    };

    req.onsuccess = function(event) {
      _db = event.target.result;
      resolve(_db);
    };

    req.onerror = function(event) {
      reject(event.target.error);
    };
  });
}

// Generic helpers — used by Phase 3+ modules

function dbGet(storeName, key) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readonly');
      var req = tx.objectStore(storeName).get(key);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function dbPut(storeName, value) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readwrite');
      var req = tx.objectStore(storeName).put(value);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function dbGetAll(storeName) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readonly');
      var req = tx.objectStore(storeName).getAll();
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function dbCount(storeName) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readonly');
      var req = tx.objectStore(storeName).count();
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function dbAdd(storeName, value) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readwrite');
      var req = tx.objectStore(storeName).add(value);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
}
```

**Version upgrade critical path:** Phase 1's `checkCatalogueHealth()` in `app.js` opens `kiosk-db` at version `1`. If Phase 2 bumps to version `2`, the `onupgradeneeded` handler fires for all existing installations. The `event.oldVersion` will be `1` for users who ran Phase 1 (where the products store may or may not have been created). The `contains()` guards prevent duplicate createObjectStore errors.

**Note:** `IDBObjectStore.getAll()` is IndexedDB v2 and is supported in Safari 10.1+. Safe to use on iPadOS 16.

### Pattern 4: Config Module (localStorage wrapper)

**What:** Typed getter/setter pairs for each config key, centralised in `config.js`. All keys are prefixed to avoid collisions.

```javascript
// src/config.js
// Source: CLAUDE.md + STATE.md architecture constraint
// All localStorage access goes through this module — never direct localStorage elsewhere.

var KEYS = {
  PASSCODE_HASH: 'kiosk_passcode_hash',
  EVENT_NAME:    'kiosk_event_name',
  EVENT_DATE:    'kiosk_event_date',
  IDLE_TIMEOUT:  'kiosk_idle_timeout',  // stored as integer string (seconds)
};

var DEFAULT_IDLE_TIMEOUT = 60;  // seconds

var Config = {
  getPasscodeHash: function() {
    return localStorage.getItem(KEYS.PASSCODE_HASH) || null;
  },
  setPasscodeHash: function(hash) {
    localStorage.setItem(KEYS.PASSCODE_HASH, hash);
  },
  getEventName: function() {
    return localStorage.getItem(KEYS.EVENT_NAME) || '';
  },
  setEventName: function(name) {
    localStorage.setItem(KEYS.EVENT_NAME, name);
  },
  getEventDate: function() {
    return localStorage.getItem(KEYS.EVENT_DATE) || '';
  },
  setEventDate: function(date) {
    localStorage.setItem(KEYS.EVENT_DATE, date);
  },
  getIdleTimeout: function() {
    var stored = localStorage.getItem(KEYS.IDLE_TIMEOUT);
    return stored ? parseInt(stored, 10) : DEFAULT_IDLE_TIMEOUT;
  },
  setIdleTimeout: function(seconds) {
    localStorage.setItem(KEYS.IDLE_TIMEOUT, String(seconds));
  },
};
```

### Pattern 5: SHA-256 Passcode Hashing

**What:** One-way hash of the admin passcode using Web Crypto API. Stored in localStorage as a hex string.

**Source:** MDN SubtleCrypto.digest() — fetched 2026-03-21

```javascript
// In config.js or a dedicated auth.js — called when setting or verifying passcode
// Must run in a secure context (served over HTTPS or localhost)

function hashPasscode(passcode) {
  var encoder = new TextEncoder();
  var data = encoder.encode(passcode);
  return window.crypto.subtle.digest('SHA-256', data).then(function(hashBuffer) {
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    var hashHex = hashArray.map(function(b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
    return hashHex;
  });
}

// Verify passcode against stored hash
function verifyPasscode(inputPasscode) {
  return hashPasscode(inputPasscode).then(function(inputHash) {
    var storedHash = Config.getPasscodeHash();
    return storedHash !== null && inputHash === storedHash;
  });
}
```

**Important:** `crypto.subtle` is only available in secure contexts (HTTPS or localhost). The kiosk will be served locally via `python3 -m http.server` during development — localhost is a secure context, so this works. In production, the PWA is installed from a local serve as well. Confirm the production serving method maintains a secure context.

**Note on `Uint8Array.prototype.toHex()`:** This is a newer API not available in Safari 16.x. Use the `Array.from(...).map(...)` pattern above, which is ES2017-compatible.

### Pattern 6: Inactivity Timer

**What:** A timer that resets on any user touch/pointer event. After `idleTimeout` seconds with no activity, show a 10-second countdown overlay. If not dismissed, navigate to `#/`.

```javascript
// src/idle.js
// Source: Browser-native setTimeout/setInterval pattern

var _idleTimer = null;
var _countdownTimer = null;
var _countdownEl = null;
var _countdownRemaining = 10;
var _active = false;

function resetIdleTimer() {
  if (!_active) return;
  if (_countdownEl) {
    cancelCountdown();
  }
  clearTimeout(_idleTimer);
  var timeout = Config.getIdleTimeout() * 1000;
  _idleTimer = setTimeout(startCountdown, timeout);
}

function startCountdown() {
  _countdownRemaining = 10;
  _countdownEl = showCountdownOverlay(_countdownRemaining);
  _countdownTimer = setInterval(function() {
    _countdownRemaining -= 1;
    updateCountdownOverlay(_countdownEl, _countdownRemaining);
    if (_countdownRemaining <= 0) {
      cancelCountdown();
      window.location.hash = '#/';
    }
  }, 1000);
}

function cancelCountdown() {
  clearInterval(_countdownTimer);
  _countdownTimer = null;
  if (_countdownEl && _countdownEl.parentNode) {
    _countdownEl.parentNode.removeChild(_countdownEl);
  }
  _countdownEl = null;
}

function initIdleTimer() {
  _active = true;
  // Listen on document — captures all touch events regardless of which element
  document.addEventListener('touchstart', resetIdleTimer, { passive: true });
  document.addEventListener('touchend', resetIdleTimer, { passive: true });
  document.addEventListener('pointerdown', resetIdleTimer, { passive: true });
  resetIdleTimer();  // Start the initial timer
}

function pauseIdleTimer() {
  // Called when entering email screen (CAT-10: 3-minute grace period)
  // Phase 4 will extend this with a different timeout for the email screen
  _active = false;
  clearTimeout(_idleTimer);
  if (_countdownEl) cancelCountdown();
}

function resumeIdleTimer() {
  _active = true;
  resetIdleTimer();
}
```

**Countdown overlay:** A full-screen semi-transparent overlay with centred text showing the remaining seconds and a "Cancel" button. Must be above all screen content and chrome (z-index > 100).

```javascript
function showCountdownOverlay(seconds) {
  var overlay = document.createElement('div');
  overlay.className = 'idle-overlay';

  var msg = document.createElement('p');
  msg.className = 'idle-message';
  msg.textContent = 'Returning to home in ' + seconds + ' seconds...';
  overlay.appendChild(msg);

  var cancel = document.createElement('button');
  cancel.className = 'idle-cancel';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', function() {
    cancelCountdown();
    resetIdleTimer();
  });
  overlay.appendChild(cancel);

  document.body.appendChild(overlay);
  return overlay;
}

function updateCountdownOverlay(el, seconds) {
  var msg = el.querySelector('.idle-message');
  if (msg) {
    msg.textContent = 'Returning to home in ' + seconds + ' seconds...';
  }
}
```

```css
.idle-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(13, 15, 26, 0.92);   /* --color-bg with alpha */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xl);
  z-index: 200;
}

.idle-message {
  font-family: var(--font-body);
  font-size: var(--text-heading);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  text-align: center;
}

.idle-cancel {
  background: var(--color-accent);
  color: var(--color-bg);
  font-family: var(--font-body);
  font-size: var(--text-label);
  font-weight: var(--weight-bold);
  border: none;
  border-radius: 4px;
  padding: 0 var(--space-xl);
  min-height: var(--touch-target-min);
  cursor: pointer;
}
```

### Pattern 7: Boot Sequence Extension

**What:** The `app.js` boot function must be extended to: (1) initialise the DB schema, (2) inject the router, and (3) start the idle timer — after the health check passes.

```javascript
// src/app.js — extend boot() to wire up Phase 2 modules

async function boot() {
  // Phase 2: open DB (creates schema if needed) before health check
  await openDB();  // from db.js — creates all stores

  var hasCatalogue = await checkCatalogueHealth();
  if (!hasCatalogue) {
    showSyncRequiredScreen();
    return;
    // Note: idle timer is NOT started on sync-required screen —
    // admin needs to interact freely. Start it after catalogue is available.
  }

  // Phase 2: init chrome (already in DOM via index.html static markup)
  initHomeButton();    // wire chrome-home click handler
  initRouter();        // from router.js — starts hashchange dispatch
  initIdleTimer();     // from idle.js — starts 60s countdown

  // Navigation will call the appropriate screen render function
  // (hash is currently '#/' or empty — router.handleRoute() runs immediately)
}
```

### Anti-Patterns to Avoid

- **Recreating QR/home chrome in each screen render function:** If any screen creates its own `.qr-corner` div, CAT-07 breaks whenever a screen is added that forgets to include it. Use one fixed-position element injected once.
- **Accessing localStorage directly outside config.js:** Violates STATE.md architecture constraint. Every localStorage read/write must go through `Config.*` methods.
- **Opening IndexedDB transactions outside db.js:** Same constraint — views and feature modules call `dbGet`/`dbPut`/`dbAdd`/`dbGetAll` from `db.js`, never `indexedDB.open` directly.
- **Using version `1` for DB in db.js:** Phase 1's `app.js` already opens `kiosk-db` at version `1` (the `checkCatalogueHealth` function). Phase 2 must use version `2` to trigger `onupgradeneeded` and create the new stores without conflicting with Phase 1's open.
- **Adding event listeners for idle timer without `passive: true`:** On iPadOS, touch event listeners that are not marked passive block scrolling and degrade performance. Always use `{ passive: true }` for touch events that don't call `preventDefault()`.
- **Using `Uint8Array.prototype.toHex()` for SHA-256 hex conversion:** Not available in Safari 16.x. Use `Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')`.
- **Starting the idle timer on the sync-required screen:** The admin needs unrestricted time to connect and sync. The timer should only run when the catalogue is available and a customer is browsing.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hash routing | Custom URL parser | `window.location.hash` + `hashchange` event | Already in STATE.md; browser-native; no edge cases on iOS Safari |
| IndexedDB promise wrapper | Complex abstraction layer | 5 plain Promise-wrapped helpers (get, put, add, getAll, count) | 950 products doesn't need a full ORM; simple helpers cover all Phase 2–6 use cases |
| Passcode hashing | Custom entropy generator or bcrypt | `crypto.subtle.digest('SHA-256', ...)` | Web Crypto is browser-native, A9X-supported, no library required |
| Inactivity detection | Mouse position tracking | `touchstart`/`touchend`/`pointerdown` events | Kiosk is touch-only; no mouse; pointer events provide a single unified listener |
| Countdown animation | CSS keyframe counter | `setInterval` decrementing an integer | Plain text "N seconds" is clearer than an animation on a kiosk; A9X performance win |

**Key insight:** Phase 2 is pure infrastructure. Every component is 20–40 lines of browser-native code. No problem here justifies a library or custom framework.

---

## Common Pitfalls

### Pitfall 1: DB Version Conflict Between Phase 1 and Phase 2

**What goes wrong:** Phase 2 code opens `kiosk-db` at version `2`, but Phase 1's `checkCatalogueHealth()` in `app.js` opens it at version `1`. If `app.js` boot runs first and opens v1, then `db.js` opens v2, the `onupgradeneeded` fires correctly — but if the db is already held open at v1, the v2 open request blocks forever (versionchange event not handled).

**Why it happens:** IndexedDB version upgrades require all existing connections to the same DB to close first. If `checkCatalogueHealth()` opens a connection and does not close it before `openDB()` runs, the upgrade blocks.

**How to avoid:** Ensure `checkCatalogueHealth()` calls `db.close()` in ALL code paths (onsuccess, onerror, and the onupgradeneeded path). Check the Phase 1 code — it does call `db.close()` in onsuccess and onerror branches but NOT when `onupgradeneeded` fires (because in that branch `db` doesn't exist as a local variable in the same scope). Review carefully and refactor `checkCatalogueHealth()` in Phase 2 to either (a) rely on `db.js`'s `openDB()` instead of its own open call, or (b) ensure it uses version `2` as well.

**Recommended fix:** Replace `checkCatalogueHealth()` with a call to `db.js`'s `dbCount('products')` — this opens at v2, handles the upgrade, and returns the count. Eliminates the dual-open conflict entirely.

**Warning signs:** App hangs on boot after Phase 2 deploy; console shows a blocked IDB open request.

### Pitfall 2: `crypto.subtle` Not Available Without HTTPS

**What goes wrong:** `window.crypto.subtle` is `undefined` at runtime, causing passcode hashing to throw.

**Why it happens:** Web Crypto API requires a secure context (HTTPS or localhost). If the kiosk is served over plain HTTP on a local network IP (e.g., `http://192.168.1.x`), `crypto.subtle` is unavailable.

**How to avoid:** Serve the kiosk app over localhost during development. In production, the app is loaded from the iPad's cache (service worker cache-first) — once installed, it works offline with no HTTP/HTTPS issue because SW serves requests. The initial sync must be done from a trusted network connection, but `crypto.subtle` operates on the cached response, not the network response.

**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'digest')` in console.

### Pitfall 3: Chrome Elements Hidden Behind Screen Divs

**What goes wrong:** QR code or home button appears briefly then is covered by a screen `<div>` that uses `position: absolute; width: 100%; height: 100%`.

**Why it happens:** `.screen` elements use `position: absolute` and cover the full viewport. If they have a higher stacking context than the chrome elements, they cover them.

**How to avoid:** Assign `z-index: 100` to `.chrome-qr` and `.chrome-home`. Ensure `.screen` elements have no explicit `z-index` (default `auto` stacks below explicitly z-indexed elements). The idle overlay must use `z-index: 200` to appear above the chrome.

**Warning signs:** During testing, tapping where the home button should be does nothing; QR code invisible on catalogue/email screens.

### Pitfall 4: `hashchange` Not Firing on First Load

**What goes wrong:** On first load, the URL has no hash (or is `#/`). The router wires up `hashchange` but never dispatches an initial route.

**Why it happens:** `hashchange` only fires when the hash changes — not on the initial page load.

**How to avoid:** Call `handleRoute()` synchronously after adding the `hashchange` listener in `initRouter()`. This dispatches the correct screen for whatever hash is present at load time.

**Warning signs:** Blank screen shown after boot completes; no screen div rendered.

### Pitfall 5: Idle Timer Fires During Admin Interactions

**What goes wrong:** Admin opens the passcode entry screen, takes a moment to enter the code, and the 60-second countdown fires and returns to home.

**Why it happens:** The idle timer starts when the catalogue is loaded and runs on any screen including the admin panel.

**How to avoid:** The admin panel screen (Phase 3) should call `pauseIdleTimer()` on entry and `resumeIdleTimer()` on exit. Provide `pauseIdleTimer` and `resumeIdleTimer` as exported functions from `idle.js` so other modules can control the timer. Also the email screen needs a 3-minute grace period (CAT-10) — Phase 4 will implement this, but Phase 2 must expose the pause/resume API so Phase 4 can use it without modifying `idle.js`.

**Warning signs:** Admin panel inaccessible on event day because 60-second timeout fires before passcode can be entered.

### Pitfall 6: DB Schema Incomplete — Missing Index for Phase 4 Queries

**What goes wrong:** Phase 4 needs to filter products by category in < 100ms (CAT-02). Without an IDB index on `category`, this requires loading all 950 products and filtering in JS — which is fine for in-memory search, but incorrect if the plan was to use an IDB index.

**Why it happens:** Schema designed in Phase 2 without Phase 4's query requirements in mind.

**How to avoid:** Create the `category` index on the `products` store in Phase 2 (included in Pattern 3 above). Also create a `createdAt` index for the "NEW badge" feature (CAT-06, Phase 4). Both are zero-cost to add now; adding them later requires an IDB version bump.

**Warning signs:** Not immediately visible — manifests as performance regression in Phase 4.

---

## IndexedDB Schema Reference

This is the canonical schema created by `db.js` at version 2. All Phase 3–6 modules must write to this schema without modification (a schema change requires a version bump).

### `products` store

| Field | Type | Purpose | Index? |
|-------|------|---------|--------|
| `id` | string (keyPath) | Shopify product ID | Primary key |
| `title` | string | Product name | No |
| `category` | string | Category name | Yes (`category`) |
| `imageUrl` | string | Optimised image URL (≤400px) | No |
| `createdAt` | string (ISO date) | When product first synced | Yes (`createdAt`) |
| `updatedAt` | string (ISO date) | Last update from Shopify | No |
| `handle` | string | Shopify URL slug | No |

### `emails` store

| Field | Type | Purpose | Index? |
|-------|------|---------|--------|
| `id` | auto-increment (keyPath) | Row identifier | Primary key |
| `email` | string | Attendee email address | No |
| `eventName` | string | Event name at time of capture | No |
| `eventDate` | string (ISO date) | Event date at time of capture | No |
| `consentAt` | string (ISO timestamp) | GDPR consent timestamp | No |

### `analytics` store

| Field | Type | Purpose | Index? |
|-------|------|---------|--------|
| `id` | auto-increment (keyPath) | Row identifier | Primary key |
| `type` | string | `'view'` / `'filter'` / `'search'` | No |
| `data` | object | Type-specific payload (cardId, category, query, etc.) | No |
| `timestamp` | string (ISO timestamp) | When event occurred | No |
| `eventName` | string | Active event at time of logging | No |

### `sync_meta` store

| Field | Type | Purpose | Index? |
|-------|------|---------|--------|
| `key` | string (keyPath) | Config key (e.g., `'lastSyncAt'`) | Primary key |
| `value` | any | Stored value | No |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `IDBKeyRange` + cursor iteration for count | `IDBObjectStore.count()` | IDB v2 / Safari 10.1+ | Simpler, faster — no cursor loop needed |
| `IDBObjectStore.getAll()` polyfill | Native `.getAll()` | IDB v2 / Safari 10.1+ | No polyfill needed on iPadOS 16 |
| `setInterval` for inactivity with mousemove | `touchstart`/`pointerdown` events | Touch-native kiosk context | More reliable on touch-only device; no mousemove noise |
| Page hash `#page` with manual string parsing | `location.hash` + `hashchange` with prefix matching | Always available | Established pattern; no library needed |
| `bcrypt.js` for passcode hashing | `crypto.subtle.digest('SHA-256', ...)` | Web Crypto ubiquitous (Safari 11+) | No library; browser-native; sufficient for single-device kiosk |

**Deprecated/outdated:**
- `IDBObjectStore.openCursor()` for counting records: Use `.count()` instead — simpler and faster.
- Manual `Array.from(new Uint8Array(buffer)).map(...).join('')` vs `Uint8Array.prototype.toHex()`: The new `.toHex()` method exists in modern browsers but is NOT available in Safari 16.x. Use the `Array.from` pattern for ES2017 safety.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual / browser-based (no automated test framework in scope) |
| Config file | None |
| Quick run command | `python3 -m http.server 8080` then open Safari (desktop or device) |
| Full suite command | Manual checklist against 5 success criteria |

**Rationale:** Phase 2 deliverables require verifying: IndexedDB store creation (use Safari Web Inspector → Storage tab), localStorage persistence (check Application → Local Storage), hash navigation (type hashes manually in URL bar), and idle timer behaviour (wait 60 seconds or lower the timeout temporarily). These are most reliably checked manually in Safari Web Inspector. No automated test framework is needed for this infrastructure phase.

### Phase Requirements → Test Map

| Req ID | Behaviour | Test Type | Verification Method | Automatable? |
|--------|-----------|-----------|---------------------|--------------|
| PWA-03 | All 4 IndexedDB object stores created and accessible on fresh install | Manual | Safari Web Inspector → Storage → IndexedDB → kiosk-db → verify 4 stores exist | Partially — can open IDB in console |
| PWA-06 | Admin passcode persists as SHA-256 hash in localStorage; config values persist across restart | Manual | Set values → close tab → reopen → verify in Application → Local Storage | Manual |
| CAT-07 | QR code visible on every screen; tapping does not navigate away | Manual | Navigate through all stub screens; verify QR element present and no navigation occurs on tap | Manual |
| CAT-08 | Home button visible top-left on every screen; tapping returns to `#/` | Manual | Navigate to each hash route; verify button present; tap it; verify hash becomes `#/` | Manual |
| CAT-09 | 60 seconds of no input → 10s countdown → auto-return to home | Manual | Set idle timeout to 10s temporarily; wait; verify countdown appears; let expire; verify `#/` | Manual |

### Sampling Rate

- **Per task commit:** Load app in Safari desktop, open Web Inspector console, verify no JS errors
- **Per wave merge:** Run through all 5 success criteria manually in Safari desktop; verify IDB schema in Web Inspector
- **Phase gate:** All 5 success criteria must pass before `/gsd:verify-work`

### Wave 0 Gaps

- None — no automated test files needed; all verification is manual via Safari Web Inspector and browser interaction

---

## Open Questions

1. **Should `checkCatalogueHealth()` in app.js be replaced entirely by `db.js`?**
   - What we know: Phase 1's `checkCatalogueHealth()` opens `kiosk-db` at version `1`. Phase 2's `db.js` opens at version `2`. Running both creates a version conflict risk.
   - What's unclear: Whether the Phase 1 health check's `db.close()` call in its `onsuccess` branch reliably closes before `openDB()` runs in the async boot sequence.
   - Recommendation: Replace the inline `checkCatalogueHealth()` in `app.js` with a call to `dbCount('products')` from `db.js`. This uses the single canonical open connection, eliminates the dual-open risk, and simplifies `app.js`.

2. **Should the chrome elements be in `index.html` static markup or injected by `app.js`?**
   - What we know: Static `index.html` markup is simpler and always present. JS injection requires timing coordination with DOMContentLoaded.
   - What's unclear: No real ambiguity — static markup is better.
   - Recommendation: Add chrome elements directly to `index.html`. The service worker already caches `index.html`; no additional work needed. JS in `app.js` only wires up the click handler for the home button.

3. **What is the initial passcode on a fresh install?**
   - What we know: `Config.getPasscodeHash()` returns `null` on a fresh install. The admin panel needs to handle this state.
   - What's unclear: Should Phase 2 set a default passcode hash, or should Phase 3 (admin panel) handle the "no passcode set" state?
   - Recommendation: Phase 2 sets no default passcode. Phase 3 (admin panel) detects `null` passcode hash and prompts the owner to set one on first use. Document this as a Phase 3 responsibility.

---

## Sources

### Primary (HIGH confidence)
- MDN — IndexedDB API (Using IndexedDB): https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB — IDB v2 patterns, onupgradeneeded, version upgrades
- MDN — SubtleCrypto.digest(): https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest — SHA-256 code example, ArrayBuffer to hex conversion, fetched 2026-03-21
- MDN — hashchange event: https://developer.mozilla.org/en-US/docs/Web/API/Window/hashchange_event — hash routing pattern
- STATE.md architecture constraints — module ownership rules (db.js/config.js/sync.js boundaries)
- CLAUDE.md — no-library policy, ES2017 constraint, storage layer design

### Secondary (MEDIUM confidence)
- Phase 1 RESEARCH.md — IndexedDB pitfalls, Safari storage behaviour (researched 2026-03-21, HIGH confidence for Phase 1 scope, carries forward)
- MDN — IDBObjectStore.getAll(): Safari 10.1+ support confirmed — safe for iPadOS 16 target

### Tertiary (LOW confidence — manual validation required)
- `passive: true` event listener performance benefit on A9X: documented pattern, not device-tested for this specific hardware

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all browser-native APIs, no library decisions, constrained by CLAUDE.md
- Architecture: HIGH — module ownership rules already locked in STATE.md; patterns are straightforward implementations of those constraints
- IndexedDB schema: HIGH — fields derived from all Phase 3–6 requirements; indexes chosen for known query patterns
- Pitfalls: HIGH — DB version conflict pitfall is a real risk with Phase 1's existing open call; all others are well-documented patterns
- SHA-256 pattern: HIGH — verified from MDN 2026-03-21
- Inactivity timer: HIGH — browser-native setTimeout/setInterval; no edge cases

**Research date:** 2026-03-21
**Valid until:** 2026-06-21 (all browser-native APIs; Safari 16.x support table stable)
