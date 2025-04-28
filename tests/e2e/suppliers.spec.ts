import { test, expect } from "@playwright/test";

/**
 * This test requires your Next.js app to be running, e.g.:
 *    npm run build && npm run start
 * or in dev mode: npm run dev
 *
 * Then run:
 *    npx playwright test
 * which will use the baseURL from your config (http://localhost:3000)
 */

test.describe("Suppliers E2E", () => {
  test("Add a new supplier, then see it in the list", async ({ page }) => {
    // 1) Go to add-supplier page
    await page.goto("/supplier/add");

    // 2) Fill required fields: 'name', 'paymentTerms'
    // based on your placeholders/labels
    await page.fill('[data-testid="supplier-name"]', "E2E Test Supsdpsdslier");
    await page.fill('[data-testid="supplier-taxID"]', "122133");
    // contact, phone, email, address, taxId are optional
    // Payment Terms is required => there's a <select>
    await page.selectOption('select', { value: "Net 5" }); 
    // ^ or { value: "Net 5" }, depending on your code

    // 3) Submit the form
    // There's a button with text "Add Supplier"? Actually, your code has:
    //   <button type="submit" ...>{t("submit")}</button>
    // So we look for a button with text that matches "Add Supplier"? 
    // Actually, your code is "submit" (like t("submit")).
    // Let's see if we can match by role:
    await page.click('button[type="submit"]');

    // 4) We expect some success message to appear, e.g. "Supplier created successfully!"
    // your code sets `setMessage(t("createSuccess"))`, which might be "Supplier created successfully!"
    // Let's check the text that appears if the request is successful
    //await expect(page.locator('[data-testid="supplier-success-message"]')).toBeVisible(); 
    await expect(page.locator('text=הספק נוצר בהצלחה!')).toBeVisible();
    // If your translation is "Supplier created successfully!", do:
    // await expect(page.locator("text=Supplier created successfully!")).toBeVisible();

    // 5) Now go to the show page: /supplier/list
    // or your code is at /supplier/list (the ShowSuppliersPage)
    await page.goto("/supplier/list");

    // 6) The new "E2E Test Supplier" should appear in the table
    await expect(page.locator("text=E2E Test Supplier")).toBeVisible();
  });
});
