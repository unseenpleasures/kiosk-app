# Feature Landscape

**Domain:** Offline product catalogue kiosk — consumer events (comic cons / fan conventions)
**Project:** ID Card Factory Event Kiosk PWA
**Researched:** 2026-03-21
**Confidence:** MEDIUM (web search unavailable; assessment based on domain knowledge of kiosk UX, retail catalogue apps, PWA patterns, and convention/event technology — flagged where uncertain)

---

## Table Stakes

Features users expect from any product browsing kiosk. Missing any of these and the experience feels broken or unfinished. Convention attendees have minimal patience — they are walking past, not sitting down.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Full-screen product grid with thumbnails | Visual product discovery is the entire purpose — text lists are unacceptable for a printed card catalogue | Med | 950+ products means lazy loading and virtualisation are mandatory, not optional |
| Category filter | Standard on every retail catalogue; 8 categories here means users must be able to narrow quickly | Low | Implemented as a tab/chip row — instant filter, no page reload |
| Keyword search | Convention attendees arrive with a character in mind ("do you have Sherlock Holmes?") — search is often the first action | Med | Must be real-time / as-you-type; < 300ms is a hard requirement on A9X hardware |
| Product detail view | Users need to see the full card design before deciding — small grid thumbnails aren't enough | Low | Full-bleed image, card name, category — no price/cart needed since this is a catalogue not a shop |
| Offline operation | Events are in large exhibition halls with notoriously poor wifi/mobile signal; the app must never show a spinner waiting for network | High | The entire architecture — service worker, IndexedDB, cache-first — exists to satisfy this single requirement |
| Fast load from cache | Attendees approach for 10–30 seconds; if the home screen takes 5s to appear, the moment is lost | High | < 2s home screen load is a hard requirement; A9X chip is the performance ceiling |
| Persistent QR code | Attendees cannot buy at the kiosk — the QR code is the conversion mechanism; if it disappears, revenue is lost | Low | Must be always-visible, not tucked into a menu |
| Auto-return to home (idle timeout) | Without it, the next attendee finds someone else's search results or a detail page — disorienting and off-brand | Low | 60s default with visible countdown; standard pattern across all unattended kiosks |
| Touch-friendly tap targets | iPad kiosk is used by strangers with varying motor accuracy; tiny tap targets cause frustration and misclicks | Low | Minimum 44×44pt (Apple HIG); ideally 60pt+ for product grid cards; no hover-dependent interactions |
| Legible typography at arm's length | Kiosk is read standing, at 40–60cm distance, often in bright convention hall lighting | Low | Minimum 16px body, 24px+ headings; high contrast on dark background |

---

## Differentiators

Features that go beyond what attendees expect — these create genuine business value and competitive advantage for The ID Card Factory as an exhibitor.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Email capture with GDPR consent | Direct marketing list built at zero marginal cost per event — one captured email that converts is worth the entire app build cost | Med | Must be a dedicated screen (not a popup that interrupts browsing); mandatory consent checkbox; per-event tagging enables cohort analysis |
| "NEW" badge on recently added cards | Repeat attendees (who visit multiple cons per year) immediately see what's changed — rewards loyalty and drives discovery | Low | Requires sync metadata tracking "added since last sync" date; simple badge render |
| Analytics: search term logging (including zero results) | Zero-result searches are a direct product gap signal — "no results for Bluey" means a potential card range to add | Low | Cheapest possible market research; data persists across events for longitudinal trends |
| Analytics: top viewed cards per event | Reveals which IP/franchises resonate at each convention type (anime con vs horror con vs general comic con) | Low | Simple view counter in IndexedDB; post-event summary in admin |
| Per-event data tagging | Emails and analytics tagged with event name/date means you can compare MCM London vs LFCC vs Comic Con Scotland | Low | Purely a data discipline decision — low implementation cost, high analytical value |
| Incremental sync (changed products only) | On pre-event day, only downloading new/changed products vs full re-download saves 10–30 min and mobile data cost | High | Requires sync metadata and cursor/timestamp tracking in Shopify GraphQL; meaningful developer complexity |
| Adjustable idle timer in admin | Different conventions have different footfall density — busy shows warrant shorter timeouts; quieter shows allow longer browsing | Low | A single range input in admin panel; negligible code |
| CSV export tagged per event | Mailchimp-ready export means zero post-event data wrangling; tagged by event means immediate segmentation | Low | Standard Blob download; format design is the only meaningful work |
| Discreet admin access trigger | A 5-tap hidden area prevents curious attendees from stumbling into admin; prevents on-table accidents | Low | Typically: tap a corner X times, or a specific gesture — common kiosk pattern |

---

## Anti-Features

