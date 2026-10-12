import { mkdir, cp, writeFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve('artifacts');
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
console.log(
  `Local release: artifacts/${filename}\nSHA-256: ${hash}\nStatic demo and documentation: artifacts/release/`,
);
