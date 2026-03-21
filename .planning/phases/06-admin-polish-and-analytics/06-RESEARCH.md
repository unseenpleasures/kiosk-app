# Phase 6: Admin Polish and Analytics - Research

**Researched:** 2026-03-21
**Domain:** IndexedDB query patterns, admin UI augmentation, idle timer live update, SHA-256 passcode change flow
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMIN-05 | Admin can adjust the idle inactivity timeout duration (default 60 seconds) | `Config.getIdleTimeout()` / `Config.setIdleTimeout()` already exist in `config.js`; `resetIdleTimer()` re-reads `Config.getIdleTimeout()` on every call — setting the value and then calling `resetIdleTimer()` makes the new value take effect immediately with no reload |
| ADMIN-06 | Admin can change the admin passcode (requires entry of current passcode) | `verifyPasscode()` and `hashPasscode()` already exist in `config.js`; change flow: verify current → hash new → `Config.setPasscodeHash(newHash)`. No new crypto primitives needed. |
| ANALYTICS-04 | Admin event summary shows top 10 most-viewed cards, most-searched terms, list of zero-result searches, total emails captured — scoped to current event | `dbGetAll('analytics')` returns all events; filter by `eventName === Config.getEventName()`; aggregate in-memory with `Array.reduce`. `dbGetAll('emails')` filtered same way gives email count. All data already stored in correct schema. |
| ANALYTICS-05 | All analytics data persists across events in IndexedDB for longitudinal trend analysis | Analytics records already include `eventName` field (set at write time in `catalogue.js`). No schema change required. The risk is accidental `dbClear('analytics')` — which does not happen in any existing code path. Verify and document that no clear is called. |

</phase_requirements>

---

## Summary

Phase 6 completes the last four v1 requirements. All four are extensions to existing code rather than new architectural components. The analytics store, the config layer, and the admin panel are all fully built — this phase adds queries, UI sections, and two admin control flows on top of them.

The analytics summary (ANALYTICS-04) is the most complex requirement. It requires reading the entire `analytics` store and grouping by event name and event type in-memory. The store already contains all needed fields (`type`, `cardId`, `cardName`, `query`, `resultCount`, `zeroResult`, `eventName`, `timestamp`) set in Phases 3 and 4. No schema migration is needed. The aggregation logic is straightforward `Array.reduce` — count card views by `cardId`, count searches by `query`, filter `zeroResult === true` — all within the current event scope.

ANALYTICS-05 (longitudinal persistence) is already satisfied by the existing schema — records accumulate across events because no code path clears the analytics store. The only implementation work is verifying this is true, documenting it, and ensuring the new event configuration save action in `admin.js` does not accidentally clear analytics.

The idle timeout control (ADMIN-05) is also nearly free: `Config.setIdleTimeout()` already exists, and `resetIdleTimer()` reads `Config.getIdleTimeout()` on every call, so the new value takes effect the next time the timer resets — which happens immediately after the admin saves the setting and calls `resetIdleTimer()`.

The passcode change flow (ADMIN-06) requires a two-step UI: enter current passcode to verify, then enter new passcode twice (or once) to set. All crypto is already in `config.js` (`verifyPasscode`, `hashPasscode`, `Config.setPasscodeHash`).

**Primary recommendation:** All four requirements are additions to `admin.js`. No new files, no schema changes, no new libraries. Two new section-render functions plus in-memory analytics aggregation.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS ES2017 | Browser-native | All logic | Project constraint — no frameworks, no build tools |
| IndexedDB v2 API | Browser-native | Analytics + email reads | Already in use via `db.js`; `dbGetAll` is the only access pattern needed |
| Web Crypto API (`crypto.subtle`) | Browser-native | SHA-256 passcode hashing | Already in use in `config.js`; no new usage required |
| localStorage (via `config.js`) | Browser-native | Idle timeout setting, passcode hash | Already in use; `Config.setIdleTimeout` and `Config.setPasscodeHash` are already implemented |

### Supporting
None — no new libraries. All tools already present.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-memory Array.reduce aggregation | IDBIndex range queries | Index queries more efficient for very large datasets; at event scale (a few thousand analytics records), in-memory is simpler and fast enough — avoid premature optimisation |
| Single-field passcode input (enter twice to confirm) | Two inputs (new + confirm) | Two-input confirm is safer for production; single input is acceptable for a single-owner device. Recommend two-input for confidence. |

