import puppeteer from 'puppeteer-core';

async function testGoogleSignIn() {
  console.log("🎬 Testing Google Sign In popup in real Chrome...");
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox']
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  page.on('console', msg => {
    console.log(`[Browser Console ${msg.type()}]: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[Browser PageError]: ${err.message}`);
  });

  try {
    await page.goto("http://localhost:3000/app?login=true", { waitUntil: "networkidle2" });
    await new Promise(r => setTimeout(r, 2000));

    console.log("🔍 Checking Google button...");
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes("Continue with Google")) {
        console.log("👉 Clicking Continue with Google in real Chrome window...");
        await btn.click();
        break;
      }
    }

    // Wait 5 seconds to observe if popup opens or any error occurs
    await new Promise(r => setTimeout(r, 6000));

    const screenshotPath = "C:/Users/ABDULLAH HOME/.gemini/antigravity-ide/brain/e62bff65-04cf-4182-a2bd-2e383965dd5c/google_auth_live_check.png";
    await page.screenshot({ path: screenshotPath });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    await new Promise(r => setTimeout(r, 4000));
  } catch (err) {
    console.error("Test error:", err.message);
  } finally {
    console.log("Closing browser...");
    await browser.close();
  }
}

testGoogleSignIn();
