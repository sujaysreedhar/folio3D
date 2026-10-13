# Changelog

## 0.2.0 — 2026-10-13

Added six-at-a-time thumbnail navigation, nested PDF/custom contents, optional persistent bookmarks synchronized between same-document readers, and Classic/Modern/Sepia/Midnight themes. New `theme`, `contents`, `storageKey`, `setTheme()`, `getContents()`, `getBookmarks()`, `toggleBookmark()`, `themechange` and `bookmarkchange` APIs. Thumbnail allocations share the configured memory budget and are released when their view closes.

The playground exposes a theme selector, and sample PDF outlines and demo section lists exercise navigation. Added portable browser/website ZIPs, npm TGZ and SHA-256 checksums, a GitHub publishing script/workflow, immutable distribution tags for jsDelivr, and publishing/theme documentation.

## 0.1.0 — 2026-10-12

Initial local release: curved3D PDF/image books, responsive layouts, drag turns, zoom/pan, keyboard toolbar, lightbox, flat fallback, bounded raster scheduling, browser modules/types/CSS, original samples and integration documentation. Publishing is not performed.

Follow-up: drag from the page interior, direction-aware single-page swipes, visible grab feedback and a fixed angled view that exposes curved sheet edges. Added optional synthesized paper sound, a labelled mute toggle, `sound`/`setSound()`/`soundchange`, and audio cleanup. The playground enables sound after interaction; library integrations remain silent by default.
