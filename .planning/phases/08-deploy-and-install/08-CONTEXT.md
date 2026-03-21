# Phase 8: Deploy and Install - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Push the completed v1.0 PWA to GitHub Pages and install it on both iPads via Add to Home Screen. The app code is complete — this phase adapts paths for GitHub Pages hosting, deploys, and creates an installation guide.

</domain>

<decisions>
## Implementation Decisions

### GitHub Repository and Hosting
- **D-01:** Repo name: `kiosk-app` under GitHub account `unseenpleasures`
- **D-02:** Public repository — Shopify Storefront API token is read-only by design, no secrets in codebase
- **D-03:** Deploy via GitHub Pages from `main` branch
- **D-04:** Final URL: `https://unseenpleasures.github.io/kiosk-app/`

### Path Adaptation Strategy
- **D-05:** Convert ALL absolute root paths (`/`) to relative paths (`./`) across the entire codebase
- **D-06:** Files requiring path changes: `manifest.json` (start_url, scope, icon paths), `sw.js` (19 APP_SHELL_FILES entries), `src/app.js` (SW register path), `index.html` (all CSS/JS/asset references)
- **D-07:** `manifest.json` start_url changes from `"/"` to `"./"`, scope from `"/"` to `"./"`
- **D-08:** `sw.js` APP_SHELL_FILES change from `'/index.html'` to `'./index.html'`, etc. for all 19 entries
- **D-09:** `src/app.js` SW register changes from `'/sw.js'` to `'./sw.js'`
- **D-10:** QR code image stays as-is — it points to the Shopify store (the conversion path), not the kiosk app URL

### Service Worker Adjustments
- **D-11:** SW fetch handler adjustments for relative path compatibility — Claude's discretion on implementation details

### Installation Guide
- **D-12:** Create a full step-by-step install guide covering: Add to Home Screen, verify standalone mode, initial Shopify sync, and Guided Access lockdown
- **D-13:** Guide lives in `.planning/INSTALL-GUIDE.md` — reference doc, not deployed with the app
- **D-14:** Physical iPad install is a manual task — plan focuses on correct deployment, guide provides instructions

### Claude's Discretion
- SW fetch handler implementation adjustments for relative paths
- Cache version bump strategy (whether to bump CACHE_NAME after path changes)
- Any index.html path references not explicitly listed above
- README.md content for the GitHub repo (if needed)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### PWA manifest and service worker
- `manifest.json` — Current manifest with absolute paths that need conversion to relative
- `sw.js` — Service worker with APP_SHELL_FILES array (19 absolute paths) and fetch handler
- `src/app.js` — SW registration at line 11 using absolute `/sw.js` path

### Asset structure
- `index.html` — App shell with CSS/JS/font/icon references
- `assets/icons/` — PWA icons (512, 1024) referenced in manifest
- `assets/fonts/` — Local fonts (Inter, Bebas Neue) loaded in CSS
- `assets/` — Logo SVG, QR code PNG, splash images

### Project constraints
- `CLAUDE.md` — No build tools, vanilla JS, ES2017, Safari/iPadOS 16 constraints

</canonical_refs>

<specifics>
## Specific Ideas

- Relative paths (`./`) chosen specifically because they work on BOTH localhost development AND GitHub Pages — no environment-specific config needed
- The repo URL `https://unseenpleasures.github.io/kiosk-app/` is the canonical deployment target
- Both iPads are iPad Pro 12.9" 1st Gen (A1652, A9X chip) running iPadOS 16

</specifics>

<code_context>
## Existing Code Insights

### Paths Requiring Change (Complete Inventory)
- `manifest.json`: `start_url`, `scope`, 2 icon `src` paths
- `sw.js`: 19 entries in `APP_SHELL_FILES` array, all starting with `/`
- `src/app.js`: `navigator.serviceWorker.register('/sw.js')` at line 11
- `index.html`: all `<link>`, `<script>`, and asset `src`/`href` attributes

### Established Patterns
- Service worker uses cache-first strategy with `CACHE_NAME = 'kiosk-v8'`
- Separate `SYNC_CACHE_NAME = 'kiosk-v3'` for product images (must not be broken)
- SW activate handler preserves both CACHE_NAME and SYNC_CACHE_NAME caches

### Integration Points
- `src/sync.js` line 14: `SYNC_CACHE_NAME` must match `sw.js` — verify no path issues there
- Font loading in `styles/main.css`: `@font-face` src paths may need checking

</code_context>

<deferred>
## Deferred Ideas

- Custom domain for GitHub Pages — out of scope per REQUIREMENTS.md
- CI/CD pipeline for automated deployment — out of scope per REQUIREMENTS.md
- Automated testing before deploy — out of scope per REQUIREMENTS.md

</deferred>

---

*Phase: 08-deploy-and-install*
*Context gathered: 2026-03-21*
