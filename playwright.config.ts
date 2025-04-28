import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",        // where we keep E2E tests
  timeout: 30000,             // 30s per test
  retries: 0,                 // set >0 if you want auto-retry on fail
  use: {
    headless: true,           // run in headless mode
    baseURL: "http://localhost:3000", // your Next.js dev or production URL
  },
});
