---
phase: 1
slug: pwa-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual (browser-based) — no automated test runner; Safari/iPadOS PWA verification requires device or simulator |
| **Config file** | none |
| **Quick run command** | Open app in Safari, check console for SW registration errors |
| **Full suite command** | Manual checklist: install PWA, go offline, verify splash, verify eviction screen |
| **Estimated runtime** | ~10 minutes manual |

---

## Sampling Rate

- **After every task commit:** Open in Safari localhost — verify no console errors
- **After every plan wave:** Run full manual checklist
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 600 seconds (manual checks)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-xx-01 | TBD | 1 | PWA-01 | manual | Open in Safari standalone mode | ✅ after impl | ⬜ pending |
| 1-xx-02 | TBD | 1 | PWA-02 | manual | Disable network, reload app | ✅ after impl | ⬜ pending |
| 1-xx-03 | TBD | 2 | PWA-04 | manual | Clear IndexedDB, relaunch app | ✅ after impl | ⬜ pending |
| 1-xx-04 | TBD | 2 | PWA-05 | manual | Check icon on home screen | ✅ after impl | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] No test framework install needed — this is a vanilla HTML/CSS/JS PWA
- [ ] Manual test checklist document created before execution begins

*Existing browser DevTools and Safari cover all automated verifications available.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App opens in standalone mode (no Safari chrome) | PWA-01 | Requires physical iPad or simulator with Add to Home Screen | Add to Home Screen, tap icon, verify no browser chrome |
| App loads offline | PWA-02 | Requires network toggle (Airplane Mode) | Enable Airplane Mode, relaunch, verify shell loads |
| "Sync required" screen on empty DB | PWA-04 | Requires IndexedDB manipulation | Clear IndexedDB via DevTools or first run, relaunch |
| App icon shows correctly | PWA-05 | Requires physical device home screen | Add to Home Screen, verify icon at correct resolution |
| 2-second load time from cache | PWA-01 | Requires A9X hardware timing | Use Safari Performance timeline on device |
| Landscape orientation enforced | PWA-01 | Requires device rotation | Rotate iPad to portrait, verify CSS rotation workaround |
| Splash screen shown (no white flash) | PWA-01 | Requires cold launch from home screen | Force-close app, relaunch from home screen |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 600s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
