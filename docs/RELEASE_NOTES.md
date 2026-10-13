Folio3D 0.2.1 adds explicit minified browser files to the reader-navigation release.

- `folio3d.min.js`: fully minified ES module, with minified lazy PDF chunks. The entry is about 14.8% smaller before HTTP compression than `folio3d.js`.
- `folio3d.min.css`: explicit filename for the already-minified stylesheet.
- Typed `folio3d/min` and `folio3d/style.min.css` npm exports.
- Original JavaScript/CSS entry points, public API, worker assets, themes and navigation remain supported.
- Legal comments and dependency license files are preserved.

CDN JavaScript: `https://cdn.jsdelivr.net/gh/sujaysreedhar/folio3D@v0.2.1/dist/folio3d.min.js`
CDN CSS: `https://cdn.jsdelivr.net/gh/sujaysreedhar/folio3D@v0.2.1/dist/folio3d.min.css`

Downloads include both regular and minified variants:

- **browser.zip**: ready-to-host library, matching PDF assets, licenses, sample PDF and example HTML.
- **website.zip**: complete static playground and three example apps; extract its contents onto your static host.
- **.tgz**: installable npm package with TypeScript types; `npm install https://github.com/sujaysreedhar/folio3D/releases/download/v0.2.1/folio3d-0.2.1.tgz`.
- **SHA256SUMS.txt**: checksums for all three packages.

The minified entry needs its sibling chunks and assets. Preserve the entire distribution directory when self-hosting. See the [README](https://github.com/sujaysreedhar/folio3D#readme) and [publishing guide](https://github.com/sujaysreedhar/folio3D/blob/main/docs/PUBLISHING.md). This release does not update the custom-domain host or publish to the npm registry. Version 0.2.0 remains available at its original URLs.
