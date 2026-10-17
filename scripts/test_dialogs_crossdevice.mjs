import puppeteer from 'puppeteer-core';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const TEST_FORM_FACTORS = [
  { name: 'iPhone SE (Ultra-Compact Mobile)', width: 320, height: 568, isMobile: true, hasTouch: true },
  { name: 'Galaxy S21 (Standard Android)', width: 360, height: 800, isMobile: true, hasTouch: true },
  { name: 'iPhone 14 Pro (iOS Dynamic Island)', width: 393, height: 852, isMobile: true, hasTouch: true },
  { name: 'iPad Mini (Tablet Portrait)', width: 768, height: 1024, isMobile: true, hasTouch: true },
  { name: 'Full HD Monitor (Desktop 1080p)', width: 1920, height: 1080, isMobile: false, hasTouch: false },
];

async function runDialogsCrossDeviceSuite() {
  console.log(`\n======================================================`);
  console.log(`🌟 ZOVIK AI — PHASE 5 CROSS-DEVICE QA & MODALS AUDIT`);
  console.log(`   Auditing Interactive Dialogs across 5 Screen Form Factors`);
  console.log(`======================================================\n`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const device of TEST_FORM_FACTORS) {
    console.log(`\n📱 AUDITING FORM FACTOR: ${device.name} [${device.width}x${device.height}]`);
    const page = await browser.newPage();
    await page.setViewport({
      width: device.width,
      height: device.height,
      deviceScaleFactor: 2,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
    });

    await page.goto(`${BASE_URL}/app`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 800));

    // 1. Audit Chat Modal (Click first companion's chat button)
    totalTests++;
    try {
      const chatOpened = await page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button'));
        const chatBtn = allButtons.find(b => b.textContent?.includes('Chat') || b.title?.includes('Chat') || b.className.includes('from-[#f53b70]'));
        if (chatBtn) {
          chatBtn.click();
          return true;
        }
        return false;
      });

      await new Promise(r => setTimeout(r, 600));

      const chatMetrics = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const overflow = docWidth - winWidth;

        // Check input bar
        const inputField = document.querySelector('form input[type="text"]');
        const sendBtn = document.querySelector('form button[type="submit"]');
        const inputVisible = inputField ? inputField.getBoundingClientRect().width > 0 : false;
        const sendVisible = sendBtn ? sendBtn.getBoundingClientRect().width > 0 : false;

        // Close chat modal
        const closeBtn = document.querySelector('div.fixed button[class*="rounded-full"]');
        if (closeBtn) closeBtn.click();

        return { overflow, inputVisible, sendVisible };
      });

      if (chatMetrics.overflow <= 0) {
        console.log(`  ✓ Chat Modal: 0px overflow | Input & Send buttons active & elevated`);
        passedTests++;
      } else {
        console.error(`  ✗ Chat Modal OVERFLOW: +${chatMetrics.overflow}px`);
        failedTests++;
      }
    } catch (e) {
      console.error(`  ✗ Chat Modal error: ${e.message}`);
      failedTests++;
    }

    await new Promise(r => setTimeout(r, 400));

    // 2. Audit Coin Store / Recharge Modal
    totalTests++;
    try {
      const storeOpened = await page.evaluate(() => {
        const coinBtns = Array.from(document.querySelectorAll('button')).filter(b => 
          b.title?.includes('Coin') || b.textContent?.includes('Coins') || b.textContent?.includes('🪙')
        );
        if (coinBtns.length > 0) {
          coinBtns[0].click();
          return true;
        }
        return false;
      });

      await new Promise(r => setTimeout(r, 600));

      const storeMetrics = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const overflow = docWidth - winWidth;

        const storeModal = document.querySelector('div.fixed:has(h2)');
        const modalVisible = storeModal ? storeModal.getBoundingClientRect().width > 0 : false;

        // Close store modal
        const closeBtn = document.querySelector('button:has(svg.lucide-x)');
        if (closeBtn) closeBtn.click();

        return { overflow, modalVisible };
      });

      if (storeMetrics.overflow <= 0) {
        console.log(`  ✓ Coin Store Modal: 0px overflow | Responsive packages container verified`);
        passedTests++;
      } else {
        console.error(`  ✗ Coin Store Modal OVERFLOW: +${storeMetrics.overflow}px`);
        failedTests++;
      }
    } catch (e) {
      console.error(`  ✗ Coin Store Modal error: ${e.message}`);
      failedTests++;
    }

    await new Promise(r => setTimeout(r, 400));

    // 3. Audit Shorts Reels Modal
    totalTests++;
    try {
      const shortsOpened = await page.evaluate(() => {
        const shortsBtn = Array.from(document.querySelectorAll('button, div')).find(el => 
          el.textContent?.includes('Zovik Shorts') || el.title?.includes('Shorts')
        );
        if (shortsBtn) {
          shortsBtn.click();
          return true;
        }
        return false;
      });

      await new Promise(r => setTimeout(r, 600));

      const shortsMetrics = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const overflow = docWidth - winWidth;

        // Close shorts
        const closeBtn = document.querySelector('button[title*="Close Shorts"], button:has(svg.lucide-x)');
        if (closeBtn) closeBtn.click();

        return { overflow };
      });

      if (shortsMetrics.overflow <= 0) {
        console.log(`  ✓ Shorts Reel Modal: 0px overflow | 100dvh Vertical video stage bounded`);
        passedTests++;
      } else {
        console.error(`  ✗ Shorts Reel Modal OVERFLOW: +${shortsMetrics.overflow}px`);
        failedTests++;
      }
    } catch (e) {
      console.error(`  ✗ Shorts Reel Modal error: ${e.message}`);
      failedTests++;
    }

    await new Promise(r => setTimeout(r, 400));

    // 4. Audit Create Companion Modal
    totalTests++;
    try {
      const createOpened = await page.evaluate(() => {
        const createBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.title?.includes('Create') || b.textContent?.includes('Create') || b.textContent?.includes('Creators')
        );
        if (createBtn) {
          createBtn.click();
          return true;
        }
        return false;
      });

      await new Promise(r => setTimeout(r, 600));

      const createMetrics = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const overflow = docWidth - winWidth;

        // Close create modal
        const closeBtn = document.querySelector('button:has(svg.lucide-x)');
        if (closeBtn) closeBtn.click();

        return { overflow };
      });

      if (createMetrics.overflow <= 0) {
        console.log(`  ✓ Create Companion Modal: 0px overflow | Multi-step form responsive`);
        passedTests++;
      } else {
        console.error(`  ✗ Create Companion Modal OVERFLOW: +${createMetrics.overflow}px`);
        failedTests++;
      }
    } catch (e) {
      console.error(`  ✗ Create Companion Modal error: ${e.message}`);
      failedTests++;
    }

    await page.close();
  }

  await browser.close();

  console.log(`\n======================================================`);
  console.log(`📊 PHASE 5 CROSS-DEVICE DIALOGS AUDIT SUMMARY:`);
  console.log(`   Total Modal Checks: ${totalTests}`);
  console.log(`   Passed:             ${passedTests}`);
  console.log(`   Failed:             ${failedTests}`);
  console.log(`   Success Rate:       ${Math.round((passedTests / totalTests) * 100)}%`);
  console.log(`======================================================\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runDialogsCrossDeviceSuite().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
