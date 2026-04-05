const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log('console', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('pageerror', err.toString()));
  page.on('requestfailed', r => console.log('requestfailed', r.url(), r.failure().errorText));

  try {
    const response = await page.goto('http://localhost:3001/accounts/list', { waitUntil: 'networkidle' });
    console.log('status', response.status());
    await page.waitForTimeout(5000);
  } catch (e) {
    console.error('error', e);
  }
  await browser.close();
})();
