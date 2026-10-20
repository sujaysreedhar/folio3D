import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
function run(command, parameters) {
  const child = spawnSync(command, parameters, { stdio: 'inherit' });
  if (child.error) throw child.error;
  return child.status ?? 1;
}

// Firefox still needs a display for software WebGL on Linux in headless mode.
// Xvfb is included by `playwright install --with-deps` in the existing workflow.
if (process.platform === 'linux' && !process.env.DISPLAY) {
  process.exit(run('xvfb-run', ['-a', process.execPath, fileURLToPath(import.meta.url), ...args]));
}
if (!args.some((arg) => arg.startsWith('--config'))) {
  const status = run(process.execPath, [
    fileURLToPath(new URL('./check-browser-environment.mjs', import.meta.url)),
  ]);
  if (status !== 0) process.exit(status);
}
process.exit(
  run(process.execPath, [fileURLToPath(import.meta.resolve('@playwright/test/cli')), 'test', ...args]),
);
