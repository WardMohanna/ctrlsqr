import { test, expect } from "@playwright/test";

test.describe("Inventory Management", () => {
  /**
   * Test: Add a new inventory item
   */
  test("should add a new inventory item", async ({ page }) => {
    // Navigate to add inventory page
    await page.goto("/inventory/add");
    await page.waitForLoadState("networkidle");

    // Handle restore modal if it appears (dismiss it)
    const restoreModal = page.getByText(/restore|שחזור/i);
    if (await restoreModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByRole("button", { name: /cancel|ביטול|no|לא/i }).click();
    }

    // Generate unique item name for test
    const testItemName = `Test Item ${Date.now()}`;
    const testSKU = `TST-${Date.now().toString().slice(-6)}`;

    // Fill the form using Hebrew placeholders
    // SKU field (inside Space.Compact, find the actual input)
    await page.getByPlaceholder(/הכנס מקט|Enter SKU/i).fill(testSKU);

    // Item name
    await page.getByPlaceholder(/הכנס שם פריט|Enter item name/i).fill(testItemName);

    // Select category (Ant Design Select) - click and select first option
    await page.getByPlaceholder(/חפש ובחר קטגוריה|Select category/i).click();
    await page.waitForSelector(".ant-select-item-option", { timeout: 5000 });
    await page.locator(".ant-select-item-option").first().click();

    // Quantity
    await page.getByPlaceholder(/הכנס כמות|Enter quantity/i).fill("100");

    // Min quantity
    await page.getByPlaceholder(/המינימום לפני התראה|Minimum quantity/i).fill("10");

    // Submit the form
    await page.getByRole("button", { name: /שמור|save|add|הוסף/i }).click();

    // Wait for success - either success modal, message, or redirect
    await expect(
      page.getByText(/success|נוצר|נשמר|הצלחה/i)
        .or(page.locator(".ant-message-success"))
    ).toBeVisible({ timeout: 10000 });
  });

  /**
   * Test: Edit an existing inventory item
   */
  test("should edit an inventory item", async ({ page }) => {
    // Navigate to edit inventory page
    await page.goto("/inventory/edit");
    await page.waitForLoadState("networkidle");

    // Handle restore modal if it appears - wait a bit for it to potentially show
    await page.waitForTimeout(1000);
    const restoreModal = page.locator(".ant-modal-content").filter({ hasText: /restore|שחזור/i });
    if (await restoreModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByRole("button", { name: /cancel|ביטול|no|לא/i }).click();
      await page.waitForTimeout(500);
    }

    // Select an item from the dropdown - find the Select component
    // Wait for the page to be ready
    await page.waitForSelector(".ant-select", { timeout: 10000 });
    
    // Click on the select to open dropdown and load items
    await page.locator(".ant-select").first().click();

    // Wait for items to load and select the first option
    await page.waitForSelector(".ant-select-item-option", { timeout: 15000 });
    await page.locator(".ant-select-item-option").first().click();

    // Wait for item details to load
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500); // Wait for form to populate

    // Modify a field (e.g., quantity) - find by placeholder
    const quantityInput = page.getByPlaceholder(/הכנס כמות|Enter quantity/i);
    await quantityInput.clear();
    await quantityInput.fill("999");

    // Submit the form
    await page.getByRole("button", { name: /שמור|save|update|עדכן/i }).click();

    // Wait for success message
    await expect(
      page.getByText(/success|עודכן|נשמר|הצלחה/i)
        .or(page.locator(".ant-message-success"))
    ).toBeVisible({ timeout: 10000 });
  });
});
