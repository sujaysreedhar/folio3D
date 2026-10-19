# Folio3D 0.3.0 execution plan

Approved in chat on 2026-10-19. Preserve existing APIs and browser-only processing.

1. Themes: add Ocean, Forest, Slate, High Contrast; typed eight-token overrides, copied state and themechange; root/lightbox parity; CSS overrides remain supported.
2. Performance: baseline measurements, lazy WebGL alongside provider initialization, reusable priority prefetch for full adjacent spreads, bounded allocations, stable frame setup and resize coalescing.
3. Usability/demo: compact controls below 720 container pixels with 44px targets and accessible More panel; eight presets and custom override examples in the demo, synchronized with lightboxes.
4. Verification/release: all existing checks and targeted regressions, matched benchmarks, 0.3.0 package/docs/assets.
5. Publication: push verified source, deploy demo-dist to docs branch root preserving CNAME and .nojekyll, verify hosted themes/assets/PDF/examples and record deployed commits.

Performance goals: at least 50% less compressed initial flat-reader JS; at least 20% less median adjacent-turn preparation; investigate startup/frame regressions above 10%. Never label an unmeasured goal achieved.

Defaults: Classic remains default. Preset changes preserve overrides; setThemeOverrides({}) clears overrides. JavaScript overrides supersede host CSS. No visual theme editor or system-theme feature.
