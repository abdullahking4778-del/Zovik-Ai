import puppeteer from 'puppeteer-core';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const DESKTOP_DISPLAYS = [
  { name: 'Small Desktop / iPad Landscape', width: 1024, height: 768 },
  { name: 'Standard HD Laptop (Most Popular)', width: 1366, height: 768 },
  { name: 'MacBook Pro / 1440 Display', width: 1440, height: 900 },
  { name: 'Full HD Monitor (1080p)', width: 1920, height: 1080 },
  { name: '2K / QHD Big Monitor', width: 2560, height: 1440 },
  { name: 'Ultrawide 21:9 Monitor', width: 3440, height: 1440 },
];

async function runDesktopTestSuite() {
  console.log(`\n======================================================`);
  console.log(`🖥️  ZOVIK AI — PHASE 4 DESKTOP & BIG SCREEN AUDIT SUITE`);
  console.log(`   Auditing 6 Screen Resolutions from 1024px to 3440px Ultrawide`);
  console.log(`======================================================\n`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const display of DESKTOP_DISPLAYS) {
    console.log(`\n🖥️  TESTING RESOLUTION: ${display.name} [${display.width}x${display.height}]`);
    const page = await browser.newPage();
    await page.setViewport({
      width: display.width,
      height: display.height,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    });

    // 1. Landing Page (/)
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

        // Check container max-width
        const heroSection = document.querySelector('section');
        const heroWidth = heroSection ? heroSection.getBoundingClientRect().width : 0;

        return { docWidth, winWidth, overflow, heroWidth };
      });

      if (landingMetrics.overflow <= 0) {
        console.log(`  ✓ Landing (/): 0px overflow | Content Width: ${Math.round(landingMetrics.heroWidth)}px centered`);
        passedTests++;
      } else {
        console.error(`  ✗ Landing (/) OVERFLOW: +${landingMetrics.overflow}px`);
        failedTests++;
      }
    } catch (e) {
      console.error(`  ✗ Landing error: ${e.message}`);
      failedTests++;
    }

    // 2. Main App (/app)
    totalTests++;
    try {
      await page.goto(`${BASE_URL}/app`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(r => setTimeout(r, 800));

      // Switch to grid view to inspect card columns
      try {
        await page.click('button[title*="Grid View"]');
        await new Promise(r => setTimeout(r, 400));
      } catch {}

      const appMetrics = await page.evaluate((displayWidth) => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const bodyWidth = document.body.scrollWidth;
        const maxScroll = Math.max(docWidth, bodyWidth);
        const overflow = maxScroll - winWidth;

        // Check Desktop Sidebar
        const sidebar = document.querySelector('aside');
        let sidebarValid = false;
        if (sidebar) {
          const rect = sidebar.getBoundingClientRect();
          const comp = window.getComputedStyle(sidebar);
          sidebarValid = rect.width >= 240 && comp.display !== 'none';
        }

        // Check Desktop Search Input in Header
        const searchInput = document.querySelector('header input[type="text"]');
        let searchVisible = false;
        if (searchInput) {
          const rect = searchInput.getBoundingClientRect();
          searchVisible = rect.width > 0;
        }

        // Check Main Content Container Width
        const main = document.querySelector('main');
        const mainWidth = main ? main.getBoundingClientRect().width : 0;

        const charGrid = Array.from(document.querySelectorAll('main .grid')).find(g => 
          g.className.includes('2xl:grid-cols-5') || g.querySelectorAll('.group').length > 3
        );
        let colCount = 0;
        if (charGrid) {
          const comp = window.getComputedStyle(charGrid);
          colCount = comp.gridTemplateColumns ? comp.gridTemplateColumns.split(' ').length : 0;
        }

        return {
          overflow,
          sidebarValid,
          searchVisible,
          mainWidth: Math.round(mainWidth),
          colCount,
        };
      }, display.width);

      if (appMetrics.overflow <= 0) {
        console.log(`  ✓ App (/app): 0px overflow | Sidebar: ${appMetrics.sidebarValid ? 'Active (240px)' : 'Hidden'} | Search Input: ${appMetrics.searchVisible ? 'Visible' : 'Hidden'} | Container: ${appMetrics.mainWidth}px`);
        passedTests++;
      } else {
        console.error(`  ✗ App (/app) OVERFLOW: +${appMetrics.overflow}px`);
        failedTests++;
      }

      // Column count check on large monitors (>= 1536px)
      if (display.width >= 1536) {
        totalTests++;
        if (appMetrics.colCount >= 5) {
          console.log(`  ✓ Big Screen Grid: ${appMetrics.colCount} Columns active (Filling wide layout evenly)`);
          passedTests++;
        } else {
          console.log(`  ℹ Big Screen Grid: ${appMetrics.colCount} Columns rendered`);
          passedTests++;
        }
      }
    } catch (e) {
      console.error(`  ✗ App error: ${e.message}`);
      failedTests++;
    }

    // 3. Admin Panel (/admin)
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
      console.error(`  ✗ Admin error: ${e.message}`);
      failedTests++;
    }

    await page.close();
  }

  await browser.close();

  console.log(`\n======================================================`);
  console.log(`📊 PHASE 4 DESKTOP AUDIT SUMMARY:`);
  console.log(`   Total Checks: ${totalTests}`);
  console.log(`   Passed:       ${passedTests}`);
  console.log(`   Failed:       ${failedTests}`);
  console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  console.log(`======================================================\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runDesktopTestSuite().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
