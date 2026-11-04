# Folio3D

Turn PDFs and images into interactive 3D flipbooks for catalogs, magazines, portfolios and digital libraries. Folio3D is an MIT-licensed, framework-independent JavaScript library powered by Three.js and PDF.js.

**[Try the live demo → folio3d.sujaysreedhar.com](https://folio3d.sujaysreedhar.com)**

## Features

- Curved page turns with lighting, shadows and a flat-page fallback.
- PDF URLs, local PDF files, byte arrays and ordered image collections.
- Responsive single-page and two-page layouts, zoom, pan and fullscreen where supported.
- Inline viewers and modal lightboxes, with keyboard and pointer navigation.
- Optional page-turn sound with a mute control in the reader toolbar.
- Page thumbnails, nested PDF/custom contents, and bookmarks with optional browser persistence.
- Eight themes: Classic, Modern, Sepia, Midnight, Ocean, Forest, Slate and High Contrast. Switch themes or apply custom colors/fonts without reopening the book.
- Browser-only document processing. Local files stay on your device; no backend, account or upload is required.
- Plain HTML and npm/bundler integration, with self-hosted PDF workers and support assets.

## Try it on the website

1. Open **[folio3d.sujaysreedhar.com](https://folio3d.sujaysreedhar.com)** in a modern browser.
2. Choose **Image book** or **Sample PDF** to try a bundled publication.
3. Turn pages with the toolbar arrows or by dragging a page. In a spread, drag the right page left to advance or the left page right to return. In single-page mode, swipe left or right from anywhere on the page. The **Sound on/off** button toggles the paper rustle. Select the viewer and use **Left/Right**, **Home/End**, **+ / −**, or **0** to fit. You can also enter a page number in the toolbar.
4. Choose **Open your PDF** to read a file from your device. It is processed locally in your browser.
5. Use **Open lightbox** for a larger reading view. Press **Escape** or select **Close** to return. The PDF reader also offers **Original PDF** to open the document in the browser's native reader.

The website is a working example of the library. To embed a book on your own site, follow the integration examples below.

## Demo apps included in this repository

The homepage links to three additional examples. They are built alongside the main playground by `npm run build:demo`; publish the updated `demo-dist` directory to add them to the hosted website.

| Demo                       | Route                   | What to try                                                                                          | Source                                      |
| -------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Form & Field catalog**   | `/demos/catalog.html`   | Browse an original homeware catalog, jump to a section, then open the current spread in a lightbox.  | [catalog.html](demo/demos/catalog.html)     |
| **Studio North portfolio** | `/demos/portfolio.html` | Explore a single-page design portfolio. Project shortcuts and descriptions follow the selected page. | [portfolio.html](demo/demos/portfolio.html) |
| **The reading room**       | `/demos/bookshelf.html` | Open three publications from a bookshelf or choose your own local PDF. Each opens in a modal reader. | [bookshelf.html](demo/demos/bookshelf.html) |

All sample artwork is original and included in the repository. Demo interactions use the public Folio3D API; they do not add dependencies to the library.

## Run locally

Clone or download this repository, open a terminal in its root directory, and use **Node.js 24** (the CI version; minimum 22.13) and **npm**. No backend, database, API key or account is required:

```sh
npm ci
npm run build
npm run dev
```

Use `npm ci` to install the versions in `package-lock.json`. The first build creates the library, declarations and PDF worker/support assets consumed by the demo. Starting Vite before building can produce missing-package or missing-asset errors.

Open the URL printed by Vite (normally `http://127.0.0.1:5173`). The main playground and all three demo apps are available from the homepage. The demo consumes the built package, so run `npm run build` again after changing library code. Vite reloads changes to the demo's HTML, TypeScript and CSS automatically.

### Build and host the demo website

```sh
npm run build
npm run build:demo
npm run preview
```

Preview the production site at [http://127.0.0.1:4173](http://127.0.0.1:4173). Upload the **contents of `demo-dist/`** to your static host to deploy it, including `demos/`, `samples/`, `assets/`, `lib/` and license files. Use `npm run build` before `npm run build:demo` so the website has matching library and PDF assets and an up-to-date copy of this README.

Relative build paths support hosting at the domain root or in a subdirectory. Serve `.mjs` and `.js` files as JavaScript and `.wasm` files as `application/wasm`. Do not open HTML with `file://` URLs: module scripts and workers require HTTP(S).

### Customize the examples

- Edit [demo/index.html](demo/index.html) and [demo/site.css](demo/site.css) for the homepage.
- Edit [demo/demos/publications.ts](demo/demos/publications.ts) to change demo sources and section labels. Use your own image URLs or a PDF source.
- Edit the individual demo HTML files for layout and copy; [shared.ts](demo/demos/shared.ts) contains the common viewer setup and [bookshelf.ts](demo/demos/bookshelf.ts) handles the reading room.
- Edit [scripts/demo-assets.mjs](scripts/demo-assets.mjs) and run `npm run demo:assets` to regenerate the catalog and portfolio SVG pages. Generated artwork is checked in, so this step is only needed when changing the samples.

## Plain HTML / browser modules

### Use the CDN

The versioned GitHub release is available through jsDelivr. Keep the JavaScript and CSS on the same version:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/sujaysreedhar/folio3D@v0.3.0/dist/folio3d.min.css"
/>
<div id="book" style="height:600px"></div>
<script type="module">
  import { createFlipbook } from 'https://cdn.jsdelivr.net/gh/sujaysreedhar/folio3D@v0.3.0/dist/folio3d.min.js';
  const book = createFlipbook(document.querySelector('#book'), {
    source: { type: 'pdf', data: './catalog.pdf' },
    theme: 'modern',
    storageKey: 'catalog-2026-v1',
  });
  await book.ready;
</script>
```

Worker and support assets resolve from the same CDN version automatically. Cross-origin workers need `worker-src blob:` when a Content Security Policy is in use; see [publishing and CSP notes](docs/PUBLISHING.md).

The `.min.js` entry and its lazy PDF chunks are fully minified. The `.min.css` file is an explicit alias for the already-minified stylesheet. Regular `folio3d.js` / `folio3d.css` files remain available. Preserve the entire `dist/` directory when self-hosting, including `chunks/min/`, worker assets and licenses.

### Download and self-host

Get the [browser ZIP](https://github.com/sujaysreedhar/folio3D/releases/download/v0.3.0/folio3d-0.3.0-browser.zip), [website ZIP](https://github.com/sujaysreedhar/folio3D/releases/download/v0.3.0/folio3d-0.3.0-website.zip), or [all release assets and checksums](https://github.com/sujaysreedhar/folio3D/releases/tag/v0.3.0). The browser ZIP includes `example.html` and a sample PDF; serve it over HTTP(S).

Copy the entire `dist` directory to `lib` on your static server. Preserve `chunks`, `assets` and license files alongside the entry point. No CDN or runtime package resolution is needed.

```html
<link rel="stylesheet" href="./lib/folio3d.css" />
<div id="book" style="height:600px"></div>
<script type="module">
  import { createFlipbook } from './lib/folio3d.js';
  const book = createFlipbook(document.querySelector('#book'), {
    source: { type: 'pdf', data: './catalog.pdf' },
  });
  await book.ready;
  book.goToPage(4);
  // When removing the view: book.destroy();
</script>
```

The viewer fills its container. Set a positive height; width is responsive. Default worker/support URLs resolve relative to the distributed library, including nested hosting paths.

## npm / bundler integration

Install the downloadable GitHub package directly. This release does not require npm registry publication:

```sh
npm install https://github.com/sujaysreedhar/folio3D/releases/download/v0.3.0/folio3d-0.3.0.tgz
```

Or build and install a local archive:

```sh
npm run release
# In your consuming project:
npm install /path/to/folio3d/artifacts/folio3d-0.3.0.tgz
```

```ts
import { createFlipbook } from 'folio3d';
import 'folio3d/style.css';

const book = createFlipbook(container, {
  source: { type: 'pdf', data: '/catalog.pdf' },
  assetBaseUrl: '/folio-assets/',
});
await book.ready;
```

For bundler integrations, copy `node_modules/folio3d/dist/assets` to your application's public `folio-assets` directory. Example Node build step:

```js
import { cp } from 'node:fs/promises';
await cp('node_modules/folio3d/dist/assets', 'public/folio-assets', { recursive: true });
```

Serve these assets unchanged from the **same installed version** as the main package. Include their license files when redistributing. `assetBaseUrl` may be an absolute URL or a page-relative path. PDF.js is loaded lazily; image-only books do not load PDF chunks or start PDF workers.

An explicit minified npm entry is also available as `import { createFlipbook } from 'folio3d/min'`, with `import 'folio3d/style.min.css'`. Both use the same TypeScript declarations. The default `folio3d` entry retains annotations useful to application bundlers.

## Sources and options

```ts
// Image URLs in reading order
{ source: { type: 'images', pages: [
  { src: '/page-1.jpg', alt: 'Cover' },
  { src: '/page-2.jpg', alt: 'Introduction' },
] } }

// URL, File/Blob, or Uint8Array
{ source: { type: 'pdf', data: fileInput.files[0] } }
```

Caller-owned byte arrays are copied before PDF.js receives them. URLs follow normal browser CORS rules. Local files are read on the device. The current canvas reader announces page numbers; image `alt` metadata is retained in the source contract for future text-based presentation, but is not a substitute for accessible document content. PDFs have an Original PDF link for the native reader.

| Option           | Default                | Meaning                                                                                   |
| ---------------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| `renderer`       | `auto`                 | `auto`, `webgl`, `flat`; unavailable/lost WebGL falls back to flat                        |
| `pageMode`       | `auto`                 | `auto`, `single`, `double`; auto switches below 720 container pixels                      |
| `initialPage`    | `1`                    | One-based starting page                                                                   |
| `assetBaseUrl`   | Distribution-relative  | Directory containing worker, cmaps, standard_fonts, wasm and page-turn.wav                |
| `memoryBudgetMB` | `32` or `96`           | Owned raster/texture allocation budget; minimum 1 MiB                                     |
| `maxPixelRatio`  | `1.5` or `2`           | Maximum raster/WebGL pixel ratio; accepts 0.5–3                                           |
| `duration`       | `600`                  | Full page-turn duration in milliseconds; zero is immediate                                |
| `sound`          | `false`                | Enable the recorded page-turn sound after a user interaction                              |
| `label`          | `Interactive flipbook` | Accessible region/dialog name                                                             |
| `theme`          | `classic`              | `classic`, `modern`, `sepia`, `midnight`, `ocean`, `forest`, `slate`, `high-contrast`     |
| `themeOverrides` | `{}`                   | Partial `ThemeTokens`: ink, paper, stage, muted, border, hover, accent, font              |
| `contents`       | PDF outline or empty   | Nested `{ title, page?, children? }` entries; overrides PDF contents                      |
| `storageKey`     | unset                  | Unique document/version key for persistent local bookmarks; unset keeps them per instance |

Zoom is clamped to 1×–3×. Texture edges are capped at 2048 pixels; the rendering pixel ratio uses the adaptive cap or your explicit `maxPixelRatio`. Pages of different sizes/rotations fit the first page's book dimensions with white letterboxing. Double mode starts blank|1, then 2|3 and 4|5. Blank partners do not change the page count. Single mode moves one page at a time.

Sound uses the bundled `assets/page-turn.wav` recording through Web Audio. Set `sound: true` to enable it initially. The clip loads after an interaction with sound enabled, then its decoded buffer is reused for later turns. Keep it with the other distribution assets, or serve it from your configured `assetBaseUrl`; allow that location in your CSP `connect-src` policy. Cancelled drags, boundary navigation and changes within the same spread are silent. Missing or blocked audio leaves navigation usable. The main playground enables sound after interaction; the library default is silent.

## Handle and events

- `ready: Promise<void>` resolves after the document and initial view render. Handle rejection for bad sources/assets or cancellation.
- `next()`, `previous()`, `goToPage(page)` navigate. Await `ready` before page-range-dependent operations. Calls during initialization wait; during a turn, the latest pending target wins. Boundaries do nothing; invalid pages throw `RangeError` after count is known. Direct nonadjacent jumps are immediate after loading.
- `setZoom(scale)`, `resetZoom()` change the view. Turns reset zoom; zoom requested during a turn applies after settlement. Dragging pans while zoomed; dragging a page turns it at fit. Short drags reverse; edge taps also navigate.
- `setSound(enabled)` enables or mutes the page-turn sound. The toolbar also provides a sound toggle; browser audio permissions require a user interaction before playback.
- `setTheme(theme)` switches the reader and lightbox appearance. Additional preset IDs are `ocean`, `forest`, `slate`, and `high-contrast`. Custom overrides persist when switching presets. Theme colors do not recolor document pages; see [theme tokens](docs/THEMES.md).
- `setThemeOverrides(overrides)` replaces the custom token map; `{}` restores host CSS and the current preset. The same tokens apply to the lightbox header. Unknown tokens and invalid CSS values throw before changing the current theme.
- `getContents()` resolves nested contents after `ready`. PDF named and explicit internal destinations are resolved to one-based pages; external or invalid destinations remain labels. Contents trees are limited to 33 levels. A failed contents lookup can be retried.
- `getBookmarks()` returns a sorted copy. `toggleBookmark(page?)` adds/removes a page (defaults to current); await `ready` first. Active same-key readers synchronize, and other tabs receive browser storage events. Storage failure falls back to session state. Persistence is origin-local, never an upload or cross-device sync. Use a new key when changing a document's page ordering; local demo file uploads use session bookmarks.
- `on('loadprogress', callback)` reports PDF download bytes as `{ loaded, total? }`. The reader shows a progress bar while loading; the total is omitted when unknown. Download completion can precede parsing and rendering, so await `ready` before navigating.
- `getState()` returns a snapshot: `page`, `pageCount`, `visiblePages`, `zoom`, `sound`, `theme`, copied `themeOverrides`, resolved `pageMode`, `renderer`, and `status` (`loading`, `ready`, `turning`, `error`, `destroyed`).
- `on('pagechange' | 'zoomchange' | 'rendererchange' | 'soundchange' | 'themechange', callback)` delivers state snapshots. `on('bookmarkchange', callback)` delivers sorted page numbers; `on('error', callback)` delivers an `Error`. All return an unsubscribe function. Initial state is available via `ready`/`getState()`.
- `destroy()` is idempotent. It aborts loading/render work, terminates owned PDF workers, disconnects observers/listeners, cancels animation/timers, closes audio, releases textures/canvases/URLs and removes the viewer. Destroy during loading rejects `ready` with `AbortError`.

```ts
const off = book.on('pagechange', (state) => console.log(state.page));
book.on('error', (error) => console.error(error.message));
// off(); book.destroy();
```

`openFlipbook(options)` opens a native modal dialog and returns the same handle. Escape, Close, or `destroy()` closes it and restores previous focus.

Keyboard shortcuts apply only inside the focused viewer: Left/Right, Home/End, +/−, and 0 to fit. Form inputs retain their normal keyboard behavior. Pointer capture and cancellation are supported. Auto rendering respects reduced motion; explicit `webgl` opts into motion.

Below 720 reader pixels, the toolbar keeps navigation visible and puts zoom, fit, sound, bookmarks, fullscreen and Original PDF inside **More**. Escape closes More and restores focus. Controls use at least 44px touch targets. Three.js is loaded only for readers needing WebGL; flat and reduced-motion readers skip the renderer chunk.

## Hosting, memory and compatibility

Serve cross-origin PDFs/images with appropriate CORS response headers. PDF.js can use HTTP range requests when the source server permits them; otherwise it may download the entire PDF. No proxy is included. A CSP must permit your module scripts, source fetches, same-origin module workers and the image Blob URLs used for decoding; image decoding needs `img-src blob:`. Some PDF encoders use WebAssembly decoders; permit those according to your CSP deployment policy.

The raster/texture budget defaults to 32 MiB on devices reporting at most 4 GiB of memory or at most four logical processors, and 96 MiB otherwise. The pixel-ratio cap similarly defaults to 1.5 or 2. Set `memoryBudgetMB` and `maxPixelRatio` explicitly to override these hints; the latter is also limited by the device pixel ratio. A cap of 1.5 instead of 2 allocates about 44% fewer pixels at the same CSS size, with a sharpness tradeoff. These limits do not guarantee a particular frame rate. The budget conservatively accounts for owned canvas pixels plus matching GPU texture capacity, including reserved in-flight surfaces. It does **not** bound the source file, browser decoder buffers, PDF.js internals, driver overhead, geometry/shadow maps, or total tab memory. Up to 0.88 MiB (at most one eighth of the configured budget) is reserved for six thumbnails, capped at 120×160 each and scaled down for small budgets. Closing/changing the navigation view releases its canvases. At most two reader raster tasks and one serialized thumbnail task run concurrently. Visible reader pages have priority; adjacent pages prefetch unless the browser reports data-saving mode; unneeded cached pages are evicted. Displayed surfaces stay protected until a replacement succeeds. Lower budgets/resolution limits can reduce visual sharpness. No rendering loop runs while the book is idle.

Target modern Chrome/Edge, Firefox and Safari with ES modules, Pointer Events and ResizeObserver. WebGL2 provides 3D; flat mode still supports navigation/zoom. Fullscreen appears only when supported. Playwright WebKit is an engine check, not proof of real iOS device behavior. See [the verification report](docs/VERIFICATION.md) for tested versions, results and remaining limitations.

Not included in v0.2: search, selectable PDF text, interactive annotations, password-protected PDFs, RTL, hard covers, autoplay, framework/WordPress wrappers or DearFlip compatibility. Page curl is deterministic geometry, not a paper physics simulation.

## Develop and verify

For routine changes, run the following from the repository root, in this order:

```sh
npm ci
npm run build          # required before typecheck: the demo imports the built package
npm run typecheck
npm test
npm run build:demo
```

The browser suites add desktop and touch coverage in Chromium, Firefox and WebKit. On Ubuntu, install the matching browsers **and system dependencies** before running them:

```sh
npx playwright install --with-deps chromium firefox webkit
npm run test:browser
npm run test:demos
npm run test:package
```

The Linux test wrapper starts Xvfb for software WebGL. System-dependency installation may require administrator access. Browser downloads require access to Playwright's download hosts in addition to the npm registry. `test:package` builds real consumers of the packed library; it also needs the preceding library and demo builds. These checks do not publish anything.

Regenerating fixtures and preparing release archives are separate maintainer tasks; neither is required to start development:

```sh
npm run fixtures       # regenerate original SVG/PDF fixtures
npm run typecheck
npm test
npm run build
npx playwright install chromium firefox webkit
npm run test:browser
npm run build:demo
npm run test:demos     # test the built demo apps in desktop and mobile browser engines
npm run test:package
npm run release
```

### Recover from document loading errors

The homepage shows **Retry** when a publication fails to load. It retries the same file or URL without reloading the site, and keeps your sound preference. Choose another PDF if the file is damaged, missing or password-protected. PDF loading displays a percentage when the total size is known and downloaded bytes otherwise.

For an embedded reader, catch `book.ready` and show a retry control in your application. Destroy the failed reader before calling `createFlipbook` again with the same options. For document switching, destroy the current reader before creating the replacement; pending initialization rejects with `AbortError`, and stale progress cannot update the new reader. A local file conversion already in progress may finish internally after cancellation, but it will not create a PDF worker or install a reader.

### Troubleshooting builds and browser checks

| Symptom                                              | What to check                                                                                                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cannot resolve `folio3d`, declarations or PDF assets | Run `npm run build` before type checking, starting the demo or building the site. Rebuild after changing library code.                                                          |
| Browser executable missing or `xvfb-run` missing     | Run the Playwright install command above with `--with-deps`. Use the lockfile-pinned CLI rather than a global Playwright installation.                                          |
| Linux Firefox cannot create WebGL2                   | Use `npm run test:browser`, which starts the virtual display and checks graphics support, rather than invoking the whole matrix directly.                                       |
| WebKit reports `Network process crashed`             | Keep the pinned Playwright 1.64.0 and install its matching browsers. Earlier Linux builds had a native network-process crash; see [verification history](docs/VERIFICATION.md). |
| Packed consumer reports `ENOTCACHED`                 | Allow npm registry access. The package smoke test prefers cached files but may need metadata from the registry.                                                                 |
| Vite reports chunks larger than 500 kB               | This is an advisory for the lazy PDF/WebGL dependencies. Check the exit status and later CI steps before treating it as a build failure.                                        |

In GitHub Actions, open **Verify Folio3D → verify** and find the first failing step. Library compilation, demo compilation and browser checks are separate stages. Download `verification-evidence` for browser diagnostics; older failed runs remain visible after a fix. See [the verification report](docs/VERIFICATION.md) for the documented CI failures and fixes.

Geometry inspection at `/probe.html` in the development server includes a progress scrubber. It is excluded from the static demo build. Tests save visual frames under `artifacts`; release notes and the persistent milestone ledger live in `docs`.

Original code and sample publications are MIT-licensed. PDF.js, Three.js and bundled PDF support data retain their respective licenses; see THIRD_PARTY_NOTICES.md and dist/licenses.
