---
phase: 08-deploy-and-install
plan: 01
subsystem: infra
tags: [pwa, github-pages, service-worker, manifest, gitignore]

# Dependency graph
requires:
  - phase: 07-bug-fixes
    provides: stable PWA codebase (sw.js, app.js, manifest.json) to convert paths on
provides:
  - All PWA source files using relative ./ paths compatible with GitHub Pages subdirectory hosting
  - .gitignore excluding non-PWA development files
  - Service worker cache bumped to kiosk-v9 to force fresh cache after path changes
affects: [github-pages-push, ipad-install]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Relative ./ paths throughout PWA (not absolute /) for subdirectory hosting compatibility"
    - ".gitignore separates PWA source from planning/dev artifacts"

key-files:
  created:
    - .gitignore
  modified:
    - manifest.json
    - sw.js
    - src/app.js
    - index.html
    - styles/main.css

key-decisions:
  - "Use ./ relative paths (not absolute /) so GitHub Pages subdirectory URL resolves correctly"
  - "Bump CACHE_NAME to kiosk-v9 to force cache refresh after path changes; preserve SYNC_CACHE_NAME at kiosk-v3 to avoid evicting product image cache"
  - "JS dynamic asset references (logo.svg, qr-code.png in app.js DOM construction) also converted — plan spec only required SW register path but acceptance criteria required zero absolute paths"

patterns-established:
  - "All local asset references use ./relative paths — never /absolute paths"

requirements-completed: [HOST-02]

# Metrics
duration: 15min
completed: 2026-03-21
---

# Phase 08 Plan 01: Path Conversion for GitHub Pages — Summary

**~35 absolute path references converted to relative ./ across 5 PWA source files, service worker cache bumped to kiosk-v9, and .gitignore created to separate PWA source from planning artifacts**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-21
- **Completed:** 2026-03-21
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Converted all absolute root paths (`/`) to relative (`./`) in manifest.json, sw.js, src/app.js, index.html, and styles/main.css — required for GitHub Pages subdirectory hosting
- Bumped CACHE_NAME from kiosk-v8 to kiosk-v9 to force browsers to fetch fresh cached assets after path changes; preserved SYNC_CACHE_NAME at kiosk-v3 to protect the product image cache
- Created .gitignore excluding .planning/, generate-assets.js, and project/ from the deployed repository while keeping all PWA source files tracked

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert all absolute paths to relative paths across 5 files** - `6414db6` (feat)
2. **Task 2: Create .gitignore for repository** - `ab36a43` (chore)

## Files Created/Modified

- `manifest.json` - start_url, scope, icon src values converted to ./
- `sw.js` - CACHE_NAME bumped to kiosk-v9, all 22 APP_SHELL_FILES entries converted to ./
- `src/app.js` - SW register path and two dynamic asset paths (logo.svg, qr-code.png) converted to ./
- `index.html` - All 17 href and src attributes converted to ./
- `styles/main.css` - 3 @font-face url() font paths converted to ./
- `.gitignore` - Created to exclude .planning/, generate-assets.js, project/ from repository

## Decisions Made

- Used `./` relative paths (not `../` or `./kiosk-app/`) — GitHub Pages serves from repo root when pushing to `gh-pages` branch or `main`
- CACHE_NAME bumped to kiosk-v9: the path changes affect all cached resources so the old cache must be invalidated; this is the standard mechanism
- SYNC_CACHE_NAME kept at kiosk-v3: product image cache is in a separate named cache, excluded from activate cleanup — bumping it would evict all ~950 product images requiring a full re-sync
- Extra auto-fix: JS dynamic asset src values in app.js (logo.svg, qr-code.png DOM construction) were also converted even though the plan's interfaces section only called out the SW register path — required to meet the acceptance criterion "No file contains an absolute root path reference to any local asset"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Converted JS dynamic asset paths in app.js**
- **Found during:** Task 1 (Convert all absolute paths)
- **Issue:** Plan interfaces section specified only `register('/sw.js')` in app.js, but app.js also constructs DOM with `logo.src = '/assets/logo.svg'` (line 49, 114) and `qrImg.src = '/assets/qr-code.png'` (line 74) — absolute paths that would break on GitHub Pages
- **Fix:** Converted both to `./assets/logo.svg` and `./assets/qr-code.png` respectively
- **Files modified:** src/app.js
- **Verification:** `grep "'/[a-z]" src/app.js` returns no matches
- **Committed in:** 6414db6 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** The extra fix is required for correctness — without it, the splash screen and sync-required screen would show broken images on GitHub Pages. No scope creep.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. The next step (Plan 02) covers the actual git push to GitHub and GitHub Pages configuration.

## Next Phase Readiness

- All PWA source files are path-correct for GitHub Pages subdirectory hosting
- .gitignore is in place; git push will only include PWA source files
- Repository is ready for Plan 02: push to GitHub, enable GitHub Pages, verify public URL

---
*Phase: 08-deploy-and-install*
*Completed: 2026-03-21*
