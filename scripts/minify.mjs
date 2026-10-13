import { build } from 'rolldown';
import { cp, stat } from 'node:fs/promises';

// A separate output keeps the existing bundler entry and its annotations intact.
// Rebundle the complete module graph so lazy PDF imports get minified chunks too.
await build({
  input: 'dist/folio3d.js',
  output: {
    dir: 'dist',
    format: 'es',
    entryFileNames: 'folio3d.min.js',
    chunkFileNames: 'chunks/min/[name]-[hash].min.js',
    minify: true,
    comments: { legal: true },
    banner: '/*! Folio3D | MIT | See LICENSE and THIRD_PARTY_NOTICES.md */',
  },
});
// Vite already minifies CSS with Lightning CSS; provide the explicit .min alias.
await cp('dist/folio3d.css', 'dist/folio3d.min.css');
const regular = (await stat('dist/folio3d.js')).size;
const compact = (await stat('dist/folio3d.min.js')).size;
console.log(
  `Minified entry: ${compact} bytes (${((1 - compact / regular) * 100).toFixed(1)}% smaller than ${regular} bytes).`,
);
