# Phase 8: Deploy and Install - Research

**Researched:** 2026-03-21
**Domain:** GitHub Pages deployment, PWA manifest / service worker path adaptation, Safari Add to Home Screen, Apple Guided Access
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Repo name: `kiosk-app` under GitHub account `unseenpleasures`
- **D-02:** Public repository — Shopify Storefront API token is read-only by design, no secrets in codebase
- **D-03:** Deploy via GitHub Pages from `main` branch
- **D-04:** Final URL: `https://unseenpleasures.github.io/kiosk-app/`
- **D-05:** Convert ALL absolute root paths (`/`) to relative paths (`./`) across the entire codebase
- **D-06:** Files requiring path changes: `manifest.json` (start_url, scope, icon paths), `sw.js` (19 APP_SHELL_FILES entries), `src/app.js` (SW register path), `index.html` (all CSS/JS/asset references)
- **D-07:** `manifest.json` start_url changes from `"/"` to `"./"`, scope from `"/"` to `"./"`
- **D-08:** `sw.js` APP_SHELL_FILES change from `'/index.html'` to `'./index.html'`, etc. for all 19 entries
- **D-09:** `src/app.js` SW register changes from `'/sw.js'` to `'./sw.js'`
- **D-10:** QR code image stays as-is — it points to the Shopify store (the conversion path), not the kiosk app URL
- **D-11:** SW fetch handler adjustments for relative path compatibility — Claude's discretion on implementation details
- **D-12:** Create a full step-by-step install guide covering: Add to Home Screen, verify standalone mode, initial Shopify sync, and Guided Access lockdown
- **D-13:** Guide lives in `.planning/INSTALL-GUIDE.md` — reference doc, not deployed with the app
- **D-14:** Physical iPad install is a manual task — plan focuses on correct deployment, guide provides instructions

### Claude's Discretion
- SW fetch handler implementation adjustments for relative paths
- Cache version bump strategy (whether to bump CACHE_NAME after path changes)
- Any index.html path references not explicitly listed above
- README.md content for the GitHub repo (if needed)

### Deferred Ideas (OUT OF SCOPE)
- Custom domain for GitHub Pages
- CI/CD pipeline for automated deployment
- Automated testing before deploy
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOST-01 | PWA files deployed to GitHub Pages with a public URL | GitHub Pages setup: create repo, push, enable Pages from main branch — URL format confirmed as `https://unseenpleasures.github.io/kiosk-app/` |
| HOST-02 | Service worker and manifest serve correctly from GitHub Pages (correct MIME types, paths) | GitHub Pages serves `.js` as `text/javascript` and `.json` as `application/json` correctly; relative path strategy ensures SW registers with correct scope; `.nojekyll` not required (no `_` directories) |
| INST-01 | PWA loads and installs via "Add to Home Screen" on iPad #1 | Manifest `display: standalone` + `start_url: "./"` + icons confirmed sufficient for Safari Add to Home Screen on iPadOS 16; SW must be registered successfully first |
| INST-02 | PWA loads and installs via "Add to Home Screen" on iPad #2 | Same as INST-01; both iPads are identical hardware/OS — same steps apply |
</phase_requirements>

---

## Summary

Phase 8 is a deployment and installation phase, not a feature development phase. The codebase is complete (v1.0). The work divides cleanly into three areas: (1) path adaptation — converting all absolute `/` paths to relative `./` paths so the app works on the GitHub Pages subdirectory URL, (2) GitHub remote setup and deployment, and (3) physical iPad installation guided by a written step-by-step guide.

The relative path strategy (`./`) is the correct and well-tested approach for GitHub Pages project pages. When `manifest.json` and `sw.js` use `./` relative paths, those paths resolve against the file's own location. Since all files sit at the repo root, `./` resolves to `https://unseenpleasures.github.io/kiosk-app/` — which is exactly right. The `cache.addAll()` call normalises relative URLs to absolute URLs internally using the SW's own `WorkerGlobalScope.location`, so `caches.match(event.request)` will find matching entries when the browser requests fully-qualified GitHub Pages URLs.

