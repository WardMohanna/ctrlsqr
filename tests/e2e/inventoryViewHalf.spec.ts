












/* 
    THIS TEST ISNT COMPLETED.
    STARTING NEW TEST.
    26/06/2025    15:41
*/




import { test, expect } from '@playwright/test';

test('Add *unexisted* inventory item, check snapshot, and delete it', async ({ page }) => {
  const itemCode = 'salam';
  const itemBarcode = 'salam';
  const itemName = 'salam';

  // Step 1: Go to add item page
  await page.goto('http://localhost:3000/inventory/add');

  const form = page.locator('form');
  const inputs = form.locator('input:not([type="checkbox"])');


  // Fill input fields
  await inputs.nth(0).fill(itemCode);        // מקט
  await inputs.nth(1).fill(itemBarcode);     // ברקוד
  await inputs.nth(2).fill(itemName);        // שם פריט

  // Select קטגוריה: חומר גלם לייצור
  await page.locator('.css-13cymwt-control').nth(0).click();
  await page.locator('div[role="option"]', { hasText: 'מוצר חצי גמור' }).click();

  await inputs.nth(4).fill('10');            // כמות התחלתית

  //choose יחידות
  await page.locator('label:text("יחידה")').locator('xpath=following-sibling::*').first().click();
  await page.locator('div[role="option"]', { hasText: 'יחידות' }).click();
  
  await inputs.nth(6).fill('10');            // כמות מינימלית




//here start fill the fields after picking מוצר חצי גמור from category

  await inputs.nth(7).fill('100');           // משקל היחידה               
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    console.log(headings);


    // Click the second react-select dropdown (מרכיבים)
await page.locator('.css-13cymwt-control').nth(3).click();

// Pick the first option
await page.locator('div[role="option"]').first().click();

// Wait 3 seconds so you can visually confirm what happened
await page.waitForTimeout(3000);

// Assert that the section header is visible (after selecting)
await expect(page.getByRole('heading', {
  name: /בחר מרכיבים \(עץ מוצר [-–] רשימת חומרים\)/
})).toBeVisible();




    //await page.pause();






  //uncomment when u want to complete the deletion of the item!!!1
  //!!!!
  //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  // Submit form
//   await page.locator('button:has-text("הוסף פריט")').click();

//   // Step 2: Go to snapshot page and select today's date
//   await page.goto('http://localhost:3000/inventory/snapshot');
//   const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
//   await page.locator('input[type="date"]').fill(today);
//   await page.locator('button:has-text("טען תצוגה")').click();

//   // Check that the item was added
//   await expect(page.getByText(itemName, { exact: false })).toBeVisible({ timeout: 7000 });

//   // await expect(page.locator(`text=${itemName}`)).toBeVisible();


  // Step 3: Go to delete page and remove the item
//   await page.goto('http://localhost:3000/inventory/delete');

//   //open white box to choose the added item
//   const selectControl = page.locator('.css-v68sna-control');
//   await expect(selectControl).toBeVisible();
//   await selectControl.click();


//   // Select the item by text (itemName)
//   await page.getByText(itemName, { exact: true }).click();

//   const deleteBtn = page.locator('button:has-text("מחיקת פריט")');
//   await expect(deleteBtn).toBeVisible();

//   // Setup dialog handler BEFORE click
//   page.once('dialog', async dialog => {
//     expect(dialog.type()).toBe('confirm');
//     expect(dialog.message()).toContain('האם אתה בטוח');
//     await dialog.accept();
//   });

//   // Click the button
//   await deleteBtn.click();



//   // Set up listener for the confirm dialog
//   page.once('dialog', async dialog => {
//     expect(dialog.type()).toBe('confirm');
//     expect(dialog.message()).toContain('האם אתה בטוח שאתה רוצה למחוק');
//     await dialog.accept(); // Clicks "OK"
//   });

});
