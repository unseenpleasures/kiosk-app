---
phase: 4
slug: customer-browse-experience
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual browser testing (vanilla JS PWA — no test framework) |
| **Config file** | none |
| **Quick run command** | `open index.html in Safari (iPadOS simulator or device)` |
| **Full suite command** | `Manual walkthrough: browse → filter → search → detail → analytics` |
| **Estimated runtime** | ~5 minutes manual |

---

## Sampling Rate

- **After every task commit:** Load app in browser, verify task acceptance criteria visually
- **After every plan wave:** Full manual walkthrough of browse + filter + search + detail flows
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 minutes

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | CAT-01 | manual | `grep -c "renderCatalogue\|catalogueView" js/catalogue.js` | ✅ | ⬜ pending |
| 04-01-02 | 01 | 1 | CAT-01 | manual | `grep "IntersectionObserver" js/catalogue.js` | ✅ | ⬜ pending |
| 04-01-03 | 01 | 1 | CAT-02 | manual | `grep "category-chip\|filterByCategory" js/catalogue.js` | ✅ | ⬜ pending |
| 04-01-04 | 01 | 1 | CAT-03 | manual | `grep "search\|searchInput" js/catalogue.js` | ✅ | ⬜ pending |
| 04-02-01 | 02 | 2 | CAT-04 | manual | `grep "renderDetail\|detailView" js/catalogue.js` | ✅ | ⬜ pending |
| 04-02-02 | 02 | 2 | CAT-05 | manual | `grep "NEW.*badge\|badge.*NEW\|isNew" js/catalogue.js` | ✅ | ⬜ pending |
| 04-02-03 | 02 | 2 | CAT-10 | manual | `grep "pauseIdleTimer\|resumeIdleTimer\|_pausedForEmail" js/idle.js` | ✅ | ⬜ pending |
| 04-03-01 | 03 | 3 | ANALYTICS-01 | manual | `grep "logEvent\|analytics" js/catalogue.js` | ✅ | ⬜ pending |
| 04-03-02 | 03 | 3 | ANALYTICS-02 | manual | `grep "card_view\|product_view" js/catalogue.js` | ✅ | ⬜ pending |
| 04-03-03 | 03 | 3 | ANALYTICS-03 | manual | `grep "search_query\|zero_results" js/catalogue.js` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — this is a vanilla JS PWA with no test framework. Verification is manual browser testing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Grid scrolls 950+ cards without jank on A9X | CAT-01 | Requires physical or simulated A9X hardware; no automated perf test | Scroll rapidly through full catalogue on iPad Pro 1st gen; count DOM nodes should stay ≤80 |
| Category filter responds in under 100ms | CAT-02 | Requires browser performance timeline | Open DevTools, tap category chip, measure filter time |
| Search results appear in under 300ms | CAT-03 | Requires browser performance timeline | Type in search field, measure time to first result render |
| "NEW" badge visible on recently-synced cards | CAT-05 | Requires time-aware IndexedDB data | Set lastSyncAt to past date, verify badge appears on newer cards |
| Email screen idle grace period (3 min) | CAT-10 | Requires waiting for idle timer; state-dependent | Navigate to email screen, wait 60s, verify idle countdown does NOT start |
| Analytics events written to IndexedDB | ANALYTICS-01,02,03 | Requires IndexedDB inspection | Open DevTools → Application → IndexedDB → analytics store, verify events written on browse/tap/search |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5 minutes
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