Features to explicitly NOT build — each one is a scope creep risk, performance liability, or GDPR hazard.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Add to cart / wishlist / purchase flow | This is a catalogue, not a shop — adding commerce creates GDPR complexity, PCI scope, fulfilment questions, and undermines the QR-to-website conversion funnel | The QR code IS the purchase path. Make it prominent and always visible |
| User accounts or login | No legitimate use case for a public kiosk with strangers; creates security/privacy surface | Single admin passcode is sufficient for all legitimate access needs |
| Video content / animated previews | A9X chip has limited GPU headroom; video files would bloat the cache from ~300MB to several GB; convention halls have poor audio environments | Static high-quality images only |
| Push notifications | Kiosk is a shared device; notifications would be bizarre and intrusive; iOS PWA notification support is limited and unreliable | Not applicable to kiosk context |
| Social sharing buttons | Adds external network dependencies; introduces potential for attendees to navigate away from the kiosk in a browser context | QR code handles outbound traffic to the website |
| Favourites / bookmark list | Stateful per-session UX requires either user identity or complex session management; convention attendees don't return to the same kiosk; increases complexity for zero business value | Email capture + QR code are the conversion mechanisms |
| Ratings or reviews | No infrastructure, no moderation, no use case at a kiosk | Not in scope |
| Live inventory / stock levels | Requires real-time network; the whole point is offline-first; stock data from Shopify is stale the moment it's synced anyway | Catalogue is aspirational ("look what exists") not transactional |
| Keyboard navigation / accessibility tree for screen readers | A kiosk with Guided Access active is not an accessibility-compliant public terminal; over-investing here creates code complexity | Ensure touch targets are large and visual contrast is high — basic accessibility is still good practice |
| Animations heavier than CSS transitions | A9X GPU will drop frames on canvas animations, heavy blur effects, or staggered grid entry animations | CSS opacity/transform transitions only; no JS animation loops |
| Infinite scroll with no position memory | If auto-return fires and resets position, users who return mid-browse lose their place — but there IS no returning user on a kiosk | Auto-return clears state entirely; grid resets to top — this is correct behaviour |
| Remote analytics / telemetry send | Adds network dependency, GDPR data processor obligations, and an ongoing third-party service dependency | All analytics stay on-device in IndexedDB; admin reads them locally |

---

## Feature Dependencies

```
Offline Operation
  └── Service Worker (cache-first)
        └── App Shell cached at install
        └── Product images cached during Sync
        └── Product JSON cached during Sync

Sync
  └── Shopify Storefront API (network required)
        └── Incremental sync (requires sync metadata in IndexedDB)
        └── "NEW" badge (requires first-sync timestamp stored)

Analytics
  └── IndexedDB (persistent storage)
        └── Search logging (requires search feature)
        └── View logging (requires product detail view)
        └── Category tracking (requires category filter)
        └── Admin summary (requires all above data to exist)

Email Capture
  └── IndexedDB (persistent storage)
        └── Per-event tagging (requires event name set in admin)
        └── CSV export (requires captured emails to exist)
        └── GDPR consent checkbox (required before writing any email)

Admin Panel
  └── Passcode protection (prerequisite for all admin features)
        └── Event name/date config (prerequisite for per-event tagging)
        └── Sync trigger (prerequisite for fresh catalogue)
        └── CSV export (prerequisite: emails captured)
        └── Analytics summary (prerequisite: analytics events exist)
        └── Timer adjustment (affects idle timeout behaviour)
        └── Passcode change (requires old passcode verification)

Idle Timeout
  └── Inactivity timer (global)
        └── Visual countdown (UI component, shown at T-10s)
        └── Grace period variant (3-min on email form, not 60s)
        └── Reset on any touch event (event listener on document)
```

---

## Touch / Kiosk-Specific UX Considerations

These are cross-cutting concerns that affect every feature, not just one. They're listed here because they often get treated as implementation details and then get missed.

### Tap Target Size
Apple HIG minimum is 44×44pt. For a kiosk used by strangers in a noisy, distracting environment, 60pt+ is better. Product grid cards should be large enough to tap confidently without zooming. Category filter chips must be tall enough (48pt minimum) to hit reliably.

### No Hover States
The entire UI must work without hover — no tooltips on hover, no reveal-on-hover controls, no underlines that only appear on hover. Every interactive element must be visually identifiable as tappable at rest.

### Fat-Finger-Safe Spacing
Minimum 8pt gap between adjacent tap targets. The category filter row, if too tightly packed, will cause mis-taps. The admin panel passcode keypad needs generous key spacing.

### Passive Touch Listeners
For scroll performance on A9X, all `touchstart` and `touchmove` event listeners should use `{ passive: true }` where possible to avoid blocking the browser's scroll compositor thread.

