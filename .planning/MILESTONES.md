# Milestones

## v1.0 Event-Ready Kiosk (Shipped: 2026-03-21)

**Phases:** 1-7 | **Plans:** 14 | **Tasks:** 25 | **Commits:** 98
**Lines of code:** 4,326 (vanilla HTML/CSS/JS) | **Files:** 13 source files
**Timeline:** 2026-03-21 (single day build)
**Git range:** 74a34b6..516a17e

**Delivered:** A fully offline PWA kiosk catalogue for The ID Card Factory — 950+ card virtual-scrolled grid, Shopify sync engine, GDPR email capture, admin analytics, all running on iPad Pro A9X hardware with zero network dependency at events.

**Key accomplishments:**

1. Installable offline PWA with cache-first service worker, boot health check, and "Sync Required" gate
2. IndexedDB data layer (4 stores) with SHA-256 passcode hashing, hash router, and idle timer with countdown
3. Shopify Storefront API sync engine with cursor-based pagination, sequential image caching, and failure-safe checkpointing
4. Virtual-scrolled 950+ card catalogue (~80 DOM nodes) with real-time search, category filter, and card detail view
5. GDPR-compliant email capture with consent gate, per-event tagging, and Mailchimp-ready CSV export
6. Admin analytics dashboard (top cards, searches, zero-results), adjustable idle timeout, and passcode change
7. Integration bug fixes closing 3 cross-phase defects (SW cache mismatch, NEW badge timing, first-sync catalogue)

---
