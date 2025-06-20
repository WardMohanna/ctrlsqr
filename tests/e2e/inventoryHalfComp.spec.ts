import { test, expect} from "@playwright/test";

test("add item to half completed category, check if its there, delete it.", async ({ page }) => {
    const itemCode = 'half tiem';
    const itemBarcode = 'half item';
    const itemName = 'half item';

    //step 1: goto item add page
    await page.goto('http://localhost:3000/inventory/add');

    const form = page.locator('form');      
    const input = form.locator('input:not([type="checkbox"])');

    //fill inputs fields
    await input.nth(0).fill(itemCode);
    await input.nth(1).fill(itemBarcode);
    await input.nth(2).fill(itemName);

    //select category "Half Completed Item"
    await page.locator('.css-13cymwt-control').nth(0).click();
    await page.locator('div[role="option"]', { hasText: 'מוצר חצי גמור'}).click();

    //choose amount to be 10 (10 is random not specific)
    await input.nth(4).fill('10');
    

    //choose units יחידות
    await page.locator('label:has-text("יחידה")').locator('xpath=following-sibling::*').first().click();
    await page.locator('div[role="option"]', { hasText: 'יחידות' }).click();


    //choose minimun amount
    await input.nth(6).fill('10');


    //choose weight as 100 (100 is random not specific)
    await input.nth(7).fill('100');

    //choose and filling the tree 
    await input.nth(8).click();
    await page.locator('div[role="option"]', { hasText: 'knafe' }).click();

    await input.nth(8).click();
    await page.locator('div[role="option"]', { hasText: 'Buds' }).click();


    await input.nth(9).fill('70');
    await input.nth(10).fill('30');


    // Submit form
    await page.locator('button:has-text("הוסף פריט")').click();




    // Step 2: Go to snapshot page and select today's date
    await page.goto('http://localhost:3000/inventory/snapshot');
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    await page.locator('input[type="date"]').fill(today);
    await page.locator('button:has-text("טען תצוגה")').click();


    // Check that the item was added
    await expect(page.getByText(itemName, { exact: false })).toBeVisible({ timeout: 7000 });

    // await expect(page.locator(`text=${itemName}`)).toBeVisible();


    // Step 3: Go to delete page and remove the item
    await page.goto('http://localhost:3000/inventory/delete');

    //open white box to choose the added item
    const selectControl = page.locator('.css-v68sna-control');
    await expect(selectControl).toBeVisible();
    await selectControl.click();


    // Select the item by text (itemName)
    await page.getByText(itemName, { exact: true }).click();

    const deleteBtn = page.locator('button:has-text("מחיקת פריט")');
    await expect(deleteBtn).toBeVisible();

    // Setup dialog handler BEFORE click
    page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('האם אתה בטוח');
        await dialog.accept();
  });

    // Click the button
    await deleteBtn.click();



    // Set up listener for the confirm dialog
    page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('האם אתה בטוח שאתה רוצה למחוק');
        await dialog.accept(); // Clicks "OK"
    });

});