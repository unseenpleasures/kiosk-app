# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Event-Ready Kiosk

**Shipped:** 2026-03-21
**Phases:** 7 | **Plans:** 14 | **Commits:** 98

### What Was Built
- Fully offline PWA kiosk catalogue with 950+ card virtual-scrolled grid
- Shopify Storefront API sync engine with cursor-based pagination and failure-safe checkpointing
- GDPR-compliant email capture with per-event tagging and Mailchimp CSV export
- Admin panel with hidden 7-tap trigger, analytics dashboard, idle timer config, passcode change
- Integration bug fix phase closing 3 cross-phase defects found by milestone audit

### What Worked
- **6-phase dependency structure** mapped cleanly to real implementation order — no phase needed rework due to missing prerequisites
- **Milestone audit before shipping** caught 3 real integration defects (SW cache mismatch, NEW badge timing, first-sync empty catalogue) that would have been production bugs
- **Module isolation pattern** (db.js/config.js/sync.js each owning their storage layer) prevented coupling issues across 7 phases
- **ES2017 constraint enforced from day one** — no late-stage compatibility surprises on target hardware
- **Virtual scroll from Phase 4 day one** — no performance retrofit needed for 950+ cards

### What Was Inefficient
- **All 7 phases built in a single day** — no real user testing between phases; all validation was code-level, not user-level
- **Phase 7 (gap closure) could have been avoided** if integration checks ran during Phases 2-4 instead of only at milestone audit
- **SUMMARY frontmatter documentation gaps** (9 requirements missing from `requirements_completed` fields) — phase summaries should be validated during execution
- **Nyquist validation files all in draft state** — validation was treated as optional rather than integrated into phase execution

### Patterns Established
- `db.js` as sole IndexedDB accessor — all views go through CRUD helpers
- `config.js` as sole localStorage accessor — centralises all config reads/writes
- `sync.js` as sole network accessor — no fetch() calls anywhere else
- 7-tap hidden trigger pattern for admin access on kiosk devices
- Sequential image caching via reduce() chain to protect A9X memory
- Blob + createObjectURL + hidden anchor for Safari-compatible file downloads

### Key Lessons
1. **Run integration checks between phases, not just at milestone audit** — the 3 bugs found in audit were all cross-phase wiring issues that existed since Phases 2-4
2. **Cache naming must be coordinated across modules** — sync.js and sw.js used different cache names, causing silent image deletion on SW update
3. **Boot sequence must be re-entrant** — first-sync flow skipped initCatalogue() because boot() assumed catalogue data existed at startup time
4. **Temporal comparisons need careful ordering** — NEW badge compared against a timestamp that was overwritten by the same sync that introduced the products

### Cost Observations
- Model mix: Primarily opus + sonnet for planning/execution, haiku for research agents
- Sessions: Multiple sessions across a single day
- Notable: Entire v1.0 MVP built and shipped in one day — high velocity enabled by clear requirements and phased execution

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 98 | 7 | Initial build — established module isolation, virtual scroll, and audit-before-ship patterns |

### Cumulative Quality

| Milestone | Audit Score | Requirements | Integration Issues Found |
|-----------|-------------|--------------|------------------------|
| v1.0 | 33/36 → 36/36 | 36 complete | 3 (all fixed in Phase 7) |

### Top Lessons (Verified Across Milestones)

1. Integration testing between phases catches wiring bugs that phase-level verification misses
2. Cache naming coordination across modules is a first-class architecture concern
