# Phase 5: Email Capture and Export - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

GDPR-compliant email sign-up screen accessible from any screen in the app with one tap, with per-event tagging and a Mailchimp-ready CSV export from the admin panel. The screen captures email + consent, stores offline in IndexedDB, and auto-returns to catalogue after confirmation. No email sending — data stays on-device.

</domain>

<decisions>
## Implementation Decisions

### Email trigger placement
- **D-01:** Persistent chrome button added to the global chrome layer in `index.html` alongside `#chrome-home` and `#chrome-qr` — always visible on every screen with a single tap
- **D-02:** Tapping the chrome email button navigates to `#/email`
- **D-03:** The chrome button position must not overlap `#chrome-home` (top-left) or `#chrome-qr` (bottom-right); exact placement is Claude's discretion

### Email form layout
- **D-04:** Full-width email address `<input type="email">` — large touch target for public kiosk use
- **D-05:** GDPR consent checkbox — unchecked by default, large tap target (checkbox + label together); label text: `"I agree to receive email updates from The ID Card Factory."`
- **D-06:** Submit button — full-width, `btn-primary` style, remains `disabled` until checkbox is ticked; re-enabled only when checkbox state changes to checked
- **D-07:** Basic client-side email format validation before submit (non-empty, contains `@`)

### Confirmation screen
- **D-08:** Full-screen thank-you message after successful submission
- **D-09:** Visible countdown showing "Returning to catalogue in Ns…" that ticks down from 5 to 0 and then navigates to `#/`
- **D-10:** Early-dismiss "Back to browsing" `btn-secondary` button is present — user can leave before 5 seconds expires
- **D-11:** Confirmation replaces the form in the same `#screen-email` container (no new route)

### IndexedDB storage
- **D-12:** Use `dbAdd('emails', record)` — record shape: `{ email, eventName, eventDate, consentAt }` where `eventName = Config.getEventName()`, `eventDate = Config.getEventDate()`, `consentAt = new Date().toISOString()`
- **D-13:** `emails` store already created in db.js (autoIncrement PK) — no schema changes needed

### CSV export (admin panel)
- **D-14:** New "Email Export" section added to `renderAdminPanel()` in `admin.js`, following the existing section pattern (`admin-section` div, `admin-section-heading` h2)
- **D-15:** Export scope — current event only: filter `emails` store where `eventName === Config.getEventName()`
- **D-16:** Mailchimp import format — two columns: `Email Address,TAGS` where TAGS = event name (enables list segmentation)
- **D-17:** CSV filename: `emails-{sanitized-event-name}-{event-date}.csv` (spaces → hyphens, lowercase)
- **D-18:** Export uses `Blob` + `URL.createObjectURL` + a hidden `<a download>` click — no server, no library
- **D-19:** If no emails for the current event, export button shows an inline message "No emails captured for this event yet" and does not generate a file

### Module structure
- **D-20:** New file `src/email.js` containing `renderEmail()` — replaces `renderEmailStub()` in `router.js`; `router.js` ROUTES table updated: `'#/email': renderEmail`
- **D-21:** `email.js` added to `index.html` script load order before `router.js` (so `renderEmail` is defined when router wires up)

### Claude's Discretion
- Exact position/icon for the chrome email button (must not clash with home or QR positions)
- Visual design of the confirmation screen (colour, icon, layout — consistent with existing dark theme)
- Error state when `dbAdd` fails (rare — show inline error, don't lose the submitted data silently)
- Whether to show a count of emails captured so far on the confirmation screen

</decisions>

<specifics>
## Specific Ideas

- The email chrome button is a permanent fixture, so it should feel intentional — not an afterthought. Consistent with the home button style (`chrome-home` uses `&#8962;` icon).
- The consent checkbox label text is fixed: `"I agree to receive email updates from The ID Card Factory."` — exact wording matters for GDPR compliance.
- Mailchimp TAGS column enables the owner to import and immediately segment by event without manual tagging.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Email schema and storage
- `src/db.js` — `emails` object store definition (lines 41-43), `dbAdd`, `dbGetAll`, `dbCount` helpers

### Config API (event name/date for tagging)
- `src/config.js` — `Config.getEventName()`, `Config.getEventDate()` — used when saving emails and filtering for export

### Router wiring
- `src/router.js` — `ROUTES` table (line 10-14), `renderEmailStub` stub (lines 63-74) — Phase 5 replaces this stub

### Idle timer integration
- `src/idle.js` — `initEmailGracePeriod()` already wires 3-minute grace on `#/email` (lines 131-142), `pauseIdleTimer()` / `resumeIdleTimer()` API

### Admin panel patterns
- `src/admin.js` — `renderAdminPanel()` section structure, `btn-primary`, `btn-secondary`, `admin-section`, `admin-section-heading` patterns used by new CSV export section

### Global chrome (email button placement)
- `index.html` — `#chrome-home` (top-left fixed) and `#chrome-qr` (bottom-right fixed) — new email chrome button must not overlap these

### ES2017 / Safari constraints
- `CLAUDE.md` — function keyword, var declarations, no arrow functions, ES2017 upper bound, no CDN, no frameworks

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `dbAdd('emails', record)`: direct call for saving a new email record — already available in db.js
- `dbGetAll('emails')`: retrieves all email records for filtering during CSV export — available in db.js
- `Config.getEventName()` / `Config.getEventDate()`: returns current event name/date for tagging and export filtering — available in config.js
- `pauseIdleTimer()` / `resumeIdleTimer()`: for admin panel export section (already called by admin.js on entry/exit)
- `btn-primary` / `btn-secondary` CSS classes: existing button styles used throughout admin.js and catalogue.js
- `admin-section` / `admin-section-heading`: section container pattern — reuse for CSV export section

### Established Patterns
- Global chrome elements live in `index.html` as fixed-position elements outside `#app`; scripts wire event listeners in `app.js` or the relevant module
- Every module uses `function` keyword and `var` — no arrow functions, no `const`/`let`
- IndexedDB access exclusively via db.js helpers — never open transactions in other modules
- localStorage access exclusively via Config object — never call `localStorage.getItem` directly
- All DOM built programmatically — no innerHTML for user-controlled content (security)
- `defer` attribute on all scripts in index.html load order matters: db.js → config.js → catalogue.js → sync.js → admin.js → router.js → idle.js → app.js; `email.js` must be inserted before `router.js`

### Integration Points
- `router.js` ROUTES table: swap `renderEmailStub` → `renderEmail` (one-line change)
- `index.html`: add `<script src="/src/email.js" defer>` before router.js script tag; add chrome email button element
- `admin.js` `renderAdminPanel()`: append new "Email Export" section before the exit button
- `sw.js`: add `/src/email.js` to the CACHE_URLS array so it is cached offline

</code_context>

<deferred>
## Deferred Ideas

- Exporting all emails across all events (not just current event) — Phase 6 analytics work, or a future backlog item
- Email count display in admin panel — could be part of Phase 6 analytics summary (ANALYTICS-04)

</deferred>

---

*Phase: 05-email-capture-and-export*
*Context gathered: 2026-03-21*
