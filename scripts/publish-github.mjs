import { spawnSync } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const dryRun = process.argv.includes('--dry-run');
function git(args, env = process.env, input) {
  const result = spawnSync('git', args, { encoding: 'utf8', env, input });
  if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${result.stderr}`);
  return result.stdout.trim();
}
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const manifest = JSON.parse(await readFile('artifacts/release-manifest.json', 'utf8'));
const repository = 'sujaysreedhar/folio3D';
const tag = `v${pkg.version}`;
if (!/^\d+\.\d+\.\d+$/.test(pkg.version) || manifest.version !== pkg.version)
  throw new Error('Build npm run release for the current stable version first.');
const expected = [
  `folio3d-${pkg.version}.tgz`,
  `folio3d-${pkg.version}-browser.zip`,
  `folio3d-${pkg.version}-website.zip`,
  'SHA256SUMS.txt',
];
if (JSON.stringify(manifest.files) !== JSON.stringify(expected))
  throw new Error('Unexpected release assets.');
const checksums = await readFile('artifacts/SHA256SUMS.txt', 'utf8');
for (const name of expected.slice(0, -1)) {
  const hash = createHash('sha256')
    .update(await readFile(resolve('artifacts', name)))
    .digest('hex');
  if (!checksums.split('\n').includes(`${hash}  ${name}`))
    throw new Error(`Checksum mismatch: ${name}`);
}
const status = git(['status', '--porcelain']);
if (status && !dryRun) throw new Error('Commit source changes before publishing.');
const head = git(['rev-parse', 'HEAD']);
if (dryRun) {
  console.log(
    JSON.stringify(
      {
        repository,
        tag,
        source: head,
        sourceClean: !status,
        files: expected,
        cdn: `https://cdn.jsdelivr.net/gh/${repository}@${tag}/dist/folio3d.js`,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
const remote = git(['remote', 'get-url', 'origin']);
if (
  ![
    'https://github.com/sujaysreedhar/folio3D.git',
    'git@github.com:sujaysreedhar/folio3D.git',
  ].includes(remote)
)
  throw new Error('Unexpected GitHub origin; refusing to publish.');
if (git(['ls-remote', 'origin', 'refs/heads/main']).split(/\s/)[0] !== head)
  throw new Error('Push the verified source commit to origin/main first.');

// Obtain credentials through the existing service login, never log or store them.
let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  const result = spawnSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
  });
  if (result.status !== 0)
    throw new Error(
      'Sign into GitHub or provide GH_TOKEN with repository contents write permission.',
    );
  token = result.stdout
    .split(/\r?\n/)
    .find((line) => line.startsWith('password='))
    ?.slice(9);
}
if (!token) throw new Error('GitHub authentication unavailable.');
async function api(path, method = 'GET', body, binary = false) {
  const url = path.startsWith('https://uploads.github.com/')
    ? path
    : `https://api.github.com/repos/${repository}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': binary ? 'application/octet-stream' : 'application/json' } : {}),
    },
    body: body ? (binary ? body : JSON.stringify(body)) : undefined,
  });
  if (response.status === 404 && method === 'GET') return null;
  if (!response.ok) throw new Error(`GitHub ${method} request failed (HTTP ${response.status}).`);
  return response.json();
}

// Keep generated files off main, but put them in the immutable release tag for jsDelivr.
const index = resolve('artifacts', `release-index-${process.pid}`);
const env = { ...process.env, GIT_INDEX_FILE: index };
let tree;
try {
  git(['read-tree', head], env);
  git(['add', '-f', 'dist'], env);
  tree = git(['write-tree'], env);
} finally {
  await rm(index, { force: true });
}
const remoteTag = git(['ls-remote', 'origin', `refs/tags/${tag}`]);
if (remoteTag) {
  git(['fetch', 'origin', `refs/tags/${tag}:refs/tags/${tag}`]);
  if (git(['rev-parse', `${tag}^{tree}`]) !== tree)
    throw new Error(
      'This version tag already contains different files. Bump the version; never rewrite a CDN tag.',
    );
} else {
  const releaseCommit = git([
    'commit-tree',
    tree,
    '-p',
    head,
    '-m',
    `Release ${tag} browser distribution`,
  ]);
  git(['tag', '-a', tag, releaseCommit, '-m', `Folio3D ${tag}`]);
  git(['push', 'origin', `refs/tags/${tag}`]);
}
let release = await api(`/releases/tags/${tag}`);
if (release && !release.draft) {
  console.log(`Already published: ${release.html_url}`);
  process.exit(0);
}
if (!release) {
  const notes = await readFile('docs/RELEASE_NOTES.md', 'utf8');
  release = await api('/releases', 'POST', {
    tag_name: tag,
    name: `Folio3D ${tag}`,
    body: notes,
    draft: true,
  });
}
for (const name of expected) {
  const data = await readFile(resolve('artifacts', name));
  const existing = release.assets.find((asset) => asset.name === name);
  if (existing) {
    const digest = `sha256:${createHash('sha256').update(data).digest('hex')}`;
    if (existing.digest !== digest)
      throw new Error(`Draft asset ${name} does not match; inspect it before retrying.`);
    continue;
  }
  await api(
    `${release.upload_url.split('{')[0]}?name=${encodeURIComponent(name)}`,
    'POST',
    data,
    true,
  );
  console.log(`Uploaded ${name}`);
}
release = await api(`/releases/${release.id}`, 'PATCH', { draft: false, make_latest: 'true' });
console.log(
  `Published ${release.html_url}\nCDN: https://cdn.jsdelivr.net/gh/${repository}@${tag}/dist/folio3d.js`,
);
