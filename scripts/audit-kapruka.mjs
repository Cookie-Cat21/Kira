/**
 * Kapruka.com E2E audit — documents the full website experience for Kira gap analysis.
 * Captures: homepage, category nav, product page, cart flow, checkout entry, account/login,
 * order history, reorder, tracking, gift services, international delivery, search, footer.
 *
 * Run: node scripts/audit-kapruka.mjs
 * Output: scripts/kapruka-audit/ (screenshots + JSON findings)
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'kapruka-audit');
mkdirSync(OUT, { recursive: true });

const BASE = 'https://www.kapruka.com';
const findings = { pages: {}, gaps: [], features: [] };

async function capture(page, name, note = '') {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`  📸 ${name}${note ? ' — ' + note : ''}`);
  return path;
}

async function captureFullPage(page, name) {
  const path = join(OUT, `${name}_full.png`);
  await page.screenshot({ path, fullPage: true });
}

async function getText(page, selector) {
  try { return await page.textContent(selector, { timeout: 3000 }); } catch { return null; }
}

async function getAll(page, selector) {
  try { return await page.$$eval(selector, els => els.map(e => e.textContent?.trim()).filter(Boolean)); } catch { return []; }
}

async function getLinks(page, selector) {
  try { return await page.$$eval(selector, els => els.map(e => ({ text: e.textContent?.trim(), href: e.href })).filter(e => e.text)); } catch { return []; }
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' });
const page = await ctx.newPage();

// ── 1. HOMEPAGE ──────────────────────────────────────────────────────────────
console.log('\n[1/12] Homepage');
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);
await capture(page, '01_homepage', 'above fold');
await captureFullPage(page, '01_homepage');

// Grab top nav items
const topNav = await getAll(page, 'nav a, header a, .header a, .navbar a, .main-nav a');
const categories = await getAll(page, '.category a, .categories a, [class*="category"] a, .menu a');
const heroText = await getAll(page, 'h1, h2, .hero h1, .banner h1, .slide h1');
const promoBanners = await getAll(page, '.banner, .promo, .hero, [class*="banner"], [class*="promo"]');

findings.pages.homepage = {
  topNavItems: topNav.slice(0, 40),
  heroText,
  promoBanners: promoBanners.slice(0, 10),
};

// ── 2. CATEGORY NAV — extract the full department list ────────────────────
console.log('[2/12] Category navigation');
// Hover or look for the mega-menu
const allCatLinks = await getLinks(page, 'a[href*="/category"], a[href*="/food"], a[href*="/cake"], a[href*="/flower"], a[href*="/electronic"], a[href*="/jewel"], a[href*="/gift"]');
const deptLinks = await getLinks(page, '.dept a, .department a, [class*="dept"] a, .sidebar-menu a, .category-list a');

// Try to find the category sidebar / mega menu
const categoryItems = await page.$$eval('a', anchors =>
  anchors
    .filter(a => /\/category\//i.test(a.href) || /\/food|cake|flower|electronic|jewel|gift|chocolate|grocery|pharmacy|book|sport|cloth|cosmetic/i.test(a.href))
    .map(a => ({ text: a.textContent.trim(), href: a.href }))
    .filter(i => i.text.length > 0 && i.text.length < 60)
    .slice(0, 60)
);
findings.pages.categories = { categoryItems, allCatLinks: allCatLinks.slice(0, 30) };
console.log(`  Found ${categoryItems.length} category links`);

// ── 3. SEARCH ────────────────────────────────────────────────────────────────
console.log('[3/12] Search');
const searchBox = page.locator('input[type="search"], input[name="q"], input[name="search"], input[placeholder*="Search"], input[placeholder*="search"]').first();
const hasSearch = await searchBox.count() > 0;

if (hasSearch) {
  await searchBox.fill('birthday cake');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  await capture(page, '03_search_results', 'birthday cake query');
  const resultCount = await getText(page, '[class*="result-count"], [class*="results"], .search-count, h1');
  const filters = await getAll(page, '[class*="filter"] label, .filter-option, .facet label');
  const sortOptions = await getAll(page, 'select option, [class*="sort"] option, .sort-by option');
  findings.pages.search = { query: 'birthday cake', resultCount, filters: filters.slice(0, 20), sortOptions };
  console.log(`  Search result page captured. Filters: ${filters.length}`);
} else {
  findings.pages.search = { error: 'Search box not found on homepage' };
}

// ── 4. PRODUCT PAGE ───────────────────────────────────────────────────────────
console.log('[4/12] Product page');
await page.goto('https://www.kapruka.com/buyonline/breadtalk-chocolate-lush-2lb/kid/cakebt00425', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);
await capture(page, '04_product_page', 'BreadTalk cake');
await captureFullPage(page, '04_product_page');

const productName = await getText(page, 'h1, [class*="product-name"], [class*="product-title"]');
const productPrice = await getText(page, '[class*="price"], .price, [itemprop="price"]');
const deliveryCities = await getAll(page, 'select option, [class*="city"] option, #deliveryCity option');
const deliveryDates = await getAll(page, '[class*="date"] option, #deliveryDate option, input[type="date"]');
const addOns = await getAll(page, '[class*="addon"], [class*="add-on"], .addon-item, [class*="extra"]');
const giftMessage = await page.$('[class*="gift-message"], textarea[name*="message"], #giftMessage, [placeholder*="message"]');
const addToCart = await getText(page, '[class*="add-to-cart"], button[class*="cart"], .btn-cart');
const productImages = await page.$$eval('img', imgs => imgs.filter(i => i.src && i.naturalWidth > 100).map(i => i.src).slice(0, 5));
const productDescription = await getText(page, '[class*="description"], .product-desc, [itemprop="description"]');
const relatedProducts = await getAll(page, '[class*="related"] .product-name, [class*="similar"] .name, [class*="you-may-like"]');
const reviews = await getAll(page, '[class*="review"], [class*="rating"], .review-item');

findings.pages.productPage = {
  productName,
  productPrice,
  deliveryCities: deliveryCities.slice(0, 20),
  deliveryDatesAvailable: deliveryDates.length > 0,
  addOns: addOns.slice(0, 10),
  hasGiftMessageField: !!giftMessage,
  addToCartButtonText: addToCart,
  productImages: productImages.length,
  productDescription: productDescription?.substring(0, 300),
  relatedProducts: relatedProducts.slice(0, 5),
  hasReviews: reviews.length > 0,
};
console.log(`  Product: ${productName} | Gift msg field: ${!!giftMessage} | AddOns: ${addOns.length} | Delivery cities: ${deliveryCities.length}`);

// ── 5. CART ──────────────────────────────────────────────────────────────────
console.log('[5/12] Cart — add item + view cart');
const addBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Buy Now"), [class*="add-cart"], .add-to-cart, button[class*="buy"]').first();
const addBtnExists = await addBtn.count() > 0;

if (addBtnExists) {
  // Select delivery city/date if required
  const citySelect = page.locator('select[name*="city"], #deliveryCity, select[id*="city"]').first();
  if (await citySelect.count() > 0) {
    await citySelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);
  }
  const dateSelect = page.locator('select[name*="date"], #deliveryDate, select[id*="date"]').first();
  if (await dateSelect.count() > 0) {
    await dateSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);
  }
  await addBtn.click();
  await page.waitForTimeout(2000);
  await capture(page, '05_after_add_to_cart', 'state after add-to-cart click');
}

// Navigate to cart
await page.goto(`${BASE}/cart`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2000);
await capture(page, '05_cart', 'cart page');

const cartItems = await getAll(page, '[class*="cart-item"], .cart-product, [class*="line-item"]');
const cartTotal = await getText(page, '[class*="cart-total"], .total, [class*="grand-total"]');
const deliveryFeeInCart = await getText(page, '[class*="delivery-fee"], [class*="shipping"], .fee');
const couponField = await page.$('input[placeholder*="coupon"], input[name*="coupon"], input[placeholder*="promo"], input[name*="promo"]');
const guestCheckout = await page.$('a:has-text("Guest"), button:has-text("Guest")');

findings.pages.cart = {
  cartItems: cartItems.slice(0, 5),
  cartTotal,
  deliveryFeeInCart,
  hasCouponField: !!couponField,
  hasGuestCheckout: !!guestCheckout,
};
console.log(`  Cart items: ${cartItems.length} | Coupon: ${!!couponField} | Guest checkout: ${!!guestCheckout}`);

// ── 6. CHECKOUT ───────────────────────────────────────────────────────────────
console.log('[6/12] Checkout');
await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2000);
await capture(page, '06_checkout', 'checkout page');
await captureFullPage(page, '06_checkout');

const checkoutFields = await page.$$eval('input, select, textarea', els =>
  els.map(e => ({ tag: e.tagName, type: e.type, name: e.name, placeholder: e.placeholder, id: e.id }))
    .filter(e => e.name || e.placeholder || e.id)
);
const paymentMethods = await getAll(page, '[class*="payment"] label, [class*="pay-method"] label, .payment-option, input[name*="payment"] + label');
const checkoutSteps = await getAll(page, '[class*="step"], .checkout-step, [class*="breadcrumb"] li');

findings.pages.checkout = {
  fields: checkoutFields.slice(0, 30),
  paymentMethods,
  checkoutSteps,
};
console.log(`  Checkout fields: ${checkoutFields.length} | Payment methods: ${paymentMethods.length}`);

// ── 7. LOGIN / REGISTRATION ────────────────────────────────────────────────
console.log('[7/12] Login + Registration');
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);
await capture(page, '07_login', 'login page');

const loginFields = await page.$$eval('input', els => els.map(e => ({ type: e.type, name: e.name, placeholder: e.placeholder })));
const socialLogins = await getAll(page, '[class*="social"] button, [class*="google"], [class*="facebook"], [class*="oauth"]');
const loginUrl = page.url();

// Try register page
await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);
await capture(page, '07_register', 'register page');
const registerFields = await page.$$eval('input', els => els.map(e => ({ type: e.type, name: e.name, placeholder: e.placeholder })));

findings.pages.auth = {
  loginUrl,
  loginFields,
  socialLogins,
  registerFields: registerFields.slice(0, 15),
};
console.log(`  Login fields: ${loginFields.length} | Social: ${socialLogins.join(', ') || 'none'}`);

// ── 8. ACCOUNT — ORDER HISTORY & REORDER ─────────────────────────────────
console.log('[8/12] Account / Order History');
await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2000);
await capture(page, '08_account', 'account page (likely redirects to login)');
const accountUrl = page.url();

await page.goto(`${BASE}/myorders`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);
await capture(page, '08_order_history', 'order history');
const orderHistoryUrl = page.url();

// Explore account sub-pages
const accountLinks = await getLinks(page, 'a');
const accountNavItems = accountLinks
  .filter(l => /order|history|reorder|track|wish|address|profile|reward|point|coupon|return/i.test(l.text))
  .slice(0, 20);

findings.pages.account = {
  accountRedirectsToLogin: accountUrl.includes('login'),
  orderHistoryUrl,
  orderHistoryRedirects: orderHistoryUrl.includes('login'),
  accountNavItems,
};
console.log(`  Account redirects to login: ${accountUrl.includes('login')} | Order history URL: ${orderHistoryUrl}`);

// ── 9. ORDER TRACKING ─────────────────────────────────────────────────────
console.log('[9/12] Order tracking');
await page.goto(`${BASE}/trackOrder`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);
await capture(page, '09_tracking', 'order tracking');

const trackingFields = await page.$$eval('input', els => els.map(e => ({ name: e.name, placeholder: e.placeholder })));
const trackingUrl = page.url();

findings.pages.tracking = {
  url: trackingUrl,
  fields: trackingFields,
};
console.log(`  Tracking page URL: ${trackingUrl} | Fields: ${trackingFields.length}`);

// ── 10. GIFT / OCCASION SERVICES ──────────────────────────────────────────
console.log('[10/12] Gift / Occasion services');
await page.goto(`${BASE}/giftreminder`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);
await capture(page, '10_gift_reminder', 'gift reminder service');
const reminderUrl = page.url();

await page.goto(`${BASE}/international`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);
await capture(page, '10_international', 'international delivery page');
await captureFullPage(page, '10_international');
const intlContent = await getText(page, 'main, .content, body');

findings.pages.gifts = {
  giftReminderUrl: reminderUrl,
  hasGiftReminderService: !reminderUrl.includes('404'),
  internationalContent: intlContent?.substring(0, 500),
};

// ── 11. SERVICES: RELOAD / VOUCHER / HOROSCOPE ────────────────────────────
console.log('[11/12] Extra services (reload, voucher, horoscope)');
await page.goto(`${BASE}/services`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);
await capture(page, '11_services', 'services page');

await page.goto(`${BASE}/Horoscope`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);
await capture(page, '11_horoscope', 'horoscope page');

// ── 12. FOOTER — FULL LINK MAP ────────────────────────────────────────────
console.log('[12/12] Footer links');
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);
const footerLinks = await page.$$eval('footer a, [class*="footer"] a', els =>
  els.map(e => ({ text: e.textContent?.trim(), href: e.href })).filter(e => e.text && e.href)
);
findings.pages.footer = { links: footerLinks };
console.log(`  Footer links: ${footerLinks.length}`);

// Also grab the full category list from homepage mega-menu
await page.evaluate(() => window.scrollTo(0, 0));
await capture(page, '12_footer', 'footer');

// ── WRITE FINDINGS JSON ───────────────────────────────────────────────────
const outJson = join(OUT, 'findings.json');
writeFileSync(outJson, JSON.stringify(findings, null, 2));
console.log(`\n✅ Audit complete. JSON saved → ${outJson}`);
console.log(`📁 Screenshots → ${OUT}`);

await browser.close();
