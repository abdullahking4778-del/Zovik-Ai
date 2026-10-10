import puppeteer from 'puppeteer-core';

async function captureLuxuryDesigns() {
  console.log("🎬 Launching Chrome to capture 3 real luxury designs...");
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
    console.log("📍 Navigating to http://localhost:3000/preview-hero...");
    await page.goto("http://localhost:3000/preview-hero", { waitUntil: "networkidle2" });
    await new Promise(r => setTimeout(r, 2500));

    // 1. Capture Design 1
    const path1 = "C:/Users/ABDULLAH HOME/.gemini/antigravity-ide/brain/e62bff65-04cf-4182-a2bd-2e383965dd5c/design_1_bento.png";
    await page.screenshot({ path: path1 });
    console.log(`📸 Design 1 Screenshot saved: ${path1}`);

    // 2. Click Design 2 button
    console.log("👉 Switching to Design 2...");
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes("Design 2")) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2000));
    const path2 = "C:/Users/ABDULLAH HOME/.gemini/antigravity-ide/brain/e62bff65-04cf-4182-a2bd-2e383965dd5c/design_2_fan.png";
    await page.screenshot({ path: path2 });
    console.log(`📸 Design 2 Screenshot saved: ${path2}`);

    // 3. Click Design 3 button
    console.log("👉 Switching to Design 3...");
    const buttons3 = await page.$$('button');
    for (const b of buttons3) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes("Design 3")) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2000));
    const path3 = "C:/Users/ABDULLAH HOME/.gemini/antigravity-ide/brain/e62bff65-04cf-4182-a2bd-2e383965dd5c/design_3_stage.png";
    await page.screenshot({ path: path3 });
    console.log(`📸 Design 3 Screenshot saved: ${path3}`);

    console.log("✨ All 3 luxury design mockups captured successfully! Leaving open for 6s...");
    await new Promise(r => setTimeout(r, 6000));

  } catch (err) {
    console.error("Capture error:", err.message);
  } finally {
    console.log("Closing browser...");
    await browser.close();
  }
}

captureLuxuryDesigns();
