# ID Card Factory — Event Kiosk Catalogue App

## What This Is

A fully offline Progressive Web App (PWA) kiosk catalogue for The ID Card Factory, deployed on iPad Pros at UK comic cons and fan events. Customers browse 950+ custom printed ID cards, sign up for email updates, and scan a QR code to visit the website. The app is locked into kiosk mode via Apple Guided Access and requires internet only for pre-event catalogue syncing from Shopify.

## Core Value

Customers can browse and discover ID cards with zero friction — fast, visual, and fully offline — while the business captures emails and analytics data that persist across every event.

## Requirements

### Validated

- ✓ PWA installs to home screen with standalone display, landscape, dark theme, 512/1024 icons — v1.0
- ✓ Service worker cache-first for app shell and all product images/JSON — v1.0
- ✓ App shell pre-cached on install — v1.0
- ✓ Home screen load < 2 seconds from cache (requires A9X hardware test) — v1.0
- ✓ Boot health check: "Sync Required" gate if IndexedDB evicted — v1.0
- ✓ IndexedDB schema with 4 object stores (products, emails, analytics, sync_meta) — v1.0
- ✓ Promise-wrapped CRUD helpers (openDB, dbGet, dbPut, dbDelete, dbCount, dbGetAll, dbGetAllByIndex, dbClear) — v1.0
- ✓ localStorage config wrapper with SHA-256 passcode hashing via Web Crypto API — v1.0
- ✓ Hash-based SPA router with 5 route patterns — v1.0
- ✓ Inactivity timer with 10-second countdown overlay and pause/resume API — v1.0
- ✓ Persistent QR code and floating home button on every screen — v1.0
- ✓ Full-screen thumbnail grid with virtual scroll (~80 DOM nodes) for 950+ cards — v1.0
- ✓ Category filter for 8 categories (< 100ms response) — v1.0
- ✓ Real-time search by name/character (< 300ms) with zero-result logging — v1.0
- ✓ "NEW" badge on cards added since previous sync — v1.0
- ✓ Card detail view with larger image and card name — v1.0
- ✓ 3-minute inactivity grace period on email form — v1.0
- ✓ Card view, category filter, and search query analytics logging — v1.0
- ✓ Dedicated email sign-up screen accessible from any screen — v1.0
- ✓ GDPR consent checkbox (unchecked by default, submit blocked until ticked) — v1.0
- ✓ Emails tagged with event name, date, and consent timestamp in IndexedDB — v1.0
- ✓ 5-second confirmation countdown after submission — v1.0
- ✓ One-tap Mailchimp-ready CSV export from admin panel — v1.0
- ✓ Hidden 7-tap trigger + passcode gate for admin panel — v1.0
- ✓ Admin event name and date configuration — v1.0
- ✓ One-button Shopify sync with progress indicator and status report — v1.0
- ✓ Cursor-based pagination with failure-safe checkpointing — v1.0
- ✓ Admin analytics summary: top 10 cards, searches, zero-results, email count — v1.0
- ✓ Cumulative analytics data persists across events — v1.0
- ✓ Adjustable inactivity timer (10-600s) — v1.0
- ✓ Changeable admin passcode with current-passcode verification — v1.0
- ✓ Product images survive SW version bumps (sync cache excluded from activate cleanup) — v1.0
- ✓ First-sync catalogue loads without page reload — v1.0

### Active

- [x] PWA hosted on GitHub Pages and accessible via public URL — Validated in Phase 08: Deploy and Install
- [ ] App installed on both iPads via Add to Home Screen — awaiting physical iPad testing (08-HUMAN-UAT.md)

### Out of Scope

- Native iOS app — PWA via Safari + Guided Access is sufficient and avoids App Store fees
- Real-time sync during events — offline-first design, sync happens at home pre-event
- Server-side data storage — all data on-device until manually exported
- OAuth or multi-user authentication — single admin passcode is sufficient
- Push notifications — out of scope for kiosk context
- Video content — storage/bandwidth costs, not relevant to card catalogue
- Cart / wishlist / purchase flow — QR code is the conversion path; commerce adds GDPR complexity
- Favourites / bookmark list — no returning users on a shared kiosk
- Live inventory / stock levels — requires network; offline-first means point-in-time data
- Remote analytics / telemetry — all data stays on-device; third-party adds GDPR obligations
- Incremental sync (delta detection) — deferred to v2.0; full resync is sufficient for v1

