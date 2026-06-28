#!/usr/bin/env node
/**
 * Captures full-page and viewport screenshots for design audit reference sites.
 * Usage: node scripts/capture-design-audit.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = path.join(process.cwd(), "docs/design-audit/screenshots");

const PAGES = {
  empire: [
    { slug: "home", url: "https://empi.re/", scroll: [0, 900, 1800] },
    { slug: "shop-all", url: "https://empi.re/shop", scroll: [0] },
    { slug: "shop-clothing", url: "https://empi.re/shop/clothing", scroll: [0] },
    {
      slug: "pdp-snapback",
      url: "https://empi.re/products/empire-x-new-era-9forty-red-snapback",
      scroll: [0],
    },
    { slug: "in-the-news", url: "https://empi.re/in-the-news", scroll: [0] },
    {
      slug: "store-home",
      url: "https://store.empi.re/",
      scroll: [0],
      waitUntil: "domcontentloaded",
    },
  ],
  kaleido: [
    { slug: "home", url: "https://www.kaleidojewellery.com/", scroll: [0, 900] },
    {
      slug: "bestsellers",
      url: "https://www.kaleidojewellery.com/collections/best-sellers",
      scroll: [0],
    },
    {
      slug: "earrings",
      url: "https://www.kaleidojewellery.com/collections/earrings",
      scroll: [0],
    },
    {
      slug: "pdp-sample",
      url: "https://www.kaleidojewellery.com/products/mini-huggie-hoop-earrings",
      scroll: [0],
    },
    {
      slug: "sale",
      url: "https://www.kaleidojewellery.com/collections/sale",
      scroll: [0],
    },
  ],
};

async function capturePage(page, site, { slug, url, scroll, waitUntil = "networkidle" }) {
  const dir = path.join(OUT, site, slug);
  await mkdir(dir, { recursive: true });

  console.log(`  → ${url}`);
  try {
    await page.goto(url, { waitUntil, timeout: 90000 });
    await page.waitForTimeout(2000);

    // Dismiss common cookie/consent banners
    for (const sel of [
      'button:has-text("Accept")',
      'button:has-text("Accept All")',
      'button:has-text("Got it")',
      '[aria-label="Close"]',
    ]) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(500);
        break;
      }
    }

    await page.screenshot({
      path: path.join(dir, "viewport-top.png"),
      fullPage: false,
    });

    for (const y of scroll) {
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
      await page.waitForTimeout(600);
      const name = y === 0 ? "scroll-0.png" : `scroll-${y}.png`;
      await page.screenshot({
        path: path.join(dir, name),
        fullPage: false,
      });
    }

    // Extract computed styles from key elements
    const styles = await page.evaluate(() => {
      const pick = (el) => {
        if (!el) return null;
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          text: (el.textContent || "").trim().slice(0, 80),
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          letterSpacing: cs.letterSpacing,
          textTransform: cs.textTransform,
          color: cs.color,
          backgroundColor: cs.backgroundColor,
          borderRadius: cs.borderRadius,
          padding: cs.padding,
          gap: cs.gap,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      };

      const headings = [...document.querySelectorAll("h1,h2,h3")].slice(0, 6).map(pick);
      const buttons = [...document.querySelectorAll("button,a[class*='btn'],a[class*='button']")]
        .slice(0, 8)
        .map(pick);
      const cards = [
        ...document.querySelectorAll(
          "[class*='product'],[class*='card'],[class*='ProductCard'],article"
        ),
      ]
        .slice(0, 4)
        .map(pick);

      const body = pick(document.body);
      return { body, headings, buttons, cards, url: location.href, title: document.title };
    });

    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      path.join(dir, "computed-styles.json"),
      JSON.stringify(styles, null, 2)
    );

    return { slug, ok: true };
  } catch (err) {
    console.error(`  ✗ ${slug}: ${err.message}`);
    return { slug, ok: false, error: err.message };
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  const results = [];

  for (const [site, pages] of Object.entries(PAGES)) {
    console.log(`\n=== ${site.toUpperCase()} ===`);
    for (const p of pages) {
      results.push({ site, ...(await capturePage(page, site, p)) });
    }
  }

  await browser.close();

  const { writeFile } = await import("node:fs/promises");
  await writeFile(path.join(OUT, "capture-log.json"), JSON.stringify(results, null, 2));

  const ok = results.filter((r) => r.ok).length;
  console.log(`\nDone: ${ok}/${results.length} pages captured → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
