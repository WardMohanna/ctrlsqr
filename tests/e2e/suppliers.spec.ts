import { test, expect } from "@playwright/test";

test.describe("Suppliers E2E", () => {
  const supplierName = "E2E Test Supplier";

  test("Add a new supplier, verify it appears, then delete it", async ({ page }) => {
    // Go to add-supplier page
    await page.goto("/supplier/add");

    // Fill required fields
    await page.fill('[data-testid="supplier-name"]', supplierName);
    await page.fill('[data-testid="supplier-taxID"]', "122133");
    await page.selectOption('select', { value: "Net 5" });

    // Submit the form
    await page.click('button[type="submit"]');

    // Expect success message
    await expect(page.locator('text=הספק נוצר בהצלחה!')).toBeVisible();

    // Go to supplier list
    await page.goto("/supplier/list");

    // Wait for the supplier to appear
    const row = page.locator(`tr:has-text("${supplierName}")`);
    await expect(row).toBeVisible();

    // Handle dialog BEFORE clicking delete
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });

    // Click the delete button inside that row
    const deleteButton = row.locator('button:has-text("delete")');
    await deleteButton.click();

    // Wait for the row to disappear
    await expect(row).not.toBeVisible({ timeout: 7000 }); // increase timeout a bit
  });
});
