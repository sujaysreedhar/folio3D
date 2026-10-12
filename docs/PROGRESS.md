# Folio3D execution ledger — docs/PLAN.md

- [x] Milestone 1: model and fixtures
- [ ] Milestone 2: curved 3D renderer
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
