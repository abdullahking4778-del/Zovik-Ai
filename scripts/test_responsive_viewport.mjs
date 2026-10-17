import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const VIEWPORTS = [
  { name: "Mobile iPhone SE", width: 320, height: 568 },
  { name: "Mobile iPhone 12/13/14", width: 390, height: 844 },
  { name: "Mobile Galaxy S21", width: 360, height: 800 },
  { name: "Tablet iPad Mini", width: 768, height: 1024 },
  { name: "Tablet iPad Pro", width: 1024, height: 1366 },
  { name: "Desktop Laptop HD", width: 1366, height: 768 },
  { name: "Desktop FHD Monitor", width: 1920, height: 1080 },
  { name: "Desktop 2K/Ultrawide", width: 2560, height: 1440 },
];

const ROUTES = ["/", "/app", "/admin"];

async function runAudit() {
  console.log("=================================================");
  console.log("📱 RESPONSIVE VIEWPORT & OVERFLOW AUDIT");
  console.log("=================================================");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  let totalIssues = 0;

  for (const route of ROUTES) {
    console.log(`\n🔍 Checking Route: http://localhost:3000${route}`);
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`http://localhost:3000${route}`, { waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});

      const metrics = await page.evaluate(() => {
        const docEl = document.documentElement;
        const body = document.body;
        const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
        const clientW = docEl.clientWidth;
        const innerW = window.innerWidth;
        const hasOverflow = scrollW > innerW + 1; // 1px threshold for subpixel

        // Find elements causing overflow if any
        let overflowingElements = [];
        if (hasOverflow) {
          const allEls = document.querySelectorAll("*");
          allEls.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.right > innerW + 1) {
              overflowingElements.push({
                tag: el.tagName,
                id: el.id,
                className: el.className?.toString?.().slice(0, 40),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
              });
            }
          });
        }

        return {
          scrollW,
          clientW,
          innerW,
          hasOverflow,
          overflowCount: overflowingElements.length,
          topOverflowing: overflowingElements.slice(0, 3),
        };
      });

      if (metrics.hasOverflow) {
        totalIssues++;
        console.log(`  ❌ [${vp.name} (${vp.width}x${vp.height})] OVERFLOW DETECTED: scrollWidth=${metrics.scrollW}px, innerWidth=${metrics.innerW}px (Diff: +${metrics.scrollW - metrics.innerW}px)`);
        if (metrics.topOverflowing.length > 0) {
          console.log(`     Top overflowing elements:`, JSON.stringify(metrics.topOverflowing));
        }
      } else {
        console.log(`  ✅ [${vp.name} (${vp.width}x${vp.height})] Perfect: width=${metrics.scrollW}px (no overflow)`);
      }
    }
  }

  await browser.close();
  console.log("\n=================================================");
  console.log(`Audit Completed. Total Viewport Issues: ${totalIssues}`);
  console.log("=================================================");
}

runAudit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
