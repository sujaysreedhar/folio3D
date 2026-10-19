import { spawnSync } from 'node:child_process';

// Reuse the existing GitHub login in memory; never print or persist credentials.
let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  const result = spawnSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
  });
  if (result.status === 0)
    token = result.stdout
      .split(/\r?\n/)
      .find((line) => line.startsWith('password='))
      ?.slice(9);
}
if (!token) throw new Error('GitHub login is unavailable.');
const base = 'https://api.github.com/repos/sujaysreedhar/folio3D';
async function get(path) {
  const response = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) throw new Error(`GitHub Pages status request failed: HTTP ${response.status}`);
  return response.json();
}
const pages = await get('/pages');
console.log(
  JSON.stringify(
    {
      url: pages.html_url,
      source: pages.source,
      cname: pages.cname,
      buildType: pages.build_type,
      status: pages.status,
    },
    null,
    2,
  ),
);
if (process.argv[2]) {
  const runs = await get(
    `/actions/runs?head_sha=${encodeURIComponent(process.argv[2])}&per_page=10`,
  );
  console.log(
    JSON.stringify(
      runs.workflow_runs.map((run) => ({
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        url: run.html_url,
        sha: run.head_sha,
      })),
      null,
      2,
    ),
  );
}
