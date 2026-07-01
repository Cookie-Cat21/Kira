/** The reorder flow depends on localStorage; we seed a last order and verify the welcome strip. */
import { test, expect } from "@playwright/test";

const LAST_ORDER = {
  orderId: "KP99999",
  items: [{ id: "cake001", name: "Chocolate Cake", price: 4500, quantity: 1 }],
  total: 4500,
  delivery: {
    city: "Colombo",
    date: "2026-07-01",
    recipientName: "Amma",
    recipientPhone: "0771234567",
    address: "123 Galle Road",
  },
  senderName: "Test User",
  label: "Chocolate Cake for Amma",
  placedAt: new Date().toISOString(),
};

test.describe("One-tap reorder", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((order) => {
      localStorage.setItem("kira_last_order", JSON.stringify(order));
    }, LAST_ORDER);
  });

  test("welcome back strip appears on home", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Welcome back/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /Order again/i })).toBeVisible();
  });

  test("Order again opens checkout with prefilled city", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Order again/i }).click();
    await expect(page.getByText(/Review your order/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Colombo/i)).toBeVisible();
  });
});
