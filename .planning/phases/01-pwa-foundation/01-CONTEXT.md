# Phase 1: PWA Foundation - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a fully installable PWA shell: manifest, service worker (cache-first), offline load, and a boot health check that blocks catalogue access if IndexedDB is evicted. No catalogue grid, no sync, no admin panel — those are Phases 2–4. The deliverable is a working kiosk-ready PWA that passes the five success criteria and can be installed to the iPad home screen today.

</domain>

<decisions>
## Implementation Decisions

### App icon
- **D-01:** Derive icon artwork from theidcardfactory.co.uk — fetch and adapt existing branding rather than creating from scratch
- **D-02:** Square format (standard PWA icon) — works correctly with iPadOS home screen; no letterboxing
- **D-03:** Dark background on the icon, matching the app theme — cohesive appearance on the iPad home screen
- **D-04:** Generate both required sizes: 512×512 and 1024×1024 as PNG files in `assets/icons/`

### Dark theme color palette
- **D-05:** Derive exact hex values from the ID Card Factory website (theidcardfactory.co.uk) — fetch brand colors rather than guessing. Expected: dark navy/black base, gold accent
- **D-06:** Minimal palette for Phase 1 — ~5 CSS custom properties: `--color-bg`, `--color-surface`, `--color-accent`, `--color-text-primary`, `--color-text-secondary`
- **D-07:** All CSS custom properties defined in `:root` block of `styles/main.css` — single source of truth for all color tokens across the project

### Home screen (Phase 1 splash)
- **D-08:** Branded splash screen — logo centred on dark background, app name, and "Browse our collection →" as the primary CTA
- **D-09:** QR code visible on the splash screen from Phase 1 — placed consistently (bottom-right or corner) to match where it will appear in Phase 2 global chrome
- **D-10:** Splash screen routes to catalogue root on tap/click — navigation placeholder that will become functional in Phase 4

### "Sync required" blocking screen
- **D-11:** Claude's discretion — minimal branded screen with clear message: "Catalogue data not found. Please sync before the event." No sync button (admin panel not built yet). Dark background, gold accent text, ID Card Factory logo.

### Service worker caching
- **D-12:** Cache all Phase 1 app shell files at install time: `index.html`, `manifest.json`, `src/app.js`, `styles/main.css`, `assets/logo.svg`, `assets/qr-code.png`, icon PNGs. Expanded in Phase 2 as more files are added.
- **D-13:** SW uses `skipWaiting()` + `clients.claim()` to activate immediately — avoids stale SW on standalone iPad (critical risk flagged in STATE.md)
- **D-14:** SW version string in cache name (e.g., `kiosk-v1`) to allow manual cache busting if needed

### Claude's Discretion
- Exact splash screen layout proportions and spacing
- Font choice for splash (must be locally bundled — no CDN; bold display font per brief)
- Loading/transition animation on app launch (CSS only, no JS animation libraries)
- Exact "Sync required" screen visual layout

</decisions>

<specifics>
## Specific Ideas

- KIOSK_APP.md: "Dark, immersive, tactile — think comic con energy, not corporate SaaS"
- KIOSK_APP.md: "Bold card thumbnails — the product IS the visual, let images lead"
- KIOSK_APP.md: "ID Card Factory branding — reference https://theidcardfactory.co.uk for colours, logo, and tone"
- QR code links to `https://theidcardfactory.co.uk` — static pre-generated asset (`assets/qr-code.png`)
- Font must be bundled locally (no CDN — offline requirement). A bold display font for the splash app name; clean sans-serif for UI chrome.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements
- `.planning/REQUIREMENTS.md` §PWA & Offline — PWA-01, PWA-02, PWA-04, PWA-05 are the exact acceptance criteria for this phase
- `.planning/ROADMAP.md` §Phase 1 — Success criteria 1–5 define done

### Project constraints and architecture
- `project/KIOSK_APP.md` §PWA Technical Requirements — manifest fields, service worker strategy, storage architecture
- `project/KIOSK_APP.md` §UI/UX Design Direction — aesthetic brief, touch target minimums, animation rules
- `project/KIOSK_APP.md` §File Structure — suggested file layout (`index.html`, `sw.js`, `src/`, `styles/`, `assets/`)
- `.planning/STATE.md` §Architecture Constraints — carry-forward rules (ES2017 max, no frameworks, no CDN, `config.js` owns localStorage, hash routing)
- `.planning/STATE.md` §Critical Risks — SW activation pattern on A9X (Phase 1 risk flag), 7-day eviction window

### Branding source
- `https://theidcardfactory.co.uk` — Live website. Extract: primary background color, accent/gold color, logo SVG/PNG, any web-safe font in use

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No code exists yet — this is the first phase. All files are new.

### Established Patterns
- File naming convention from KIOSK_APP.md: lowercase with hyphens, no build artifacts committed
- Module separation already decided: `db.js` (IndexedDB only), `config.js` (localStorage only), `sync.js` (network only), `app.js` (main coordinator)

### Integration Points
- `index.html` is the app shell — must register the service worker and contain the root `<div>` that all views render into
- Phase 2 will add `db.js`, hash router, and inactivity timer — Phase 1 only needs the boot health check hook in `app.js` that Phase 2 fills in

</code_context>

<deferred>
## Deferred Ideas

- Animated logo on splash — Phase 1 uses CSS transition only; if user wants a more elaborate brand animation, that's a Phase 2+ decision
- Dark/light mode toggle — out of scope; kiosk is always dark
- Splash screen with "featured cards" preview — no catalogue data in Phase 1; deferred to Phase 4 home screen design

</deferred>

---

*Phase: 01-pwa-foundation*
*Context gathered: 2026-03-21*