**Installation:** No new packages. All capabilities are browser-native.

---

## Architecture Patterns

### How Analytics Data is Currently Written

Every write in `catalogue.js` uses `dbAdd('analytics', record)` with this shape:

```javascript
// card_view record (ANALYTICS-01)
{
  type: 'card_view',
  cardId: product.id,
  cardName: product.title,
  timestamp: new Date().toISOString(),
  eventName: Config.getEventName()
}

// search record (ANALYTICS-03)
{
  type: 'search',
  query: query,
  resultCount: _filtered.length,
  zeroResult: _filtered.length === 0,
  timestamp: new Date().toISOString(),
  eventName: Config.getEventName()
}

// category_filter record (ANALYTICS-02)
{
  type: 'category_filter',
  category: _activeCategory,
  timestamp: new Date().toISOString(),
  eventName: Config.getEventName()
}
```

All records already carry `eventName`. Filtering by current event is a simple `Array.filter`.

### Pattern 1: Analytics Aggregation (ANALYTICS-04)

**What:** Load all analytics records, filter to current event, aggregate by type in-memory.
**When to use:** On admin panel render, each time the analytics section is shown.

```javascript
// Source: in-memory aggregation — ES2017 Array methods
function aggregateAnalytics(records, currentEventName) {
  var eventRecords = records.filter(function(r) {
    return r.eventName === currentEventName;
  });

  // Top 10 card views — count by cardId, sort descending, take first 10
  var cardViews = {};
  var cardNames = {};
  eventRecords.forEach(function(r) {
    if (r.type === 'card_view') {
      cardViews[r.cardId] = (cardViews[r.cardId] || 0) + 1;
      cardNames[r.cardId] = r.cardName;
    }
  });
  var topCards = Object.keys(cardViews)
    .map(function(id) { return { id: id, name: cardNames[id], count: cardViews[id] }; })
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, 10);

  // Most-searched terms — count by query, sort descending
  var searchCounts = {};
  eventRecords.forEach(function(r) {
    if (r.type === 'search') {
      searchCounts[r.query] = (searchCounts[r.query] || 0) + 1;
    }
  });
  var topSearches = Object.keys(searchCounts)
    .map(function(q) { return { query: q, count: searchCounts[q] }; })
    .sort(function(a, b) { return b.count - a.count; });

  // Zero-result searches — unique queries that returned zero results
  var zeroResultSet = {};
  eventRecords.forEach(function(r) {
    if (r.type === 'search' && r.zeroResult) {
      zeroResultSet[r.query] = true;
    }
  });
  var zeroResults = Object.keys(zeroResultSet);

  return { topCards: topCards, topSearches: topSearches, zeroResults: zeroResults };
}
```

### Pattern 2: Idle Timeout Live Update (ADMIN-05)

**What:** Save new timeout value and immediately apply it to the running timer.
**Key insight:** `resetIdleTimer()` calls `Config.getIdleTimeout()` internally on every invocation. Saving the new value then calling `resetIdleTimer()` is sufficient — no module-level cache to invalidate.

```javascript
// In the admin panel save handler for idle timeout
Config.setIdleTimeout(newSeconds);
resumeIdleTimer();   // re-activates _active and calls resetIdleTimer()
```

Note: The admin panel calls `pauseIdleTimer()` on entry (`renderAdmin()` line 11). The exit button calls `resumeIdleTimer()`. To apply a new timeout value while still in the admin panel (so the user sees the effect without exiting), call `Config.setIdleTimeout(newSeconds)` — no further action needed until the admin exits and `resumeIdleTimer()` fires naturally. The save confirmation feedback is sufficient; no need to force a timer reset mid-panel.

### Pattern 3: Passcode Change Flow (ADMIN-06)

**What:** Two-step UI — verify current passcode, then set new passcode.
**When to use:** Dedicated "Change Passcode" section in the admin panel.

```javascript
// Step 1: verify current passcode
verifyPasscode(currentInput).then(function(valid) {
  if (!valid) {
    // show error "Incorrect current passcode"
    return;
  }
  // Step 2: hash new passcode and store
  hashPasscode(newInput).then(function(hash) {
    Config.setPasscodeHash(hash);
    // show success "Passcode updated"
  });
});
```

**Two-input confirm recommendation:** Include a "Confirm new passcode" field and check `newInput === confirmInput` before hashing. This prevents the owner from locking themselves out by mistyping on a touchscreen keyboard. This check happens in plain JS before any async call.

