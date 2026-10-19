# Folio3D 0.3.0 performance

Matched local measurements on 2026-10-19 compare the v0.2.1 distribution with the final v0.3.0 runtime. Initial minified entry gzip size fell from **142,377 to 11,993 bytes (91.6%)**. Flat/reduced-motion readers skip Three.js entirely. PDF modules, workers and source files are separate transfers; this is not the total download size of a PDF reader.

## Hardware GPU

Chromium 153.0.8010.12 with ANGLE Direct3D11 on this machine's AMD Radeon 880M:

| Profile          | Renderer | First ready, 0.2.1 → 0.3.0 | Adjacent preparation, 0.2.1 → 0.3.0 |
| ---------------- | -------- | -------------------------- | ----------------------------------- |
| Desktop          | Flat     | 196.6 → 187.3 ms           | 17.2 → 17.5 ms                      |
| Desktop          | WebGL    | 269.3 → 264.4 ms           | 40.3 → 11.3 ms                      |
| Mobile emulation | Flat     | 516.6 → 469.2 ms           | 32.0 → 29.8 ms                      |
| Mobile emulation | WebGL    | 715.4 → 699.6 ms           | 74.6 → 40.6 ms                      |

Default WebGL adjacent preparation improves by **72.0% on desktop and 45.6% in mobile emulation**, exceeding the 20% target. Warmed hardware-GPU frame p50 remains 16.7 ms and p95 remains **16.8 ms**. Startup and frame times remain within the 10% regression limit in this hardware run. Flat PDF preparation is broadly unchanged; PDF.js frame scheduling remains the main floor.

## Software GPU limitation

The corresponding SwiftShader run records first-ready medians of 154.6/461.7 ms on desktop (flat/WebGL) and 433.5/861.1 ms in mobile emulation. WebGL adjacent preparation improves from 50.5 to 15.7 ms on desktop and 84.9 to 42.0 ms on mobile.

Software-renderer frame p95 increases from **33.5 to 50.0 ms**, with p50 unchanged at 33.3 ms. A separate isolated frame-only pair reproduced 33.4 versus 50.0 ms. Thus the frame regression target is met on the real GPU and **is not met on SwiftShader**. This limitation is recorded rather than generalized into a universal frame-rate claim. Browsers using software WebGL may prefer the existing `renderer: 'flat'` option.

## Method

- Windows 11, AMD Ryzen AI 9 365, 28 GiB RAM; separate real-AMD-GPU and SwiftShader measurements.
- Ten fresh browser contexts per case, identical local HTTP server, sample PDF, viewport and browser version. Desktop 1200×900; mobile 390×844 with 4× Chromium CPU throttling. These are desktop-hosted contexts, not physical phones. GPU driver shader caches may persist across contexts.
- First-ready includes module import, document/worker initialization and first render. Navigation uses `next()` after one animation frame at page 2, with duration 0 to isolate preparation from the intentional turn duration.
- Warmed frames use an image book, two warmup turns and six measured 600ms turns, without concurrent browser test suites.
- `scripts/benchmark-release.mjs LABEL` saves a distribution snapshot and raw samples under `artifacts/benchmarks/LABEL/`. `--reuse` reruns a preserved snapshot; `--library PATH` selects a baseline distribution. On Windows, `--hardware` selects full Chromium with ANGLE D3D11; verify the reported GPU. `--frames-only` writes a separate frame report without replacing the cold-load report.

Initial exploratory runs used a fixed page jump, which was not adjacent in single-page mode; those runs are excluded. The table uses the corrected matched baseline-hardware/release-hardware runs. Raw reports for both renderer configurations ship with local release evidence.
