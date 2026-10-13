# Folio3D verification

## Version 0.2.1 — 2026-10-13

Added a separate minified ES module graph and `.min.css` alias without changing runtime source. The initial missing-file regression failed with HTTP 404 before implementation. Final typecheck, 16 unit tests and production library/demo builds passed; **54/54 packed-package checks passed** across Chromium, Firefox and WebKit at desktop/touch sizes. The checks exercise regular and minified PDF consumers, navigation, thumbnails, bookmarks, worker failures, themes, minified lazy imports and actual WebGL page turns. The `/min` TypeScript declarations compile without Vite ambient types.

The entry measures 570,295 bytes versus 669,447 bytes for the regular entry: 14.8% smaller before transfer compression. CSS was already minified and is copied unchanged to its explicit `.min.css` alias. Independent review confirmed asset-base resolution, complete minified import graph, exports, license comments/notices and package inclusion. Physical-device and hardware-GPU limitations from v0.2.0 still apply.

## Version 0.2.0 — 2026-10-13

Reader navigation (six-at-a-time thumbnails, PDF/custom contents, bookmarks), four themes, demo integration and GitHub/CDN packaging were checked locally on the same Windows browser matrix below.

- TypeScript, library/demo production builds and all 16 unit tests passed.
- Full browser run: **294 passed, 12 intentional skips**. After review fixes for bookmark synchronization and thumbnail budget accounting, the focused navigation suite passed **66/66** across Chromium, Firefox and WebKit desktop/touch configurations.
- Production demo applications: **48/48 passed**.
- Actual packed npm and nested plain-module consumers: **36/36 passed**, including PDF thumbnails, bookmarks, all four themes, matching lightbox theme, mobile overflow and missing-worker errors. Vanilla TypeScript declarations also passed without Vite ambient types.
- Theme screenshots were captured in every configuration. Modern desktop/mobile and Midnight desktop were visually inspected. An older demo background override that obscured Midnight contrast was removed; its toolbar/stage colors now have explicit regression checks.
- Independent core review identified focus loss when pagination/removal replaced controls and stale same-document bookmark overwrites. Both were reproduced, fixed and covered. Thumbnails now reserve a bounded portion of `memoryBudgetMB`; the 1 MiB case passed with reader and thumbnail allocations summed.
- Dependency audit after pinning the ZIP builder to fflate 0.8.3: zero reported vulnerabilities.

Archives are built by `npm run release`; `npm run publish:github -- --dry-run` validates their SHA-256 checksums and prints the intended repository/tag/assets without publishing. Actual hosted release/CDN status must be checked separately from these local checks. Physical phones, real iOS Safari and hardware-GPU frame rates remain unverified. The optional release workflow is supplied as a template in `docs/` because the current GitHub login cannot install workflows; it has not been claimed as a hosted CI pass.

## Version 0.1.0 — 2026-10-12

Verified local release. Original MIT code, original sample publications and no public deployment or npm publishing. The approved scope is recorded in PLAN.md; PROGRESS.md records milestone evidence and implementation rulings.

## Additional demo apps — 2026-10-12

The repository now includes a catalog with section navigation, a single-page portfolio with project notes, and a bookshelf with PDF/image lightboxes and a local PDF picker. The homepage links to all three. Twelve original SVG pages and their deterministic generator are included.

`npm run test:demos` passed **48 checks, 0 failures** against the production `demo-dist` build: Chromium, Firefox and WebKit, each at desktop 1200×900 and mobile 390×844 sizes. These checks cover homepage routes, section/project navigation, current-page lightbox opening, Escape and focus restoration, all three bookshelf publications, local PDFs without upload requests, viewport overflow, reduced-motion fallback, browser Back navigation and persisted page transitions. WebKit's pointer-click focus behavior is handled explicitly by focusing the opening control before creating a dialog. Inline readers remain mounted when a page enters the browser's back/forward cache; an independent review also verified an actual cached Chromium Back navigation with `pageshow.persisted === true`.

Type checking, all 16 unit tests, the library build and the multipage demo build passed. Desktop and mobile screenshots of the new pages are saved as `artifacts/demo-{catalog,portfolio,bookshelf}-<project>.png`; desktop catalog/bookshelf and mobile portfolio layouts were visually inspected. Mobile results emulate browser viewports; physical-device behavior remains unverified. The updated README and demo website are local artifacts; this work does not deploy the new examples to the public domain.

