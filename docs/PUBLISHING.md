# Publish Folio3D

Folio3D has two deliverables: the embeddable library and a static demonstration website. The GitHub release provides both; jsDelivr serves the versioned library directly from its public Git tag.

## Use the published library

Version 0.3.0 URLs:

- JavaScript: `https://cdn.jsdelivr.net/gh/sujaysreedhar/folio3D@v0.3.0/dist/folio3d.min.js`
- CSS: `https://cdn.jsdelivr.net/gh/sujaysreedhar/folio3D@v0.3.0/dist/folio3d.min.css`
- [Downloads, source and checksums](https://github.com/sujaysreedhar/folio3D/releases/tag/v0.3.0)

The minified ES module uses matching minified chunks under `dist/chunks/min/`. Keep those files and `dist/assets/` when copying the distribution. The original entry/style filenames remain supported; the stylesheet was already minified, so `.min.css` contains the same CSS. All GitHub packages include both variants.

Use the full tag in production, with matching CSS, JavaScript and support assets. A GitHub release attachment alone is insufficient for jsDelivr: `dist/` must exist in the tagged Git tree. The release script creates that snapshot without putting generated files on `main`. Never move or overwrite a published version tag; publish a new version for changes. [jsDelivr GitHub documentation](https://github.com/jsdelivr/jsdelivr#github).

Use the browser ZIP for a plain website (`example.html` is included), or install the TGZ URL with npm as shown in the README. Publishing to the npm registry is optional and separate; `npm install folio3d` is not the documented installation method for this GitHub release.

## Deploy the website

Download `folio3d-0.3.0-website.zip`, extract it and upload its **contents** to the static host serving your domain. Or upload the contents of `demo-dist/` after:

```sh
npm ci
npm run build
npm run build:demo
```

Preserve `demos/`, `samples/`, `assets/`, `lib/`, and license notices. Relative build paths support a domain root or subdirectory. Preview with `npm run preview`.

The live demo uses GitHub Pages, publishing the root of the `docs` branch at `folio3d.sujaysreedhar.com`. After verification, commit the contents of `demo-dist/` to that branch and push it. Preserve `.nojekyll` and `CNAME`; matching files are included in `demo/public/` so production builds retain them. The `docs` deployment branch is separate from the `docs/` source-documentation directory on `main`. Publishing a GitHub release alone does not update Pages.

Confirm Settings → Pages selects `docs` and `/ (root)`. Wait for the Pages deployment, then verify the live version meta tag, all eight presets, the custom palette/lightbox, a PDF and each example route. Keep the previous deployment commit so a failed hosted check can be rolled back with a revert commit.

## Cut the next release

1. Update the package version with `npm version minor --no-git-tag-version` (or `patch`), changelog, release notes, versioned URLs, and verification report.
2. Run `npm ci`, `npm run build`, `npm run typecheck`, `npm test`, `npm run build:demo`, `npm run test:browser`, `npm run test:demos`, and `npm run test:package`. Install matching Playwright browsers first if needed.
3. Commit and push the verified source to `main`.
4. Run the local release commands below. They build archives, tag the distribution, upload assets into a draft, then publish the complete release.

For optional GitHub Actions publishing, first copy [the workflow template](github-release-workflow.yml) to `.github/workflows/release.yml` and commit it using a GitHub login with workflow-write permission. Then choose **Actions → Publish GitHub and CDN release → Run workflow**, selecting `main`. The template reruns verification and uses its repository-scoped GitHub token with `contents: write`. The template is not installed automatically because the publishing login used for v0.3.0 lacks the `workflow` scope.

For a local release from the same verified source commit:

```sh
npm run release
npm run publish:github -- --dry-run
npm run publish:github
```

The publisher checks hashes, version, a clean working tree and that the source is on `origin/main`. It accepts `GH_TOKEN`/`GITHUB_TOKEN` or the existing Git Credential Manager login, without writing credentials to files. Repository contents write permission and Git push access are required. It rejects an existing version with different contents. A matching partial draft can be resumed; existing assets must have matching GitHub SHA-256 digests. An already-created local tag after a network failure may need inspection before retrying the tag push.

Outputs in `artifacts/`: an npm TGZ, browser ZIP, website ZIP, `SHA256SUMS.txt`, and `release-manifest.json`. Checksums verify integrity, not an independent signing identity.

## Hosting and CSP

Serve `.js`/`.mjs` as JavaScript and `.wasm` as `application/wasm`. Serve PDFs/images with CORS headers when their origin differs from your page. CDN defaults keep PDF.js and its worker/support files on the same version.

A CSP using the CDN must permit its module origin in `script-src` and asset/document origins in `connect-src`. PDF.js wraps a cross-origin worker using a Blob, so allow `worker-src blob:` plus the CDN in the worker's script policy. Image decoding needs `img-src blob:`. PDF WebAssembly decoders can require `wasm-unsafe-eval` in `script-src`. Adapt directives to your application; the library does not add a permissive policy for you. Self-hosting all distribution assets makes a stricter same-origin worker policy possible.

After publishing, open a real page importing the exact CDN version and load a PDF. Check that CSS, lazy PDF modules, worker, thumbnails and contents work; HTTP 200 for the entry file alone does not verify the integration.
