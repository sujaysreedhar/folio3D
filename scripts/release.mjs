import { mkdir, cp, writeFile, readdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { zipDirectory } from './zip.mjs';

const directory = resolve('artifacts');
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
await mkdir(directory, { recursive: true });
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run through npm run release.');
const result = spawnSync(
  process.execPath,
  [npm, 'pack', '--json', '--pack-destination', directory],
  {
    encoding: 'utf8',
  },
);
if (result.status !== 0) throw new Error(result.stdout + '\n' + result.stderr);
const [{ filename }] = JSON.parse(result.stdout);
const hash = createHash('sha256')
  .update(await readFile(resolve(directory, filename)))
  .digest('hex');
await writeFile(resolve(directory, `${filename}.sha256`), `${hash}  ${filename}\n`);
const release = resolve(directory, 'release');
if (!release.startsWith(directory + sep)) throw new Error('Invalid release directory.');
await rm(release, { recursive: true, force: true });
await mkdir(release, { recursive: true });
for (const name of [
  'dist',
  'demo-dist',
  'docs',
  'README.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'CHANGELOG.md',
])
  await cp(name, resolve(release, name), { recursive: true });
await cp(resolve(directory, filename), resolve(release, filename));
await cp(resolve(directory, `${filename}.sha256`), resolve(release, `${filename}.sha256`));
for (const name of (await readdir(directory)).filter(
  (name) =>
    name === 'geometry' ||
    name === 'drag' ||
    name === 'performance.json' ||
    /^demo-.*\.png$/.test(name),
))
  await cp(resolve(directory, name), resolve(release, 'artifacts', name), { recursive: true });

const browser = resolve(directory, 'browser');
if (!browser.startsWith(directory + sep)) throw new Error('Invalid browser directory.');
await rm(browser, { recursive: true, force: true });
await mkdir(browser, { recursive: true });
for (const name of [
  'dist',
  'README.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'CHANGELOG.md',
  'docs/PUBLISHING.md',
  'docs/THEMES.md',
])
  await cp(name, resolve(browser, name), { recursive: true });
await cp('demo/public/samples/magazine.pdf', resolve(browser, 'sample.pdf'));
await writeFile(
  resolve(browser, 'example.html'),
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Folio3D ${version}</title><link rel="stylesheet" href="./dist/folio3d.min.css"><div id="book" style="height:90vh"></div><script type="module">import {createFlipbook} from './dist/folio3d.min.js';const book=createFlipbook(document.querySelector('#book'),{source:{type:'pdf',data:'./sample.pdf'},theme:'modern',storageKey:'sample-${version}'});book.ready.catch(console.error);</script></html>`,
);
const browserZip = `folio3d-${version}-browser.zip`;
const websiteZip = `folio3d-${version}-website.zip`;
await zipDirectory(browser, resolve(directory, browserZip));
await zipDirectory(resolve('demo-dist'), resolve(directory, websiteZip));
const sums = [];
for (const name of [filename, browserZip, websiteZip]) {
  const digest = createHash('sha256')
    .update(await readFile(resolve(directory, name)))
    .digest('hex');
  sums.push(`${digest}  ${name}`);
}
await writeFile(resolve(directory, 'SHA256SUMS.txt'), sums.join('\n') + '\n');
await writeFile(
  resolve(directory, 'release-manifest.json'),
  JSON.stringify({ version, files: [filename, browserZip, websiteZip, 'SHA256SUMS.txt'] }, null, 2),
);
console.log(
  `Local release: artifacts/${filename}\nBrowser ZIP: artifacts/${browserZip}\nWebsite ZIP: artifacts/${websiteZip}\nChecksums: artifacts/SHA256SUMS.txt\nStatic demo and documentation: artifacts/release/`,
);
