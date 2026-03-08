import { defineConfig, devices } from "@playwright/test";

/**
 * E2E Test Configuration for Inventory Management System
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 60000, // 60 seconds per test

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    actionTimeout: 15000, // 15 seconds per action
  },

  projects: [
    // Setup project - handles authentication
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },

    // Main tests - depends on setup for auth
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },

    // Optional: Test on other browsers
    // {
    //   name: "firefox",
    //   use: {
    //     ...devices["Desktop Firefox"],
    //     storageState: "e2e/.auth/user.json",
    //   },
    //   dependencies: ["setup"],
    // },
  ],

  // Run local dev server before tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
