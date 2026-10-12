import { defineConfig } from '@playwright/test';
import { projects } from './tests/projects';
export default defineConfig({
  testDir: 'tests/package',
  timeout: 30000,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:4174', viewport: { width: 1280, height: 1000 } },
  projects,
  webServer: {
    command: 'node scripts/serve.mjs --root artifacts/site --port 4174',
    url: 'http://127.0.0.1:4174/nested/',
    reuseExistingServer: !process.env.CI,
  },
  reporter: 'list',
});
