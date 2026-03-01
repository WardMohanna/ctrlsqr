import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

/**
 * Authentication setup - runs once before all tests
 * Logs in and saves the session state for reuse
 */
setup("authenticate", async ({ page }) => {
  // Get credentials from environment or use defaults
  const username = process.env.TEST_USERNAME || "test.user";
  const password = process.env.TEST_PASSWORD || "test123";

  // Navigate to login page
  await page.goto("/");

  // Wait for React hydration and login form to be ready
  await page.waitForLoadState("networkidle");

  // Fill login form (Ant Design form inputs with Hebrew placeholders)
  await page.getByPlaceholder("שם משתמש").fill(username);
  await page.getByPlaceholder("סיסמה").fill(password);

  // Submit the form
  await page.getByRole("button", { name: /התחבר/i }).click();

  // Wait for redirect to welcome page (successful login)
  await expect(page).toHaveURL(/welcomePage/, { timeout: 10000 });

  // Save the authenticated state
  await page.context().storageState({ path: authFile });
});
