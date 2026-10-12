# Folio3D v0.1 implementation specification

Approved 2026-10-12. Implement the six milestones sequentially; original MIT code, framework-independent TypeScript, Three.js, PDF.js, Vite, Vitest, Playwright, npm lockfile. Browser-only processing, no backend, uploads, telemetry, publishing, or public deployment.

## Release scope

PDF URLs, local PDF files and copied byte arrays; ordered image URLs; curved 3D sheets with front/back textures, shadows and thickness; previous/next, page selection, keyboard and pointer/touch drag; responsive single/double layouts; zoom/pan/fit/fullscreen; inline and lightbox; flat fallback, loading/errors, complete cleanup; npm ESM/types/CSS, self-contained browser modules, demo and documentation.

Deferred: search, thumbnails, outlines, selectable PDF text, annotations, password-protected PDFs, RTL, hard covers, sound, autoplay, WordPress, React wrappers and DearFlip API compatibility. Folio3D is a working name. Reference behavior: https://js.dearflip.com/docs/options-list/ . Do not copy proprietary code or assets.

## Interfaces and architecture

Five boundaries: controller (logical pages/state/lifecycle/events), providers (load/dimensions/cancellable rasterization), scheduler (priority/prefetch/cache/disposal), renderers (Three.js + flat), UI (controls/gestures/layout/lightbox).

`createFlipbook(container, options)` returns a handle with `ready`, `next()`, `previous()`, `goToPage(page)`, `setZoom(scale)`, `resetZoom()`, `getState()`, `on(event, listener)` (returns unsubscribe), `destroy()`.

Sources: `{type:'pdf', data:string|Blob|Uint8Array}` or `{type:'images', pages:Array<{src:string;alt?:string}>}`. Options: renderer auto/webgl/flat, pageMode auto/single/double, initialPage, assetBaseUrl. State: one-based page, count, visible pages, zoom, resolved layout/renderer/lifecycle. Events: pagechange, zoomchange, rendererchange, error. `openFlipbook(options)` returns the same handle; destroy closes modal and restores focus.

Navigation waits for ready, rejects invalid page numbers with RangeError, next/previous at boundaries are no-ops. Double starts blank|1 then 2|3, 4|5; synthetic blanks excluded from counts. Single advances one page. Resizing preserves selected page.

## Milestone 1 — Model and fixtures

- Package/build/strict types/unit tests/minimal development viewer.
- Pure page/spread mapping, provider contract with page count/dimensions/cancellable raster/dispose.
- Original numbered asymmetric image fixtures.
- Acceptance: mapping/navigation for 1–5 pages; layout switch preserves logical page.

## Milestone 2 — Curved 3D

- Image fixtures first; orthographic camera, 40 width subdivisions, front/back materials, directional lighting, shadow receiver, lightweight page stacks.
- CPU spine-anchored cylindrical bend, normalized progress, preserved sheet length and flat endpoints.
- Double physical sheet turns; single consecutive-page transitions centered when settled.
- Forward/back, drag commit/reverse, 600ms default, one active turn and latest pending target only.
- Development progress scrubber. Visual captures at 0/25/50/75/100%: curvature, stable spine, correct textures, no clipping/flicker/intersection. Rigid rectangles fail acceptance.

## Milestone 3 — Documents and bounded rendering

- Lazy PDF.js with matching worker; URL/Blob/copied bytes, image provider.
- Visible first then adjacent, max two raster jobs, cancel obsolete jobs and reject stale generations.
- Honor PDF rotation; contain mixed sizes in first-page book dimensions without cropping.
- Configurable 96 MiB owned raster+texture budget including temporary allocations; evict/downscale before allocation. Texture edge max2048; DPR max2; re-render settled zoom.
- Preserve PDF.js range behavior; no promise of partial downloads without server support.
- Acceptance: 200 pages without whole-document rasterization, rapid navigation never stale, bounded owned allocations.

## Milestone 4 — Reader/fallback

- Toolbar previous/next/page/count/zoom/fit/fullscreen/original PDF.
- Auto single below720 container CSS px, double otherwise; zoom1–3; edge drag at fit, pan when zoomed, turn resets zoom.
- Pointer capture/cancel settled state; focused keyboard only, focus labels and page announcements.
- Flat fallback on absent/lost WebGL, explicit flat, reduced motion in auto. Same page/control behavior.
- Useful network/CORS/malformed/password/image/worker errors.
- Idempotent destroy cancels loads/workers/RAF/observers/listeners/URLs/textures/geometry.

## Milestone 5 — Distribution/demo

- npm ESM/types/CSS plus self-contained browser modules, lazy PDF support, matching worker/support assets relative to distribution; assetBaseUrl override.
- Namespaced styles and multiple viewers.
- Original sample magazine/image book, local PDF picker, inline/lightbox. Consumer demo imports built output.
- Docs for installation/self hosting/CORS/range/API/lifecycle/browsers/limits/notices.
- Acceptance: packed npm consumer and plain HTML static server including nested base URL.

## Milestone 6 — Verification/release

- CI typecheck/unit/build/browser tests. Local release archive, MIT/notices/changelog/verification report.
- Tests: odd/even/first/last/jump/reverse/layout; geometry endpoints/spine/finite normals/back texture/reversal; text/scanned/rotated/mixed/200-page/broken/malformed/password PDFs; rapid navigation/resize mid-turn/destroy loading/stale completion; keyboard/mouse/touch/zoom/pan/modal focus/two instances; WebGL absent/lost/reduced motion/no fullscreen; npm/browser/nested paths/missing worker; budget/idle animation/50 mount-destroy.
- Chromium, Firefox, WebKit desktop/mobile. Real mobile device if available, otherwise explicitly unverified.
- Record real frame times with hardware context; target60Hz after textures ready, no universal performance claim. Inspect rendered frames.

## Execution

Test-first behavior changes; record commands/results and visual evidence in PROGRESS.md. Focused commit per verified milestone. Do not expand deferred scope or substitute a rigid flip. Milestone2 is first major visual gate. Finish with runnable demo, packaged library, documentation and honest verification report. Clarify only if a discovered constraint requires changing the specification.
