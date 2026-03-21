# Domain Pitfalls

**Domain:** Offline PWA kiosk — Safari/iPadOS, Shopify Storefront API, IndexedDB
**Project:** ID Card Factory Event Kiosk
**Researched:** 2026-03-21
**Confidence:** MEDIUM-HIGH (training knowledge; iOS-specific claims flagged where verification recommended)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or blocked deployments.

---

### Pitfall C1: iOS Safari Evicts PWA Storage After ~7 Days of No Use

**What goes wrong:** Safari on iOS/iPadOS enforces an Intelligent Tracking Prevention (ITP) policy that treats PWA storage as evictable. If the installed PWA has not been opened for approximately 7 days, Safari can silently delete all IndexedDB data, Cache Storage (service worker cache), and localStorage. The device owner may not receive any warning.

**Why it happens:** Apple's ITP treats unused web storage as potentially tracking-related. Installed home screen PWAs get more generous treatment than regular browser tabs, but the 7-day eviction window still applies if the device goes unused. Pre-iPadOS 16.4, PWAs were classified more harshly.

**Consequences:**
- The entire product catalogue (950+ products + all images) is wiped silently between events
- Captured emails and analytics data from a completed event could be lost if the device is put away without exporting
- The sync metadata that enables incremental sync is lost, forcing a full re-sync
- The admin passcode hash in localStorage may be wiped, locking the owner out of their own admin panel if they don't have a recovery mechanism

**Prevention:**
- Never rely on storage persistence as a given — build a "storage health check" on app launch that verifies the catalogue exists and is populated
- Export email CSVs immediately after every event, before the device is put away
- Display a prominent warning in the admin panel: "Export emails now — storage may be cleared if device is unused"
- Store sync timestamp and record count in multiple locations (localStorage AND IndexedDB) so the health check can detect partial eviction
- Warn the user during the pre-event sync flow: "Keep this app open or launch it weekly to prevent data loss"
- Consider adding a "ping" mechanism — a minimal scheduled wake that could be triggered by the owner launching the app briefly — though Safari does not support Background Sync reliably on iOS

**Detection (warning signs):**
- App launches to an empty or broken catalogue
- Analytics show zero records despite previous events
- Admin panel shows "Last sync: never"

**Phase:** Address in Phase 1 (PWA foundation) and Phase 3 (sync/storage). Document in the admin UX.

---

### Pitfall C2: Service Worker Does Not Update Automatically on iOS Safari

**What goes wrong:** On iOS Safari, the service worker lifecycle differs from Chrome/Desktop in two important ways: (1) Safari aggressively caches the service worker script itself, and (2) the `skipWaiting()` + `clients.claim()` pattern may not activate the new worker immediately when the PWA is installed to home screen and running in standalone mode.

**Why it happens:** When a PWA is running in full-screen standalone mode, Safari does not always trigger a service worker update check on every navigation the way desktop Chrome does. The new worker can be in a "waiting" state for extended periods. There is no visible browser refresh UI to help.

**Consequences:**
- Bug fixes or catalogue updates to the app shell are not picked up
- A developer deploys a fix to the HTML/JS files, but the kiosk continues running the old version because the service worker is serving from cache
- Incremental sync logic changes may not take effect, causing corrupt or incomplete data

**Prevention:**
- Always version the service worker file name (e.g., `sw.js?v=2`) or include a build timestamp inside the worker to force cache busting
- Implement an explicit "Check for app update" button in the admin panel that calls `navigator.serviceWorker.getRegistration()` and triggers `update()`
- Use `skipWaiting()` inside the service worker's `install` event AND `clients.claim()` in `activate`, but also add a `controllerchange` listener on the main page that forces a `window.location.reload()` when a new worker takes over — this is the most reliable activation pattern on iOS
- Log the current service worker version in the admin panel so the owner can verify updates took effect
- Keep the service worker file short and deterministic — avoid dynamic imports that may behave differently across Safari versions

**Detection (warning signs):**
- Admin panel still shows old app version after deploying an update
- Sync behaviour doesn't change after a code fix
- `navigator.serviceWorker.controller` is null on first load after install

**Phase:** Address in Phase 1 (PWA foundation). Test explicitly on the target device before Phase 2.

---

### Pitfall C3: IndexedDB Quota is ~50% of Free Disk Space — But Not Guaranteed

