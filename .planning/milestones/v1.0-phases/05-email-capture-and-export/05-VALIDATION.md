---
phase: 5
slug: email-capture-and-export
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual + browser DevTools (no test framework — vanilla JS PWA) |
| **Config file** | none |
| **Quick run command** | Open Safari → navigate to `#/email` → verify form renders |
| **Full suite command** | Full manual walkthrough per acceptance criteria |
| **Estimated runtime** | ~5 minutes |

---

## Sampling Rate

- **After every task commit:** Visual check in browser — navigate to affected route/panel
- **After every plan wave:** Full manual walkthrough of email capture + CSV export
- **Before `/gsd:verify-work`:** Full suite must pass
- **Max feedback latency:** 300 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD — filled by planner | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — no test framework install needed. Validation is manual browser testing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email form renders on `#/email` | EMAIL-01 | DOM-based UI, no test runner | Navigate to `#/email`, verify form fields and button present |
| Consent checkbox unchecked by default, submit disabled | EMAIL-02 | DOM state verification | Load `#/email`, confirm checkbox unchecked, submit button has `disabled` attribute |
| Submit stores record in IndexedDB | EMAIL-03 | IndexedDB requires browser context | Submit form, open DevTools → Application → IndexedDB → emails store, verify record |
| Confirmation screen countdown and auto-return | EMAIL-03 | Timed browser behavior | Submit form, verify countdown ticks from 5→0, verify navigation to `#/` |
| CSV export from admin panel | EMAIL-04, EMAIL-05 | File download / share sheet on iPadOS | Open admin panel, tap export, verify CSV file with correct headers |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
