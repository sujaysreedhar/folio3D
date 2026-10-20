import { mkdir, writeFile, cp } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = process.cwd(),
  artifacts = resolve('artifacts');
await mkdir(artifacts, { recursive: true });
function run(args, cwd = root) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', env: process.env });
  if (result.status !== 0) throw new Error(result.stdout + '\n' + result.stderr);
  return result.stdout;
}
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run through npm run prepare:package.');
const packed = JSON.parse(run([npm, 'pack', '--json', '--pack-destination', artifacts]));
const consumer = resolve('artifacts/consumer'),
  site = resolve('artifacts/site');
await mkdir(consumer, { recursive: true });
await writeFile(
  resolve(consumer, 'package.json'),
  JSON.stringify({ name: 'folio3d-smoke-consumer', private: true, type: 'module' }),
);
run(
  [
    npm,
    'install',
    resolve(artifacts, packed[0].filename),
    '--ignore-scripts',
    // npm ci caches pinned tarballs, but a fresh consumer may still need metadata.
    '--prefer-offline',
    '--no-audit',
    '--no-fund',
  ],
  consumer,
);
const dist = resolve(consumer, 'node_modules/folio3d/dist');
await writeFile(
  resolve(consumer, 'types-consumer.ts'),
  `import { createFlipbook, type FlipbookOptions } from 'folio3d';
import { createFlipbook as createMinified } from 'folio3d/min';
const minifiedFactory: typeof createFlipbook = createMinified;
const options: FlipbookOptions = { source: { type: 'images', pages: [{ src: '/one.svg' }] }, sound: true, theme: 'modern', contents: [{ title: 'Start', page: 1 }], storageKey: 'types-test' };
const book = createFlipbook(document.createElement('div'), options);
book.on('pagechange', state => { const page: number = state.page; console.log(page); });
book.on('soundchange', state => { const sound: boolean = state.sound; console.log(sound); });
book.setSound(false);
book.setTheme('ocean');
book.setThemeOverrides({ paper: '#f1fafb', font: 'Georgia, serif' });
book.on('themechange', state => { const paper: string | undefined = state.themeOverrides.paper; console.log(paper); });
book.on('themechange', state => { const theme: string = state.theme; console.log(theme); });
book.on('bookmarkchange', pages => { const first: number | undefined = pages[0]; console.log(first); });
void book.ready.then(async () => { book.toggleBookmark(); const pages: number[] = book.getBookmarks(); const contents = await book.getContents(); console.log(pages, contents); });
book.goToPage(1); book.destroy();
`,
);
run(
  [
    resolve('node_modules/typescript/bin/tsc'),
    '--ignoreConfig',
    '--noEmit',
    '--module',
    'ESNext',
    '--moduleResolution',
    'Bundler',
    '--target',
    'ES2022',
    '--strict',
    'types-consumer.ts',
  ],
  consumer,
);
console.log('Vanilla TypeScript consumer declarations passed (without vite/client).');
await cp(dist, resolve(site, 'nested/lib'), { recursive: true });
await cp('tests/fixtures/magazine.pdf', resolve(site, 'nested/catalog.pdf'));
await writeFile(
  resolve(site, 'nested/minified.html'),
  `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>Minified module consumer</title><link rel="stylesheet" href="./lib/folio3d.min.css"></head><body><div id="book" style="height:650px"></div><script type="module">import{createFlipbook}from'./lib/folio3d.min.js';window.book=createFlipbook(document.querySelector('#book'),{source:{type:'pdf',data:'./catalog.pdf'},renderer:new URLSearchParams(location.search).has('webgl')?'webgl':'flat',theme:'modern'});window.book.ready.catch(()=>{});</script></body></html>`,
);
await writeFile(
  resolve(site, 'nested/index.html'),
  `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>Plain module consumer</title><link rel="stylesheet" href="./lib/folio3d.css"></head><body><div id="book" style="width:900px;height:650px"></div><script type="module">import{createFlipbook}from'./lib/folio3d.js';window.book=createFlipbook(document.querySelector('#book'),{source:{type:'pdf',data:'./catalog.pdf'},renderer:'flat',theme:'modern',storageKey:'package-smoke'});window.book.ready.catch(()=>{});</script></body></html>`,
);
await cp(resolve(dist, 'assets'), resolve(consumer, 'public/assets'), { recursive: true });
await cp('tests/fixtures/magazine.pdf', resolve(consumer, 'public/catalog.pdf'));
await writeFile(
  resolve(consumer, 'index.html'),
  `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>npm consumer</title></head><body><div id="book" style="height:650px"></div><script type="module" src="/main.js"></script></body></html>`,
);
await writeFile(
  resolve(consumer, 'main.js'),
  `import{createFlipbook}from'folio3d';import'folio3d/style.css';window.book=createFlipbook(document.querySelector('#book'),{source:{type:'pdf',data:'/npm/catalog.pdf'},assetBaseUrl:'/npm/assets/',renderer:'flat'});window.book.ready.catch(()=>{});`,
);
await writeFile(
  resolve(consumer, 'vite.config.mjs'),
  `export default{base:'/npm/',build:{outDir:${JSON.stringify(resolve(site, 'npm'))},emptyOutDir:true}};`,
);
console.log(run([resolve('node_modules/vite/bin/vite.js'), 'build'], consumer));
await cp('demo-dist', resolve(site, 'showcase'), { recursive: true });
console.log(`Prepared real packed npm and plain-module consumers from ${packed[0].filename}.`);
