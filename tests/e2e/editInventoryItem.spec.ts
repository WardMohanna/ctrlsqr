import { test, expect} from "@playwright/test";
/*
*this test is picking an existed knafe
*then change the quantity to 69
*its checking only if the item is updated
*/
test("edit existed inventory item", async ({ page }) => {


    await page.goto('http://localhost:3000/inventory/edit');

    const form = page.locator('form');      
    const input = form.locator('input:not([type="checkbox"])');

    //choose item to edit from dropbox
    const dropdownInput = page.locator('input[aria-autocomplete="list"]');
    await dropdownInput.click();
    await page.locator('div[role="option"]', { hasText: 'knafe'}).click();
    // await page.waitForTimeout(3000); // 3000 milliseconds = 3 seconds

    await input.nth(4).fill('69');
    //await page.waitForTimeout(3000); // 3000 milliseconds = 3 seconds

    await page.locator('button:has-text("שמור שינויים")').click();

    
    // Step 1: Assert the success message is visible
    await expect(page.getByRole('heading', { name: 'הפריט עודכן בהצלחה!' })).toBeVisible();


    // Step 2: Click the "אישור" button
    await page.getByRole('button', { name: 'אישור' }).click();


    //go check in inventory if the item is updated
    await page.goto('http://localhost:3000/inventory/show');
    const row = page.locator('tr', { hasText: 'knafe' });
    //await page.waitForTimeout(3000); // 3000 milliseconds = 3 seconds
    await expect(row.getByText('69')).toBeVisible();



});