**What goes wrong:** iOS Safari grants IndexedDB (and Cache Storage combined) a quota derived from available device storage, typically up to 50% of free disk. For a 32GB iPad with 10GB free, that's theoretically 5GB. However, the actual limit is enforced dynamically, and Safari may prompt the user to allow more storage — or deny it silently — depending on iOS version and device state. Critically, Cache Storage and IndexedDB share this quota.

**Why it happens:** Apple does not expose a fixed quota. The storage allocation is opaque and can change between iOS versions. Safari does not consistently show a permission prompt for large PWA storage requests on older iPadOS versions (pre-16.4).

**Consequences:**
- Attempting to cache 200–400MB of images in Cache Storage may silently fail mid-sync with no error thrown, leaving the catalogue partially populated
- If Cache Storage and IndexedDB compete for the same quota pool, filling one can block writes to the other, breaking email capture silently
- A sync that "succeeds" from the UI perspective may have dropped images for cards that weren't yet fetched

**Prevention:**
- After each image fetch during sync, verify the response was actually stored by reading it back from cache — do not trust the `put()` call alone
- Track sync progress per-product in IndexedDB, not just a single "last sync" timestamp. Each product should have a flag: `imagesStored: true/false`
- Use `navigator.storage.estimate()` before starting a sync to check available quota. Warn the operator if less than 600MB is available (conservative margin above the 400MB target)
- Provide a "Storage status" readout in the admin panel: bytes used, bytes available, estimated capacity for images
- Compress images aggressively at sync time — fetch Shopify images at exactly 400px wide via the Shopify image URL sizing parameter (`?width=400`). Do not store originals.
- Structure the sync so it is resumable: if storage runs out mid-sync, the next sync run continues from where it left off

**Detection (warning signs):**
- Some product cards show broken image placeholders after sync
- `navigator.storage.estimate()` returns `usage` close to `quota`
- IndexedDB writes throw `QuotaExceededError`

**Phase:** Address in Phase 2 (data layer) and Phase 3 (sync engine). `navigator.storage.estimate()` check is a Phase 2 task.

---

### Pitfall C4: Safari PWA Loses Service Worker Registration When Storage Is Evicted

**What goes wrong:** When iOS evicts PWA storage (see C1), it may also unregister the service worker. The app then runs without a service worker — meaning the next launch hits the network for every file. On an event floor with no Wi-Fi, this means the app appears as a blank page or shows a network error.

**Why it happens:** The service worker's registration and its associated Cache Storage are tied together in the browser's storage budget. Eviction of one can cascade to the other.

**Consequences:**
- App is completely unusable offline after storage eviction — blank screen at an event
- The owner has no way to recover without internet access
- This is the single most catastrophic failure mode for the kiosk

**Prevention:**
- On every app launch, before rendering anything, run a self-check: verify that `navigator.serviceWorker.controller` is active, that the catalogue exists in IndexedDB (count > 0), and that at least one image exists in Cache Storage
- If the check fails, display a clear "Sync required" blocking screen with instructions: "Connect to Wi-Fi and tap Sync in the admin panel"
- Never design the UI to silently degrade — make offline failure loud and obvious
- Instruct the device owner to launch the app at least once every 5 days (not 7, for safety margin) to reset the eviction timer
- Consider a reminder workflow: a simple reminder on the owner's phone calendar for the day before each event

**Detection (warning signs):**
- App shows blank screen or network error at event
- `navigator.serviceWorker.controller` is null
- IndexedDB record count returns 0

**Phase:** Phase 1 (boot sequence / health check). This must be in the very first milestone.

---

### Pitfall C5: Shopify Storefront API GraphQL Cursor Pagination Breaks on Large Catalogues

**What goes wrong:** Fetching 951 products 50 at a time via cursor-based pagination requires 20 sequential GraphQL requests. If any single request fails (network drop, rate limit, or Shopify server error), the cursor state is lost and the sync must restart from the beginning — unless cursors are persisted.

**Why it happens:** GraphQL cursors are opaque strings that encode the position in the result set. They expire (Shopify cursors are not indefinitely valid) and cannot be reconstructed if lost. Without checkpointing, a failure mid-sync means fetching all previously-fetched products again.

**Consequences:**
- A sync that fails at product 900/951 discards all progress and must restart from product 1
- On a slow hotel Wi-Fi connection before an event, a 20-request sync with retries could take several minutes; failed restarts make this worse
- Duplicate products may be inserted into IndexedDB if the incremental sync logic doesn't de-duplicate correctly on restart

