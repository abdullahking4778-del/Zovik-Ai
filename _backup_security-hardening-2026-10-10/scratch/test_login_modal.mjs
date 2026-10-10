import puppeteer from 'puppeteer-core';

async function testLoginModal() {
  console.log("🎬 Launching Chrome to verify updated Login Modal on /app?login=true...");
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox']
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  try {
    // Clear localStorage to ensure not logged in
    await page.goto("http://localhost:3000/app", { waitUntil: "networkidle2" });
    await page.evaluate(() => {
      localStorage.removeItem("zovik_logged_in");
      localStorage.removeItem("zovik_user_cache");
    });

    console.log("📍 Navigating to http://localhost:3000/app?login=true...");
    await page.goto("http://localhost:3000/app?login=true", { waitUntil: "networkidle2" });
    await new Promise(r => setTimeout(r, 2500));

    // Screenshot of modal
    const screenshotPath = "C:/Users/ABDULLAH HOME/.gemini/antigravity-ide/brain/e62bff65-04cf-4182-a2bd-2e383965dd5c/updated_signin_modal.png";
    await page.screenshot({ path: screenshotPath });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    console.log("✨ Modal visible on your screen for 8 seconds...");
    await new Promise(r => setTimeout(r, 8000));

  } catch (err) {
    console.error("Error during test:", err.message);
  } finally {
    console.log("Closing browser...");
    await browser.close();
  }
}

testLoginModal();
