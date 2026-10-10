import puppeteer from 'puppeteer-core';

(async () => {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100 });

  // Get token
  const authRes = await fetch('http://localhost:3000/api/admin/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: '#Abdullah786099#' })
  });
  const { token } = await authRes.json();

  await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => {
    localStorage.setItem('zovik_admin_session', t);
  }, token);

  // Reload and wait until authenticated UI shows
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !document.querySelector('input[type="password"]'), { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 2000));

  // Find and click "Photo Sequence & Re-Order" tab
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Photo Sequence')) {
      console.log('Clicking Photo Sequence & Re-Order tab...');
      await btn.click();
      break;
    }
  }

  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: 'C:/Users/ABDULLAH HOME/.gemini/antigravity-ide/brain/e62bff65-04cf-4182-a2bd-2e383965dd5c/admin_galleries_live.png' });
  console.log('Admin galleries screenshot saved.');

  await browser.close();
  console.log('Done!');
})();
