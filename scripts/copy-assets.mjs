import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist/assets', { recursive: true });
for (const name of ['pdf.worker.min.mjs', 'cmaps', 'standard_fonts', 'wasm']) {
  const source = name.endsWith('.mjs') ? `node_modules/pdfjs-dist/legacy/build/${name}` : `node_modules/pdfjs-dist/${name}`;
  await cp(source, `dist/assets/${name}`, { recursive: true });
}
