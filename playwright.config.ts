import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  retries: 0,
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: false,             // show browser
        baseURL: 'http://localhost:3000',
        screenshot: 'on',
        video: 'retain-on-failure',  // or 'on' if you want always
        trace: 'on-first-retry',
        launchOptions: {
          slowMo: 500,               // slow down actions for visibility
        },
      },
    },
  ],
});