### Pattern 4: Existing Section Pattern in admin.js

All admin sections follow this DOM structure:

```javascript
var section = document.createElement('div');
section.className = 'admin-section';

var heading = document.createElement('h2');
heading.className = 'admin-section-heading';
heading.textContent = 'Section Title';
section.appendChild(heading);

// ... section content ...

panel.appendChild(section);
```

New Phase 6 sections MUST follow this exact pattern to maintain visual consistency.

### Admin Panel Section Order (after Phase 6)

1. Event Configuration (existing — ADMIN-02)
2. Catalogue Sync (existing — ADMIN-03)
3. Sync Status (existing — ADMIN-04)
4. Email Export (existing — EMAIL-05)
5. **Analytics Summary** (new — ANALYTICS-04)
6. **Idle Timeout** (new — ADMIN-05)
7. **Change Passcode** (new — ADMIN-06)
8. Exit Button (existing)

Analytics Summary is highest business value — place it before operational controls.

### Anti-Patterns to Avoid

- **Clearing analytics on event change:** The admin panel's "Save" for event config MUST NOT clear the analytics or emails stores. Verify the existing save handler (`saveBtn` in `renderAdminPanel`) does not call `dbClear` — it does not (confirmed in `admin.js` lines 187–192: only calls `Config.setEventName` and `Config.setEventDate`). No action needed.
- **Filtering analytics by event date instead of event name:** Queries filtered by timestamp range would break if the owner forgets to set the event name. Always filter by `eventName` field as the canonical event discriminator.
- **Storing idle timeout outside config.js:** Must use `Config.setIdleTimeout()` — architecture constraint from STATE.md that `config.js` is the exclusive localStorage accessor.
- **Opening IndexedDB transactions in admin.js directly:** Must use `dbGetAll()` from `db.js` — architecture constraint that `db.js` is the exclusive IDB gateway.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SHA-256 hashing | Custom hash | `crypto.subtle.digest` via `hashPasscode()` in `config.js` | Already implemented and tested; re-use the existing function |
| Analytics persistence | Custom event store | Existing `analytics` IndexedDB store | Already populated with correct schema by Phase 4 |
| In-memory sorting | Custom sort | `Array.sort()` with comparison function | Browser-native; sufficient for hundreds to low thousands of records |
| Config persistence | Direct localStorage write | `Config.setIdleTimeout()`, `Config.setPasscodeHash()` | Architecture constraint — config.js is the exclusive localStorage accessor |

**Key insight:** Phase 6 is entirely additive UI over existing infrastructure. The data is already there; the crypto is already there; the config layer is already there. The only new code is aggregation logic and DOM-building in `admin.js`.

---

## Common Pitfalls

### Pitfall 1: Event Name Scope Mismatch

**What goes wrong:** Analytics records for the current event show zero results even though data was captured.
**Why it happens:** `Config.getEventName()` is called at render time, but the analytics records were written when a slightly different event name was stored (e.g., trailing space, capitalisation difference, or the event name was changed mid-event).
**How to avoid:** Display the current event name in the analytics summary header so the admin can see what scope is being filtered on. Document that the event name must be set before the event starts and not changed during it.
**Warning signs:** Analytics section renders "No data" but the admin knows interactions occurred.

### Pitfall 2: Passcode Lockout

**What goes wrong:** Admin mistypes new passcode on touchscreen; cannot re-enter admin panel.
**Why it happens:** Single-field passcode entry with no confirmation; fat-finger on soft keyboard.
**How to avoid:** Add a "Confirm new passcode" field. Check `newPasscode === confirmPasscode` in JS before calling `hashPasscode()`. If they don't match, show an error and do not update the stored hash.
**Warning signs:** First time the owner changes their passcode they cannot log in afterward.

### Pitfall 3: Idle Timer Not Taking Effect Immediately

**What goes wrong:** Admin saves a new idle timeout value but the kiosk still times out at the old interval after they exit.
**Why it happens:** If there's an in-memory variable caching the timeout value (there isn't in the current `idle.js` — it calls `Config.getIdleTimeout()` on every `resetIdleTimer()` call), the cached value would persist.
**How to avoid:** Confirm (already verified) that `resetIdleTimer()` reads from `Config.getIdleTimeout()` dynamically every time. The current `idle.js` has no cached timeout variable — `Config.getIdleTimeout() * 1000` is called inline on line 32. This means saving the config value is sufficient; no additional wiring needed.
**Warning signs:** Timeout behaves identically after change.

