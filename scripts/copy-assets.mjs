import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist/assets', { recursive: true });
await mkdir('dist/licenses', { recursive: true });
for (const name of ['pdf.worker.min.mjs', 'cmaps', 'standard_fonts', 'wasm']) {
  const source = name.endsWith('.mjs')
    ? `node_modules/pdfjs-dist/legacy/build/${name}`
    : `node_modules/pdfjs-dist/${name}`;
  await cp(source, `dist/assets/${name}`, { recursive: true });
}
for (const [name, path] of [
  ['THREE-LICENSE.txt', 'node_modules/three/LICENSE'],
  ['PDFJS-LICENSE.txt', 'node_modules/pdfjs-dist/LICENSE'],
])
  await cp(path, `dist/licenses/${name}`);
await cp('dist', 'demo/public/lib', { recursive: true });
for (const name of ['LICENSE', 'README.md']) {
  try {
    await cp(name, `demo/public/${name === 'LICENSE' ? 'LICENSE' : 'README'}.txt`);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}
