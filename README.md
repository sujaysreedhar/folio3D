# Folio3D

An MIT-licensed, framework-independent 3D PDF and image flipbook. Original curved-sheet rendering, browser-only document processing, responsive layouts and an accessible reader toolbar. No backend, account, uploads or telemetry.

## Run the demo

Use Node.js 22.13+ (or Node.js 24+) and npm:

```sh
npm ci
npm run build
npm run dev
```

Open the URL printed by Vite. The demo consumes the built package; rebuild after library changes. `npm run build:demo` creates a deployable static site in `demo-dist`; `npm run preview` serves it at http://127.0.0.1:4173. Do not open HTML with file:// URLs: module scripts and workers require HTTP(S).

## Plain HTML / browser modules

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

This project has not been published. Build a local package and install that specific archive:

```sh
npm run release
# In your consuming project:
npm install /path/to/folio3d/artifacts/folio3d-0.1.0.tgz
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

| Option           | Default                | Meaning                                                              |
| ---------------- | ---------------------- | -------------------------------------------------------------------- |
| `renderer`       | `auto`                 | `auto`, `webgl`, `flat`; unavailable/lost WebGL falls back to flat   |
| `pageMode`       | `auto`                 | `auto`, `single`, `double`; auto switches below 720 container pixels |
| `initialPage`    | `1`                    | One-based starting page                                              |
| `assetBaseUrl`   | Distribution-relative  | Directory containing worker, cmaps, standard_fonts, wasm             |
| `memoryBudgetMB` | `96`                   | Owned raster/texture allocation budget; minimum 1 MiB                |
| `duration`       | `600`                  | Full page-turn duration in milliseconds; zero is immediate           |
| `label`          | `Interactive flipbook` | Accessible region/dialog name                                        |

Zoom is clamped to 1×–3×. Texture edges are capped at 2048 pixels and DPR at 2. Pages of different sizes/rotations fit the first page's book dimensions with white letterboxing. Double mode starts blank|1, then 2|3 and 4|5. Blank partners do not change the page count. Single mode moves one page at a time.

## Handle and events

- `ready: Promise<void>` resolves after the document and initial view render. Handle rejection for bad sources/assets or cancellation.
- `next()`, `previous()`, `goToPage(page)` navigate. Await `ready` before page-range-dependent operations. Calls during initialization wait; during a turn, the latest pending target wins. Boundaries do nothing; invalid pages throw `RangeError` after count is known. Direct nonadjacent jumps are immediate after loading.
- `setZoom(scale)`, `resetZoom()` change the view. Turns reset zoom; zoom requested during a turn applies after settlement. Dragging pans while zoomed; outer-edge dragging turns pages at fit.
- `getState()` returns a snapshot: `page`, `pageCount`, `visiblePages`, `zoom`, resolved `pageMode`, `renderer`, and `status` (`loading`, `ready`, `turning`, `error`, `destroyed`).
- `on('pagechange' | 'zoomchange' | 'rendererchange', callback)` delivers state snapshots. `on('error', callback)` delivers an `Error`. Both return an unsubscribe function. Initial state is available via `ready`/`getState()`.
- `destroy()` is idempotent. It aborts loading/render work, terminates owned PDF workers, disconnects observers/listeners, cancels animation/timers, releases textures/canvases/URLs and removes the viewer. Destroy during loading rejects `ready` with `AbortError`.

```ts
const off = book.on('pagechange', (state) => console.log(state.page));
book.on('error', (error) => console.error(error.message));
// off(); book.destroy();
```

`openFlipbook(options)` opens a native modal dialog and returns the same handle. Escape, Close, or `destroy()` closes it and restores previous focus.

Keyboard shortcuts apply only inside the focused viewer: Left/Right, Home/End, +/−, and 0 to fit. Form inputs retain their normal keyboard behavior. Pointer capture and cancellation are supported. Auto rendering respects reduced motion; explicit `webgl` opts into motion.

## Hosting, memory and compatibility

Serve cross-origin PDFs/images with appropriate CORS response headers. PDF.js can use HTTP range requests when the source server permits them; otherwise it may download the entire PDF. No proxy is included. A CSP must permit your module scripts, source fetches, same-origin module workers and the image Blob URLs used for decoding; image decoding needs `img-src blob:`. Some PDF encoders use WebAssembly decoders; permit those according to your CSP deployment policy.

The 96 MiB budget conservatively accounts for owned canvas pixels plus matching GPU texture capacity, including reserved in-flight surfaces. It does **not** bound the source file, browser decoder buffers, PDF.js internals, driver overhead, geometry/shadow maps, or total tab memory. At most two raster tasks run concurrently. Visible pages have priority, adjacent pages prefetch; unneeded cached pages are evicted. Displayed surfaces stay protected until a replacement succeeds. Lower budgets/resolution limits can reduce visual sharpness. No rendering loop runs while the book is idle.

Target modern Chrome/Edge, Firefox and Safari with ES modules, Pointer Events and ResizeObserver. WebGL2 provides 3D; flat mode still supports navigation/zoom. Fullscreen appears only when supported. Playwright WebKit is an engine check, not proof of real iOS device behavior. See [the verification report](docs/VERIFICATION.md) for tested versions, results and remaining limitations.

Not included in v0.1: search, thumbnails, outlines, selectable PDF text, interactive annotations, password-protected PDFs, RTL, hard covers, sound, autoplay, framework/WordPress wrappers or DearFlip compatibility. Page curl is deterministic geometry, not a paper physics simulation.

## Develop and verify

```sh
npm run fixtures       # regenerate original SVG/PDF fixtures
npm run typecheck
npm test
npm run build
npx playwright install chromium firefox webkit
npm run test:browser
npm run build:demo
npm run test:package
npm run release
```

Geometry inspection at `/probe.html` in the development server includes a progress scrubber. It is excluded from the static demo build. Tests save visual frames under `artifacts`; release notes and the persistent milestone ledger live in `docs`.

Original code and sample publications are MIT-licensed. PDF.js, Three.js and bundled PDF support data retain their respective licenses; see THIRD_PARTY_NOTICES.md and dist/licenses.