### Pinch-Zoom Lockout
The viewport meta tag must include `user-scalable=no` (or Guided Access handles it). Accidental pinch-zoom on a kiosk is disorienting and exposes browser chrome.

### No Text Input Friction
The email capture form uses a native keyboard. On iPad in landscape, the keyboard covers roughly the bottom 40% of screen. The email input must be positioned in the upper half, or the form must scroll/pan to keep the input visible above the keyboard.

### Idle Timeout — Exact Pattern
The industry-standard kiosk idle pattern is:
1. Start countdown timer on last touch event
2. At T-10s (configurable): show non-intrusive overlay with countdown ("Returning to home in 10...") and a "Keep browsing" cancel button
3. At T-0: dismiss all screens, scroll to top, clear search input, reset category filter, return to home grid
4. The countdown overlay itself counts as activity if tapped — must reset timer

The email form grace period (3 min) is correct — users filling out a form type slowly and look up frequently; 60s would interrupt a legitimate conversion.

### Visual Hierarchy at Distance
The kiosk is read from standing distance (~50cm). Text and controls that would be comfortable at 30cm (normal phone distance) need to be ~40% larger. The product grid image thumbnails do the heavy lifting; text labels are secondary.

### Dark Theme Suitability
Convention halls are often dimly lit in certain areas (lighting rigs, projection screens). A dark navy/black base with gold accents (matching brand) is well-suited — it's less visually fatiguing and the backlit screen is less blinding in a dark hall. Dark themes also reduce LCD backlight wash-out in bright environments when combined with high-contrast elements.

### System UI Intrusions (Guided Access Mitigations)
Even with Guided Access active, iOS may show the battery warning overlay, time-out the display (screen sleep), or briefly show the status bar. The app cannot prevent these at the PWA level. Mitigation: keep screen brightness at maximum in Guided Access settings and disable auto-lock. The app itself should not fight this — document it as an operational setup step.

---

## MVP Recommendation

The MVP is essentially the full spec as written in PROJECT.md. This is appropriate because:
1. The feature list is already scoped tightly — it omits everything not essential
2. All features serve at least one of three core jobs: browse, capture, or measure
3. The "differentiators" table above are mostly low-complexity additions that don't justify deferral

**Prioritise in this order within the build:**

1. Offline product grid with category filter (core browse experience — everything else is worthless without this)
2. Keyword search (real-time, logged — table stakes for character-name browsing)
3. Idle timeout with countdown (critical for unattended kiosk operation)
4. Persistent QR code (the revenue conversion mechanism)
5. Admin panel — sync trigger + event config (needed to load catalogue and tag data)
6. Email capture with GDPR consent (lead generation purpose)
7. CSV export (email list is useless without export)
8. Analytics logging (can start simple, enrich later)
9. "NEW" badge (low complexity, high perceived value for repeat attendees)
10. Incremental sync (genuine complexity — build last once basic sync works)

**Defer only if timeline is extreme:**
- Incremental sync: full re-download on each pre-event setup is tolerable initially; optimise after first event
- Admin analytics summary: raw data in IndexedDB exists even without the summary view; can be exported/inspected manually as a fallback

---

## Confidence Notes

| Area | Confidence | Notes |
|------|------------|-------|
| Table stakes | HIGH | These are established patterns in retail kiosk / event technology; strong domain knowledge basis |
| Differentiators | HIGH | Directly derived from PROJECT.md spec plus event exhibitor context — email capture, analytics, and per-event tagging are established practices |
| Anti-features | HIGH | Each anti-feature exclusion has a clear technical or business reason; no speculation |
| Touch UX details | MEDIUM | Apple HIG values (44pt targets etc.) are documented fact; kiosk-specific patterns (idle timeout flow, passive listeners) are widely documented best practice but web search was unavailable to verify current-year sources |
| Incremental sync complexity | MEDIUM | Shopify Storefront API GraphQL cursor pagination is well-documented; incremental logic complexity is an engineering judgement call |

---

## Sources

- PROJECT.md — authoritative spec (The ID Card Factory, 2026-03-21)
- Apple Human Interface Guidelines — minimum touch target size 44×44pt (documented fact, HIGH confidence)
- iPadOS 16 / Safari PWA constraints — Guided Access behaviour, viewport meta, passive event listeners (documented platform behaviour, HIGH confidence)
- Shopify Storefront API — unauthenticated read scope, GraphQL cursor pagination (platform documentation, HIGH confidence)
- GDPR Article 7 — explicit consent required before processing personal data (legislative fact, HIGH confidence)
- General kiosk idle timeout pattern — industry-standard UX; widely documented but web search unavailable to cite specific sources (MEDIUM confidence)
- NOTE: Web search was denied during this research session. Findings rely on project specification and domain knowledge. No findings have been presented as HIGH confidence without a documentable basis.
