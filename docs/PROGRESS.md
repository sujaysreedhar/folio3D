# Folio3D execution ledger — docs/PLAN.md

- [x] Milestone 1: model and fixtures
- [x] Milestone 2: curved 3D renderer
- [ ] Milestone 3: providers and render scheduler
- [ ] Milestone 4: reader interaction and fallback
- [ ] Milestone 5: distribution and demo
- [ ] Milestone 6: release verification

## Pre-flight

Empty repository, no existing tests or implementation. Shared contracts: controller→renderer uses logical snapshots; provider→scheduler returns owned canvas surfaces; scheduler→renderer owns lifetime until view/turn changes; UI→controller uses public handle.

Ruling: work in the existing empty checkout on codex/folio3d — unborn repository has no commit from which to create a worktree; no existing user implementation can be disturbed.

Ruling: user-approved in-chat specification is saved as PLAN.md and serves as both design and implementation authority; use this persistent tracked ledger rather than shell-specific skill scripts.

## Milestone 1

Model tests observed RED (9 failed against placeholders) then GREEN (9 passed). Original SVG and PDF fixtures generated, including 200 pages, scanned and rotated/mixed sizes. TypeScript6 required an explicit declaration rootDir; fixed configuration. Sandbox blocks npm DNS and Vitest temp renames; approved setup/check commands run outside it. Dependencies pinned: Three0.186.1, PDF.js6.4.299, Vite8.3.4, Vitest4.1.11.

## Milestone 2

Geometry tests RED (flat placeholder failed endpoints/curvature), GREEN13/13. Chrome browser inspection passed. Viewed forward0/25/50/75/100%, reverse and single frames in artifacts/geometry; corrected initial stack positions and material consistency found in visual inspection. Sheet is an integrated unit tangent with sinusoidal curvature and40 width segments, stable spine and oriented reverse texture. No idle render loop in renderer. Full turn scheduling and pointer reversal integrate with the controller in milestone4.

Ruling: use installed Chrome for the initial visual gate — current Playwright browser download was slow, stopped after20%; full Firefox/WebKit verification will use installed compatible engines or install required versions before release. Cost if unsupported: report exact unverified browser coverage rather than imply it passed.
