import { defineConfig } from '@playwright/test';
import { projects } from './tests/projects';
export default defineConfig({
  testDir: 'tests/browser',
  timeout: 30000,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:5173', viewport: { width: 1200, height: 900 } },
  projects,
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
  reporter: 'list',
});