One gap was discovered during research: `styles/main.css` contains three `@font-face` declarations with absolute paths (`/assets/fonts/*.woff2`) that are NOT listed in D-06 of the context document but MUST be converted to relative paths. The SW fetch handler requires no structural changes — the existing cache-first pattern works correctly with relative-path-keyed cache entries. A `CACHE_NAME` bump is recommended to force cache refresh on first load after the path changes.

**Primary recommendation:** Convert all absolute paths to relative paths across 5 files (manifest.json, sw.js, src/app.js, index.html, styles/main.css), create the GitHub remote and push to main, enable GitHub Pages, then follow the install guide on both iPads.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| GitHub Pages | Free tier | Static site hosting from git repo | Zero infrastructure cost, HTTPS automatic, no server needed, correct MIME types for JS/CSS/JSON |
| Safari Add to Home Screen | iPadOS 16 | PWA installation mechanism | Only mechanism available on iPad without MDM; built into iOS Share menu since iOS 1 |
| Apple Guided Access | iPadOS 16 | Kiosk lockdown | OS-level, no app code needed, triple-Home to toggle |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| GitHub CLI (`gh`) or git | System | Create repo, push, enable Pages | During deployment task |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Relative paths (`./`) | Hardcoded absolute path (`/kiosk-app/`) | Absolute would also work but breaks localhost dev; `./` works on both |
| GitHub Pages from `main` | GitHub Pages from `gh-pages` branch | `main` branch is simpler — no separate deploy branch needed |

**Installation:** No package installation required. Vanilla PWA — no dependencies.

---

## Architecture Patterns

### Recommended Project Structure
```
kiosk-app/                   # repo root = GitHub Pages root
├── index.html               # paths changed to ./
├── manifest.json            # start_url: "./" scope: "./"
├── sw.js                    # APP_SHELL_FILES all ./
├── src/                     # app.js register: './sw.js'
│   └── *.js
├── styles/
│   └── main.css             # @font-face url('./assets/fonts/...')
├── assets/
│   ├── fonts/
│   ├── icons/
│   └── *.png/.svg
└── .planning/
    └── INSTALL-GUIDE.md     # not deployed, lives in .planning/
```

### Pattern 1: Relative Path Conversion for GitHub Pages Subdirectory

**What:** Replace all absolute root-relative paths (`/...`) with document-relative paths (`./...`) so the same codebase works at both `http://localhost/` and `https://unseenpleasures.github.io/kiosk-app/`.

**When to use:** Any time a PWA is deployed to a GitHub Pages project page (not a user/org page at `username.github.io`).

**How it works:** Relative URLs in `manifest.json`, `sw.js`, and HTML resolve against the file's own location. Since all files are at the repo root and served from `https://unseenpleasures.github.io/kiosk-app/`, `./` resolves to `https://unseenpleasures.github.io/kiosk-app/`.

**Example — manifest.json:**
```json
{
  "start_url": "./",
  "scope": "./",
  "icons": [
    { "src": "./assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "./assets/icons/icon-1024.png", "sizes": "1024x1024", "type": "image/png" }
  ]
}
```

**Example — sw.js APP_SHELL_FILES:**
```javascript
var APP_SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './src/app.js',
  './src/config.js',
  './src/db.js',
  './src/sync.js',
  './src/catalogue.js',
  './src/admin.js',
  './src/email.js',
  './src/router.js',
  './src/idle.js',
  './styles/main.css',
  './styles/animations.css',
  './assets/logo.svg',
  './assets/qr-code.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-1024.png',
  './assets/fonts/bebas-neue.woff2',
  './assets/fonts/inter-400.woff2',
  './assets/fonts/inter-700.woff2'
];
```
Note: `'/'` becomes `'./'` and `/index.html` becomes `'./index.html'` — 21 entries after adding missing font paths that were already in APP_SHELL_FILES. Current sw.js has 20 array entries (counting `'/'`).