## Current Milestone: v1.1 Live Deployment

**Goal:** Get the PWA hosted on GitHub Pages and installed on both iPads.

**Target features:**
- GitHub Pages hosting
- PWA installed on 2 iPads

## Context

- **Shipped:** v1.0 on 2026-03-21
- **Codebase:** 4,326 LOC across 13 source files (vanilla HTML/CSS/JS)
- **Platform**: iPadOS 16, Safari, PWA installed to home screen via "Add to Home Screen"
- **Primary device**: iPad Pro 12.9" 1st Gen (A1652, A9X chip) — older hardware, performance targets set accordingly
- **Kiosk lockdown**: Apple Guided Access (OS-level) + app-level admin passcode (two layers)
- **Data source**: Shopify Storefront API 2026-01 (read-only, free tier) — `unauthenticated_read_product_listings` scope
- **Product scale**: 951 products as of March 2026, paginated 50 at a time via GraphQL cursor
- **Image strategy**: Compressed images (~400px wide) cached in Cache API during sync
- **Branding**: Dark navy/black base, gold accent (#c8a951), Inter variable font
- **Category structure**: Anime & Manga / Film & Cinema / Gaming / Horror / Novelty / UK TV / US & World TV / Law & Services
- **Known tech debt**: dbGetAll('emails') missing .catch() handler, splash images not in SW precache, 9 SUMMARY frontmatter documentation gaps

## Constraints

- **Tech Stack**: Vanilla HTML/CSS/JS PWA — no build tools, no frameworks, no App Store. Must run in Safari on iPadOS 16.
- **Compatibility**: iPad Pro 12.9" 1st Gen (A9X chip), iPadOS 16 maximum. No features requiring newer iOS.
- **Performance**: A9X chip is 2015-era hardware. Bundle size, animation complexity, and memory usage must be constrained accordingly.
- **Offline**: Zero network dependency during events. All data must be pre-cached. No CDN fonts, no remote assets.
- **Storage**: IndexedDB for persistent data. localStorage for small config. Service worker cache for app shell + product assets.
- **GDPR**: Explicit opt-in checkbox mandatory on email capture. Data stays on-device until owner exports CSV.
- **Security**: Shopify Storefront API token is public/read-only by design — safe to include in client-side code. Admin passcode stored hashed in localStorage.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PWA over native app | No App Store fees, no annual developer account, iPadOS 16 fully supports PWA + Guided Access | ✓ Good |
| Vanilla JS over framework | No build toolchain, no node_modules, simpler deployment — serve directly from filesystem | ✓ Good |
| No arrow functions in sw.js | Safari SW compatibility — older Safari versions had issues parsing arrow functions in SW context | ✓ Good |
| Shopify Storefront API 2026-01 | Free, read-only, built into every Shopify store — no custom backend needed | ✓ Good |
| IndexedDB for all persistent data | Browser-native, offline-capable, handles large datasets (950+ products) | ✓ Good |
| Shopify token in client code | Token is read-only and unauthenticated — Shopify's intended use case for storefronts | ✓ Good |
| ES2017 syntax constraint | A9X chip / Safari 16.x safe upper bound — no optional chaining, no nullish coalescing | ✓ Good |
| Node.js PNG encoder for assets | Python unavailable; pure Node.js zlib/deflate generates all PNG icons/splash with no deps | ✓ Good |
| 7-tap hidden trigger for admin | Inconspicuous to customers, accessible to owner via muscle memory | ✓ Good |
| Sequential image caching | Prevents parallel fetch memory pressure on A9X chip — reduce() chain | ✓ Good |
| Virtual scroll from day one | ~80 DOM nodes max for 950+ cards; IntersectionObserver sentinel pattern | ✓ Good |
| Separate sync cache name | Product images in dedicated cache, excluded from SW activate cleanup | ✓ Good (fixed in Phase 7) |
| prevSyncAt for NEW badge | Store previous lastSyncAt before overwriting to get correct badge timing | ✓ Good (fixed in Phase 7) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-21 after Phase 08 complete — PWA live at https://unseenpleasures.github.io/kiosk-app/*
