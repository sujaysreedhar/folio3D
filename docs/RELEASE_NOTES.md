Folio3D 0.2.0 adds reader navigation and four themes to the 3D PDF/image flipbook.

- Browse six lightweight page thumbnails at a time, within the configured canvas budget.
- Jump through nested PDF contents (including named destinations), or provide custom image-book contents.
- Bookmark pages, optionally persist them locally, and synchronize inline/lightbox readers for the same document.
- Switch between Classic, Modern, Sepia and Midnight without reopening a book.
- Keyboard focus, navigation cleanup and graceful storage failure handling.

Downloads:

- **browser.zip**: ready-to-host library, matching PDF assets, licenses, sample PDF and example HTML.
- **website.zip**: complete static playground and three example apps; extract its contents onto your static host.
- **.tgz**: installable npm package with TypeScript types; `npm install https://github.com/sujaysreedhar/folio3D/releases/download/v0.2.0/folio3d-0.2.0.tgz`.
- **SHA256SUMS.txt**: checksums for all three packages.

CDN JavaScript: `https://cdn.jsdelivr.net/gh/sujaysreedhar/folio3D@v0.2.0/dist/folio3d.js`  
CDN CSS: `https://cdn.jsdelivr.net/gh/sujaysreedhar/folio3D@v0.2.0/dist/folio3d.css`

See the [README](https://github.com/sujaysreedhar/folio3D#readme), [publishing guide](https://github.com/sujaysreedhar/folio3D/blob/main/docs/PUBLISHING.md), and [verification report](https://github.com/sujaysreedhar/folio3D/blob/main/docs/VERIFICATION.md). This release does not publish to the npm registry or update the existing custom-domain host. PDF text selection/search, password entry, RTL and framework wrappers remain outside this release. MIT; bundled dependencies retain their own licenses.