**Prevention:**
- Persist the current pagination cursor to IndexedDB after each successful page fetch — not just on completion of the full sync
- On sync start, check for a saved cursor and resume from that position
- Expire saved cursors after 1 hour (Shopify cursor validity window — verify against current Shopify docs before implementation)
- Use `upsert` semantics (insert or update by product ID) in IndexedDB, never raw `add()`, so duplicate page fetches are idempotent
- Implement exponential backoff (start at 1s, cap at 30s) with a maximum of 3 retries per page before surfacing an error
- Show per-page progress in the sync UI ("Fetching page 12 of 20...") so the operator knows the sync is making progress

**Detection (warning signs):**
- Sync consistently fails at the same product count
- Duplicate product entries in the catalogue
- Sync time increases significantly on retry

**Phase:** Phase 3 (sync engine). The cursor checkpointing is load-bearing — plan it before writing any sync code.

---

### Pitfall C6: Shopify Storefront API Rate Limits on Free Tier

**What goes wrong:** The Shopify Storefront API enforces rate limits based on a "bucket" system (cost points per query, bucket refills over time). On the free/standard tier, complex GraphQL queries that fetch many fields per product can exhaust the bucket across 20 paginated requests, resulting in a `429 Too Many Requests` or a `THROTTLED` error in the GraphQL response body.

**Why it happens:** Shopify's Storefront API uses cost-based rate limiting, not a simple requests-per-minute limit. A query that fetches product title, description, handle, tags, images, variants, and metafields costs significantly more than a minimal query. Fetching 50 products per page with full details can be expensive.

**Consequences:**
- Sync silently fails mid-catalogue if the rate limit error is not detected in the GraphQL response body (HTTP 200 with `errors` in JSON)
- The operator sees no clear error, assumes sync is complete, and goes to the event with an incomplete catalogue
- Image URLs are stored but when the sync then fetches images, a second wave of requests can trigger additional rate limiting

**Prevention:**
- Parse GraphQL responses for `errors` and `extensions.cost` fields, not just HTTP status — Shopify returns rate limit errors as HTTP 200 with error details in the body
- Add a 500ms delay between each paginated page request (not just on error) to stay well within the rate limit
- Minimise the fields fetched per product: title, handle, description (truncated to 500 chars), image URL (primary only), tags (for category mapping), and product ID. Do not fetch variants, metafields, or full description in the pagination query — fetch those in a detail call only if needed
- Log the `extensions.cost.requestedQueryCost` from each response and surface it in sync logs for debugging
- Check `extensions.cost.throttleStatus.currentlyAvailable` before each request and wait if it is below a safe threshold

**Detection (warning signs):**
- HTTP 200 responses with `errors` array containing `THROTTLED` code
- Sync stops at exactly the same product count across multiple runs
- Missing products in the second half of the catalogue

**Phase:** Phase 3 (sync engine). Design the query cost budget before writing the GraphQL queries.

---

## Moderate Pitfalls

---

### Pitfall M1: Guided Access Does Not Prevent All Safari Navigation

**What goes wrong:** Apple Guided Access locks the device to a single app, but within Safari PWA standalone mode, certain gestures and UI elements can still trigger navigation outside the catalogue: the system back gesture (swipe from left edge), any `<a href>` link that opens a new tab, `window.open()` calls, and external links embedded in Shopify product descriptions.

**Why it happens:** Guided Access restricts which apps can be opened, but the PWA itself runs inside the WebKit rendering engine. The PWA controls its own navigation — Guided Access does not prevent in-app navigation to external URLs.

**Consequences:**
- A customer taps an external link in a product description and navigates away from the kiosk app — possibly to a browser address bar where they can type anything
- Even if Guided Access prevents launching Safari app, the PWA standalone context may handle external navigation in ways that expose the URL bar
- The kiosk effectively becomes non-functional until the operator resets it

**Prevention:**
- Intercept all link clicks globally: `document.addEventListener('click', e => { const a = e.target.closest('a'); if (a && !a.href.startsWith(location.origin)) { e.preventDefault(); } })`
- Sanitise all Shopify product description HTML before rendering — strip all `<a>` tags or replace with `<span>`
- Use `target="_self"` on every internal link as a belt-and-braces measure
- Never use `window.open()` — the QR code should be a displayed image, not a clickable link
- In Guided Access settings, disable the touch area for the top-left corner (where iOS back gesture activates) if the option is available
- Test the left-edge swipe gesture explicitly on the target device — it may or may not be catchable at the JS level

**Detection (warning signs):**
- Safari address bar becomes visible during testing
- Browser tab switcher appears

