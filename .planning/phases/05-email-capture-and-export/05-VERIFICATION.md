---
phase: 05-email-capture-and-export
verified: 2026-03-21T00:00:00Z
status: human_needed
score: 11/11 must-haves verified
human_verification:
  - test: "Chrome email button visible and navigates to #/email"
    expected: "Envelope icon visible at bottom-left on catalogue screen; tap navigates to #/email and button dims to 50% opacity while on that screen"
    why_human: "Fixed-position visual element and navigation — cannot verify tap behavior or visual rendering programmatically"
  - test: "Email form GDPR checkbox is unchecked by default and blocks submit"
    expected: "Checkbox renders unchecked; submit button disabled until checkbox is ticked; no way to submit with unchecked checkbox"
    why_human: "Browser default state of a checkbox and disabled attribute interaction requires visual inspection"
  - test: "5-second countdown auto-navigates and early-dismiss works"
    expected: "Confirmation screen counts down 5-4-3-2-1 then navigates to #/; 'Back to browsing' navigates immediately; navigating away mid-countdown does not cause ghost navigation"
    why_human: "Timer behaviour and navigation side-effects require runtime observation"
  - test: "CSV download and share sheet on iPadOS Safari"
    expected: "Tapping Export triggers iOS share sheet with a .csv file; file contents match Mailchimp format; zero-emails state shows inline message without generating a file"
    why_human: "Blob + URL.createObjectURL download path only verifiable in a real Safari/iPadOS environment; share sheet is OS-level"
---

# Phase 5: Email Capture and Export Verification Report

**Phase Goal:** Email capture and export — customers can sign up for email updates with GDPR consent, and the business owner can export the email list as a Mailchimp-ready CSV from the admin panel.
**Verified:** 2026-03-21
**Status:** human_needed — all automated checks passed; 4 items require runtime verification
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Chrome email button is visible on every screen and navigates to #/email on tap | VERIFIED | `index.html` line 35: `id="chrome-email"` button with `aria-label="Sign up for email updates"` and `&#9993;` glyph; `app.js` lines 184-191: `initEmailButton()` wires click to `window.location.hash = '#/email'`; called in `boot()` line 246 |
| 2 | Email form renders with email input, GDPR checkbox (unchecked by default), and disabled submit button | VERIFIED | `email.js` lines 76-96: checkbox created without `.checked`, `submitBtn.disabled = true` — correct per plan spec |
| 3 | Submit button is enabled only when the GDPR checkbox is ticked | VERIFIED | `email.js` lines 99-101: `checkbox.addEventListener('change', function() { submitBtn.disabled = !checkbox.checked; })` |
| 4 | Submitting a valid email stores a record in IndexedDB with email, eventName, eventDate, consentAt | VERIFIED | `email.js` lines 145-153: record built with all four fields; `dbAdd('emails', record)` called; `Config.getEventName()` and `Config.getEventDate()` used for event fields; `new Date().toISOString()` for consentAt |
| 5 | After submission, a confirmation screen with 5-second countdown replaces the form and auto-returns to #/ | VERIFIED | `email.js` lines 178-262: `card.innerHTML = ''`, countdown via `setInterval` at 1000ms, `window.location.hash = '#/'` when `remaining <= 0` |
| 6 | Early-dismiss button on confirmation clears the countdown and navigates to #/ immediately | VERIFIED | `email.js` lines 257-261: `dismissBtn` click clears `_emailCountdown` and sets hash |
| 7 | Admin panel has an Email Export section with a single export button | VERIFIED | `admin.js` lines 311-312: `renderEmailExportSection(panel)` called in `renderAdminPanel()`; section heading "Email Export" at line 365 |
| 8 | Tapping export when emails exist triggers a CSV download/share sheet | VERIFIED | `admin.js` lines 400-408: `Blob`, `URL.createObjectURL`, hidden `<a>` click, `URL.revokeObjectURL` — correct Safari-compatible download pattern |
| 9 | CSV has header row 'Email Address,TAGS' and data rows contain email + event name | VERIFIED | `admin.js` line 394: `var csvRows = ['Email Address,TAGS']`; line 396: each row is `escapeCsvField(r.email) + ',' + escapeCsvField(eventName)` |
| 10 | CSV filename follows pattern emails-{sanitized-event-name}-{event-date}.csv | VERIFIED | `admin.js` lines 348-351: `buildCsvFilename()` produces `'emails-' + safeName + '-' + eventDate + '.csv'`; safeName is lowercased, whitespace hyphenated, non-alphanumeric stripped |
| 11 | When no emails exist, an inline message says 'No emails captured for this event yet.' and no file is generated | VERIFIED | `admin.js` lines 388-392: `if (filtered.length === 0)` sets statusMsg and returns before any Blob creation |