### Pitfall 4: Analytics Summary Performance on A9X

**What goes wrong:** `dbGetAll('analytics')` returns thousands of records; `Array.reduce` aggregation blocks the UI thread on A9X hardware.
**Why it happens:** At a busy event with 1000+ visitors making 5–10 interactions each, the analytics store could hold 5,000–10,000 records. All processed synchronously in the main thread.
**How to avoid:** At event scale (even a very busy one-day event), 10,000 records processed with simple object counting is well within A9X JS budget. IndexedDB read of 10,000 small records is the bottleneck, not the aggregation. Show a loading indicator while the async `dbGetAll` resolves. Do not attempt to stream records with a cursor — `getAll()` is simpler and sufficient.
**Warning signs:** Admin panel analytics section visibly stalls before rendering.

### Pitfall 5: ANALYTICS-05 Is Already Satisfied

**What goes wrong:** Developer implements a data migration or schema change, thinking the analytics store doesn't persist across events.
**Why it happens:** The requirement sounds like it needs new code.
**How to avoid:** Confirm (already verified) that the analytics store accumulates records indefinitely — no `dbClear('analytics')` call exists anywhere in the codebase. ANALYTICS-05 implementation is: (1) confirm no clear exists, (2) document the `eventName` field as the discriminator, (3) verify the analytics summary correctly scopes to current event without corrupting the longitudinal dataset.

---

## Code Examples

### Loading and Aggregating Analytics in Admin Panel

```javascript
// Source: db.js dbGetAll pattern + in-memory aggregation
function renderAnalyticsSummarySection(panel) {
  var section = document.createElement('div');
  section.className = 'admin-section';

  var heading = document.createElement('h2');
  heading.className = 'admin-section-heading';
  heading.textContent = 'Event Analytics';
  section.appendChild(heading);

  var loading = document.createElement('p');
  loading.className = 'sync-result-detail';
  loading.textContent = 'Loading...';
  section.appendChild(loading);

  panel.appendChild(section);

  var eventName = Config.getEventName();

  Promise.all([
    dbGetAll('analytics'),
    dbGetAll('emails')
  ]).then(function(results) {
    var analytics = results[0];
    var emails = results[1];

    loading.style.display = 'none';

    // Email count for current event
    var emailCount = emails.filter(function(r) {
      return r.eventName === eventName;
    }).length;

    // Aggregate analytics
    var agg = aggregateAnalytics(analytics, eventName);

    // ... build DOM from agg.topCards, agg.topSearches, agg.zeroResults, emailCount
  });
}
```

### Idle Timeout Save Handler

```javascript
// Source: config.js Config.setIdleTimeout + idle.js resetIdleTimer
saveTimeoutBtn.addEventListener('click', function() {
  var val = parseInt(timeoutInput.value, 10);
  if (!val || val < 10 || val > 600) {
    // Show validation error — sensible bounds: 10 seconds minimum, 10 minutes maximum
    return;
  }
  Config.setIdleTimeout(val);
  saveTimeoutConfirm.style.display = 'block';
  setTimeout(function() { saveTimeoutConfirm.style.display = 'none'; }, 2000);
});
```

### Passcode Change Handler

