import type { CheckoutInfo, DeliveryQuote, KiraProduct } from "@/types";

export const CATALOG_GUARD_INTENT_RE =
  /\b(show|search|find|browse|buy|get|send|order|recommend|gift|present|cake|flower|rose|bouquet|chocolat|hamper|toy|fashion|cloth|dress|saree|electronic|phone|perfume|jewel|delivery|checkout|cart|tray|budget|under|below|max|price|lkr|rs\.?)\b/i;
export const CURRENCY_AMOUNT_RE = /\b(?:LKR|Rs\.?|රු)\s*([\d,]+(?:\.\d+)?)/gi;
export const BUDGET_CONTEXT_AMOUNT_RE =
  /\b(?:under|below|max(?:imum)?|budget|less than|up to)\s*(?:lkr|rs\.?)?\s*([\d,]+(?:\.\d+)?)/i;

export function parseBudgetAmount(value?: string): number | undefined {
  if (!value) return undefined;
  const match =
    value.match(BUDGET_CONTEXT_AMOUNT_RE) ??
    value.match(/\b(?:lkr|rs\.?)\s*([\d,]+(?:\.\d+)?)/i) ??
    value.match(/\b([\d,]{3,}(?:\.\d+)?)\b/);
  const amount = match ? Number(match[1].replace(/,/g, "")) : undefined;
  return amount && Number.isFinite(amount) && amount > 0 ? Math.round(amount) : undefined;
}

function extractCurrencyAmounts(text: string): number[] {
  const amounts: number[] = [];
  for (const match of text.matchAll(CURRENCY_AMOUNT_RE)) {
    const amount = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(amount) && amount > 0) amounts.push(Math.round(amount));
  }
  return amounts;
}

function isBudgetPhraseAroundAmount(text: string, amount: number): boolean {
  const escaped = amount.toLocaleString("en-LK").replace(/,/g, "\\s*,?\\s*");
  const plain = String(amount).split("").join("\\s*,?\\s*");
  const amountPattern = `(?:${escaped}|${plain})`;
  const budgetNear = new RegExp(
    `(?:under|below|max(?:imum)?|budget|less than|up to|ceiling).{0,24}(?:LKR|Rs\\.?)?\\s*${amountPattern}|` +
      `(?:LKR|Rs\\.?)?\\s*${amountPattern}.{0,24}(?:budget|limit|ceiling)`,
    "i"
  );
  return budgetNear.test(text);
}

export function shouldGuardCatalogText(
  latestUserText: string,
  toolsCalled: Set<string>
): boolean {
  return (
    CATALOG_GUARD_INTENT_RE.test(latestUserText) ||
    toolsCalled.has("kapruka_search_products") ||
    toolsCalled.has("kapruka_get_product") ||
    toolsCalled.has("kapruka_check_delivery") ||
    toolsCalled.has("kapruka_create_order")
  );
}

function safeCatalogAmounts({
  products,
  deliveryQuotes,
  checkoutInfo,
  latestUserText,
  budget,
}: {
  products: KiraProduct[];
  deliveryQuotes: DeliveryQuote[];
  checkoutInfo?: CheckoutInfo;
  latestUserText: string;
  budget?: string;
}): Set<number> {
  const safe = new Set<number>();
  for (const product of products) safe.add(Math.round(product.price));
  for (const quote of deliveryQuotes) {
    if (quote.fee !== undefined) safe.add(Math.round(quote.fee));
  }
  const summary = checkoutInfo?.summary;
  for (const amount of [
    summary?.itemsTotal,
    summary?.deliveryFee,
    summary?.addonsTotal,
    summary?.grandTotal,
    parseBudgetAmount(latestUserText),
    parseBudgetAmount(budget),
  ]) {
    if (amount !== undefined && Number.isFinite(amount)) safe.add(Math.round(amount));
  }
  return safe;
}

export function isUnsafeCatalogClaim({
  text,
  products,
  deliveryQuotes,
  checkoutInfo,
  latestUserText,
  budget,
}: {
  text: string;
  products: KiraProduct[];
  deliveryQuotes: DeliveryQuote[];
  checkoutInfo?: CheckoutInfo;
  latestUserText: string;
  budget?: string;
}): boolean {
  if (!text.trim()) return false;
  if (/₹/.test(text)) return true;

  const amounts = extractCurrencyAmounts(text);
  if (amounts.length > 0) {
    const safe = safeCatalogAmounts({
      products,
      deliveryQuotes,
      checkoutInfo,
      latestUserText,
      budget,
    });
    for (const amount of amounts) {
      if (safe.has(amount)) continue;
      if (isBudgetPhraseAroundAmount(text, amount)) continue;
      return true;
    }
  }

  const hasRealCatalogFact =
    products.length > 0 || deliveryQuotes.length > 0 || checkoutInfo !== undefined;
  const repeatedListingShape =
    /\b(?:\d+[\).]|[-•])\s*[A-Z][^\n]{8,80}?(?:LKR|Rs\.?|priced|costs?|at)\b[\s\S]*\b(?:\d+[\).]|[-•])\s*[A-Z][^\n]{8,80}?(?:LKR|Rs\.?|priced|costs?|at)\b/i.test(
      text
    );
  return !hasRealCatalogFact && repeatedListingShape;
}

export function stripKnownProductNames(text: string, products: KiraProduct[]): string {
  let stripped = text;
  for (const product of products) {
    const name = product.name?.trim();
    if (!name) continue;
    stripped = stripped.split(name).join("");
  }
  return stripped;
}
