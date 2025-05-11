# Test info

- Name: should render inventory items and allow count submission
- Location: C:\Users\97254\Desktop\controlSquare\ctrlsqr\tests\e2e\inventoryView.spec.ts:3:5

# Error details

```
Error: locator.check: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="checkbox"]').first()

    at C:\Users\97254\Desktop\controlSquare\ctrlsqr\tests\e2e\inventoryView.spec.ts:28:26
```

# Page snapshot

```yaml
- button "← חזרה"
- heading "תצוגת מלאי לפי תאריך" [level=1]
- text: "בחר תאריך:"
- textbox: 2025-05-11
- button "טען תצוגה"
- 'heading "קטגוריה: חומר ניקוי" [level=2]'
- table:
  - rowgroup:
    - row "שם הפריט כמות מחיר עלות נוכחי סה\"כ":
      - cell "שם הפריט"
      - cell "כמות"
      - cell "מחיר עלות נוכחי"
      - cell "סה\"כ"
  - rowgroup:
    - row "asdasdasd 3 ₪0.00 ₪0.00":
      - cell "asdasdasd"
      - cell "3"
      - cell "₪0.00"
      - cell "₪0.00"
    - row "סה\"כ לקטגוריה ₪0.00":
      - cell "סה\"כ לקטגוריה"
      - cell "₪0.00"
- 'heading "קטגוריה: חומר גלם לייצור" [level=2]'
- table:
  - rowgroup:
    - row "שם הפריט כמות מחיר עלות נוכחי סה\"כ":
      - cell "שם הפריט"
      - cell "כמות"
      - cell "מחיר עלות נוכחי"
      - cell "סה\"כ"
  - rowgroup:
    - row "knafe 0 ₪0.00 ₪0.00":
      - cell "knafe"
      - cell "0"
      - cell "₪0.00"
      - cell "₪0.00"
    - row "מרשמלווווווווווווווו 140 ₪15.00 ₪2100.00":
      - cell "מרשמלווווווווווווווו"
      - cell "140"
      - cell "₪15.00"
      - cell "₪2100.00"
    - row "מרשמלו 1009 ₪10.00 ₪10090.00":
      - cell "מרשמלו"
      - cell "1009"
      - cell "₪10.00"
      - cell "₪10090.00"
    - row "קרם פיסטוק 0 ₪10.00 ₪0.00":
      - cell "קרם פיסטוק"
      - cell "0"
      - cell "₪10.00"
      - cell "₪0.00"
    - row "שוקלד חלב קליבו 400 ₪0.00 ₪0.00":
      - cell "שוקלד חלב קליבו"
      - cell "400"
      - cell "₪0.00"
      - cell "₪0.00"
    - row "שוקלד לבן קליבו 0 ₪0.00 ₪0.00":
      - cell "שוקלד לבן קליבו"
      - cell "0"
      - cell "₪0.00"
      - cell "₪0.00"
    - row "סה\"כ לקטגוריה ₪12190.00":
      - cell "סה\"כ לקטגוריה"
      - cell "₪12190.00"
- 'heading "קטגוריה: מוצר גמור" [level=2]'
- table:
  - rowgroup:
    - row "שם הפריט כמות מחיר עלות נוכחי סה\"כ":
      - cell "שם הפריט"
      - cell "כמות"
      - cell "מחיר עלות נוכחי"
      - cell "סה\"כ"
  - rowgroup:
    - row "dubai 205 ₪0.00 ₪0.00":
      - cell "dubai"
      - cell "205"
      - cell "₪0.00"
      - cell "₪0.00"
    - row "dubaiiiiiiii 317 ₪1.50 ₪475.50":
      - cell "dubaiiiiiiii"
      - cell "317"
      - cell "₪1.50"
      - cell "₪475.50"
    - row "דובאי 100 מרשמלו 110 ₪0.94 ₪103.40":
      - cell "דובאי 100 מרשמלו"
      - cell "110"
      - cell "₪0.94"
      - cell "₪103.40"
    - row "סה\"כ לקטגוריה ₪578.90":
      - cell "סה\"כ לקטגוריה"
      - cell "₪578.90"
- text: "סה\"כ כולל: ₪12768.90"
- button "Open Next.js Dev Tools":
  - img
- button "Open issues overlay": 1 Issue
- button "Collapse issues badge":
  - img
- alert
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 |
   3 | test('should render inventory items and allow count submission', async ({ page }) => {
   4 |   // Navigate to the snapshot page
   5 |   await page.goto('http://localhost:3000/inventory/snapshot');
   6 |
   7 |   // Wait for the date picker to be visible (adjust this selector as needed)
   8 |   await page.waitForSelector('input[type="date"]'); // Assuming it's an input element
   9 |
  10 |   // Select a date (for example, today's date)
  11 |   const today = new Date();
  12 |   const dateString = today.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
  13 |   await page.locator('input[type="date"]').fill(dateString);
  14 |
  15 |   // Wait for the loading button or indicator with text "טוען" (translate to "Loading")
  16 |   const loadingButton = page.locator('text=טען תצוגה');
  17 |   await loadingButton.click();  // Click the loading button to start loading
  18 |
  19 |   // Wait for the page to load (adjust this if a table or other indicator appears)
  20 |   await page.waitForSelector('table'); // Assuming a table appears after the data loads
  21 |
  22 |   // Check that the table rows are visible (no need for category check)
  23 |   const tableRows = await page.locator('table tbody tr').count();
  24 |   expect(tableRows).toBeGreaterThan(0); // Ensure there is at least one item
  25 |
  26 |   // Simulate a user selecting items to count
  27 |   const checkbox = page.locator('input[type="checkbox"]');
> 28 |   await checkbox.first().check();
     |                          ^ Error: locator.check: Test timeout of 30000ms exceeded.
  29 |
  30 |   // Simulate a user entering a new count value
  31 |   const input = page.locator('input[type="number"]');
  32 |   await input.first().fill('5');
  33 |
  34 |   // Simulate form submission
  35 |   const submitButton = page.locator('button[type="submit"]');
  36 |   await submitButton.click();
  37 |
  38 |   // Check if the success message is shown
  39 |   await expect(page.locator('text=Stock count updated successfully')).toBeVisible();
  40 | });
  41 |
```