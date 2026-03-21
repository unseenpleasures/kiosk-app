---
phase: 8
slug: deploy-and-install
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — manual verification only |
| **Config file** | None |
| **Quick run command** | Open `https://unseenpleasures.github.io/kiosk-app/` in browser |
| **Full suite command** | Physical iPad install + smoke test |
| **Estimated runtime** | ~5 minutes (manual) |

---

## Sampling Rate

- **After every task commit:** Verify changed files with `grep` for correct relative paths
- **After every plan wave:** Open deployed URL in browser, verify SW registration
- **Before `/gsd:verify-work`:** Full manual checklist (see Manual-Only Verifications)
- **Max feedback latency:** Immediate (grep-based path checks) / 5 min (deployment propagation)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | HOST-01 | manual-only | `grep -c '\./' manifest.json` | N/A | ⬜ pending |
| 08-01-02 | 01 | 1 | HOST-02 | manual-only | `grep -c '\./' sw.js` | N/A | ⬜ pending |
| 08-01-03 | 01 | 1 | HOST-01 | manual-only | `curl -s -o /dev/null -w '%{http_code}' URL` | N/A | ⬜ pending |
| 08-02-01 | 02 | 2 | INST-01 | manual-only | N/A — physical iPad | N/A | ⬜ pending |
| 08-02-02 | 02 | 2 | INST-02 | manual-only | N/A — physical iPad | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — no test files need to be created. All verification is manual per REQUIREMENTS.md (automated testing explicitly out of scope for this milestone).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GitHub Pages URL returns 200 | HOST-01 | Requires live deployment | 1. Navigate to `https://unseenpleasures.github.io/kiosk-app/` 2. Verify page loads |
| SW registers and app loads offline | HOST-02 | Requires live HTTPS origin | 1. Open URL in browser 2. Check DevTools > Application > Service Workers 3. Go offline, reload |
| iPad #1 installs and launches standalone | INST-01 | Requires physical iPad hardware | 1. Open URL in Safari on iPad #1 2. Share > Add to Home Screen 3. Open from home screen 4. Verify no Safari chrome 5. Trigger Shopify sync |
| iPad #2 installs and launches standalone | INST-02 | Requires physical iPad hardware | 1. Repeat iPad #1 steps on iPad #2 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 300s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
