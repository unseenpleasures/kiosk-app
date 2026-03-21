---
phase: 2
slug: data-layer-and-navigation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual browser testing + console assertions (no test framework — vanilla JS PWA) |
| **Config file** | none |
| **Quick run command** | Open `index.html` in Safari / browser, check console for errors |
| **Full suite command** | Open `index.html`, exercise all screens, check IDB in DevTools |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Open app in browser, check browser console for JS errors
- **After every plan wave:** Full manual walkthrough — navigate all hash routes, verify IDB stores in DevTools Application tab
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-db-01 | db | 1 | PWA-03 | manual | `Open app → DevTools → Application → IndexedDB → kiosk-db` | ✅ | ⬜ pending |
| 2-db-02 | db | 1 | PWA-03 | manual | `Check 4 object stores exist: products, emails, analytics, sync_metadata` | ✅ | ⬜ pending |
| 2-config-01 | config | 1 | PWA-06 | manual | `Set admin passcode → reload app → passcode hash persists in localStorage` | ✅ | ⬜ pending |
| 2-router-01 | router | 2 | CAT-07 | manual | `Navigate to #/products → URL updates → correct view shown` | ✅ | ⬜ pending |
| 2-router-02 | router | 2 | CAT-07 | manual | `Press home button → URL resets to #/ → catalogue root shown` | ✅ | ⬜ pending |
| 2-idle-01 | idle | 2 | CAT-08 | manual | `Wait 60s with no input → countdown overlay appears for 10s` | ✅ | ⬜ pending |
| 2-idle-02 | idle | 2 | CAT-08 | manual | `Dismiss countdown → timer resets; no dismiss → app returns to home` | ✅ | ⬜ pending |
| 2-chrome-01 | chrome | 1 | CAT-09 | manual | `QR code visible on every screen; tapping does not navigate away` | ✅ | ⬜ pending |
| 2-chrome-02 | chrome | 1 | CAT-09 | manual | `Home button visible top-left on every screen` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — this is a vanilla JS PWA with no test framework. All validation is manual browser-based inspection.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| IndexedDB stores created on fresh install | PWA-03 | IDB creation only verifiable in DevTools Application tab | Open app fresh (clear site data), go to DevTools → Application → IndexedDB → verify `kiosk-db` v2 with 4 stores |
| Hash routing dispatches to correct views | CAT-07 | DOM view switching requires visual browser check | Navigate to `#/`, `#/product/123`, `#/admin` — verify correct view rendered each time |
| Inactivity countdown overlay | CAT-08 | Timer behavior requires real-time observation | Leave app idle 60s — countdown overlay must appear; test dismiss (tap) and auto-return paths |
| QR code non-navigation | CAT-09 | Requires tapping in Safari standalone mode | In Guided Access / standalone, tap QR code — verify app stays in current view |
| Config persists across restart | PWA-06 | Requires app reload to verify localStorage persistence | Set event name → close PWA → reopen → event name must still be present |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
