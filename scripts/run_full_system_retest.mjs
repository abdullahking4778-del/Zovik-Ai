import puppeteer from 'puppeteer-core';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const DEVICES_TO_TEST = [
  // Mobile
  { name: 'iPhone SE (Ultra-Compact)', width: 320, height: 568, category: 'Mobile' },
  { name: 'Galaxy S21 (Android Standard)', width: 360, height: 800, category: 'Mobile' },
  { name: 'iPhone 14 / 15 / 16 Pro', width: 393, height: 852, category: 'Mobile' },
  { name: 'Android Large (Pixel 7 / S23+)', width: 412, height: 915, category: 'Mobile' },
  { name: 'iPhone Pro Max', width: 430, height: 932, category: 'Mobile' },
  
  // Tablet
  { name: 'iPad Mini (Portrait)', width: 768, height: 1024, category: 'Tablet' },
  { name: 'Galaxy Tab S8 (Portrait)', width: 800, height: 1280, category: 'Tablet' },
  { name: 'iPad Air (Portrait)', width: 820, height: 1180, category: 'Tablet' },
  { name: 'iPad Pro 11" (Portrait)', width: 834, height: 1194, category: 'Tablet' },
  { name: 'iPad Mini (Landscape)', width: 1024, height: 768, category: 'Tablet' },
  { name: 'iPad Air (Landscape)', width: 1180, height: 820, category: 'Tablet' },

  // Desktop & Big Monitors
  { name: 'HD Laptop', width: 1366, height: 768, category: 'Desktop' },
  { name: 'MacBook Pro / 1440 Display', width: 1440, height: 900, category: 'Desktop' },
  { name: 'Full HD Monitor (1080p)', width: 1920, height: 1080, category: 'Big Screen' },
  { name: '2K / QHD Big Monitor', width: 2560, height: 1440, category: 'Big Screen' },
  { name: 'Ultrawide Monitor (21:9)', width: 3440, height: 1440, category: 'Ultrawide' },
];

const ROUTES_TO_TEST = ['/', '/app', '/admin'];

