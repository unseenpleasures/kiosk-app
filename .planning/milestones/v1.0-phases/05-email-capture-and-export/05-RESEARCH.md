# Phase 5: Email Capture and Export - Research

**Researched:** 2026-03-21
**Domain:** Form UI, IndexedDB write, CSV export, global chrome extension, admin panel augmentation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Persistent chrome button added to the global chrome layer in `index.html` alongside `#chrome-home` and `#chrome-qr` — always visible on every screen with a single tap
- **D-02:** Tapping the chrome email button navigates to `#/email`
- **D-03:** The chrome button position must not overlap `#chrome-home` (top-left) or `#chrome-qr` (bottom-right); exact placement is Claude's discretion
- **D-04:** Full-width email address `<input type="email">` — large touch target for public kiosk use
- **D-05:** GDPR consent checkbox — unchecked by default, large tap target (checkbox + label together); label text: `"I agree to receive email updates from The ID Card Factory."`
- **D-06:** Submit button — full-width, `btn-primary` style, remains `disabled` until checkbox is ticked; re-enabled only when checkbox state changes to checked
- **D-07:** Basic client-side email format validation before submit (non-empty, contains `@`)
- **D-08:** Full-screen thank-you message after successful submission
- **D-09:** Visible countdown showing "Returning to catalogue in Ns…" that ticks down from 5 to 0 and then navigates to `#/`
- **D-10:** Early-dismiss "Back to browsing" `btn-secondary` button is present — user can leave before 5 seconds expires
- **D-11:** Confirmation replaces the form in the same `#screen-email` container (no new route)
- **D-12:** Use `dbAdd('emails', record)` — record shape: `{ email, eventName, eventDate, consentAt }` where `eventName = Config.getEventName()`, `eventDate = Config.getEventDate()`, `consentAt = new Date().toISOString()`
- **D-13:** `emails` store already created in db.js (autoIncrement PK) — no schema changes needed
- **D-14:** New "Email Export" section added to `renderAdminPanel()` in `admin.js`, following the existing section pattern (`admin-section` div, `admin-section-heading` h2)
- **D-15:** Export scope — current event only: filter `emails` store where `eventName === Config.getEventName()`
- **D-16:** Mailchimp import format — two columns: `Email Address,TAGS` where TAGS = event name (enables list segmentation)
- **D-17:** CSV filename: `emails-{sanitized-event-name}-{event-date}.csv` (spaces → hyphens, lowercase)
- **D-18:** Export uses `Blob` + `URL.createObjectURL` + a hidden `<a download>` click — no server, no library
- **D-19:** If no emails for the current event, export button shows an inline message "No emails captured for this event yet" and does not generate a file
- **D-20:** New file `src/email.js` containing `renderEmail()` — replaces `renderEmailStub()` in `router.js`; `router.js` ROUTES table updated: `'#/email': renderEmail`
- **D-21:** `email.js` added to `index.html` script load order before `router.js` (so `renderEmail` is defined when router wires up)

### Claude's Discretion

