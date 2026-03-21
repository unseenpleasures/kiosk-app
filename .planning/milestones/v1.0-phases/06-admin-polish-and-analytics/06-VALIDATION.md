---
phase: 6
slug: admin-polish-and-analytics
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual browser verification (no automated test framework — vanilla JS PWA) |
| **Config file** | none |
| **Quick run command** | Open Safari DevTools → Application → IndexedDB; verify data visually |
| **Full suite command** | Navigate admin panel; exercise all new controls end-to-end |
| **Estimated runtime** | ~2 minutes manual walkthrough |

---

## Sampling Rate

- **After every task commit:** Visual check of changed admin section in browser
- **After every plan wave:** Full admin panel walkthrough
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 1 | ANALYTICS-04 | manual | Open admin panel → event summary section | ❌ W0 | ⬜ pending |
| 6-01-02 | 01 | 1 | ANALYTICS-05 | manual | Configure new event → verify old analytics preserved | ❌ W0 | ⬜ pending |
| 6-02-01 | 02 | 1 | ADMIN-05 | manual | Change idle timeout in admin → verify timer uses new value | ❌ W0 | ⬜ pending |
| 6-02-02 | 02 | 1 | ADMIN-06 | manual | Change passcode via admin → verify new passcode works | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*No automated test framework installed — this is a vanilla JS PWA without a build toolchain. All verification is manual browser-based.*

*Existing infrastructure covers all phase requirements (manual verification).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Top 10 most-viewed cards displayed | ANALYTICS-04 | DOM inspection only; no test runner | Load admin panel, check event summary section lists 10 cards sorted by view count |
| Most-searched terms listed | ANALYTICS-04 | DOM inspection | Check event summary shows search terms with counts |
| Zero-result searches listed | ANALYTICS-04 | DOM inspection | Check zero-result section present and populated |
| Analytics scoped to current event | ANALYTICS-04 | Requires real event data in IDB | Configure event, browse, check summary shows only current event records |
| Historical analytics preserved on event change | ANALYTICS-05 | Requires prior-event data | Verify old event records still in IDB after new event configured |
| Idle timeout change takes effect immediately | ADMIN-05 | Requires real timer observation | Change timeout, wait for idle, observe new duration kicks in |
| Passcode change requires current passcode | ADMIN-06 | UI interaction | Attempt change with wrong current passcode — must reject |
| New hashed passcode persists after reload | ADMIN-06 | Page reload test | Change passcode, reload app, verify new passcode accepted |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