## Page dragging and sound follow-up — 2026-10-12

Pages can now be grabbed across their interior. Double-page mode follows the selected side; single-page swipes follow movement direction. Short/cancelled drags settle back, central taps stay put, edge taps still navigate, and zoomed drags still pan. A small fixed camera angle exposes the existing cylindrical sheet curvature and cast shadows. Captures in `artifacts/drag/<project>/curved-page.png` show held turns; Chromium forward/drag, Firefox reverse and WebKit mobile frames were visually inspected.

Optional paper sound is synthesized locally with Web Audio. The main playground enables it after user interaction; the library defaults to silent and exposes `sound`, `setSound()`, `soundchange` and a labelled toolbar toggle. Playback activation, completed-turn playback, muted/cancelled behavior and idempotent context disposal passed in Chromium and Firefox at both viewport sizes. This Windows WebKit build exposes no `AudioContext`, so four real-audio cases skip; unavailable/blocked audio navigation and sound preference behavior pass in all six configurations. Speaker/headphone audibility and physical mobile audio remain unverified.

A fresh read-only review identified first-interaction audio through the page input/consumer controls and navigation racing a held pointer before movement begins. Both defects were reproduced, fixed and re-reviewed without remaining findings. The packed TypeScript consumer also checks the new sound API without `vite/client`. CI builds the self-referenced package declarations before checking demo imports. The complete browser run below includes the additional demo apps in the current workspace.

## Environment

Windows 11 (10.0.26200), AMD Ryzen AI 9 365 with Radeon 880M, 28 GiB reported system RAM, 20 logical processors. Node.js 25.6.1, npm 11.9.0, Playwright 1.63.0. Runtime dependencies are pinned to Three.js 0.186.1 and PDF.js 6.4.299; the committed npm lockfile pins the toolchain.

| Browser engine | Version       | Configurations                          |
| -------------- | ------------- | --------------------------------------- |
| Chromium       | 153.0.8010.12 | Desktop 1200×900; touch context 390×844 |
| Firefox        | 155.0         | Desktop 1200×900; touch context 390×844 |
| WebKit         | 26.6          | Desktop 1200×900; touch context 390×844 |

The mobile configurations emulate viewport size and touch input on this Windows machine. They are not physical phones. Some model/lifecycle tests deliberately keep a fixed-size reader; dedicated responsive and showcase tests constrain the reader to the mobile viewport.

## Final checks

| Command                                                                          | Observed result                                                            |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `npm run typecheck`                                                              | Passed, strict source/demo/test type checking                              |
| `npm test`                                                                       | 16 passed in 3 files                                                       |
| `npm run build`                                                                  | Passed, ESM, declarations, CSS, matching worker/support assets             |
| `npm run build:demo`                                                             | Passed, static consumer showcase                                           |
| `npm run test:browser`                                                           | 240 passed, 12 recorded skips, 0 failures; six projects, 252 total cases |
| `npm run test:package`                                                           | 30 passed, 0 failures; real installed archive and plain-module hosting     |
| `npm run test:browser -- --project chromium --grep "records warmed" --workers 1` | Passed; controlled timing run after other suites finished                  |

Five timing cases are skipped because timings are recorded once in desktop Chromium; three touch-only cases are skipped in desktop configurations; four real-audio cases skip in this WebKit build without Web Audio. The same touch interaction runs in all three touch configurations. Missing-WebGL tests intentionally emit Three.js context-creation errors before falling back successfully. The demo build emits a chunk-size advisory for bundled Three.js; it is not a build failure. The core library is about 658 kB uncompressed / 150 kB gzip; PDF support is a separate lazy chunk of about 620 kB / 164 kB gzip, excluding worker/support data.

The additional `npm run test:browser -- --grep "touch viewport"` check passed in all 3 touch projects (3 desktop skips), including native Chromium touch dragging. Touch taps run in all three touch configurations. Chromium injects native touchStart/touchMove/touchEnd input to verify dragging; cross-engine mouse drags cover the shared Pointer Events/capture path. Physical touch dragging on Firefox/Safari devices remains unverified.

`npm run release` passed and produced a local npm archive, SHA-256 sidecar and full release folder. No publication was performed.