**Example — src/app.js SW registration:**
```javascript
navigator.serviceWorker.register('./sw.js')
```
No explicit `scope` parameter needed — when `sw.js` is at the repo root and all content is at the same level, the default scope (the SW script's directory) covers everything correctly.

**Example — index.html:**
```html
<link rel="manifest" href="./manifest.json">
<link rel="apple-touch-icon" sizes="1024x1024" href="./assets/icons/icon-1024.png">
<link rel="apple-touch-icon" sizes="512x512" href="./assets/icons/icon-512.png">
<link rel="apple-touch-startup-image" ... href="./assets/splash-2732x2048.png">
<link rel="apple-touch-startup-image" ... href="./assets/splash-2048x2732.png">
<link rel="stylesheet" href="./styles/main.css">
<link rel="stylesheet" href="./styles/animations.css">
<img src="./assets/qr-code.png" ...>
<script src="./src/db.js" defer></script>
<!-- ...all 9 scripts... -->
```

**Example — styles/main.css @font-face (UNDOCUMENTED GAP — must be included):**
```css
@font-face {
  font-family: 'Bebas Neue';
  src: url('./assets/fonts/bebas-neue.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-weight: 400;
  src: url('./assets/fonts/inter-400.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-weight: 700;
  src: url('./assets/fonts/inter-700.woff2') format('woff2');
}
```

### Pattern 2: Service Worker Fetch Handler — No Changes Required

**What:** The existing `caches.match(event.request)` cache-first handler works correctly with relative-path-populated caches.

**Why:** `cache.addAll(['./index.html'])` normalises the relative URL against `WorkerGlobalScope.location` — the SW's own URL. Since the SW is at `https://unseenpleasures.github.io/kiosk-app/sw.js`, `./index.html` resolves to `https://unseenpleasures.github.io/kiosk-app/index.html`. When the browser requests `https://unseenpleasures.github.io/kiosk-app/index.html`, `caches.match(event.request)` compares the same absolute URL — match succeeds.

**Source:** MDN Cache.addAll() — "URLs may be relative to the base URL, which is the `WorkerGlobalScope.location` in a worker context." (HIGH confidence)

### Pattern 3: GitHub Pages Setup from main Branch

**Steps (perform in GitHub UI or via `gh` CLI):**
1. Create new public repo `kiosk-app` under `unseenpleasures` account
2. Add remote: `git remote add origin https://github.com/unseenpleasures/kiosk-app.git`
3. Rename local branch from `master` to `main`: `git branch -m master main`
4. Push: `git push -u origin main`
5. In repo Settings > Pages > Build and deployment: select "Deploy from a branch" > `main` > `/ (root)` > Save
6. GitHub Pages URL activates within ~60 seconds: `https://unseenpleasures.github.io/kiosk-app/`

### Pattern 4: Safari Add to Home Screen on iPadOS 16

**Requirements for PWA install prompt to work:**
- App served over HTTPS (GitHub Pages provides this automatically)
- `manifest.json` linked in `<head>` with `display: standalone`
- Service worker registered and active
- `start_url` within the same origin

**Steps on iPad:**
1. Open Safari, navigate to `https://unseenpleasures.github.io/kiosk-app/`
2. Wait for app to fully load and SW to register (first load may need network)
3. Tap the Share button (box with upward arrow)
4. Scroll down in the share sheet and tap "Add to Home Screen"
5. Edit the name if desired, tap "Add"
6. App icon appears on home screen; tap to launch in standalone mode

### Pattern 5: Apple Guided Access Setup

**Steps (one-time setup per iPad, then per-session activation):**

**One-time setup:**
1. Settings > Accessibility > Guided Access — toggle ON
2. Tap "Passcode Settings" > "Set Guided Access Passcode" — set a passcode
3. Optional: enable "Time Limits" or "Accessibility Shortcut"

**Per-session activation:**
1. Launch the kiosk PWA from home screen (must be in foreground)
2. Triple-press the Home button (or Side button on iPad Pro without Home button)
   - iPad Pro 12.9" 1st Gen (A1652): has a physical Home button — triple-press Home
3. Guided Access options appear — optionally circle screen areas to disable touch
4. Tap "Start" (top-right)
5. App is now locked; customers cannot exit

**Exit Guided Access:**
1. Triple-press Home button
2. Enter passcode
3. Tap "End" (top-left)

### Anti-Patterns to Avoid

- **Mixing absolute and relative paths:** If `sw.js` has `'./index.html'` but `index.html` links `<script src="/src/app.js">`, the SW will cache `./src/app.js` (absolute: `.../kiosk-app/src/app.js`) but the browser will request `/src/app.js` (absolute: `.../src/app.js`) — cache miss. Convert ALL paths in ALL files.
- **Forgetting CSS @font-face paths:** CONTEXT.md D-06 does not list `styles/main.css` but it has three absolute font `url()` paths that MUST be converted. If missed, fonts load from network and fail offline.
- **Not bumping CACHE_NAME:** After converting paths, the old cache (`kiosk-v8`) contains entries keyed to the old absolute URLs. Bumping to `kiosk-v9` forces a fresh cache install on first GitHub Pages load.
- **Installing PWA before SW registers:** On first visit, the SW install is async. If the user taps "Add to Home Screen" before the install event completes, the cached app shell may be incomplete. Always verify the SW shows as active in Safari dev tools (or wait ~3 seconds) before installing.
- **Testing localhost after path changes:** After converting to `./`, verify on localhost too. Both environments should work identically with relative paths.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTPS on GitHub Pages | Custom SSL setup | GitHub Pages built-in | Pages automatically provisions TLS; no configuration needed |
| Path rewriting for subdirectory | Custom build script | Manual `./` conversion | 5 files, ~35 substitutions — no tooling needed at this scale |
| Install prompt UI | Custom "tap to install" button | Safari native Share menu | `beforeinstallprompt` is not supported on iOS/Safari — native flow only |

**Key insight:** This phase is configuration and deployment, not code. Resist the urge to add tooling.

---

## Common Pitfalls

### Pitfall 1: CSS Font Paths Missed

**What goes wrong:** Fonts fail to load offline because `styles/main.css` still has `/assets/fonts/...` paths. App renders with system fallback fonts — visible regression.

**Why it happens:** CONTEXT.md D-06 explicitly lists 4 files but omits `styles/main.css`. Easy to miss when executing changes file-by-file.

**How to avoid:** The plan must include a task that explicitly converts all three `@font-face` `url()` values in `styles/main.css`.

**Warning signs:** After deployment, fonts look wrong in Safari (system sans-serif instead of Inter/Bebas Neue). Especially visible on the catalogue headings.

### Pitfall 2: CACHE_NAME Stale After Path Changes

**What goes wrong:** Old cache entries (`/index.html`, `/src/app.js`, etc.) persist under `kiosk-v8`. When the browser loads the new deployment, the SW attempts to serve the old absolute-path responses to the new relative-path requests — misses. Falls through to network. Inconsistent offline behaviour.

**Why it happens:** `skipWaiting` activates the new SW but the old cache is preserved (by design, to keep `SYNC_CACHE_NAME`). If `CACHE_NAME` is unchanged, the activate handler sees it as a "current" cache and does not delete it.

**How to avoid:** Bump `CACHE_NAME` from `'kiosk-v8'` to `'kiosk-v9'` in `sw.js`. The activate handler deletes all caches that are not `CACHE_NAME` or `SYNC_CACHE_NAME`, so the old entries get cleaned up automatically.

**Warning signs:** Offline load fails for JS/CSS but works for images (images are in the separate `SYNC_CACHE_NAME` which doesn't change).

### Pitfall 3: SW Scope Mismatch

**What goes wrong:** Service worker registers but shows "active (no clients)" — pages do not benefit from the SW cache. Network requests are not intercepted.

**Why it happens:** If `sw.js` were placed in a subdirectory (e.g., `src/sw.js`) and registered without an explicit scope, the default scope would be `./src/` — covering only URLs under that path. In this project, `sw.js` is already at the root, so this is not a risk. Documented for completeness.

**How to avoid:** Keep `sw.js` at the repo root. Default scope covers `./` which is all pages.

**Warning signs:** In Safari developer tools, SW shows as active but fetch events are not logged. Cache entries never populate.

### Pitfall 4: GitHub Pages Propagation Delay

**What goes wrong:** After pushing and enabling Pages, the URL returns 404 for up to 2 minutes. First-visit testing appears to fail when the site is simply not ready yet.

**Why it happens:** GitHub Pages builds and propagates CDN nodes; not instant.

**How to avoid:** Wait 60–120 seconds after enabling Pages before testing. Check GitHub repo Settings > Pages for the "Your site is published at..." confirmation banner.

**Warning signs:** 404 from `https://unseenpleasures.github.io/kiosk-app/` immediately after enabling Pages.

### Pitfall 5: iPad Requires Safari for First Install

**What goes wrong:** User opens app in Chrome or Firefox on iPad and "Add to Home Screen" doesn't appear or installs as a plain bookmark (no standalone mode).

**Why it happens:** On iPadOS 16, only Safari honours the web manifest for standalone PWA installation. Other browsers install as bookmarks that open in a browser tab.

**How to avoid:** The install guide must explicitly say: "Open in Safari." Not Chrome, not Firefox.

---

## Complete Path Change Inventory

This is the authoritative list of ALL changes needed across ALL files. The context doc (D-06) omitted `styles/main.css`.

| File | Current value | Change to |
|------|--------------|-----------|
| `manifest.json` | `"start_url": "/"` | `"start_url": "./"` |
| `manifest.json` | `"scope": "/"` | `"scope": "./"` |
| `manifest.json` | `"src": "/assets/icons/icon-512.png"` | `"src": "./assets/icons/icon-512.png"` |
| `manifest.json` | `"src": "/assets/icons/icon-1024.png"` | `"src": "./assets/icons/icon-1024.png"` |
| `sw.js` | `'/'` in APP_SHELL_FILES | `'./'` |
| `sw.js` | `'/index.html'` ... `'/assets/fonts/inter-700.woff2'` (19 entries) | `'./index.html'` ... `'./assets/fonts/inter-700.woff2'` |
| `sw.js` | `CACHE_NAME = 'kiosk-v8'` | `CACHE_NAME = 'kiosk-v9'` |
| `src/app.js` | `register('/sw.js')` | `register('./sw.js')` |
| `index.html` | `href="/manifest.json"` | `href="./manifest.json"` |
| `index.html` | `href="/assets/icons/icon-1024.png"` (apple-touch-icon) | `href="./assets/icons/icon-1024.png"` |
| `index.html` | `href="/assets/icons/icon-512.png"` (apple-touch-icon) | `href="./assets/icons/icon-512.png"` |
| `index.html` | `href="/assets/splash-2732x2048.png"` | `href="./assets/splash-2732x2048.png"` |
| `index.html` | `href="/assets/splash-2048x2732.png"` | `href="./assets/splash-2048x2732.png"` |
| `index.html` | `href="/styles/main.css"` | `href="./styles/main.css"` |
| `index.html` | `href="/styles/animations.css"` | `href="./styles/animations.css"` |
| `index.html` | `src="/assets/qr-code.png"` | `src="./assets/qr-code.png"` |
| `index.html` | `src="/src/db.js"` ... `src="/src/app.js"` (9 scripts) | `src="./src/db.js"` ... `src="./src/app.js"` |
| `styles/main.css` | `url('/assets/fonts/bebas-neue.woff2')` | `url('./assets/fonts/bebas-neue.woff2')` |
| `styles/main.css` | `url('/assets/fonts/inter-400.woff2')` | `url('./assets/fonts/inter-400.woff2')` |
| `styles/main.css` | `url('/assets/fonts/inter-700.woff2')` | `url('./assets/fonts/inter-700.woff2')` |

**Total changes:** ~35 path strings across 5 files. SW fetch handler: no changes needed.

---

## Validation Architecture

nyquist_validation is enabled. However, this phase has no automated test infrastructure (explicitly out of scope per REQUIREMENTS.md) and consists of deployment/installation tasks that require physical hardware. All validation is manual smoke-testing.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None — manual verification only |
| Config file | None |
| Quick run command | None — open URL in browser |
| Full suite command | None — physical iPad install |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOST-01 | `https://unseenpleasures.github.io/kiosk-app/` returns 200 | manual-only | N/A | N/A |
| HOST-02 | SW registers, manifest parses, app shell loads offline | manual-only | N/A | N/A |
| INST-01 | iPad #1: app installs, launches standalone, completes sync | manual-only | N/A | N/A |
| INST-02 | iPad #2: app installs, launches standalone, completes sync | manual-only | N/A | N/A |

**Justification for manual-only:** Physical iPad hardware is required for INST-01 and INST-02. Automated testing of PWA install on Safari/iPadOS is not feasible without a real device. HOST-01/02 require a live GitHub Pages deployment to verify. REQUIREMENTS.md explicitly marks "Automated testing" as Out of Scope for this milestone.

### Wave 0 Gaps
None — no test files need to be created. All verification is manual.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcode `/repo-name/` absolute paths in SW | Use `./` relative paths | ~2019 (relative URLs in manifests) | `./` works on localhost AND GitHub Pages without env config |
| `gh-pages` branch for deployment | Deploy from `main` branch | GitHub Pages UI added branch selection ~2020 | Simpler — no separate branch needed |
| `beforeinstallprompt` for custom install UI | iOS uses Share menu only | iOS never supported `beforeinstallprompt` | Install UI must be "Add to Home Screen" instructions, not a custom button |

**Deprecated/outdated:**
- AppCache API: deprecated and removed everywhere — already using Service Worker correctly
- `navigator.serviceWorker.register('/sw.js', {scope: '/repo-name/'})` with explicit absolute scope: works but unnecessary when SW is at root and using relative paths

---

## Open Questions

1. **Does `unseenpleasures` GitHub account already exist?**
   - What we know: The account name and repo name are locked decisions
   - What's unclear: Whether the account is set up, whether the user has 2FA enabled for push access
   - Recommendation: Plan assumes account exists; note in plan to verify push credentials before starting deployment task

2. **Should `generate-assets.js` and `project/` directory be committed to the repo?**
   - What we know: These exist in the working directory but are not part of the PWA itself
   - What's unclear: Whether the user wants them in the public GitHub repo
   - Recommendation: Include a `.gitignore` to exclude `generate-assets.js`, `project/`, and `.planning/` from the deployed repo — or leave the decision to the planner. The `.planning/` directory contains internal docs (including the INSTALL-GUIDE.md) and should not be publicly deployed.

3. **Local branch is `master`, GitHub default is `main`**
   - What we know: `git branch -a` shows only `master` locally; D-03 specifies `main` branch for GitHub Pages
   - What's unclear: Whether the user wants to rename `master` to `main`
   - Recommendation: Plan must include renaming `master` to `main` before pushing: `git branch -m master main`

---

## Sources

### Primary (HIGH confidence)
- MDN Cache.addAll() — URL resolution in worker context: relative URLs normalised to absolute using `WorkerGlobalScope.location`
- MDN Web App Manifest: scope and start_url — relative URL resolution against manifest file's URL
- MDN start_url reference — `"./"` resolves to manifest's directory: `https://unseenpleasures.github.io/kiosk-app/`
- GitHub Pages documentation — deploy from branch setup, URL format for project pages
- Apple Guided Access — triple-Home activation, triple-press to exit, passcode settings

### Secondary (MEDIUM confidence)
- Christian Heilmann (2022): "Turning a GitHub page into a Progressive Web App" — confirms `/repo-name/` vs `./` path patterns for GitHub Pages
- MDN PWA Installability — Safari iOS 16.3: only Safari can install; Share menu Add to Home Screen
- WebKit blog — `display: standalone` required for standalone mode on iOS

### Tertiary (LOW confidence)
- General community consensus that GitHub Pages serves standard MIME types for JS/CSS/JSON correctly — no known issues for standard file extensions

---

## Metadata

**Confidence breakdown:**
- Path change inventory: HIGH — derived from direct file inspection
- SW fetch handler (no change needed): HIGH — verified against MDN Cache API spec
- GitHub Pages setup steps: MEDIUM — documentation confirmed; DNS propagation timing is approximate
- Safari Add to Home Screen requirements: HIGH — confirmed via official MDN and WebKit docs
- Guided Access steps: MEDIUM — confirmed via multiple sources; exact UI may vary slightly on iPadOS 16

**Research date:** 2026-03-21
**Valid until:** 2026-09-21 (stable domain — GitHub Pages and Safari PWA behaviour changes slowly)
