import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
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
const demoLib = resolve('demo/public/lib');
if (!demoLib.startsWith(resolve('demo/public') + sep))
  throw new Error('Invalid demo library directory.');
await rm(demoLib, { recursive: true, force: true });
await cp('dist', demoLib, { recursive: true });
for (const name of ['LICENSE', 'README.md', 'THIRD_PARTY_NOTICES.md']) {
  try {
    await cp(name, `demo/public/${name.replace(/\.md$/, '')}.txt`);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}
