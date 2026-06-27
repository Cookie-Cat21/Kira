import { test, expect, type Page } from "@playwright/test";

async function resetShop(page: Page, path = "/shop") {
  await page.goto(path);
  await page.evaluate(() => {
    try {
      localStorage.clear();
    } catch {}
  });
  await page.reload();
}

async function firstStoreProduct(page: Page) {
  const card = page.locator('article.store-card a[aria-label^="View "]').first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  return card;
}

test.describe("Shop storefront", () => {
  test("shop home renders hero, categories, product rails, and Kira band", async ({ page }) => {
    await resetShop(page);

    await expect(
      page.getByRole("heading", { name: /Send something/i })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /Shop by category/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Kapruka fast lanes/i })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rush delivery", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "On sale", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bakery brands", exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Cakes & Bakery/i }).first()
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /Trending today/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Shopping, by conversation/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Ask Kira/i }).first()).toBeVisible();
  });

  test("category to product to bag to checkout handoff works", async ({ page }) => {
    await resetShop(page, "/shop/cakes");
    await expect(
      page.getByRole("heading", { name: /Cakes & Bakery/i })
    ).toBeVisible({ timeout: 15_000 });

    await (await firstStoreProduct(page)).click();
    await expect(page).toHaveURL(/\/product\//);
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.getByText(/LKR|Rs/i).first()).toBeVisible();

    await page.getByRole("button", { name: /Add to bag/i }).click();
    await expect(page.getByRole("button", { name: /View bag/i })).toBeVisible();
    await page.getByRole("button", { name: /View bag/i }).click();

    const tray = page.getByRole("dialog", { name: "Gift tray" });
    await expect(tray).toBeVisible({ timeout: 10_000 });
    await tray.getByRole("button", { name: /Proceed to checkout/i }).click();

    await page.route("**/api/checkout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          checkoutInfo: {
            checkoutUrl: "https://www.kapruka.com/checkout/shop-e2e-test",
            orderRef: "SHOP-E2E",
            expiresAt: new Date(Date.now() + 900_000).toISOString(),
            summary: {
              itemsTotal: 4200,
              deliveryFee: 450,
              addonsTotal: 0,
              grandTotal: 4650,
            },
          },
          mode: "sandbox",
        }),
      });
    });

    const checkout = page.getByRole("dialog", { name: "Checkout" });
    await expect(checkout).toBeVisible();
    await checkout.getByRole("button", { name: /Continue/i }).click();
    await checkout.getByLabel(/Recipient name/i).fill("Amali Perera");
    await checkout.getByLabel(/Phone number/i).fill("0771234567");
    await checkout.getByLabel(/City/i).fill("Colombo");
    await checkout.getByLabel(/Street address/i).fill("12 Flower Road");
    await checkout.getByLabel(/Delivery date/i).fill("2026-06-30");
    await checkout.getByRole("button", { name: /Create Kapruka link/i }).click();

    await expect(
      checkout.getByRole("link", { name: /Open demo checkout link|Complete payment on Kapruka/i })
    ).toHaveAttribute("href", /kapruka\.com\/checkout\/shop-e2e-test/);
  });

  test("search result opens product and Ask Kira uses seeded product context", async ({ page }) => {
    await resetShop(page);

    await page.getByRole("button", { name: /^Search$/i }).click();
    await page.getByPlaceholder(/Search cakes/i).fill("cake");
    const result = page.locator('a[href^="/product/"]').filter({ hasText: /cake/i }).first();
    await expect(result).toBeVisible({ timeout: 10_000 });
    await result.click();
    await expect(page).toHaveURL(/\/product\//);

    await page.getByRole("button", { name: /Ask Kira about this/i }).click();
    const dock = page.getByRole("dialog", { name: /Kira assistant/i });
    await expect(dock).toBeVisible({ timeout: 10_000 });
    await expect(dock.getByText(/Here's the one you were looking at/i)).toBeVisible();
    await expect(dock.getByText(/Good pick to ask about/i)).toBeVisible({ timeout: 20_000 });
    await expect(dock.locator('[aria-label="Send"]')).toBeVisible({ timeout: 10_000 });
  });

  test("mobile shop navigation, rails, bag, and Kira launcher are usable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await resetShop(page);

    await expect(page.getByRole("heading", { name: /Send something/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /^Search$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Open Kira/i })).toBeVisible();

    const categoryRail = page.getByRole("link", { name: /Flowers/i }).first();
    await expect(categoryRail).toBeVisible();
    await categoryRail.click();
    await expect(page).toHaveURL(/\/shop\/flowers/);
    await expect(page.getByRole("heading", { name: "Flowers", exact: true })).toBeVisible();

    await (await firstStoreProduct(page)).click();
    await page.getByRole("button", { name: /Add to bag/i }).click();
    await expect(page.getByRole("button", { name: /Open bag, 1 item/i })).toBeVisible();
  });
});
