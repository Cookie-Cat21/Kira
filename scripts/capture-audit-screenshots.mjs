#!/usr/bin/env node
/**
 * Capture audit screenshots for Kapruka website and Kira app.
 * Usage:
 *   node scripts/capture-audit-screenshots.mjs kapruka
 *   node scripts/capture-audit-screenshots.mjs kira [baseUrl]
 */
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join } from "path";

const WIDTHS = [320, 375, 768, 1024, 1280];

const KAPRUKA_PAGES = [
  { name: "homepage", url: "https://www.kapruka.com/" },
  {
    name: "catalog",
    url: "https://www.kapruka.com/shops/deliveryCatalogCompact_wide.jsp",
  },
  {
    name: "order-status",
    url: "https://www.kapruka.com/contactUs/orderStatus.jsp",
  },
  {
    name: "agent-challenge",
    url: "https://www.kapruka.com/contactUs/agentChallenge.html",
  },
  { name: "mcp", url: "https://mcp.kapruka.com/" },
];

async function capturePage(browser, url, outDir, prefix, width) {
  const page = await browser.newPage();
  await page.setViewportSize({ width, height: width <= 375 ? 812 : 900 });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2500);
    const path = join(outDir, `${prefix}-${width}.png`);
    await page.screenshot({ path, fullPage: false });
    console.log(`  ✓ ${path}`);
  } catch (err) {
    console.error(`  ✗ ${prefix}-${width}: ${err.message}`);
  } finally {
    await page.close();
  }
}

async function captureKapruka() {
  const outDir = join(process.cwd(), "audit/kapruka-current");
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  for (const { name, url } of KAPRUKA_PAGES) {
    console.log(`\n${name}: ${url}`);
    for (const width of WIDTHS) {
      await capturePage(browser, url, outDir, name, width);
    }
  }

  await browser.close();
}

async function captureKira(baseUrl = "http://localhost:3000") {
  const outDir = join(process.cwd(), "audit/kira-current/screenshots");
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const states = [
  {
    name: "hero",
    setup: async (page) => {
      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(2000);
    },
  },
  {
    name: "chat-active",
    setup: async (page) => {
      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
      const input = page.locator("textarea").first();
      await input.waitFor({ timeout: 15000 });
      await input.fill("Show me birthday gifts under 12000");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(8000);
    },
  },
  {
    name: "product-results",
    setup: async (page) => {
      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
      const input = page.locator("textarea").first();
      await input.waitFor({ timeout: 15000 });
      await input.fill(
        "I need a birthday gift for my girlfriend in Colombo tomorrow under Rs. 12000. She likes chocolate and flowers."
      );
      await page.keyboard.press("Enter");
      await page.waitForTimeout(12000);
    },
  },
  {
    name: "loading",
    setup: async (page) => {
      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
      const input = page.locator("textarea").first();
      await input.waitFor({ timeout: 15000 });
      await input.fill("Show me cakes in Colombo");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1500);
    },
  },
  {
    name: "sinhala",
    setup: async (page) => {
      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
      const siBtn = page.getByRole("button", { name: /^SI$/i });
      if (await siBtn.isVisible().catch(() => false)) {
        await siBtn.click();
      }
      const input = page.locator("textarea").first();
      await input.fill("අම්මාට උපන්දින තෑග්ගක් ඕනේ කොළඹට");
      await page.waitForTimeout(1000);
    },
  },
  {
    name: "tracking",
    setup: async (page) => {
      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
      const input = page.locator("textarea").first();
      await input.waitFor({ timeout: 15000 });
      await input.fill("track order KP12345");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(6000);
    },
  },
  {
    name: "error",
    setup: async (page) => {
      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
      const input = page.locator("textarea").first();
      await input.waitFor({ timeout: 15000 });
      await input.fill("xyznonexistentproduct12345");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(8000);
    },
  },
  {
    name: "mobile-dock",
    setup: async (page) => {
      await page.goto(`${baseUrl}/shop`, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
      await page.waitForTimeout(1500);
    },
  },
  {
    name: "cart-drawer",
    setup: async (page) => {
      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
      const input = page.locator("textarea").first();
      await input.waitFor({ timeout: 15000 });
      await input.fill("Show me chocolates under 5000");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(10000);
      const addBtn = page.getByRole("button", { name: /add to cart/i }).first();
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(1000);
      }
      const cartBtn = page
        .getByRole("button", { name: /cart|bag|tray/i })
        .first();
      if (await cartBtn.isVisible().catch(() => false)) {
        await cartBtn.click();
        await page.waitForTimeout(1000);
      }
    },
  },
  {
    name: "quick-view",
    setup: async (page) => {
      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
      const input = page.locator("textarea").first();
      await input.waitFor({ timeout: 15000 });
      await input.fill("Show me flowers under 8000");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(10000);
      const card = page.locator("[data-product-card], article, .product-card").first();
      if (await card.isVisible().catch(() => false)) {
        await card.click();
        await page.waitForTimeout(1500);
      }
    },
  },
  {
    name: "checkout",
    setup: async (page) => {
      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
      const input = page.locator("textarea").first();
      await input.waitFor({ timeout: 15000 });
      await input.fill("ready to checkout");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(6000);
    },
  },
  {
    name: "delivery-estimator",
    setup: async (page) => {
      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
      const input = page.locator("textarea").first();
      await input.waitFor({ timeout: 15000 });
      await input.fill("Can you deliver to Kandy tomorrow?");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(8000);
    },
  },
];

  const captureWidths = [375, 1280];

  for (const state of states) {
    console.log(`\n${state.name}`);
    for (const width of captureWidths) {
      const page = await browser.newPage();
      await page.setViewportSize({
        width,
        height: width <= 375 ? 812 : 900,
      });
      try {
        await state.setup(page);
        const path = join(outDir, `${state.name}-${width}.png`);
        await page.screenshot({ path, fullPage: false });
        console.log(`  ✓ ${path}`);
      } catch (err) {
        console.error(`  ✗ ${state.name}-${width}: ${err.message}`);
      } finally {
        await page.close();
      }
    }
  }

  await browser.close();
}

const mode = process.argv[2] || "kapruka";
if (mode === "kapruka") {
  await captureKapruka();
} else if (mode === "kira") {
  await captureKira(process.argv[3] || "http://localhost:3000");
} else {
  console.error("Usage: node scripts/capture-audit-screenshots.mjs [kapruka|kira] [baseUrl]");
  process.exit(1);
}
