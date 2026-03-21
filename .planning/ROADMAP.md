# Roadmap: ID Card Factory — Event Kiosk Catalogue App

## Milestones

- ✅ **v1.0 Event-Ready Kiosk** — Phases 1-7 (shipped 2026-03-21)
- 🚧 **v1.1 Live Deployment** — Phase 8 (in progress)

## Phases

<details>
<summary>✅ v1.0 Event-Ready Kiosk (Phases 1-7) — SHIPPED 2026-03-21</summary>

- [x] **Phase 1: PWA Foundation** - Installable offline PWA with service worker and app shell — completed 2026-03-21
- [x] **Phase 2: Data Layer and Navigation** - IndexedDB schema, localStorage config, hash router, idle timer — completed 2026-03-21
- [x] **Phase 3: Sync Engine** - Shopify Storefront API sync with cursor pagination and image caching — completed 2026-03-21
- [x] **Phase 4: Customer Browse Experience** - Virtual-scrolled catalogue grid, search, filters, card detail — completed 2026-03-21
- [x] **Phase 5: Email Capture and Export** - GDPR email form, per-event tagging, CSV export — completed 2026-03-21
- [x] **Phase 6: Admin Polish and Analytics** - Analytics dashboard, idle timeout config, passcode change — completed 2026-03-21
- [x] **Phase 7: Integration Bug Fixes** - SW cache preservation, NEW badge timing, first-sync catalogue fix — completed 2026-03-21

Full details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

### 🚧 v1.1 Live Deployment (In Progress)

**Milestone Goal:** PWA hosted on GitHub Pages and installed on both iPads, ready for events.

- [ ] **Phase 8: Deploy and Install** - Push PWA to GitHub Pages, verify hosting, and install on both iPads via Add to Home Screen

## Phase Details

### Phase 8: Deploy and Install
**Goal**: The PWA is publicly hosted and operational on both iPads
**Depends on**: Phase 7 (v1.0 complete)
**Requirements**: HOST-01, HOST-02, INST-01, INST-02
**Success Criteria** (what must be TRUE):
  1. The PWA is accessible via a public GitHub Pages URL in any browser
  2. Service worker registers correctly and the app shell loads offline from cache on GitHub Pages
  3. The PWA installs to the home screen on iPad #1 via "Add to Home Screen" in Safari
  4. The PWA installs to the home screen on iPad #2 via "Add to Home Screen" in Safari
  5. After installation on each iPad, the app launches in standalone mode (no Safari chrome) and completes a Shopify sync
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. PWA Foundation | v1.0 | 2/2 | Complete | 2026-03-21 |
| 2. Data Layer and Navigation | v1.0 | 2/2 | Complete | 2026-03-21 |
| 3. Sync Engine | v1.0 | 2/2 | Complete | 2026-03-21 |
| 4. Customer Browse Experience | v1.0 | 2/2 | Complete | 2026-03-21 |
| 5. Email Capture and Export | v1.0 | 2/2 | Complete | 2026-03-21 |
| 6. Admin Polish and Analytics | v1.0 | 2/2 | Complete | 2026-03-21 |
| 7. Integration Bug Fixes | v1.0 | 2/2 | Complete | 2026-03-21 |
| 8. Deploy and Install | v1.1 | 0/? | Not started | - |

---
*Roadmap created: 2026-03-21*
*Last updated: 2026-03-21 after v1.1 roadmap creation*
