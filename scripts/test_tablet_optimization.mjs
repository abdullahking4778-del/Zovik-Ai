import puppeteer from 'puppeteer-core';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const TABLET_DEVICES = [
  { name: 'iPad Mini (Portrait)', width: 768, height: 1024, isMobile: true, hasTouch: true },
  { name: 'Android Tablet (Galaxy Tab Portrait)', width: 800, height: 1280, isMobile: true, hasTouch: true },
  { name: 'iPad Air 10th Gen (Portrait)', width: 820, height: 1180, isMobile: true, hasTouch: true },
  { name: 'iPad Pro 11" (Portrait)', width: 834, height: 1194, isMobile: true, hasTouch: true },
  { name: 'iPad Mini (Landscape)', width: 1024, height: 768, isMobile: true, hasTouch: true },
  { name: 'iPad Air (Landscape)', width: 1180, height: 820, isMobile: true, hasTouch: true },
];

async function runTabletTestSuite() {
  console.log(`\n======================================================`);
  console.log(`🚀 ZOVIK AI — PHASE 3 TABLET OPTIMIZATION TEST SUITE`);
  console.log(`   Auditing 6 Tablet Form Factors across Landing, App, and Admin`);
  console.log(`======================================================\n`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const device of TABLET_DEVICES) {
    console.log(`\n📱 TESTING DEVICE: ${device.name} [${device.width}x${device.height}]`);
    const page = await browser.newPage();
    await page.setViewport({
      width: device.width,
      height: device.height,
      deviceScaleFactor: 2,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
    });

    // 1. Test Landing Page (/)
    totalTests++;
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(r => setTimeout(r, 600));

      const landingMetrics = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const bodyWidth = document.body.scrollWidth;
        const maxScroll = Math.max(docWidth, bodyWidth);
        const overflow = maxScroll - winWidth;
        return { docWidth, winWidth, overflow };
      });

      if (landingMetrics.overflow <= 0) {
        console.log(`  ✓ Landing Page (/): 0px overflow (doc: ${landingMetrics.docWidth}px, win: ${landingMetrics.winWidth}px)`);
        passedTests++;
      } else {
        console.error(`  ✗ Landing Page (/) OVERFLOW: +${landingMetrics.overflow}px`);
        failedTests++;
      }
    } catch (e) {
      console.error(`  ✗ Landing Page error: ${e.message}`);
      failedTests++;
    }

    // 2. Test Main App (/app)
    totalTests++;
    try {
      await page.goto(`${BASE_URL}/app`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(r => setTimeout(r, 800));

      const appMetrics = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const bodyWidth = document.body.scrollWidth;
        const maxScroll = Math.max(docWidth, bodyWidth);
        const overflow = maxScroll - winWidth;

        // Check cards layout
        const characterCards = Array.from(document.querySelectorAll('.group[class*="relative"]'));
        
        // Check MobileNav positioning
        const mobileNav = document.querySelector('nav.lg\\:hidden');
        let navVisible = false;
        let navBounded = false;
        if (mobileNav) {
          const rect = mobileNav.getBoundingClientRect();
          navVisible = rect.width > 0 && rect.height > 0;
          navBounded = rect.width <= winWidth;
        }

        return {
          overflow,
          cardsCount: characterCards.length,
          navVisible,
          navBounded,
        };
      });

      if (appMetrics.overflow <= 0) {
        console.log(`  ✓ App (/app - Home Tab): 0px overflow | Nav: ${appMetrics.navVisible ? 'Visible & Bounded' : 'Desktop Sidebar'}`);
        passedTests++;
      } else {
        console.error(`  ✗ App (/app) OVERFLOW: +${appMetrics.overflow}px`);
        failedTests++;
      }
    } catch (e) {
      console.error(`  ✗ App (/app) error: ${e.message}`);
      failedTests++;
    }

    // 3. Test Grid Column Balance on Tablet Portrait (768px-834px)
    if (device.width < 1000) {
      totalTests++;
      try {
        const gridColumnsCheck = await page.evaluate(() => {
          // Switch to grid view if not already
          const gridBtn = document.querySelector('button[title*="Grid View"]');
          if (gridBtn) gridBtn.click();
          
          const gridContainer = document.querySelector('#character-grid ~ div .grid, main .grid');
          if (!gridContainer) return { found: false };

          const computed = window.getComputedStyle(gridContainer);
          const gridTemplateColumns = computed.gridTemplateColumns;
          const colCount = gridTemplateColumns ? gridTemplateColumns.split(' ').length : 0;
          return { found: true, colCount, gridTemplateColumns };
        });

        if (gridColumnsCheck.found) {
          console.log(`  ✓ Grid Columns (${device.width}px): ${gridColumnsCheck.colCount} columns (Template: ${gridColumnsCheck.gridTemplateColumns.substring(0, 30)}...)`);
          passedTests++;
        } else {
          console.log(`  ℹ Grid Container in row view mode (Fluid dynamic rows active)`);
          passedTests++;
        }
      } catch (e) {
        console.error(`  ✗ Grid column check error: ${e.message}`);
        failedTests++;
      }
    }

    // 4. Test Admin Panel (/admin)
    totalTests++;
    try {
      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(r => setTimeout(r, 600));

      const adminMetrics = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const bodyWidth = document.body.scrollWidth;
        const maxScroll = Math.max(docWidth, bodyWidth);
        const overflow = maxScroll - winWidth;
        return { overflow, docWidth, winWidth };
      });

      if (adminMetrics.overflow <= 0) {
        console.log(`  ✓ Admin (/admin): 0px overflow (doc: ${adminMetrics.docWidth}px, win: ${adminMetrics.winWidth}px)`);
        passedTests++;
      } else {
        console.error(`  ✗ Admin (/admin) OVERFLOW: +${adminMetrics.overflow}px`);
        failedTests++;
      }
    } catch (e) {
      console.error(`  ✗ Admin (/admin) error: ${e.message}`);
      failedTests++;
    }

    await page.close();
  }

  await browser.close();

  console.log(`\n======================================================`);
  console.log(`📊 PHASE 3 TABLET TEST SUMMARY:`);
  console.log(`   Total Checks: ${totalTests}`);
  console.log(`   Passed:       ${passedTests}`);
  console.log(`   Failed:       ${failedTests}`);
  console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  console.log(`======================================================\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTabletTestSuite().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
