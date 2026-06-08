const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message));
    page.on('requestfailed', request => {
      console.log('REQUEST_FAILED:', request.url(), request.failure().errorText);
    });

    await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });

    console.log("Page loaded. Waiting a bit to see if client errors happen...");
    await new Promise(r => setTimeout(r, 5000));

    await browser.close();
  } catch (e) {
    console.error("Puppeteer Script Error:", e);
  }
})();
