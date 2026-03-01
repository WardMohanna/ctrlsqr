import { test, expect } from "@playwright/test";

test.describe("Inventory Management", () => {
  /**
   * Test: Add a new inventory item
   */
  test("should add a new inventory item", async ({ page, request }) => {
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

    // Fill the form using textbox roles (based on actual page structure)
    // SKU field - use the Hebrew placeholder found in the page
    await page.getByRole("textbox", { name: /הכנס מקט|Enter SKU/i }).fill(testSKU);

    // Item name
    await page.getByRole("textbox", { name: /שם הפריט|item name/i }).fill(testItemName);

    // Select category (Ant Design Select) - click on the select dropdown then pick first option
    await page.locator(".ant-select").first().click();
    await page.waitForSelector(".ant-select-item-option", { timeout: 5000 });
    await page.locator(".ant-select-item-option").first().click();

    // Quantity (InputNumber spinbutton) - label is "כמות התחלתית" in Hebrew
    await page.getByRole("spinbutton", { name: /כמות התחלתית|starting quantity|quantity/i }).fill("100");

    // Min quantity (InputNumber spinbutton) - label is "כמות מינימלית" in Hebrew
    await page.getByRole("spinbutton", { name: /כמות מינימלית|min.*quantity|minimum/i }).fill("10");

    // Submit the form
    await page.getByRole("button", { name: /שמור|save|add|הוסף/i }).click();

    // Wait for success modal (add page uses a Modal instead of toast)
    await expect(
      page.getByText(/Item added successfully|הפריט נוסף בהצלחה/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Fetch the new record from the database via API and verify details
    const response = await request.get("/api/inventory");
    expect(response.ok()).toBeTruthy();

    const items = await response.json();
    const createdItem = items.find((item: any) => item.sku === testSKU);

    expect(createdItem).toBeDefined();
    expect(createdItem.itemName).toBe(testItemName);
    expect(createdItem.sku).toBe(testSKU);
    expect(createdItem.quantity).toBe(100);
    expect(createdItem.minQuantity).toBe(10);
  });

  /**
   * Test: Edit an existing inventory item
   */
  test("should edit an inventory item", async ({ page, request }) => {
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

    // Wait for item details to load and form to appear
    await page.waitForLoadState("networkidle");
    
    // Wait for the edit form to render (it only shows after item is selected) - use label selector
    const skuInput = page.getByLabel(/SKU|מק"ט/i).first();
    await skuInput.waitFor({ state: "visible", timeout: 15000 });

    // Get the item's SKU for API lookup
    const itemSKU = await skuInput.inputValue();

    // Modify a field (e.g., quantity)
    const quantityInput = page.getByLabel(/quantity|כמות/i).first();
    await quantityInput.waitFor({ state: "visible", timeout: 5000 });
    await quantityInput.clear();
    await quantityInput.fill("999");

    // Submit the form
    await page.getByRole("button", { name: /שמור|save|update|עדכן/i }).click();

    // Wait for success message - use first() to avoid strict mode
    await expect(
      page.locator(".ant-message-success").first()
    ).toBeVisible({ timeout: 10000 });

    // Fetch the updated record from the database via API and verify details
    const response = await request.get("/api/inventory");
    expect(response.ok()).toBeTruthy();

    const items = await response.json();
    const updatedItem = items.find((item: any) => item.sku === itemSKU);

    expect(updatedItem).toBeDefined();
    expect(updatedItem.quantity).toBe(999);
  });
});
