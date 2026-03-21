---
phase: 3
slug: sync-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual browser testing (vanilla JS PWA — no test framework) |
| **Config file** | none |
| **Quick run command** | Open `index.html` in Safari / browser, navigate to admin panel |
| **Full suite command** | Full kiosk flow: unlock admin → sync → browse catalogue offline |
| **Estimated runtime** | ~5 minutes manual |

---

## Sampling Rate

- **After every task commit:** Visual check in browser dev tools (IndexedDB, console, network tab)
- **After every plan wave:** Run full admin + sync flow in browser
- **Before `/gsd:verify-work`:** Full suite must pass all manual checks
- **Max feedback latency:** 5 minutes

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-admin-passcode | admin | 1 | ADMIN-01 | manual | open admin panel, enter wrong passcode → blocked | ❌ W0 | ⬜ pending |
| 3-event-config | admin | 1 | ADMIN-02 | manual | set event name → reload → verify persists | ❌ W0 | ⬜ pending |
| 3-sync-trigger | sync | 1 | SYNC-01 | manual | tap Sync → progress indicator appears | ❌ W0 | ⬜ pending |
| 3-sync-progress | sync | 1 | SYNC-02 | manual | watch page counter increment during sync | ❌ W0 | ⬜ pending |
| 3-sync-complete | sync | 1 | SYNC-03 | manual | verify status report shown on completion | ❌ W0 | ⬜ pending |
| 3-failure-recovery | sync | 2 | SYNC-04 | manual | kill network mid-sync → catalogue still browsable | ❌ W0 | ⬜ pending |
| 3-offline-images | sync | 2 | SYNC-01 | manual | enable airplane mode → browse catalogue → images load | ❌ W0 | ⬜ pending |
| 3-admin-hidden | admin | 1 | ADMIN-03 | manual | no visible button on kiosk UI that reveals admin | ❌ W0 | ⬜ pending |
| 3-admin-export | admin | 2 | ADMIN-04 | manual | export CSV from admin panel → file downloads | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*This is a vanilla JS PWA with no test framework. All verification is manual.*

- [ ] Browser DevTools open to IndexedDB panel (verify product/image storage)
- [ ] Network tab available to simulate offline (toggle "Offline" in DevTools)
- [ ] Safari on iPad (or Safari desktop for dev) to test passcode UI

*Existing infrastructure: none — all verifications are manual browser checks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin passcode blocks entry | ADMIN-01 | DOM/UI interaction | Enter wrong passcode 3 times → verify blocked; enter correct → admin panel opens |
| Event name persists across restart | ADMIN-02 | Browser state | Set name, close tab, reopen → verify name shown |
| Progress indicator during sync | SYNC-02 | Live UI | Tap Sync, watch counter update per page |
| Sync report on completion | SYNC-03 | Live UI | Verify product count, new cards added, errors displayed |
| Catalogue intact after network failure | SYNC-04 | Network state | Use DevTools to drop network at page 10 → navigate catalogue → all prev products visible |
| Full offline browse after sync | SYNC-01 | Device state | Enable airplane mode → open app → browse 10+ products with images |
| Admin trigger hidden from kiosk view | ADMIN-03 | UX | Browse as customer — no admin button visible without knowing gesture/tap sequence |
| CSV export downloads correctly | ADMIN-04 | File system | Tap export → file downloads with correct email data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5 minutes
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
