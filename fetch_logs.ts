import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message));

  await page.goto("http://127.0.0.1:3000");
  await page.waitForTimeout(3000);
  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error("SCRIPT ERROR", err);
  process.exit(1);
});
