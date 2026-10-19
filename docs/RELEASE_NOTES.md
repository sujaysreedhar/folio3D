Folio3D 0.3.0 adds more themes, custom embed styling, lazy 3D loading and simpler mobile controls.

- Eight presets: Classic, Modern, Sepia, Midnight, Ocean, Forest, Slate and High Contrast.
- Typed `themeOverrides` and `setThemeOverrides()` for colors and font families, applied consistently to readers and lightboxes. Existing CSS variables still work.
- Three.js loads only when WebGL is needed; PDF initialization and renderer loading overlap.
- Relevant in-flight prefetches survive navigation; both pages of adjacent spreads are prepared with visible work taking priority.
- A compact More disclosure below 720 reader pixels, with 44px controls, keyboard dismissal and focus restoration.
- The demo offers all themes, a custom palette and copyable JavaScript/CSS examples.

Existing navigation methods, sources, Classic defaults, flat fallback and allocation budgets remain supported. Theme changes preserve the current page and do not recolor publication content. No font downloads or telemetry are added.

CDN JavaScript: `https://cdn.jsdelivr.net/gh/sujaysreedhar/folio3D@v0.3.0/dist/folio3d.min.js`
CDN CSS: `https://cdn.jsdelivr.net/gh/sujaysreedhar/folio3D@v0.3.0/dist/folio3d.min.css`

Downloads include the browser ZIP, website ZIP, npm TGZ, and SHA-256 checksums. Keep the entire matching `dist/` directory, including lazy WebGL/PDF chunks and worker/support assets, when self-hosting. npm registry publication remains separate.

The website is published to the existing GitHub Pages `docs` branch with its custom domain preserved. Verification and matched benchmark evidence are recorded in `docs/VERIFICATION.md`.
