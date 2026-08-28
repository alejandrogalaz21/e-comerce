import { devices, defineConfig } from '@playwright/test';

import { STORAGE_STATE } from './e2e/support/auth';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // The specs share one database (the import spec resets the products table),
  // so spec files must not run in parallel workers.
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    viewport: { width: 1920, height: 1080 },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: STORAGE_STATE,
      },
    },
  ],
});