**Score: 11/11 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/email.js` | renderEmail, showEmailConfirmation, validateAndSave — min 80 lines | VERIFIED | 262 lines; all three functions present and substantive |
| `index.html` | chrome-email button element + email.js script tag | VERIFIED | Line 35: `id="chrome-email"`; line 45: `src="/src/email.js" defer` before router.js (line 46) |
| `styles/main.css` | Email screen and chrome button CSS classes including `.chrome-email` | VERIFIED | All required classes present: `.screen-email` (886), `.email-form-card` (893), `.email-consent-group` (951), `.email-confirmation-heading` (974), `.chrome-email` (1024), `.chrome-email.active-screen` (1057) |
| `src/admin.js` | renderEmailExportSection, escapeCsvField, buildCsvFilename — contains "Email Export" | VERIFIED | 474 lines; all three functions present at lines 336, 348, 359 respectively |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `index.html` | `src/email.js` | script tag with defer | WIRED | Line 45: `<script src="/src/email.js" defer></script>` — appears before router.js at line 46 |
| `src/router.js` | `src/email.js` | ROUTES table references renderEmail | WIRED | Line 12: `'#/email': renderEmail` — stub deleted, no `renderEmailStub` in file |
| `src/email.js` | `src/db.js` | dbAdd('emails', record) | WIRED | Line 152: `dbAdd('emails', record).then(...)` |
| `src/app.js` | `index.html chrome-email` | initEmailButton() wired in boot | WIRED | Lines 184-191: `initEmailButton()` reads `getElementById('chrome-email')` and wires click; called at boot() line 246 |
| `src/app.js` | `updateChromeEmailState` | hashchange listener wired in boot | WIRED | Lines 199-208: function defined; lines 255-256: `window.addEventListener('hashchange', updateChromeEmailState)` + immediate call |
| `src/admin.js` | `src/db.js` | dbGetAll('emails') for reading stored records | WIRED | Line 383: `dbGetAll('emails').then(function(allEmails) { ... })` |
| `src/admin.js` | `src/config.js` | Config.getEventName() for filtering and tagging | WIRED | Line 380: `var eventName = Config.getEventName()` inside export handler |
| `sw.js` | `src/email.js` | APP_SHELL_FILES includes /src/email.js | WIRED | Line 18: `'/src/email.js'` in APP_SHELL_FILES; CACHE_NAME is 'kiosk-v7' (ahead of planned v4 — correct, cache was bumped further in later work) |
| `renderAdminPanel` | `renderEmailExportSection` | Called before exitBtn appended | WIRED | Line 312: `renderEmailExportSection(panel)` called before exitBtn declaration (line 315) — export section is DOM-ordered before exit button via sequential append |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| EMAIL-01 | 05-01-PLAN.md | Attendee can access email sign-up screen from anywhere in the app | SATISFIED | chrome-email button in global chrome (index.html); initEmailButton() wires click in boot(); active on all screens |
| EMAIL-02 | 05-01-PLAN.md | Sign-up form with email field, mandatory GDPR checkbox (unchecked by default), submit blocked until checkbox ticked | SATISFIED | email.js: checkbox created without `.checked`, `submitBtn.disabled = true`, change listener wires checkbox to button state |
| EMAIL-03 | 05-01-PLAN.md | Submitted email stored in IndexedDB with event name, event date, consent timestamp | SATISFIED | email.js lines 145-153: record with all four fields stored via `dbAdd('emails', record)` |
| EMAIL-04 | 05-01-PLAN.md | Confirmation screen after successful submission, auto-dismisses to catalogue after 5 seconds | SATISFIED | email.js lines 178-262: showEmailConfirmation() with setInterval countdown and early-dismiss button |
| EMAIL-05 | 05-02-PLAN.md | Admin can export current event's email list as tagged, Mailchimp-ready CSV | SATISFIED | admin.js: renderEmailExportSection() with 'Email Address,TAGS' header, per-event filtering, Blob download, zero-emails state |

**No orphaned requirements.** REQUIREMENTS.md maps EMAIL-01 through EMAIL-05 to Phase 5; all five are claimed and satisfied by plans 05-01 and 05-02.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/admin.js` | 379-412 | `dbGetAll('emails').then(...)` has no `.catch()` handler | Info | If IndexedDB fails, the export button silently does nothing — no user feedback. Not a blocker: export is an admin function used with a stable local DB; failure is extremely unlikely in normal operation |

No placeholder stubs, no hardcoded empty data, no `return null` / `return {}` implementations. All functions are substantive and wired.

---

