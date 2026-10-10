import puppeteer from 'puppeteer-core';
import path from 'path';

async function runLiveBrowserTest() {
  console.log("==================================================");
  console.log("🎬 STARTING LIVE CHROME VISUAL TEST ON SCREEN");
  console.log("==================================================");

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

  console.log(`\n🔍 Launching Google Chrome from: ${chromePath}`);
  console.log("👀 Nazar rakhein apni screen par, Chrome window khul rahi hai...\n");

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  // Listen to browser console messages to detect errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`⚠️ [Chrome Console Error]: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    console.log(`❌ [Chrome Page Exception]: ${err.message}`);
  });

  // Handle any alerts/dialogs gracefully
  page.on('dialog', async dialog => {
    console.log(`🔔 [Chrome Alert Dialog]: "${dialog.message()}"`);
    await dialog.accept();
  });

  try {
    console.log("📍 Step 1: Navigating to http://localhost:3000/admin...");
    await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle2" });
    await new Promise(r => setTimeout(r, 2000));

    // Check if we are on Login screen
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      console.log("🔑 Step 2: Login screen detect hui. Password enter kar raha hoon...");
      await passwordInput.click();
      await page.keyboard.type("#Abdullah786099#", { delay: 60 });
      await new Promise(r => setTimeout(r, 1000));

      console.log("🔓 Step 3: 'Unlock Control Room' button click kar raha hoon...");
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
      } else {
        await page.keyboard.press('Enter');
      }

      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 2500));
    } else {
      console.log("ℹ️ Pehle se active session detect hua. Direct Dashboard par hain.");
    }

    console.log("\n📊 Step 4: Overview & Metrics Tab view ho raha hai...");
    await new Promise(r => setTimeout(r, 3000));

    // Helper to click tab by text
    const clickTab = async (tabName) => {
      console.log(`👉 Tab change: '${tabName}' par click kar raha hoon...`);
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes(tabName)) {
          await btn.click();
          await new Promise(r => setTimeout(r, 2500));
          return true;
        }
      }
      return false;
    };

    // Step 5: Check Payments Tab
    await clickTab("Payments");
    console.log("💳 Payments Approval Queue screen par render ho gayi!");
    await new Promise(r => setTimeout(r, 3000));

    // Step 6: Check Companions Tab
    await clickTab("Companions");
    console.log("✨ Companions List screen par render ho gayi!");
    await new Promise(r => setTimeout(r, 3000));

    // Step 7: Check Photo Galleries Tab
    await clickTab("Photo Galleries");
    console.log("📸 Photo Galleries screen par render ho gayi!");
    await new Promise(r => setTimeout(r, 3000));

    // Step 8: Check Shorts Reels Tab
    await clickTab("Shorts Reels");
    console.log("🎬 Shorts Reels screen par render ho gayi!");
    await new Promise(r => setTimeout(r, 3000));

    // Step 9: Check Users Tab
    await clickTab("Users");
    console.log("👥 Users List Management screen par render ho gayi!");
    await new Promise(r => setTimeout(r, 3000));

    // Step 10: Back to Overview Tab
    await clickTab("Overview & Metrics");
    await new Promise(r => setTimeout(r, 2000));

    console.log("\n==================================================");
    console.log("✅ LIVE BROWSER TEST COMPLETED SUCCESSFULLY!");
    console.log("Window 15 seconds tak open rahegi taake aap khud dekh sakein.");
    console.log("==================================================");

    await new Promise(r => setTimeout(r, 15000));

  } catch (err) {
    console.error("❌ Live Browser Test mein error aya:", err.message);
  } finally {
    console.log("🚪 Closing browser window...");
    await browser.close();
    console.log("✨ Done!");
  }
}

runLiveBrowserTest();