- Exact position/icon for the chrome email button (must not clash with home or QR positions)
- Visual design of the confirmation screen (colour, icon, layout — consistent with existing dark theme)
- Error state when `dbAdd` fails (rare — show inline error, don't lose the submitted data silently)
- Whether to show a count of emails captured so far on the confirmation screen

### Deferred Ideas (OUT OF SCOPE)

- Exporting all emails across all events (not just current event) — Phase 6 analytics work, or a future backlog item
- Email count display in admin panel — could be part of Phase 6 analytics summary (ANALYTICS-04)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EMAIL-01 | Attendee can access an email sign-up screen from anywhere in the app | Chrome button (D-01/D-02) added to `index.html` global chrome layer; always rendered above `#app`; wired in `app.js` |
| EMAIL-02 | Sign-up form contains email address field and a mandatory GDPR consent checkbox (unchecked by default); submission blocked until checkbox is ticked | `renderEmail()` builds form programmatically; checkbox `change` listener gates the `disabled` attribute on submit button |
| EMAIL-03 | Submitted email is stored in IndexedDB with event name, event date, and consent timestamp | `dbAdd('emails', record)` with `{ email, eventName, eventDate, consentAt }` — store already exists in db.js v2 schema |
| EMAIL-04 | Confirmation screen displays after successful submission and auto-dismisses to catalogue after 5 seconds | `showEmailConfirmation()` replaces form content in `#screen-email`; `setInterval` drives countdown; `window.location.hash = '#/'` on zero |
| EMAIL-05 | Admin can export the current event's email list as a tagged, Mailchimp-ready CSV | New "Email Export" section in `renderAdminPanel()`; `dbGetAll('emails')` filtered by `eventName`; `Blob` + `createObjectURL` + hidden anchor download |
</phase_requirements>

---

## Summary

Phase 5 is an additive feature phase: it introduces one new module (`src/email.js`), two HTML mutations (chrome button + script tag in `index.html`), one admin panel section (CSV export in `admin.js`), one service worker cache entry, and one router re-wire. No schema changes are required — `db.js` already defines the `emails` object store from Phase 2. All storage, config, idle timer, and routing infrastructure is already in place.

The phase splits cleanly into three independent units: (1) the email form and confirmation flow in `src/email.js`, (2) the chrome trigger button in `index.html` + `app.js` wiring, and (3) the CSV export section in `admin.js`. These can be planned as separate tasks with the chrome button task being the prerequisite for manual QA of the email flow.

The CSS work is additive — new class names for the email form, confirmation screen, and chrome email button are needed, none of which conflict with existing class names. The `main.css` patterns for chrome elements, form inputs, buttons, and admin sections are directly reusable.

**Primary recommendation:** Build in task order: (1) chrome button + CSS, (2) `email.js` form and confirmation, (3) admin CSV export section. Wire `sw.js` and `router.js` in the same task as their respective dependencies.

---

## Standard Stack

### Core (all browser-native — no npm packages)

| API | Purpose | Notes |
|-----|---------|-------|
| `<input type="email">` | Email field with iOS keyboard hint | `inputmode="email"` + `autocorrect="off"` + `autocapitalize="off"` required for good kiosk UX on iOS — the browser email keyboard shows `@` but autocorrect will mangle addresses without the off attributes |
| `<input type="checkbox">` | GDPR consent checkbox | Must be unchecked by default (`checked` attribute absent). `change` event is the correct listener (not `click`) for reliable cross-browser checkbox state |
| `dbAdd('emails', record)` | IndexedDB write via db.js | Already available. Returns a Promise resolving to the new autoIncrement PK |
| `dbGetAll('emails')` | IndexedDB read all for CSV export | Already available. Returns array of all records; filter in JS |
| `Blob` + `URL.createObjectURL` | CSV file generation and download | Supported in Safari 10.1+; confirmed available in Safari 16.x on iPadOS 16 |
| `setInterval` / `clearInterval` | Countdown timer on confirmation | Standard; must be cleared when user taps early-dismiss to prevent double-navigation |
| `Config.getEventName()` / `Config.getEventDate()` | Event tagging for stored records and export filter | Already in config.js |

### No-Library Policy (reconfirmed for this phase)

| Task | Approach |
|------|----------|
| Email validation | `value.trim().length > 0 && value.indexOf('@') !== -1` — no regex library |
| CSV generation | Build string manually: header row + data rows joined with `'\n'` |
| File download | `Blob` + `URL.createObjectURL` + `<a download>` click + `URL.revokeObjectURL` |
| Countdown | `setInterval` with a module-scoped counter variable |
| DOM construction | `document.createElement` + `textContent` — no `innerHTML` for user data |

**Installation:** None — all browser-native APIs.

---

## Architecture Patterns

### Module Structure

```
src/
├── email.js         # NEW — renderEmail(), showEmailConfirmation()
├── admin.js         # MODIFIED — renderAdminPanel() gets Email Export section
├── router.js        # MODIFIED — ROUTES['#/email'] swapped from stub to renderEmail
├── db.js            # UNCHANGED — emails store already exists
├── config.js        # UNCHANGED — getEventName/getEventDate already exist
├── idle.js          # UNCHANGED — initEmailGracePeriod() already wired
└── app.js           # MODIFIED — wire chrome email button click listener
index.html           # MODIFIED — add chrome email button + email.js script tag
sw.js                # MODIFIED — add /src/email.js to APP_SHELL_FILES
styles/main.css      # MODIFIED — add email screen, chrome email button styles
```

### Pattern 1: Global Chrome Button (email trigger)

**What:** A fixed-position button in `index.html`'s global chrome layer, positioned so it does not overlap `#chrome-home` (top-left, 48×48px at top:16px left:16px) or `#chrome-qr` (bottom-right, ~120px tall at bottom:24px right:24px).

**Recommended position:** Bottom-left. Mirrors the QR code on the opposite corner. Clear of both existing chrome elements.

```html
<!-- index.html — inside <body>, after #chrome-home -->
<button id="chrome-email" class="chrome-email" type="button" aria-label="Sign up for email updates">
  <span class="chrome-email-icon">&#9993;</span>
</button>
```

`&#9993;` is the envelope character (✉) — universally understood for email, consistent with the `&#8962;` home glyph used on `#chrome-home`.

**CSS:**
```css
.chrome-email {
  position: fixed;
  bottom: var(--space-md);
  left: var(--space-md);
  width: 48px;
  height: 48px;
  min-height: var(--touch-target-min);
  background: rgba(14, 27, 77, 0.85);
  border: 1px solid var(--color-accent);
  border-radius: 8px;
  color: var(--color-accent);
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
}
.chrome-email:active {
  opacity: 0.8;
}
```

**app.js wiring:**
```javascript
// In boot() or initChrome(), after chrome-home is wired
var emailBtn = document.getElementById('chrome-email');
if (emailBtn) {
  emailBtn.addEventListener('click', function() {
    window.location.hash = '#/email';
  });
}
```

### Pattern 2: renderEmail() in email.js

**What:** Builds `#screen-email` with a form (email input + GDPR checkbox + submit button). On successful `dbAdd`, calls `showEmailConfirmation()` which replaces the form content in-place.

**Key structure:**
```javascript
// src/email.js
// ES2017: function keyword, var declarations, no arrow functions, no const/let

function renderEmail() {
  var app = document.getElementById('app');
  app.innerHTML = '';

  var screen = document.createElement('div');
  screen.className = 'screen';
  screen.id = 'screen-email';

  renderEmailForm(screen);
  app.appendChild(screen);
}

function renderEmailForm(screen) {
  // Build form elements programmatically
  // Wire checkbox change -> toggleSubmit
  // Wire submit click -> validateAndSave
}

function validateAndSave(emailInput, consentCheckbox, screen) {
  var email = emailInput.value.trim();
  if (!email || email.indexOf('@') === -1) {
    // show inline validation error
    return;
  }
  var record = {
    email: email,
    eventName: Config.getEventName(),
    eventDate: Config.getEventDate(),
    consentAt: new Date().toISOString()
  };
  dbAdd('emails', record).then(function() {
    showEmailConfirmation(screen);
  }).catch(function(err) {
    // show inline error — do not silently discard submitted data
    showEmailError(screen, email, record);
  });
}

function showEmailConfirmation(screen) {
  // Clear form content from screen
  // Build confirmation view with countdown
  // setInterval countdown 5 -> 0 -> navigate to #/
  // Early-dismiss button clears interval and navigates immediately
}
```

**Critical implementation notes:**
- `screen.innerHTML = ''` is safe here (no user-controlled content — only static text and buttons)
- The countdown `setInterval` handle MUST be stored in a `var` and `clearInterval`'d in both the early-dismiss click handler and after navigating to `#/` to prevent stale interval fires
- `pauseIdleTimer()` / `resumeIdleTimer()` for this screen is already handled by `initEmailGracePeriod()` in `idle.js` — do NOT call these manually from `email.js`

### Pattern 3: CSV Export in admin.js

**What:** New `admin-section` appended to `renderAdminPanel()` before the Exit button. Reads all emails from IndexedDB, filters by current event name, generates CSV string, triggers download.

```javascript
function renderEmailExportSection(panel) {
  var section = document.createElement('div');
  section.className = 'admin-section';

  var heading = document.createElement('h2');
  heading.className = 'admin-section-heading';
  heading.textContent = 'Email Export';
  section.appendChild(heading);

  var exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'btn-primary btn-large';
  exportBtn.textContent = 'Export Emails (CSV)';
  section.appendChild(exportBtn);

  var statusMsg = document.createElement('p');
  statusMsg.className = 'sync-result-detail';
  statusMsg.style.display = 'none';
  section.appendChild(statusMsg);

  exportBtn.addEventListener('click', function() {
    var eventName = Config.getEventName();
    var eventDate = Config.getEventDate();

    dbGetAll('emails').then(function(allEmails) {
      var filtered = allEmails.filter(function(r) {
        return r.eventName === eventName;
      });

      if (filtered.length === 0) {
        statusMsg.textContent = 'No emails captured for this event yet.';
        statusMsg.style.display = 'block';
        return;
      }

      var csvRows = ['Email Address,TAGS'];
      filtered.forEach(function(r) {
        // Escape email and event name for CSV safety
        csvRows.push(escapeCsvField(r.email) + ',' + escapeCsvField(eventName));
      });
      var csvString = csvRows.join('\n');

      var blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = buildCsvFilename(eventName, eventDate);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      statusMsg.textContent = 'Exported ' + filtered.length + ' email(s).';
      statusMsg.style.display = 'block';
    });
  });

  panel.insertBefore(section, panel.lastChild); // before exit button
}

function escapeCsvField(value) {
  // Wrap in quotes if field contains comma, quote, or newline
  if (value.indexOf(',') !== -1 || value.indexOf('"') !== -1 || value.indexOf('\n') !== -1) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function buildCsvFilename(eventName, eventDate) {
  var safeName = eventName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  return 'emails-' + safeName + '-' + eventDate + '.csv';
}
```

### Pattern 4: script load order in index.html

Per D-21 and the existing load order comment in CONTEXT.md:

```html
<!-- Insert email.js BEFORE router.js -->
<script src="/src/db.js" defer></script>
<script src="/src/config.js" defer></script>
<script src="/src/catalogue.js" defer></script>
<script src="/src/sync.js" defer></script>
<script src="/src/admin.js" defer></script>
<script src="/src/email.js" defer></script>   <!-- NEW -->
<script src="/src/router.js" defer></script>
<script src="/src/idle.js" defer></script>
<script src="/src/app.js" defer></script>
```

`router.js` references `renderEmail` at parse time in the `ROUTES` object literal. With `defer`, all scripts are parsed in document order before any executes — but the ROUTES object is assigned when `router.js` executes, by which time `email.js` will have already executed (because it appears first). This is safe.

### Anti-Patterns to Avoid

- **Using innerHTML to build form content from user data:** All email addresses stored in IndexedDB must be rendered via `textContent`, never `innerHTML`. An email address is untrusted user input even though it lives on-device.
- **Calling pauseIdleTimer() from email.js:** `initEmailGracePeriod()` in `idle.js` already handles pausing/resuming for `#/email`. Double-pausing is safe (pause just sets `_active = false`), but calling `resumeIdleTimer()` from `email.js` on submit would prematurely resume before the user leaves the screen — rely solely on the hashchange mechanism.
- **Leaving setInterval running after navigation:** If the user taps the home chrome button during the confirmation countdown, the interval will fire against a stale reference to the now-replaced `screen` element. Store the interval ID in a module-scoped `var` and `clearInterval` it on the hashchange event (or in the early-dismiss handler before navigating).
- **Forgetting URL.revokeObjectURL after download:** Creates a memory leak. Always call `URL.revokeObjectURL(url)` immediately after the anchor click — the browser has already enqueued the download.
- **Missing catalogue.js from script load:** The existing script order includes `catalogue.js` before `sync.js`. Do not disturb this ordering when inserting `email.js`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email format validation | Regex-based email parser | `value.trim().length > 0 && value.indexOf('@') !== -1` | Sufficient for kiosk UX; full RFC 5322 validation is over-engineering for this case |
| CSV quoting | Custom CSV library | Manual `escapeCsvField()` (see Pattern 3) | Only two columns, one of which is owner-controlled event name; the full CSV spec complexity (multiline, BOM, encoding) is unnecessary |
| File download | Server endpoint | `Blob` + `URL.createObjectURL` + `<a download>` | No server available; this is the standard offline-first pattern for file generation in browsers |
| Countdown timer | Animation library | `setInterval` with a `var` counter | CSS transition on the number string is sufficient; no animation library needed |

**Key insight:** Every "hard" problem in this phase (CSV quoting, file download, countdown) has a 5-10 line browser-native solution. The complexity is in the integration details, not the algorithms.

---

## Runtime State Inventory

> Phase 5 is an additive feature phase, not a rename/refactor. No runtime state migration is required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `emails` object store exists in IndexedDB but contains no records yet (no email capture UI existed before this phase) | None — store is ready to receive writes |
| Live service config | None — no external services configured for email | None |
| OS-registered state | None | None |
| Secrets/env vars | None — email data is on-device only; no third-party service API keys needed | None |
| Build artifacts | `sw.js` CACHE_NAME is `kiosk-v3`; adding `email.js` requires a cache version bump to ensure the new file is fetched | Bump `CACHE_NAME` to `kiosk-v4` in `sw.js` when adding `/src/email.js` to `APP_SHELL_FILES` |

---

## Common Pitfalls

### Pitfall 1: Stale setInterval After Navigation

**What goes wrong:** User taps chrome-home during the 5-second confirmation countdown. The hashchange fires, `renderCatalogue()` replaces `#app` contents, but the `setInterval` still holds a closure reference to the old `screen` element. When the interval fires at 0, it calls `window.location.hash = '#/'` — which fires another hashchange, re-rendering the catalogue. Harmless in this case, but if the user had navigated to a card detail, the stale interval would boot them back to home.

**Why it happens:** `setInterval` closures capture variables, not the live DOM. Replacing the DOM does not stop the interval.

**How to avoid:** Store the interval ID in a module-scoped `var _emailCountdown = null`. Set it to null after `clearInterval`. Wire a one-time `hashchange` listener inside `showEmailConfirmation()` that calls `clearInterval(_emailCountdown)` when the hash changes away from `#/email`.

**Warning signs:** "User tapped home button during thank-you screen and got bounced back" in testing.

### Pitfall 2: iOS Safari Keyboard Covers Input Field

**What goes wrong:** On iPad with the software keyboard visible, the email input is below the keyboard fold. The user types a valid address but cannot see their input.

**Why it happens:** `position: fixed` chrome elements and `overflow: hidden` on `body` can prevent scroll-to-focused-element on older iOS.

**How to avoid:** Give `#screen-email` `overflow-y: auto` and use `scrollIntoView()` on the email input on focus. The form should be vertically centred with enough `padding-bottom` to account for the keyboard height (approximately 320px on a 12.9" iPad). Alternatively, place the email input near the top of the form rather than centred.

**Warning signs:** Input caret visible but user cannot see what they type; submit button not reachable.

### Pitfall 3: autocorrect Mangling Email Addresses

**What goes wrong:** iOS autocorrect capitalises the first character or suggests completions, producing `John@gmail.com` or `test@gmail .com` (with a trailing space).

**Why it happens:** `<input type="email">` suppresses some autocorrect on desktop Safari, but on iOS the software keyboard has its own autocorrect system.

**How to avoid:** Add the following attributes to the email input:
```html
autocorrect="off"
autocapitalize="off"
spellcheck="false"
```
These are non-standard but widely supported and are the standard practice for email inputs on iOS.

**Warning signs:** Stored emails with capital first letters, spaces, or autocomplete substitutions.

### Pitfall 4: CSV Download Does Nothing on iPadOS Safari

**What goes wrong:** The `<a download>` click silently does nothing in Safari — no file appears in Files.

**Why it happens:** Safari on iOS/iPadOS does not honour the `download` attribute for all MIME types. For `text/csv`, Safari opens a share sheet or preview instead of downloading directly. This is a known Safari limitation.

**How to avoid:** Use `text/csv;charset=utf-8;` as the MIME type — this is the correct type and does prompt the share sheet on iPadOS, which lets the admin AirDrop or save to Files. This is the expected user flow on iPad; there is no silent background download mechanism. The admin should expect a share sheet, not a Files app download. Document this in the UI: the button label could say "Export / Share Emails (CSV)" to set expectations.

**Warning signs:** Export button tapped, nothing visible happens — admin thinks it failed.

### Pitfall 5: insertBefore Fails If Exit Button Is Not the Last Child

**What goes wrong:** `panel.insertBefore(emailSection, panel.lastChild)` assumes the exit button is always `panel.lastChild`. If `renderAdminPanel()` ever appends something after the exit button (future phases), the email section would be misplaced.

**Why it happens:** DOM insertion by relative position is fragile.

**How to avoid:** Give the exit button a stable `id` (e.g., `id="admin-exit-btn"`) and use `panel.insertBefore(emailSection, exitBtn)` with a direct reference to the element, not `lastChild`.

### Pitfall 6: Event Name Contains CSV-Unsafe Characters

**What goes wrong:** Event name like `MCM London "May" 2026` produces malformed CSV: `John@test.com,MCM London "May" 2026`.

**Why it happens:** CSV fields containing `"` must be double-quoted and internal quotes must be doubled.

**How to avoid:** Always pass event name through `escapeCsvField()` (see Pattern 3 above). Verified correct: wraps in double-quotes and doubles internal quotes.

**Warning signs:** CSV opens in Excel/Sheets with data in wrong columns.

---

## Code Examples

Verified patterns from the existing codebase:

### Existing chrome button style (from main.css lines 284-305)
```css
/* chrome-home is the established pattern for chrome buttons */
.chrome-home {
  position: fixed;
  top: var(--space-md);
  left: var(--space-md);
  width: 48px;
  height: 48px;
  background: rgba(14, 27, 77, 0.85);
  border: 1px solid var(--color-accent);
  border-radius: 8px;
  color: var(--color-accent);
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
}
```

### Admin section pattern (from admin.js lines 139-194)
```javascript
// admin-section div + admin-section-heading h2 is the established pattern
var eventSection = document.createElement('div');
eventSection.className = 'admin-section';

var eventHeading = document.createElement('h2');
eventHeading.className = 'admin-section-heading';
eventHeading.textContent = 'Event Configuration';
eventSection.appendChild(eventHeading);
// ... inputs and buttons ...
panel.appendChild(eventSection);
```

### dbAdd pattern (from db.js lines 96-106)
```javascript
// dbAdd returns a Promise<IDBKey>
function dbAdd(storeName, value) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readwrite');
      var req = tx.objectStore(storeName).add(value);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
}
```

### Blob CSV download (browser-native, no library)
```javascript
// Standard pattern for CSV download in Safari — share sheet on iPadOS
var blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
var url = URL.createObjectURL(blob);
var a = document.createElement('a');
a.href = url;
a.download = 'filename.csv';
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
```

### Countdown pattern (matching existing idle.js setInterval approach)
```javascript
var _emailCountdown = null;
var _emailCountdownRemaining = 5;

function startConfirmationCountdown(screen) {
  _emailCountdownRemaining = 5;
  updateCountdownText(screen, _emailCountdownRemaining);
  _emailCountdown = setInterval(function() {
    _emailCountdownRemaining -= 1;
    updateCountdownText(screen, _emailCountdownRemaining);
    if (_emailCountdownRemaining <= 0) {
      clearInterval(_emailCountdown);
      _emailCountdown = null;
      window.location.hash = '#/';
    }
  }, 1000);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<input type="text">` for email | `<input type="email">` with `autocorrect="off" autocapitalize="off"` | iOS keyboard improvements (2014+) | Correct keyboard layout with `@` key, but manual autocorrect suppression still needed |
| Server-side CSV generation | `Blob` + `URL.createObjectURL` client-side | Safari 10.1+ (2016) | No server required; share sheet on iPadOS is the expected delivery mechanism |
| Manual IndexedDB open in each module | Centralised `db.js` wrapper (project pattern) | Phase 2 decision | All modules call `dbAdd`/`dbGetAll`; never open IDB transactions directly |

**Deprecated/outdated in this project context:**
- Direct `localStorage` for email records: localStorage has ~5-10MB limit — not suitable for an unbounded list of email records.
- `innerHTML` for building form content from any user data: project convention explicitly forbids this (CONTEXT.md established pattern).

---

## Open Questions

1. **Safari share sheet vs. silent file download**
   - What we know: Safari on iPadOS does not silently download files to the Files app via `<a download>`. It shows a share sheet.
   - What's unclear: The exact share sheet behaviour on iPadOS 16 with `text/csv` — whether it offers "Save to Files" as a prominent option.
   - Recommendation: Test on-device early. The button label should say "Export / Share Emails (CSV)" to set admin expectations. This is not a blocker — share sheet is the correct workflow.

2. **Email count on confirmation screen (Claude's discretion)**
   - What we know: `dbCount('emails')` returns total across all events; a filtered count requires `dbGetAll('emails').then(filter)`.
   - What's unclear: Whether showing a count adds meaningful value on the confirmation screen (vs. in the admin panel).
   - Recommendation: Show a simple "You're #N to sign up today!" message using a filtered count scoped to the current event. Adds social proof in a kiosk context. Implement as a secondary detail beneath the main thank-you message; fetch asynchronously and update the DOM when ready.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — vanilla JS PWA with no test runner configured |
| Config file | None — Wave 0 gap |
| Quick run command | Manual browser test via local server |
| Full suite command | Manual browser test via local server |

No automated test infrastructure exists in this project. The codebase is vanilla JS with no package.json, no test runner, and no test files. All validation is manual, performed against a running local server on the target device or Chrome DevTools for iPad simulation.

### Phase Requirements — Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| EMAIL-01 | Chrome email button visible on catalogue, card detail, admin screens | manual-only | n/a | Verify button renders and navigates to `#/email` from each screen |
| EMAIL-02 | Submit disabled until checkbox checked; unchecked by default | manual-only | n/a | Tap submit without checkbox — must be blocked; tick checkbox — must enable |
| EMAIL-03 | Submitted email appears in IndexedDB with correct fields | manual-only | n/a | Use Safari DevTools > Storage > IndexedDB to verify record after submission |
| EMAIL-04 | Confirmation shows countdown 5→0 and auto-navigates to `#/`; early dismiss works | manual-only | n/a | Wait full 5 seconds; also test early-dismiss; also test chrome-home during countdown |
| EMAIL-05 | CSV export produces correct Mailchimp format; no-emails state shows message | manual-only | n/a | Export with 0 records; export with test records; open CSV in spreadsheet to verify columns |

### Sampling Rate
- **Per task commit:** Load app in browser, navigate to `#/email`, submit test email, verify IndexedDB record
- **Per wave merge:** Full manual walkthrough of all 5 EMAIL requirements
- **Phase gate:** All 5 requirements passing manual verification before `/gsd:verify-work`

### Wave 0 Gaps
- No test infrastructure gaps to fill — project has no automated test runner. All verification is manual browser testing.
- For EMAIL-05 specifically: use Safari DevTools on-device to pre-populate the `emails` store with 3-4 test records before testing CSV export.

---

## Sources

### Primary (HIGH confidence)
- `C:\kiosk app\src\db.js` — emails store schema confirmed (lines 41-43), dbAdd/dbGetAll helpers confirmed
- `C:\kiosk app\src\router.js` — renderEmailStub confirmed (lines 63-74), ROUTES table structure confirmed (lines 10-14)
- `C:\kiosk app\src\admin.js` — renderAdminPanel() section pattern confirmed, button classes confirmed
- `C:\kiosk app\src\idle.js` — initEmailGracePeriod() confirmed (lines 131-142), pauseIdleTimer/resumeIdleTimer API confirmed
- `C:\kiosk app\src\config.js` — Config.getEventName(), Config.getEventDate() confirmed
- `C:\kiosk app\index.html` — chrome-home (top-left), chrome-qr (bottom-right) positions confirmed; script load order confirmed
- `C:\kiosk app\sw.js` — APP_SHELL_FILES array confirmed (lines 7-28), CACHE_NAME `kiosk-v3` confirmed
- `C:\kiosk app\styles\main.css` — btn-primary, btn-secondary, admin-section, admin-section-heading, chrome-home patterns confirmed
- `C:\kiosk app\.planning\phases\05-email-capture-and-export\05-CONTEXT.md` — all 21 decisions confirmed

### Secondary (MEDIUM confidence)
- MDN: `Blob` + `URL.createObjectURL` — standard browser API, confirmed available Safari 10.1+; share sheet behaviour on iPadOS is expected and documented
- MDN: `autocorrect`, `autocapitalize` attributes — non-standard but universally supported on iOS Safari for suppressing autocorrect on email inputs
- CLAUDE.md — ES2017 upper bound, function keyword, var declarations, no arrow functions, no frameworks, no CDN — all confirmed as project constraints

### Tertiary (LOW confidence)
- Safari `<a download>` share sheet behaviour on iPadOS 16 with `text/csv` — confirmed by community reports and MDN notes; not tested on target device yet. Flag for early on-device validation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs confirmed from existing codebase and MDN
- Architecture: HIGH — all integration points confirmed from reading source files directly
- Pitfalls: HIGH for setInterval/DOM pitfalls (confirmed from code patterns); MEDIUM for Safari download behaviour (not yet device-tested)

**Research date:** 2026-03-21
**Valid until:** 2026-04-20 (stable APIs, no fast-moving dependencies)