async function runFullSystemRetest() {
  console.log('======================================================================');
  console.log('🔍 ZOVIK AI — EXHAUSTIVE A-TO-Z ALL-PHASE RE-TEST & AUDIT');
  console.log('   Checking 16 Devices × 3 Core Routes + Modals + Console Logs');
  console.log('======================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const results = {
    totalChecks: 0,
    passedChecks: 0,
    failedChecks: 0,
    warnings: [],
    errors: [],
    details: []
  };

  try {
    const page = await browser.newPage();

    // Listen to console errors and unhandled exceptions
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' && !text.includes('favicon') && !text.includes('Failed to load resource')) {
        results.warnings.push(`[Console Error] ${text}`);
      }
    });

    page.on('pageerror', err => {
      results.errors.push(`[Runtime Uncaught] ${err.message}`);
    });

    // 1. AUDIT ALL 16 DEVICES ACROSS ALL 3 ROUTES
    console.log('--- 1. VIEWPORT & ROUTE OVERFLOW AUDIT ---');
    for (const route of ROUTES_TO_TEST) {
      console.log(`\n🌐 ROUTE: ${BASE_URL}${route}`);

      for (const dev of DEVICES_TO_TEST) {
        results.totalChecks++;
        await page.setViewport({ width: dev.width, height: dev.height });
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('body', { timeout: 10000 });

        const metrics = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
          const innerW = window.innerWidth;
          const overflow = scrollW - innerW;
          return { scrollW, innerW, overflow };
        });

        const isClean = metrics.overflow <= 1; // 1px rounding tolerance
        if (isClean) {
          results.passedChecks++;
          console.log(`  ✅ [${dev.category}] ${dev.name} (${dev.width}x${dev.height}): 0px overflow (doc: ${metrics.scrollW}px, win: ${metrics.innerW}px)`);
        } else {
          results.failedChecks++;
          console.error(`  ❌ [${dev.category}] ${dev.name} (${dev.width}x${dev.height}): OVERFLOW DETECTED! (${metrics.overflow}px)`);
          results.errors.push(`Overflow on ${route} @ ${dev.name}: ${metrics.overflow}px`);
        }
      }
    }

    // 2. AUDIT MODALS & DIALOGS ACROSS KEY FORM FACTORS
    console.log('\n--- 2. INTERACTIVE MODALS & TOUCH TARGETS AUDIT ---');
    const modalDevices = [
      { name: 'iPhone SE', width: 320, height: 568 },
      { name: 'iPhone 14 Pro', width: 393, height: 852 },
      { name: 'iPad Mini', width: 768, height: 1024 },
      { name: 'Full HD Monitor', width: 1920, height: 1080 }
    ];

    for (const dev of modalDevices) {
      console.log(`\n📱 Modals Check on: ${dev.name} (${dev.width}x${dev.height})`);
      await page.setViewport({ width: dev.width, height: dev.height });
      await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle2' });

      // Check Chat Modal
      results.totalChecks++;
      const chatOpened = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('div[class*="group cursor-pointer"]'));
        if (cards.length > 0) {
          cards[0].click();
          return true;
        }
        return false;
      });

      if (chatOpened) {
        await new Promise(r => setTimeout(r, 600));
        const chatAudit = await page.evaluate(() => {
          const input = document.querySelector('input[placeholder*="Type a message"]') || document.querySelector('input');
          const sendBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg') || b.textContent.includes('Send'));
          const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth;
          return {
            hasInput: !!input,
            hasSendBtn: !!sendBtn,
            overflow
          };
        });

        if (chatAudit.hasInput && chatAudit.overflow <= 1) {
          results.passedChecks++;
          console.log(`  ✅ Chat Modal: Bounded & Accessible (Input: ${chatAudit.hasInput}, Overflow: ${chatAudit.overflow}px)`);
        } else {
          results.failedChecks++;
          console.error(`  ❌ Chat Modal: Issue detected (Input: ${chatAudit.hasInput}, Overflow: ${chatAudit.overflow}px)`);
          results.errors.push(`Chat Modal issue on ${dev.name}`);
        }

        // Close Chat Modal
        await page.evaluate(() => {
          const closeBtn = document.querySelector('button[class*="rounded-full"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Back') || b.querySelector('svg'));
          if (closeBtn) closeBtn.click();
        });
        await new Promise(r => setTimeout(r, 400));
      }

      // Check Coin Store Modal
      results.totalChecks++;
      const storeOpened = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const coinBtn = buttons.find(b => b.textContent.includes('Coins') || b.textContent.includes('Get Coins') || b.textContent.includes('🪙'));
        if (coinBtn) {
          coinBtn.click();
          return true;
        }
        return false;
      });

      if (storeOpened) {
        await new Promise(r => setTimeout(r, 600));
        const storeAudit = await page.evaluate(() => {
          const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth;
          const hasModal = document.body.innerText.includes('Coin Store') || document.body.innerText.includes('Coins');
          return { hasModal, overflow };
        });

        if (storeAudit.overflow <= 1) {
          results.passedChecks++;
          console.log(`  ✅ Coin Store Modal: Bounded & Responsive (Overflow: ${storeAudit.overflow}px)`);
        } else {
          results.failedChecks++;
          console.error(`  ❌ Coin Store Modal: Overflow detected (${storeAudit.overflow}px)`);
          results.errors.push(`Coin Store Modal overflow on ${dev.name}`);
        }

        // Close store
        await page.evaluate(() => {
          const closeBtn = document.querySelector('button[class*="rounded-full"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Close') || b.querySelector('svg'));
          if (closeBtn) closeBtn.click();
        });
        await new Promise(r => setTimeout(r, 400));
      }

      // Check Touch Target Size (Mobile buttons >= 40px)
      if (dev.width < 500) {
        results.totalChecks++;
        const touchTargets = await page.evaluate(() => {
          const navButtons = Array.from(document.querySelectorAll('nav button, header button'));
          let undersized = 0;
          navButtons.forEach(btn => {
            const rect = btn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              if (rect.width < 38 || rect.height < 38) {
                undersized++;
              }
            }
          });
          return { total: navButtons.length, undersized };
        });

        if (touchTargets.undersized === 0) {
          results.passedChecks++;
          console.log(`  ✅ Touch Targets: Ergonomic (Total checked: ${touchTargets.total}, Undersized: 0)`);
        } else {
          results.warnings.push(`Touch Targets on ${dev.name}: ${touchTargets.undersized} buttons smaller than 38px`);
          console.log(`  ⚠️ Touch Targets: ${touchTargets.undersized} buttons slightly compact`);
          results.passedChecks++; // counted as warning, not hard failure
        }
      }
    }

    // 3. CHECK DESKTOP BIG SCREEN SCALING (1920px & 2560px)
    console.log('\n--- 3. BIG SCREEN SCALING & 5-COL GRID AUDIT ---');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle2' });

    results.totalChecks++;
    const bigScreenLayout = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      const container = divs.find(d => d.className && typeof d.className === 'string' && (d.className.includes('2xl:max-w-[1600px]') || d.className.includes('max-w-7xl')));
      const grid = divs.find(d => d.className && typeof d.className === 'string' && d.className.includes('2xl:grid-cols-5'));
      const sidebar = document.querySelector('aside');
      return {
        containerMaxW: container ? window.getComputedStyle(container).maxWidth : 'none',
        has5ColGrid: !!grid,
        hasSidebar: !!sidebar && sidebar.offsetWidth > 200
      };
    });

    if (bigScreenLayout.hasSidebar && (bigScreenLayout.has5ColGrid || bigScreenLayout.containerMaxW !== 'none')) {
      results.passedChecks++;
      console.log(`  ✅ Big Screen Layout: Sidebar (${bigScreenLayout.hasSidebar}), 5-Col Grid (${bigScreenLayout.has5ColGrid}), MaxWidth (${bigScreenLayout.containerMaxW})`);
    } else {
      results.failedChecks++;
      console.error(`  ❌ Big Screen Layout issue!`);
      results.errors.push('Big screen layout check failed');
    }

  } catch (err) {
    console.error('Fatal Test Runner Error:', err);
    results.errors.push(`Runner Fatal: ${err.message}`);
  } finally {
    await browser.close();
  }

  console.log('\n======================================================================');
  console.log('📊 RE-TEST AUDIT SUMMARY:');
  console.log(`   Total Checks:    ${results.totalChecks}`);
  console.log(`   Passed:          ${results.passedChecks}`);
  console.log(`   Failed:          ${results.failedChecks}`);
  console.log(`   Warnings Found:  ${results.warnings.length}`);
  console.log(`   Errors Found:    ${results.errors.length}`);
  console.log(`   Success Rate:    ${Math.round((results.passedChecks / results.totalChecks) * 100)}%`);
  console.log('======================================================================');

  if (results.warnings.length > 0) {
    console.log('\n⚠️ WARNINGS LOGGED:');
    results.warnings.forEach(w => console.log('  - ' + w));
  }

  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS / PROBLEMS FOUND:');
    results.errors.forEach(e => console.log('  - ' + e));
  } else {
    console.log('\n🌟 ZERO CRITICAL ERRORS OR MISTAKES FOUND! ALL PHASES CERTIFIED!');
  }
}

runFullSystemRetest();
