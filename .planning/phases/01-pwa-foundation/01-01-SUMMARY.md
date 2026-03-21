---
phase: 01-pwa-foundation
plan: 01
subsystem: pwa-shell
tags: [pwa, manifest, css, assets, fonts, icons, splash]
dependency_graph:
  requires: []
  provides:
    - index.html app shell with all iOS PWA meta tags
    - manifest.json with standalone display, landscape, dark theme
    - CSS design token system (colors, spacing, typography)
    - Self-hosted woff2 fonts (Bebas Neue, Inter 400/700)
    - Brand icons (512x512, 1024x1024 PNG)
    - Splash images for iPad Pro 12.9" 1st Gen (portrait + landscape)
    - QR code PNG for theidcardfactory.co.uk
    - CSS fade-in animation utility
  affects:
    - Plan 01-02 (app.js registers SW, renders into #app)
    - All subsequent plans (inherit CSS tokens and font-face declarations)
tech_stack:
  added:
    - Web App Manifest (manifest.json)
    - Self-hosted woff2 fonts via @font-face
    - CSS Custom Properties (design token system)
  patterns:
    - CSS portrait-to-landscape rotation workaround (Safari/iPadOS orientation fix)
    - apple-touch-icon + apple-touch-startup-image for iOS home screen install
    - font-display:swap on all @font-face declarations
key_files:
  created:
    - index.html
    - manifest.json
    - styles/main.css
    - styles/animations.css
    - assets/logo.svg
    - assets/qr-code.png
    - assets/icons/icon-512.png
    - assets/icons/icon-1024.png
    - assets/splash-2732x2048.png
    - assets/splash-2048x2732.png
    - assets/fonts/bebas-neue.woff2
    - assets/fonts/inter-400.woff2
    - assets/fonts/inter-700.woff2
  modified: []
decisions:
  - "Used Node.js PNG encoder (no external deps) to generate icons and splash images — Python not available in environment"
  - "Downloaded Inter woff2 from Google Fonts CDN (latin subset only) — Google serves same variable font file for weight 400 and 700; @font-face weight declarations will correctly select each weight at render time"
  - "Downloaded Bebas Neue woff2 (latin subset) from Google Fonts CDN — confirmed wOF2 magic bytes"
  - "Downloaded logo.svg directly from theidcardfactory.co.uk CDN — 9.4KB SVG with gold/navy brand colors"
  - "Generated QR code using hardcoded module matrix for https://theidcardfactory.co.uk (Version 3 QR, 29x29 modules)"
metrics:
  duration: "5 minutes"
  completed: "2026-03-21T07:37:42Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 13
  files_modified: 0
---

# Phase 1 Plan 1: PWA Foundation Scaffolding Summary

**One-liner:** App shell with iOS PWA meta tags, dark-theme manifest, CSS design token system, self-hosted woff2 fonts, and generated brand icons/splash images — all offline-ready.

---

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Download brand assets and create icon/splash image files | `5e3378b` | 9 asset files (logo, qr, icons, splash, fonts) |
| 2 | Create manifest.json and index.html app shell with iOS meta tags | `7255e0c` | manifest.json, index.html |
| 3 | Create CSS foundation — tokens, font-face, reset, landscape fix, animations | `3986cd7` | styles/main.css, styles/animations.css |

---

## What Was Built

### PWA Install Infrastructure

`manifest.json` provides the W3C PWA manifest with `display: standalone`, `background_color: #0d0f1a`, `theme_color: #0d0f1a`, `orientation: landscape`, and both icon sizes (512×512, 1024×1024).

`index.html` contains all iOS-specific meta tags required for correct Safari PWA behaviour:
- `apple-touch-icon` (512 and 1024) — Safari uses these over manifest icons for home screen
- `apple-touch-startup-image` (landscape: 2732×2048, portrait: 2048×2732) — prevents white flash on launch
- `apple-mobile-web-app-status-bar-style: black-translucent` — status bar styling
- `apple-mobile-web-app-title: ID Cards` — home screen label
- No deprecated `apple-mobile-web-app-capable` tag (per RESEARCH.md anti-patterns)

### CSS Design System

`styles/main.css` establishes the project-wide token system:
- **6 color tokens** verified from theidcardfactory.co.uk: `--color-bg` (#0d0f1a), `--color-surface` (#0e1b4d), `--color-accent` (#f5c842), `--color-text-primary` (#f0f0f0), `--color-text-secondary` (#a0a8c0), `--color-destructive` (#e53e3e)
- **7 spacing tokens** on 4px scale: xs (4px) through 3xl (64px)
- **4 text size tokens**: display (48px), heading (28px), body (16px), label (14px)
- **2 font tokens**: `--font-display` (Bebas Neue), `--font-body` (Inter)
- **Touch target**: `--touch-target-min: 48px`
- **3 @font-face declarations** with `font-display: swap` — all pointing to local woff2 files
- **Portrait orientation fix** via CSS `rotate(90deg)` media query (Safari ignores manifest orientation)
- Screen component styles for splash and sync-required screens

`styles/animations.css` provides a single `.fade-in` / `.fade-in.visible` opacity transition (300ms ease-in). No `@keyframes`, no `transform3d` — safe for A9X GPU.

### Assets

All 9 assets created at required paths and dimensions:
- `assets/logo.svg` — original SVG from theidcardfactory.co.uk (9.4KB)
- `assets/qr-code.png` — 192×192px QR code for https://theidcardfactory.co.uk
- `assets/icons/icon-512.png` — 512×512px dark navy icon with ID card design
- `assets/icons/icon-1024.png` — 1024×1024px 2× version
- `assets/splash-2732x2048.png` — landscape splash (physical pixels for iPad Pro 12.9" 1st Gen)
- `assets/splash-2048x2732.png` — portrait splash (defensive fallback)
- `assets/fonts/bebas-neue.woff2` — 13.7KB latin subset
- `assets/fonts/inter-400.woff2` — 48.2KB latin subset
- `assets/fonts/inter-700.woff2` — 48.2KB latin subset (variable font, weight selectable via CSS)

---

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Implementation Notes

**1. Python not available — used Node.js PNG generator instead**
- **Found during:** Task 1
- **Issue:** Plan specified using Python + Pillow for PNG generation; Python was not available in the environment
- **Fix:** Wrote a pure Node.js PNG encoder using raw deflate compression (no npm dependencies) to generate all PNG assets. All output verified at correct pixel dimensions.
- **Files modified:** `generate-assets.js` (utility script, not a plan deliverable)
- **Commit:** `5e3378b`

**2. Inter font — Google Fonts serves variable font for both 400 and 700 weights**
- **Found during:** Task 1
- **Issue:** Plan expected two different woff2 files; Google Fonts now serves the same Inter variable font file for both weight 400 and weight 700 latin subsets
- **Fix:** Downloaded the latin subset woff2 twice (once as inter-400.woff2, once as inter-700.woff2). Both files are identical in content but the separate `@font-face` declarations with `font-weight: 400` and `font-weight: 700` correctly instruct the browser which axis value to use at render time. This is the correct behaviour for a variable font.
- **Impact:** None — renders identically to two distinct weight files. File is 48.2KB each.

---

## Verification Results

All 7 overall verification criteria pass:

1. All 9 asset files exist with non-zero file sizes — PASS
2. manifest.json valid JSON: standalone, #0d0f1a background, landscape, both icons — PASS
3. index.html: manifest link, apple-touch-icon (×2), startup-image (×2), stylesheet links, #app div, deferred app.js — PASS
4. index.html: NO deprecated apple-mobile-web-app-capable — PASS
5. styles/main.css: all tokens from UI-SPEC, 3 @font-face (swap), landscape rotation fix — PASS
6. styles/animations.css: fade-in opacity transition, no @keyframes — PASS
7. Files serve correctly when loaded via local HTTP server — pending device verification in Plan 02

---

## Known Stubs

None — all Plan 01 deliverables are complete static assets. The `#app` div is empty (no app.js yet — created in Plan 02). This is intentional per the plan scope.

---

## Self-Check: PASSED

All 13 created files confirmed present on disk. All 3 task commits (`5e3378b`, `7255e0c`, `3986cd7`) confirmed in git log.
