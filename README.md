# Folio3D website

This branch contains the built Folio3D demo website. The application source, development instructions and library documentation live on the [main branch](https://github.com/sujaysreedhar/folio3D/tree/main).

## Publish with GitHub Pages

In the repository's **Settings → Pages**, select **Deploy from a branch**, choose **docs** and **/(root)**, then save.

The site includes the main playground and three demo apps:

- `/demos/catalog.html` — Form & Field catalog
- `/demos/portfolio.html` — Studio North portfolio
- `/demos/bookshelf.html` — The reading room

The `CNAME` file records `folio3d.sujaysreedhar.com`. Configure that custom domain in GitHub Pages and point its DNS to GitHub Pages if using this domain.

## Update the site

Build the source from `main` with `npm ci`, `npm run build` and `npm run build:demo`. Publish the contents of `demo-dist/` at the root of this branch, preserving `.nojekyll` and `CNAME`.

`README.txt` contains the full library documentation. License files and bundled PDF support assets must remain alongside the website.
