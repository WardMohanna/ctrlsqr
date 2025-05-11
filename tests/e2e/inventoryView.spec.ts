import { test, expect } from '@playwright/test';

test('should render inventory items and allow count submission', async ({ page }) => {
  // Navigate to the snapshot page
  await page.goto('http://localhost:3000/inventory/snapshot');

  // Wait for the date picker to be visible (adjust this selector as needed)
  await page.waitForSelector('input[type="date"]'); // Assuming it's an input element

  // Select a date (for example, today's date)
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
  await page.locator('input[type="date"]').fill(dateString);

  // Wait for the loading button or indicator with text "טוען" (translate to "Loading")
  const loadingButton = page.locator('text=טען תצוגה');
  await loadingButton.click();  // Click the loading button to start loading

  // Wait for the page to load (adjust this if a table or other indicator appears)
  await page.waitForSelector('table'); // Assuming a table appears after the data loads

  // Check that the table rows are visible (no need for category check)
  const tableRows = await page.locator('table tbody tr').count();
  expect(tableRows).toBeGreaterThan(0); // Ensure there is at least one item

  // Simulate a user selecting items to count
  const checkbox = page.locator('input[type="checkbox"]');
  await checkbox.first().check();

  // Simulate a user entering a new count value
  const input = page.locator('input[type="number"]');
  await input.first().fill('5');

  // Simulate form submission
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();

  // Check if the success message is shown
  await expect(page.locator('text=Stock count updated successfully')).toBeVisible();
});
