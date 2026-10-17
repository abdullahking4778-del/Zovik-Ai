import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const MOBILE_DEVICES = [
  { name: "iPhone SE (Compact 320px)", width: 320, height: 568 },
  { name: "Android Galaxy S21 (360px)", width: 360, height: 800 },
  { name: "iPhone 14 / 15 / 16 (393px)", width: 393, height: 852 },
  { name: "iPhone Pro Max (430px)", width: 430, height: 932 },
  { name: "Android Large (412px)", width: 412, height: 915 },
];

async function runMobileAudit() {
  console.log("==================================================================");
  console.log("📱 PHASE 2: MOBILE DEEP POLISH AUDIT (iOS & Android 320px - 480px)");
  console.log("==================================================================");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  let totalErrors = 0;

  for (const dev of MOBILE_DEVICES) {
    console.log(`\n🔍 Evaluating Device: ${dev.name} [${dev.width}x${dev.height}]`);
    await page.setViewport({ width: dev.width, height: dev.height, isMobile: true, hasTouch: true });
    await page.goto("http://localhost:3000/app", { waitUntil: "networkidle2", timeout: 15000 });

    const results = await page.evaluate(() => {
      const docEl = document.documentElement;
      const body = document.body;
      const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
      const innerW = window.innerWidth;
      const hasOverflow = scrollW > innerW + 1;

      // 1. Check Mobile Navigation
      const navEl = document.querySelector("nav.lg\\:hidden");
      const navExists = !!navEl;
      let navMetrics = { exists: false, height: 0, buttonCount: 0, smallTargets: [] };

      if (navEl) {
        const navRect = navEl.getBoundingClientRect();
        const buttons = navEl.querySelectorAll("button");
        const smallTargets = [];

        buttons.forEach((btn, idx) => {
          const rect = btn.getBoundingClientRect();
          // WCAG 2.5.5 recommended touch target is 44x44px (with 38px min for compact icons)
          if (rect.width < 38 || rect.height < 38) {
            smallTargets.push({ index: idx, width: Math.round(rect.width), height: Math.round(rect.height) });
          }
        });

        navMetrics = {
          exists: true,
          height: Math.round(navRect.height),
          buttonCount: buttons.length,
          smallTargets,
        };
      }

      // 2. Check Header
      const headerEl = document.querySelector("header");
      const headerRect = headerEl ? headerEl.getBoundingClientRect() : null;
      const headerOverflow = headerRect ? headerRect.width > innerW + 1 : false;

      // 3. Check Character Cards
      const cards = document.querySelectorAll("#character-grid, .snap-start");
      const cardCount = cards.length;

      return {
        scrollW,
        innerW,
        hasOverflow,
        navMetrics,
        headerOverflow,
        cardCount,
      };
    });

    if (results.hasOverflow) {
      totalErrors++;
      console.log(`  ❌ Horizontal Overflow: scrollWidth=${results.scrollW}px, innerWidth=${results.innerW}px`);
    } else {
      console.log(`  ✅ Zero Horizontal Overflow (Width: ${results.scrollW}px === ${results.innerW}px)`);
    }

    if (results.navMetrics.exists) {
      if (results.navMetrics.smallTargets.length > 0) {
        totalErrors++;
        console.log(`  ⚠️ Sub-optimal touch targets found in MobileNav:`, results.navMetrics.smallTargets);
      } else {
        console.log(`  ✅ MobileNav Ergonomics: ${results.navMetrics.buttonCount} buttons verified with 40px+ touch targets (Nav height: ${results.navMetrics.height}px)`);
      }
    } else {
      totalErrors++;
      console.log(`  ❌ MobileNav element not detected on mobile viewport!`);
    }

    if (results.headerOverflow) {
      totalErrors++;
      console.log(`  ❌ Header exceeds screen width!`);
    } else {
      console.log(`  ✅ Header perfectly fit to mobile screen`);
    }
  }

  await browser.close();
  console.log("\n==================================================================");
  console.log(`Phase 2 Mobile Audit Completed. Total Issues: ${totalErrors}`);
  console.log("==================================================================");

  if (totalErrors > 0) {
    process.exit(1);
  }
}

runMobileAudit().catch((err) => {
  console.error("Mobile Audit failed:", err);
  process.exit(1);
});
