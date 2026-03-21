---
phase: 7
slug: integration-bug-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual verification (no automated test framework in project) |
| **Config file** | None |
| **Quick run command** | Load app in browser, inspect with DevTools |
| **Full suite command** | Follow phase VERIFICATION.md checklist |
| **Estimated runtime** | ~5 minutes (manual) |

---

## Sampling Rate

- **After every task commit:** Visual inspection in browser DevTools
- **After every plan wave:** Full manual flow test — first sync, catalogue render, admin analytics, SW update simulation
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** N/A (manual verification)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | PWA-03, SYNC-04 | manual | Bump CACHE_NAME in sw.js, reload, verify kiosk-v3 cache persists in DevTools > Application > Cache Storage | N/A | ⬜ pending |
| 07-01-02 | 01 | 1 | CAT-06 | manual | Sync twice, verify NEW badge on cards added between syncs | N/A | ⬜ pending |
| 07-01-03 | 01 | 1 | CAT-01 | manual | Clear all data, first sync, navigate to #/ — catalogue renders without reload | N/A | ⬜ pending |
| 07-01-04 | 01 | 1 | ANALYTICS-04 | manual | Open admin analytics, verify email count paragraph has gold accent color | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework or test files needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Product images survive SW version bump | PWA-03 | Requires browser Cache Storage inspection | 1. Sync products 2. Bump CACHE_NAME in sw.js 3. Reload 4. Check kiosk-v3 still in Cache Storage 5. Verify images load |
| NEW badge on recently added cards | CAT-06 | Requires two sequential syncs with product changes | 1. Sync 2. Add product in Shopify 3. Sync again 4. Verify NEW badge on new product only |
| First-sync catalogue renders | CAT-01 | Requires clean-slate device state | 1. Clear site data 2. Load app (sync-required screen) 3. Enter admin, sync 4. Navigate to #/ 5. Verify full catalogue grid |
| Email stat styled correctly | ANALYTICS-04 | Visual CSS verification | 1. Open admin analytics 2. Verify email count paragraph has accent color and bold weight |

---

## Validation Sign-Off

- [ ] All tasks have manual verification steps documented
- [ ] Sampling continuity: every task has a verification step
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency acceptable for manual project
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