### Syntax Convention Check

`src/email.js`: No `const`, `let`, or arrow functions (`=>`) detected — uses `function` keyword and `var` throughout. Compliant with ES2017 project constraint.

`src/admin.js` (new functions): Same — `function escapeCsvField`, `function buildCsvFilename`, `function renderEmailExportSection` all use `var` and `function` keyword.

---

### Commit Verification

All three implementation commits confirmed present in git history:

- `5bb27d7` — feat(05-01): create email.js module
- `c10595a` — feat(05-01): wire chrome button, script tag, SW cache, router swap, active-screen state
- `f0896d1` — feat(05-02): add Email Export section to admin panel with CSV download

---

### Notable Deviation from Plan (Non-blocking)

**Plan 02 key link spec said:** `insertBefore(section, exitBtn)` passing `exitBtn` as anchor reference.

**Actual implementation:** `renderEmailExportSection(panel)` is called at line 312 before `exitBtn` is declared (line 315). The function does `panel.appendChild(section)`. The exit button is then appended after. The DOM order is identical to what `insertBefore` would produce. The plan's stated motivation (Pitfall 5 — avoid `panel.lastChild`) is also satisfied because the section is appended by direct sequential logic before the exit button exists. This is equivalent and correct.

---

### Human Verification Required

The following items cannot be confirmed programmatically and require manual testing in a browser:

#### 1. Chrome Email Button — Visual Presence and Navigation

**Test:** Open the app at `http://localhost:8000` with catalogue data loaded. Observe the bottom-left area of every screen (catalogue, category, card detail).
**Expected:** Envelope icon button with "Sign up here" label visible at bottom-left. Tap navigates to `#/email`. Button dims to ~50% opacity when already on the email screen.
**Why human:** Fixed-position element rendering and touch-navigation cannot be verified by grep.

#### 2. GDPR Form — Default State and Submit Gating

**Test:** Navigate to `#/email`. Observe the form without touching anything. Attempt to activate the submit button. Then tick the checkbox.
**Expected:** Checkbox is unchecked by default. Submit button is greyed/inert. After ticking checkbox, submit becomes active. Unticking re-disables it.
**Why human:** Browser-rendered disabled state and checkbox default require visual inspection.

#### 3. Confirmation Countdown and Stale Interval Protection

**Test:** Submit a valid email. Watch the countdown. Also test: (a) let it expire naturally; (b) tap "Back to browsing" mid-count; (c) tap the chrome-home button mid-count then return to `#/email`.
**Expected:** Countdown shows "Returning to catalogue in 5..." down to 0 then navigates to `#/`. Early dismiss navigates immediately. Chrome-home mid-count does NOT cause a ghost auto-navigation to `#/` a few seconds later.
**Why human:** Timer behaviour and the stale-interval cleanup hinge on runtime event ordering.

#### 4. CSV Download / Share Sheet on iPadOS Safari

**Test:** From the admin panel, tap "Export / Share Emails (CSV)" when emails have been captured for the current event. Also test with zero emails for the current event name.
**Expected (with emails):** iOS share sheet appears with a `.csv` attachment. File opens with header `Email Address,TAGS` and one row per captured email with event name in the TAGS column.
**Expected (no emails):** Inline message "No emails captured for this event yet." appears; no file is generated.
**Why human:** `URL.createObjectURL` + hidden anchor click behaviour on Safari/iPadOS and the share sheet are OS-level; only verifiable on real hardware or Simulator.

---

## Summary

Phase 5 is **structurally complete**. All 11 observable truths are verified against actual codebase code, not SUMMARY claims:

- `src/email.js` (262 lines) — fully implemented with `renderEmail`, `validateAndSave`, `showEmailConfirmation`, stale-interval cleanup, and GDPR consent wiring
- `src/admin.js` — `renderEmailExportSection`, `escapeCsvField`, `buildCsvFilename` added and wired into `renderAdminPanel`
- `index.html` — chrome-email button present with correct attributes; email.js loaded before router.js
- `sw.js` — `/src/email.js` in `APP_SHELL_FILES`; CACHE_NAME at `kiosk-v7`
- `src/router.js` — ROUTES table maps `#/email` to `renderEmail`; stub deleted
- `src/app.js` — `initEmailButton()` and `updateChromeEmailState()` defined and called in `boot()`
- All EMAIL-01 through EMAIL-05 requirements satisfied
- No placeholder stubs, no anti-patterns blocking goal achievement

The only unresolved items are runtime behaviours that require human browser verification: visual rendering, timer interaction, and iPadOS share sheet behaviour.

---

_Verified: 2026-03-21_
_Verifier: Claude (gsd-verifier)_
