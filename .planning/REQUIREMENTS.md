# Requirements: ID Card Factory — Event Kiosk Catalogue App

**Defined:** 2026-03-21
**Core Value:** Customers can browse and discover ID cards with zero friction — fast, visual, and fully offline — while the business captures emails and analytics data that persist across every event.

## v1 Requirements

### Catalogue

- [ ] **CAT-01**: Attendee can browse a full-screen thumbnail grid of all 950+ cards with lazy loading and virtual scrolling
- [ ] **CAT-02**: Attendee can filter the grid by one of 8 categories instantly (< 100ms response)
- [ ] **CAT-03**: Attendee can search cards in real-time by name or character (results appear < 300ms)
- [ ] **CAT-04**: All search queries including zero-result searches are logged with timestamp
- [ ] **CAT-05**: Attendee can tap a card to view a larger image and card name
- [ ] **CAT-06**: Cards added since the previous sync are badged "NEW"
- [x] **CAT-07**: QR code linking to https://theidcardfactory.co.uk is always visible on every screen
- [x] **CAT-08**: Floating home button fixed to top-left on every screen; tapping it resets search, filter, and returns to the catalogue grid
- [x] **CAT-09**: App automatically returns to home after 60 seconds of inactivity, preceded by a 10-second visual countdown with cancel option
- [ ] **CAT-10**: Email sign-up form has a separate 3-minute inactivity grace period to avoid interrupting mid-entry

### Sync

- [x] **SYNC-01**: Admin can trigger a full Shopify Storefront API catalogue sync with one tap
- [x] **SYNC-02**: Sync displays a progress indicator while running
- [x] **SYNC-03**: Sync completion shows a status report (products updated, new cards added, any errors)
- [x] **SYNC-04**: Previous cached catalogue remains fully usable if sync fails or is interrupted

### Email Capture

- [ ] **EMAIL-01**: Attendee can access an email sign-up screen from anywhere in the app
- [ ] **EMAIL-02**: Sign-up form contains email address field and a mandatory GDPR consent checkbox (unchecked by default); submission blocked until checkbox is ticked
- [ ] **EMAIL-03**: Submitted email is stored in IndexedDB with event name, event date, and consent timestamp
- [ ] **EMAIL-04**: Confirmation screen displays after successful submission and auto-dismisses to catalogue after 5 seconds
- [ ] **EMAIL-05**: Admin can export the current event's email list as a tagged, Mailchimp-ready CSV

### Admin Panel

- [x] **ADMIN-01**: Admin panel is accessible only via a hidden discreet trigger and a passcode entry
- [x] **ADMIN-02**: Admin can set event name and date before each show (used for email tagging and analytics labelling)
- [x] **ADMIN-03**: Admin can trigger a full catalogue sync from within the admin panel
- [x] **ADMIN-04**: Admin can view sync status: last sync time, product count, and any sync errors
- [ ] **ADMIN-05**: Admin can adjust the idle inactivity timeout duration (default 60 seconds)
- [ ] **ADMIN-06**: Admin can change the admin passcode (requires entry of current passcode)

### Analytics

- [ ] **ANALYTICS-01**: Every card detail view is logged with card ID, card name, and timestamp
- [ ] **ANALYTICS-02**: Every category filter selection is logged with category name and timestamp
- [ ] **ANALYTICS-03**: Every search query is logged; zero-result searches are flagged separately from results-found searches
- [ ] **ANALYTICS-04**: Admin event summary shows: top 10 most-viewed cards, most-searched terms, list of zero-result searches, and total emails captured — all scoped to the current event
- [ ] **ANALYTICS-05**: All analytics data persists across events in IndexedDB for longitudinal trend analysis

### PWA & Offline

- [x] **PWA-01**: App installs as a PWA to iPad home screen with standalone display, landscape orientation, dark background theme, and 512×512 and 1024×1024 icons
- [x] **PWA-02**: Service worker caches the full app shell on first install; uses cache-first strategy for all app assets and product images
- [x] **PWA-03**: All product JSON and optimised images (≤400px width) are downloaded to device during sync; the app functions fully offline with no network dependency
- [x] **PWA-04**: On every launch, app checks whether catalogue data is present in IndexedDB; if storage was evicted, a "Sync required" blocking screen is shown before the catalogue
- [x] **PWA-05**: Home screen loads in under 2 seconds from cache on A9X hardware (iPad Pro 12.9" 1st Gen)
- [x] **PWA-06**: Admin passcode stored hashed (SHA-256) in localStorage; event name, event date, and timer setting stored in localStorage

## v2 Requirements

### Sync

- **SYNC-V2-01**: Incremental sync — only downloads new or changed products since the last sync; stores `updatedAt` per product to enable delta detection. Full resync is the v1 approach; this optimises pre-event setup time for future versions.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cart / wishlist / purchase flow | Catalogue only — QR code is the intended conversion path; commerce adds GDPR complexity |
| User accounts / login | No use case on a shared kiosk; single admin passcode is sufficient |
| Video content | A9X GPU ceiling; cache size impact; convention hall audio environment |
| Push notifications | Kiosk context; iOS PWA notification support unreliable |
| Social sharing buttons | External network dependency; risk of attendees leaving the kiosk |
| Favourites / bookmark list | No returning users on a shared kiosk; session state complexity for zero value |
| Live inventory / stock levels | Requires network; offline-first design means data is always point-in-time |
| Remote analytics / telemetry | All data stays on-device; third-party service adds GDPR data processor obligations |
| Native iOS app | PWA + Guided Access achieves the same kiosk lockdown without App Store fees |
| Keyboard navigation / screen reader tree | Guided Access kiosk is not an accessibility-compliant public terminal; basic visual contrast and touch targets are still required |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PWA-01 | Phase 1 | Complete |
| PWA-02 | Phase 1 | Complete |
| PWA-04 | Phase 1 | Complete |
| PWA-05 | Phase 1 | Complete |
| PWA-03 | Phase 2 | Complete |
| PWA-06 | Phase 2 | Complete |
| CAT-07 | Phase 2 | Complete |
| CAT-08 | Phase 2 | Complete |
| CAT-09 | Phase 2 | Complete |
| SYNC-01 | Phase 3 | Complete |
| SYNC-02 | Phase 3 | Complete |
| SYNC-03 | Phase 3 | Complete |
| SYNC-04 | Phase 3 | Complete |
| ADMIN-01 | Phase 3 | Complete |
| ADMIN-02 | Phase 3 | Complete |
| ADMIN-03 | Phase 3 | Complete |
| ADMIN-04 | Phase 3 | Complete |
| CAT-01 | Phase 4 | Pending |
| CAT-02 | Phase 4 | Pending |
| CAT-03 | Phase 4 | Pending |
| CAT-04 | Phase 4 | Pending |
| CAT-05 | Phase 4 | Pending |
| CAT-06 | Phase 4 | Pending |
| CAT-10 | Phase 4 | Pending |
| ANALYTICS-01 | Phase 4 | Pending |
| ANALYTICS-02 | Phase 4 | Pending |
| ANALYTICS-03 | Phase 4 | Pending |
| EMAIL-01 | Phase 5 | Pending |
| EMAIL-02 | Phase 5 | Pending |
| EMAIL-03 | Phase 5 | Pending |
| EMAIL-04 | Phase 5 | Pending |
| EMAIL-05 | Phase 5 | Pending |
| ADMIN-05 | Phase 6 | Pending |
| ADMIN-06 | Phase 6 | Pending |
| ANALYTICS-04 | Phase 6 | Pending |
| ANALYTICS-05 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after roadmap creation — all 36 requirements mapped*
