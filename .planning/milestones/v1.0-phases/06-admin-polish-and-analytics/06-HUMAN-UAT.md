---
status: partial
phase: 06-admin-polish-and-analytics
source: [06-VERIFICATION.md]
started: 2026-03-21T15:30:00Z
updated: 2026-03-21T15:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Analytics section renders correctly with real event data
expected: Event Analytics section shows the correct event name, populated top-10 card list, ranked search terms, and zero-result searches matching seeded data
result: [pending]

### 2. Idle timeout change takes effect on next interaction
expected: Set idle timeout to 10 seconds, save, exit admin, wait 10 seconds — home screen appears (idle reset fires)
result: [pending]

### 3. Passcode change and immediate re-use
expected: Change passcode, exit admin, re-enter with NEW passcode — admin unlocks; old passcode no longer works
result: [pending]

### 4. Section insertion order in admin panel
expected: Sections top to bottom: Event Configuration, Catalogue Sync, Sync Status, Email Export, Event Analytics, Idle Timeout, Change Passcode, Exit button
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