```javascript
// Source: config.js verifyPasscode + hashPasscode + Config.setPasscodeHash
changePasscodeBtn.addEventListener('click', function() {
  var current = currentPasscodeInput.value.trim();
  var next = newPasscodeInput.value.trim();
  var confirm = confirmPasscodeInput.value.trim();

  if (!current || !next || !confirm) { return; }

  if (next !== confirm) {
    passcodeError.textContent = 'New passcodes do not match';
    passcodeError.style.display = 'block';
    return;
  }

  verifyPasscode(current).then(function(valid) {
    if (!valid) {
      passcodeError.textContent = 'Incorrect current passcode';
      passcodeError.style.display = 'block';
      return;
    }
    return hashPasscode(next).then(function(hash) {
      Config.setPasscodeHash(hash);
      passcodeSuccess.style.display = 'block';
      currentPasscodeInput.value = '';
      newPasscodeInput.value = '';
      confirmPasscodeInput.value = '';
    });
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A — no analytics summary existed | In-memory aggregation over IndexedDB getAll | Phase 6 | No migration needed |
| N/A — idle timeout was fixed at 60s | Configurable via localStorage via config.js | Phase 6 | Config.setIdleTimeout already exists |

**No deprecated patterns to address in this phase.**

---

## Open Questions

1. **Idle timeout input bounds**
   - What we know: Default is 60 seconds. The business owner is the only user of this setting.
   - What's unclear: What are sensible minimum/maximum bounds?
   - Recommendation: 10 seconds minimum (anything shorter is unusable), 600 seconds (10 minutes) maximum. Default remains 60. Use a `<input type="number" min="10" max="600">` with client-side validation before saving.

2. **Top search terms: exact match vs. deduplicated**
   - What we know: Searches are logged per debounce settle (not per keystroke). A user searching "batman" multiple times counts as multiple records.
   - What's unclear: Should the display show all-time query counts, or unique sessions?
   - Recommendation: Show total count per unique query string — this tells the owner which terms are popular regardless of how many distinct people searched. Simple `Object.keys(searchCounts)` approach.

3. **Analytics section position in admin panel**
   - What we know: The admin panel currently has four sections: Event Config, Catalogue Sync, Sync Status, Email Export.
   - What's unclear: Should analytics be first (highest business value) or last (least frequent use)?
   - Recommendation: Place analytics after Email Export, before operational controls (idle timeout, passcode change). Owner will check analytics and email export together as a post-event review task.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual browser testing — no automated test framework configured in this project |
| Config file | None |
| Quick run command | Load `index.html` in Safari/Chrome, navigate to admin panel |
| Full suite command | Walk through all four requirements manually with the checklist below |

### Phase Requirements — Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANALYTICS-04 | Analytics summary renders top 10 cards, top searches, zero-result searches, email count scoped to current event | Manual — requires pre-seeded IDB data | N/A | N/A |
| ANALYTICS-05 | Analytics records from a previous event (different `eventName`) are still present in IDB after new event is configured | Manual — change event name, verify old records not deleted | N/A | N/A |
| ADMIN-05 | Saving a new idle timeout value causes the kiosk to time out at the new interval | Manual — set 15s, wait, verify countdown fires at 15s not 60s | N/A | N/A |
| ADMIN-06 | Passcode change requires correct current passcode; incorrect current passcode is rejected; new passcode takes effect immediately | Manual — attempt wrong current passcode, then correct flow | N/A | N/A |

### Sampling Rate
- **Per task:** Load app in browser, exercise the specific admin section being built
- **Per wave merge:** Full manual admin panel walkthrough: all four new sections functional
- **Phase gate:** All four success criteria verified before marking complete

### Wave 0 Gaps
None — no automated test infrastructure required. This project uses manual verification throughout (established pattern from Phases 1–5).

---

## Sources

### Primary (HIGH confidence)
- `src/admin.js` — existing admin panel structure, section pattern, passcode overlay, email export section
- `src/db.js` — `dbGetAll`, `dbAdd`, `dbCount` — confirmed available CRUD helpers
- `src/config.js` — `Config.getIdleTimeout()`, `Config.setIdleTimeout()`, `Config.setPasscodeHash()`, `verifyPasscode()`, `hashPasscode()` — all already implemented
- `src/catalogue.js` — analytics write schema: confirmed field names (`type`, `cardId`, `cardName`, `query`, `resultCount`, `zeroResult`, `eventName`, `timestamp`)
- `src/idle.js` — confirmed `resetIdleTimer()` reads `Config.getIdleTimeout()` dynamically on line 32; no cached timeout variable
- `.planning/REQUIREMENTS.md` — ADMIN-05, ADMIN-06, ANALYTICS-04, ANALYTICS-05 requirement definitions

### Secondary (MEDIUM confidence)
- MDN IndexedDB API — `IDBObjectStore.getAll()` confirmed available Safari 10.1+ (project baseline is iPadOS 16 / Safari 16.x)
- MDN Web Crypto API — `crypto.subtle.digest` confirmed available in secure contexts (served over HTTPS or localhost)

### Tertiary (LOW confidence)
None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components verified present in existing codebase
- Architecture: HIGH — all patterns derived from reading actual source files
- Pitfalls: HIGH — derived from code inspection, not speculation

**Research date:** 2026-03-21
**Valid until:** Stable — this phase depends only on the existing codebase, not external APIs or fast-moving libraries
