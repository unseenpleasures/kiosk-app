---
phase: 05-email-capture-and-export
plan: 01
subsystem: ui
tags: [email-capture, gdpr, indexeddb, pwa, service-worker, vanilla-js]

# Dependency graph
requires:
  - phase: 02-data-layer-and-navigation
    provides: dbAdd, dbGetAll, IndexedDB emails store, Config.getEventName/getEventDate, hash-based router
  - phase: 04-customer-browse-experience
    provides: initEmailGracePeriod idle pause/resume, chrome-home button pattern

provides:
  - renderEmail() entry point for #/email route
  - validateAndSave() stores email record with GDPR consent fields to IndexedDB
  - showEmailConfirmation() with 5-second countdown + early-dismiss
  - chrome-email button in global chrome (fixed bottom-left)
  - active-screen dimming on chrome-email when on #/email
  - email screen and chrome button CSS classes in main.css
  - /src/email.js in SW cache (kiosk-v4)

affects: [05-02-email-export, 06-admin-polish-and-analytics]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-scoped _emailCountdown var guards against stale setInterval across re-renders"
    - "hashchange listener cleanup pattern: one-shot listener removes itself after firing"
    - "validateAndSave disables submit on click to prevent double-submit, re-enables on error"
    - "Chrome button active-screen class updated on every hashchange via updateChromeEmailState()"

key-files:
  created:
    - src/email.js
  modified:
    - styles/main.css
    - index.html
    - sw.js
    - src/router.js
    - src/app.js

key-decisions:
  - "chrome-email button placed bottom-left fixed to avoid QR code (bottom-right) and home button (top-left) — no overlap"
  - "validateAndSave uses email.length > 0 && indexOf('@') !== -1 per plan spec (D-07) — intentionally simple, matches UX expectation"
  - "/src/catalogue.js added to SW APP_SHELL_FILES — was missing from kiosk-v3 cache, discovered during sw.js edit"
  - "renderEmailStub deleted from router.js — Phase 5 replaces it with real renderEmail from email.js"

patterns-established:
  - "Stale interval cleanup: window.addEventListener('hashchange', cleanupFn) one-shot pattern used in showEmailConfirmation"
  - "Chrome button active state: updateChromeEmailState() called on hashchange + once at boot"

requirements-completed: [EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04]

# Metrics
duration: 25min
completed: 2026-03-21
---

# Phase 5 Plan 01: Email Sign-Up Screen Summary

**GDPR-compliant email capture screen with IndexedDB persistence, 5-second confirmation countdown, and global chrome envelope button accessible from any screen**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-21
- **Completed:** 2026-03-21
- **Tasks:** 2
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments

- Full email sign-up screen (renderEmail) with heading, email input, GDPR consent checkbox unchecked by default, and disabled submit button that enables only when checkbox is ticked
- validateAndSave stores { email, eventName, eventDate, consentAt } to IndexedDB emails store via dbAdd — GDPR-compliant, fully offline
- showEmailConfirmation renders checkmark, "YOU'RE IN!" heading, 5-second countdown with per-tick DOM update, early-dismiss button, and async signup count for current event
- Stale interval cleanup via one-shot hashchange listener prevents ghost countdown after mid-flow navigation
- Chrome email button (envelope glyph, bottom-left fixed) wired in index.html and app.js — navigates to #/email from any screen; dims to 50% opacity when already on #/email
- SW cache bumped to kiosk-v4 with email.js and catalogue.js added to APP_SHELL_FILES

## Task Commits

Each task was committed atomically:

1. **Task 1: Create email.js module with form, validation, confirmation, and countdown** - `5bb27d7` (feat)
2. **Task 2: Wire chrome button, script tag, SW cache, router swap, and active-screen state** - `c10595a` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/email.js` — complete email capture module: renderEmail, renderEmailForm, validateAndSave, showEmailConfirmation
- `styles/main.css` — email screen CSS: .screen-email, .email-form-card, .email-input, .email-consent-group, .email-confirmation-heading, .chrome-email, .chrome-email.active-screen (and all related classes)
- `index.html` — chrome-email button element added; email.js script tag inserted before router.js
- `sw.js` — CACHE_NAME bumped to kiosk-v4; /src/email.js and /src/catalogue.js added to APP_SHELL_FILES
- `src/router.js` — ROUTES table updated to renderEmail; renderEmailStub function deleted; header comment updated
- `src/app.js` — initEmailButton() and updateChromeEmailState() added; both wired in boot()

## Decisions Made

- chrome-email button placed at bottom-left to avoid both chrome-home (top-left) and chrome-qr (bottom-right) — no touch target overlap
- Email validation intentionally kept simple (non-empty + '@') per plan spec D-07 — matches user expectation at a physical event kiosk
- /src/catalogue.js was missing from SW APP_SHELL_FILES (kiosk-v3 omission) — added in this plan alongside email.js
- renderEmailStub deleted entirely — no longer needed, reduces dead code

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added /src/catalogue.js to SW APP_SHELL_FILES**
- **Found during:** Task 2 (sw.js edit)
- **Issue:** Plan instructed to check if catalogue.js was already in APP_SHELL_FILES; it was not present in kiosk-v3. Without it the catalogue module would not be cached offline, breaking the core browse experience after a cache refresh.
- **Fix:** Added '/src/catalogue.js' to APP_SHELL_FILES alongside '/src/email.js'
- **Files modified:** sw.js
- **Verification:** grep confirms both entries present in sw.js
- **Committed in:** c10595a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Fix was directly required by plan spec ("Also add /src/catalogue.js if not already present"). No scope creep.

## Issues Encountered

None — both tasks executed as planned. All acceptance criteria verified with grep checks before each commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Email capture fully wired — 05-02 (CSV export from admin panel) can proceed
- IndexedDB emails store is being written with correct schema (email, eventName, eventDate, consentAt)
- Admin panel export in 05-02 can read from emails store using dbGetAll('emails')
- No blockers

## Self-Check: PASSED

- src/email.js — FOUND
- styles/main.css — FOUND
- index.html — FOUND
- sw.js — FOUND
- src/router.js — FOUND
- src/app.js — FOUND
- .planning/phases/05-email-capture-and-export/05-01-SUMMARY.md — FOUND
- Commit 5bb27d7 — FOUND (Task 1)
- Commit c10595a — FOUND (Task 2)

---
*Phase: 05-email-capture-and-export*
*Completed: 2026-03-21*