CI performs type checking, unit tests, both builds, all browser projects and packed consumers using Node.js 24 and the lockfile-pinned browser tooling.

## Coverage and visual evidence

Unit checks cover one-based page/spread mapping for 1–5 pages, boundaries, layout changes, flat geometry endpoints, anchored spine, preserved arc length, finite vertices/normals, concurrency, budget reservations, stale completion and protection of displayed surfaces during failed replacement.

Browser checks cover text, scanned, mixed-size/rotated, encrypted, malformed, missing and 200-page PDFs; copied bytes and local Blobs; isolated asset paths for concurrent documents; queued navigation; reverse/partial/complete/cancelled drags; zoom/pan and zoom during turns; loading/turn resize; focused keyboard navigation; two viewers; modal Escape/focus restoration; WebGL absence/context loss; reduced motion; unavailable fullscreen; loading destruction; worker termination; idle animation; immediate WebGL context release; and 50 mount/destroy cycles per browser configuration.

The 200-page check opens the document and rasterizes one requested page, rather than every page. The scheduler tests enforce a 1 MiB budget during repeated distant navigation and a 1.83 MiB budget when a replacement fails. The budget covers owned canvas pixels and conservative matching GPU texture capacity, including reserved work. It does not measure total browser/tab memory, PDF.js internal caches, source buffers, decoder internals, driver allocations, geometry or shadow maps.

Packed checks install the actual npm archive into a separate consumer, validate declarations without `vite/client`, build the consumer with Vite, and run it alongside a plain browser-module consumer under a nested URL. They also exercise missing-worker errors, lazy PDF loading, the static showcase, a local PDF file, modal behavior and mobile overflow.

Geometry screenshots are saved separately for all six projects under `artifacts/geometry/<project>/`. Forward frames at 0%, 25%, 50%, 75% and 100%, reverse turns and single-page endpoints were visually inspected. They show texture orientation, fixed spine, curvature and settled alignment; this gate combines visual review with geometry assertions, rather than treating a screenshot capture as a visual assertion. Desktop and mobile showcase captures are under `artifacts/demo-*.png`.

The full local release bundle includes these generated artifacts. They are ignored by Git and are not included in the smaller npm archive.

## Timing measurement

Headless Chromium, 1200×900 viewport with a 900×650 reader, DPR 1, default 600 ms turns, two warm-up turns and six measured turns. One Playwright worker; no other integration suite ran concurrently. The follow-up run with the angled camera recorded 132 sampled frame intervals: median **33.30 ms**, p95 **33.40 ms**, maximum **100.10 ms**.

Chromium reported ANGLE/Vulkan **SwiftShader**, a software renderer, on the hardware described above. The 60 Hz target was **not consistently achieved** in this environment. Hardware-accelerated GPU and real-mobile timings remain unverified; no universal smoothness claim is made. Raw requestAnimationFrame intervals and metadata are written to `artifacts/performance.json`. These are presentation intervals during warmed turns, not isolated CPU geometry time or GPU execution time.

## Review fixes

A fresh read-only review identified and led to regression fixes for exported declarations referencing absent CSS, zoom rerasterization cancelling navigation/held drags, eviction of displayed surfaces before replacements succeeded, a global PDF worker URL race during Blob conversion, and zoom debounce interrupting panning. Additional release checks exposed and fixed first-load context loss, first-load responsive resize and delayed WebGL context disposal. Each behavioral defect was reproduced before its fix.

## Limits and unverified environments

- A physical Android/iOS device was unavailable; real mobile-device smoke testing is **unverified**. Playwright WebKit is not proof of Safari/iOS behavior.
- Installed Edge, production Safari and hardware-accelerated GPU performance were not independently measured. Chromium/Firefox/WebKit engine coverage is recorded above.
- Fullscreen absence is simulated. Native fullscreen permissions and platform UI vary by browser.
- Network failures and missing assets are exercised locally. Cross-origin deployments require correct server CORS/range/CSP policy; no claim is made that every PDF downloads only selected byte ranges.
- Rasterized PDFs have no selectable text or interactive annotations. Passwords and all other deferred features remain outside v0.1.
- CI is configured in `.github/workflows/ci.yml`; a hosted GitHub Actions run has not been performed because this task does not push or publish.
- PDF/image decoder and driver memory are outside the owned-surface budget. Large source files may still consume significant total tab memory.
