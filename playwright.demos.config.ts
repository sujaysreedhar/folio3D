import { defineConfig } from '@playwright/test';
import { projects } from './tests/projects';

export default defineConfig({
  testDir: 'tests/browser',
  testMatch: 'demos.spec.ts',
  timeout: 30000,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1200, height: 900 } },
  projects,
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  reporter: 'list',
});
