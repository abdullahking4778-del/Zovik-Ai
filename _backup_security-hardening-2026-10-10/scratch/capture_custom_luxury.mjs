import puppeteer from 'puppeteer-core';

async function captureCustomLuxury() {
  console.log("🎬 Capturing custom luxury hero design in Chrome...");
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--start-maximized', '--no-sandbox']
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    await page.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
    await new Promise(r => setTimeout(r, 2500));

    const path = "C:/Users/ABDULLAH HOME/.gemini/antigravity-ide/brain/e62bff65-04cf-4182-a2bd-2e383965dd5c/main_landing_applied.png";
    await page.screenshot({ path });
    console.log(`📸 Screenshot successfully saved: ${path}`);

    console.log("✨ Window open for 6 seconds so user can see live on screen...");
    await new Promise(r => setTimeout(r, 6000));
  } catch (err) {
    console.error("Capture error:", err.message);
  } finally {
    console.log("Closing browser...");
    await browser.close();
  }
}

captureCustomLuxury();