**Phase:** Phase 1 (PWA shell) and Phase 4 (product display). The link interception must be in the shell, not just the product pages.

---

### Pitfall M2: GDPR Checkbox Must Be Unchecked by Default and Cannot Be Pre-Ticked

**What goes wrong:** A common shortcut is rendering the GDPR consent checkbox with `checked` as the default state to reduce friction. Under UK GDPR (which applies post-Brexit in the UK), pre-ticked consent checkboxes are explicitly invalid. The ICO (Information Commissioner's Office) has enforced against this.

**Why it happens:** Developers optimise for conversion (more emails captured) and pre-tick the box.

**Consequences:**
- Any emails captured with a pre-ticked consent box are captured without valid consent under UK GDPR Article 7
- If the ICO investigates (e.g., due to a complaint from an event attendee), the entire email list from that period could be considered invalid and must be deleted
- Potential fine: up to £17.5M or 4% of annual turnover under UK GDPR

**Prevention:**
- `<input type="checkbox" id="gdpr" required>` — never add `checked` attribute
- The submit button must be disabled until the checkbox is ticked (enforce in JS, not just CSS)
- The consent text must be specific: "I agree to receive email updates from The ID Card Factory about new products and events." — not vague language like "I accept the terms"
- Store a `consentTimestamp` alongside each email in IndexedDB
- Store `consentText` as a versioned string alongside each record, so you can prove what text was displayed when consent was given
- Do not use a toggle/switch UI element — use a standard checkbox. Toggles have ambiguous semantics for consent UIs.

**Detection (warning signs):**
- QA testers note the form submits without ticking the checkbox
- The checkbox appears checked on form load

**Phase:** Phase 2 or whichever phase builds the email capture form. Non-negotiable on first implementation.

---

### Pitfall M3: A9X Performance Degrades With More Than ~200 DOM Nodes in a Single Scroll View

**What goes wrong:** Rendering all 951 product thumbnails as DOM nodes simultaneously causes the A9X chip (2015 iPad Pro) to drop to below 10fps on scroll. The memory pressure alone from 951 `<img>` elements (even unloaded) can cause Safari to terminate the PWA.

**Why it happens:** The A9X has 4GB RAM but the GPU is significantly older than the A12+ chips in modern iPads. Safari on iPadOS 16 does not have the same GPU compositing optimisations as desktop Chrome. Each DOM node — especially `<img>` — consumes graphics memory even before the image loads.

**Consequences:**
- Sluggish or jank-filled scrolling on the main catalogue grid
- Safari terminates the app with no user-visible error (white screen)
- App reload from service worker cache takes several seconds, interrupting the customer experience

**Prevention:**
- Implement virtual scrolling (windowed rendering): only render the visible viewport + one screen above and one below (~60–90 cards), remove off-screen cards from the DOM
- In vanilla JS, this means maintaining a scroll listener that computes which cards are in the viewport and does `element.innerHTML = ''` / `appendChild()` for rows entering/leaving view
- Use `contain: strict` CSS on each card element to prevent style/layout recalculation from bubbling up to the whole grid
- Use `content-visibility: auto` on row containers — this is supported in Safari 15+ and provides browser-native virtualisation for off-screen content
- Set `loading="lazy"` on all `<img>` elements as a baseline, but `content-visibility: auto` is the more important optimisation
- Test scroll performance on the actual A9X device early (Phase 2/3) — do not trust emulator results

**Detection (warning signs):**
- Scrolling drops below 60fps in Safari's Web Inspector timeline
- Memory usage exceeds 500MB in Web Inspector
- White screen / app reload during vigorous scrolling

**Phase:** Phase 2 (catalogue grid). Must be designed with virtual scrolling from the start — retrofitting it is a near-rewrite.

---

### Pitfall M4: localStorage Is Synchronous and Blocks the Main Thread

**What goes wrong:** All reads and writes to localStorage are synchronous and block the main thread. On older hardware (A9X), storing or reading several hundred bytes can introduce noticeable lag if called on every card tap or search keystroke.

**Why it happens:** Developers use localStorage for convenience. It is fine for small, infrequent writes (passcode, event name, timer setting) but is commonly misused for data that should be in IndexedDB.

**Consequences:**
- Search typing feels stuttery if any localStorage access is in the search handler
- Analytics event logging that writes to localStorage on every card tap causes frame drops

**Prevention:**
- localStorage is only acceptable for: admin passcode hash, event name, timer setting, app version. Maximum ~5 keys.
- All analytics events, product data, and emails must use IndexedDB exclusively
- For in-memory caching of the product list (for fast search), use a module-level JS array — not localStorage or IndexedDB on every keystroke. Load the full product list into memory once on app start and search against the in-memory array

**Detection (warning signs):**
- Search feels delayed beyond 300ms
- Frame drops visible in Web Inspector timeline during tap events

**Phase:** Phase 2 (data layer design). Establish the "what goes where" rule before writing any storage code.

---

### Pitfall M5: Service Worker Cache-First Strategy Caches Error Responses

**What goes wrong:** A naive cache-first service worker intercepts all fetch requests. If a Shopify image URL returns a 404 or 500 during the sync, that error response gets stored in the cache and served forever. Every subsequent load of that product shows a broken image.

**Why it happens:** A simple `cache.put(request, response)` does not check the response status. The fetch handler happily stores a `Response` with `status: 404`.

**Consequences:**
- Permanent broken images for any product where the image fetch errored during sync
- The incremental sync may not re-fetch these images on the next sync if it only fetches "new" products
- Admin panel sync report says "Success" even though some images are broken

**Prevention:**
- Always check `response.ok` (status 200–299) before storing in cache: `if (response.ok) { cache.put(request, response.clone()); }`
- For failed image fetches, mark the product's `imagesStored: false` flag in IndexedDB so the next sync retries them
- In the service worker, when serving a cached response, also check `cachedResponse.ok` — if it is false, delete it and return a fallback placeholder image
- Provide a `placeholder.svg` in the app shell that is always cached, used as the fallback for any product with no valid cached image

**Detection (warning signs):**
- Broken image icons on specific product cards after sync
- Cache Storage contains responses with status 404 (visible in Safari Web Inspector > Storage)

**Phase:** Phase 3 (sync engine) and Phase 1 (service worker setup).

---

### Pitfall M6: Inactivity Timer Conflicts With iPad's Own Auto-Lock

**What goes wrong:** The app implements a 60-second inactivity return-to-home timer. But iPadOS also has its own auto-lock timer (Settings > Display & Brightness > Auto-Lock). If the auto-lock fires before the app's timer, the device locks — and when unlocked, the PWA may reload from the service worker or show a stale state.

**Why it happens:** The app timer and the OS timer are independent. The OS timer wins.

**Consequences:**
- Device locks mid-browsing, requiring the operator to unlock it with the passcode — not ideal at a busy event
- Guided Access may require PIN entry to unlock, not just the device passcode — adding friction
- After unlock, the app reloads and a customer's session context is lost

**Prevention:**
- Document in the operator setup guide: set iPad Auto-Lock to "Never" (Settings > Display & Brightness > Auto-Lock > Never) before each event
- The app cannot prevent the OS from locking the device. `WakeLock API` (`navigator.wakeLock`) is not reliably supported in Safari PWA standalone mode on iPadOS 16 — verify before relying on it
- Design the app to recover gracefully from a reload: the home screen should always be the restore point, no session state to preserve

**Detection (warning signs):**
- Device locks itself during unattended testing
- Customers encounter lock screen

**Phase:** Phase 1 (setup documentation) and Phase 2 (inactivity timer implementation).

---

## Minor Pitfalls

---

### Pitfall m1: Shopify Image URLs Include CDN Tokens That Expire

**What goes wrong:** Shopify product image URLs fetched from the Storefront API may contain CDN parameters (e.g., `v=` version tokens). If these URLs expire after a certain period, cached images in the service worker Cache Storage will return 403s when the browser tries to re-validate them.

**Prevention:**
- Use the Shopify image URL transformation parameter (`?width=400&format=jpg`) and strip any `v=` or expiry parameters from the URL before storing as the cache key
- Store the cleaned URL (path + sizing params only) as both the cache key and the IndexedDB record — not the full CDN URL with tokens
- Verify Shopify's actual URL expiry behaviour during Phase 3 implementation

**Phase:** Phase 3 (sync engine).

---

### Pitfall m2: `Add to Home Screen` Install Prompt Cannot Be Triggered Programmatically on iOS

**What goes wrong:** On Android/Chrome, a PWA can listen for `beforeinstallprompt` and show a custom "Install App" button. On iOS Safari, this does not exist. The user must manually use the Share sheet and tap "Add to Home Screen".

**Prevention:**
- Do not build any "Install this app" button or prompt logic
- On first load (when running in browser context, not standalone), show a static instructional overlay: "Tap the Share button, then 'Add to Home Screen'" with a screenshot
- Detect standalone mode via `window.navigator.standalone === true` to suppress this message when already installed

**Phase:** Phase 1 (PWA shell).

---

### Pitfall m3: CSS `position: fixed` Elements Misbehave During iOS Soft Keyboard

**What goes wrong:** When the email form's keyboard appears on iOS, fixed-position elements (the QR code bar, home button) may jump, resize, or disappear because iOS resizes the viewport when the keyboard appears.

**Prevention:**
- Use `position: fixed` with `bottom: env(safe-area-inset-bottom)` and test with keyboard open
- Alternatively, use `position: sticky` within a scroll container for bottom UI elements
- The email form page is the only page with keyboard input — test this page explicitly on the target device

**Phase:** Phase 2 (email capture UI).

---

### Pitfall m4: Shopify Storefront API Returns Products in Inconsistent Category Order

**What goes wrong:** Shopify's Storefront API does not guarantee sort order across paginated requests unless `sortKey` is explicitly specified. Without a sort key, product order can shift between syncs, causing "NEW" badge logic to incorrectly flag existing products.

**Prevention:**
- Always specify `sortKey: CREATED_AT, reverse: false` (or `ID`) in every paginated query
- The "NEW" badge logic should use `product.publishedAt` or the `createdAt` timestamp relative to the last sync date — not positional index in the result set

**Phase:** Phase 3 (sync engine).

---

### Pitfall m5: Admin Passcode Hash in localStorage is Readable If Device is Unlocked

**What goes wrong:** Storing the admin passcode as a hash in localStorage is visible to any user who opens Safari's developer tools or uses the Files app to inspect app storage. On a shared device, this means any tech-savvy user who disables Guided Access could read and crack a weak hash.

**Prevention:**
- Use a strong hash (SHA-256 via SubtleCrypto) with a salt — never MD5 or plain base64
- Accept that on a single-owner device this is "good enough" — the threat model is preventing casual customer access, not a sophisticated attacker
- Document this limitation: the passcode provides UX protection, not cryptographic security

**Phase:** Phase 2 (admin panel).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| PWA shell / service worker setup | SW not activating on iOS (C2), link escape from kiosk (M1) | Implement `skipWaiting` + `clients.claim` + force reload pattern; global link interceptor |
| App boot sequence | Silent storage eviction (C1, C4) | Health check on every launch before rendering; "Sync required" blocking screen |
| Data layer / IndexedDB schema | localStorage misuse (M4), upsert vs. insert (C5) | Define storage rules in code comments; use upsert everywhere |
| Virtual scroll / catalogue grid | A9X DOM performance (M3) | Design with `content-visibility: auto` + windowing from day 1 |
| Shopify sync engine | Quota failure (C3), cursor loss (C5), rate limits (C6), error response caching (M5) | All five mitigations are load-bearing for a reliable sync |
| Email capture form | GDPR pre-tick (M2), iOS keyboard layout (m3) | Checkbox unchecked by default, enforce in JS; test keyboard on device |
| Admin panel | SW update not reflected (C2), passcode security (m5) | "Check for update" button; SHA-256 + salt |
| Image URL storage | CDN token expiry (m1) | Strip tokens, use clean URLs as cache keys |
| Operator setup documentation | Auto-lock conflict (M6), eviction timer (C1) | Written setup checklist: Auto-Lock = Never, open app every 5 days |

---

## Sources

**Confidence note:** This document is based on training knowledge (cutoff August 2025) covering:
- Apple's ITP documentation and WebKit blog posts on storage partitioning
- MDN Web Docs on service worker lifecycle and Cache Storage
- Shopify developer documentation on Storefront API rate limiting (cost-based bucket model)
- W3C Storage Living Standard (quota/eviction)
- UK ICO guidance on GDPR consent (explicit opt-in requirement)
- Community post-mortems on iOS PWA storage eviction (multiple sources, MEDIUM confidence)
- WebKit source and release notes for iPadOS 15/16 PWA behaviour

**Areas to verify before implementation (LOW confidence items):**
- Exact current Shopify cursor expiry window — check Shopify developer changelog at implementation time
- Whether `navigator.wakeLock` works in iPadOS 16 Safari PWA standalone mode — test on device
- Whether `content-visibility: auto` is fully supported on iPadOS 16 Safari — check caniuse.com / WebKit release notes
- Whether the 7-day eviction window applies to installed home screen PWAs on iPadOS 16 specifically — Apple has adjusted this in minor updates and behaviour may differ from browser tab context
