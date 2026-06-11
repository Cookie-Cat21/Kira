import { describe, it, expect } from "vitest";
import {
  readMcpText,
  parseMcpPayload,
  formatMcpContentForModel,
  extractProductsFromMcp,
  extractProductDetailsFromMcp,
  extractDeliveryInfoFromMcp,
  extractCheckoutInfoFromMcp,
  extractTrackingFromMcp,
} from "@/lib/mcp-parsing";

// ---------------------------------------------------------------------------
// readMcpText
// ---------------------------------------------------------------------------
describe("readMcpText", () => {
  it("returns a plain string unchanged", () => {
    expect(readMcpText('{"ok":true}')).toBe('{"ok":true}');
  });

  it("extracts text from a standard MCP content array with type=text", () => {
    const content = [{ type: "text", text: "hello world" }];
    expect(readMcpText(content)).toBe("hello world");
  });

  it("falls back to first block with a text field when type is missing", () => {
    const content = [{ text: "fallback text" }];
    expect(readMcpText(content)).toBe("fallback text");
  });

  it("returns empty string for an empty array", () => {
    expect(readMcpText([])).toBe("");
  });

  it("unwraps a nested content property on an object", () => {
    const nested = { content: [{ type: "text", text: "nested" }] };
    expect(readMcpText(nested)).toBe("nested");
  });

  it("returns empty string for null / undefined", () => {
    expect(readMcpText(null)).toBe("");
    expect(readMcpText(undefined)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// parseMcpPayload
// ---------------------------------------------------------------------------
describe("parseMcpPayload", () => {
  it("returns ok:true with parsed data for valid JSON in an array block", () => {
    const content = [{ type: "text", text: '{"results":[]}' }];
    const result = parseMcpPayload(content);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ results: [] });
    }
  });

  it("returns ok:false with kind=empty for an empty content array", () => {
    const result = parseMcpPayload([]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("empty");
    }
  });

  it("returns ok:false with kind=no-products for 'No products found' text", () => {
    const content = [{ type: "text", text: "No products found for that query." }];
    const result = parseMcpPayload(content);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("no-products");
    }
  });

  it("returns ok:false with kind=tool-error for 'Error:' prefix", () => {
    const content = [{ type: "text", text: "Error: something went wrong" }];
    const result = parseMcpPayload(content);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("tool-error");
    }
  });

  it("returns ok:false with kind=text for non-JSON plain text", () => {
    const content = [{ type: "text", text: "just some text" }];
    const result = parseMcpPayload(content);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("text");
    }
  });
});

// ---------------------------------------------------------------------------
// formatMcpContentForModel
// ---------------------------------------------------------------------------
describe("formatMcpContentForModel", () => {
  it("returns JSON-stringified data on ok parse", () => {
    const content = [{ type: "text", text: '{"foo":"bar"}' }];
    expect(formatMcpContentForModel(content)).toBe('{"foo":"bar"}');
  });

  it("returns the raw text on failed parse (no products)", () => {
    const content = [{ type: "text", text: "No products found." }];
    const result = formatMcpContentForModel(content);
    expect(result).toBe("No products found.");
  });
});

// ---------------------------------------------------------------------------
// extractProductsFromMcp
// ---------------------------------------------------------------------------

const makeProductContent = (products: unknown[]) =>
  [{ type: "text", text: JSON.stringify({ results: products }) }];

const minimalProduct = {
  id: "P001",
  name: "Rose Bouquet",
  price: 1500,
  currency: "LKR",
  image_url: "https://example.com/rose.jpg",
  url: "https://kapruka.com/rose",
};

describe("extractProductsFromMcp", () => {
  it("returns an array of KiraProducts from results field", () => {
    const content = makeProductContent([minimalProduct]);
    const products = extractProductsFromMcp(content);
    expect(products).toHaveLength(1);
    expect(products[0].id).toBe("P001");
    expect(products[0].name).toBe("Rose Bouquet");
    expect(products[0].price).toBe(1500);
  });

  it("caps at 6 items when more than 6 are returned", () => {
    const manyProducts = Array.from({ length: 10 }, (_, i) => ({
      ...minimalProduct,
      id: `P${i}`,
      name: `Product ${i}`,
    }));
    const content = makeProductContent(manyProducts);
    const products = extractProductsFromMcp(content);
    expect(products.length).toBeLessThanOrEqual(6);
  });

  it("returns empty array for empty content", () => {
    expect(extractProductsFromMcp([])).toEqual([]);
  });

  it("returns empty array for malformed JSON text", () => {
    const content = [{ type: "text", text: "not json" }];
    expect(extractProductsFromMcp(content)).toEqual([]);
  });

  it("tolerates products under 'products' key instead of 'results'", () => {
    const content = [{ type: "text", text: JSON.stringify({ products: [minimalProduct] }) }];
    const products = extractProductsFromMcp(content);
    expect(products).toHaveLength(1);
  });

  it("filters out items with no valid price (price=0 or missing)", () => {
    const noPrice = [
      { id: "P1", name: "No Price", price: 0 },
      { ...minimalProduct },
    ];
    const content = makeProductContent(noPrice);
    const products = extractProductsFromMcp(content);
    expect(products.every((p) => p.price > 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// extractProductDetailsFromMcp
// ---------------------------------------------------------------------------
describe("extractProductDetailsFromMcp", () => {
  it("parses a full product details object", () => {
    const data = {
      id: "P001",
      name: "Birthday Cake",
      price: { amount: 2500, currency: "LKR" },
      images: ["https://example.com/cake.jpg"],
      variants: [],
      in_stock: true,
    };
    const content = [{ type: "text", text: JSON.stringify(data) }];
    const details = extractProductDetailsFromMcp(content);
    expect(details).toBeDefined();
    expect(details?.id).toBe("P001");
    expect(details?.price).toBe(2500);
    expect(details?.inStock).toBe(true);
  });

  it("returns undefined for empty content", () => {
    expect(extractProductDetailsFromMcp([])).toBeUndefined();
  });

  it("returns undefined for malformed/non-object JSON", () => {
    const content = [{ type: "text", text: JSON.stringify([1, 2, 3]) }];
    expect(extractProductDetailsFromMcp(content)).toBeUndefined();
  });

  it("uses fallback product values when fields are absent", () => {
    const fallback = {
      id: "fallback-id",
      name: "Fallback Product",
      price: 999,
      currency: "LKR",
    };
    const content = [{ type: "text", text: JSON.stringify({ price: { amount: 500, currency: "LKR" }, variants: [] }) }];
    const details = extractProductDetailsFromMcp(content, fallback);
    expect(details?.id).toBe("fallback-id");
    expect(details?.name).toBe("Fallback Product");
  });
});

// ---------------------------------------------------------------------------
// extractDeliveryInfoFromMcp
// ---------------------------------------------------------------------------
describe("extractDeliveryInfoFromMcp", () => {
  it("parses a delivery quote with city and fee", () => {
    const data = {
      city: "Colombo",
      fee: 300,
      currency: "LKR",
      available: true,
      estimated_date: "2026-06-15",
    };
    const content = [{ type: "text", text: JSON.stringify(data) }];
    const quote = extractDeliveryInfoFromMcp(content);
    expect(quote).toBeDefined();
    expect(quote?.city).toBe("Colombo");
    expect(quote?.fee).toBe(300);
    expect(quote?.available).toBe(true);
  });

  it("returns undefined when city is absent", () => {
    const data = { fee: 300, currency: "LKR" };
    const content = [{ type: "text", text: JSON.stringify(data) }];
    expect(extractDeliveryInfoFromMcp(content)).toBeUndefined();
  });

  it("returns undefined for empty content", () => {
    expect(extractDeliveryInfoFromMcp([])).toBeUndefined();
  });

  it("sets perishable=true when perishable_warning is present", () => {
    const data = {
      city: "Kandy",
      rate: 500,
      perishable_warning: "Keep refrigerated",
    };
    const content = [{ type: "text", text: JSON.stringify(data) }];
    const quote = extractDeliveryInfoFromMcp(content);
    expect(quote?.perishable).toBe(true);
    expect(quote?.perishableWarning).toBe("Keep refrigerated");
  });

  it("reads fee from 'rate' field as well as 'fee'", () => {
    const data = { city: "Galle", rate: 450 };
    const content = [{ type: "text", text: JSON.stringify(data) }];
    const quote = extractDeliveryInfoFromMcp(content);
    expect(quote?.fee).toBe(450);
  });
});

// ---------------------------------------------------------------------------
// extractCheckoutInfoFromMcp
// ---------------------------------------------------------------------------
describe("extractCheckoutInfoFromMcp", () => {
  it("parses a checkout info object with summary", () => {
    const data = {
      checkout_url: "https://kapruka.com/checkout/abc123",
      order_ref: "KP-2026-001",
      summary: {
        items_total: 2500,
        delivery_fee: 300,
        grand_total: 2800,
        currency: "LKR",
      },
    };
    const content = [{ type: "text", text: JSON.stringify(data) }];
    const info = extractCheckoutInfoFromMcp(content);
    expect(info).toBeDefined();
    expect(info?.checkoutUrl).toBe("https://kapruka.com/checkout/abc123");
    expect(info?.orderRef).toBe("KP-2026-001");
    expect(info?.summary?.grandTotal).toBe(2800);
  });

  it("returns undefined when checkout_url is absent", () => {
    const data = { order_ref: "KP-001", summary: {} };
    const content = [{ type: "text", text: JSON.stringify(data) }];
    expect(extractCheckoutInfoFromMcp(content)).toBeUndefined();
  });

  it("returns undefined for empty content", () => {
    expect(extractCheckoutInfoFromMcp([])).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// extractTrackingFromMcp
// ---------------------------------------------------------------------------
describe("extractTrackingFromMcp", () => {
  it("parses a tracking response with timeline events", () => {
    const data = {
      order_number: "KP12345",
      status: "In Transit",
      status_display: "Your order is on the way",
      timeline: [
        { status: "confirmed", label: "Order Confirmed", done: true, time: "2026-06-10 10:00" },
        { status: "dispatched", label: "Dispatched", done: true, time: "2026-06-11 09:00" },
        { status: "in_transit", label: "In Transit", done: false },
      ],
    };
    const content = [{ type: "text", text: JSON.stringify(data) }];
    const tracking = extractTrackingFromMcp(content);
    expect(tracking).toBeDefined();
    expect(tracking?.orderNumber).toBe("KP12345");
    expect(tracking?.currentStatus).toBe("In Transit");
    expect(tracking?.timeline).toHaveLength(3);
    expect(tracking?.timeline[0].done).toBe(true);
  });

  it("returns undefined for empty content", () => {
    expect(extractTrackingFromMcp([])).toBeUndefined();
  });

  it("returns undefined when both orderNumber and currentStatus are absent", () => {
    const data = { delivery_date: "2026-06-15" };
    const content = [{ type: "text", text: JSON.stringify(data) }];
    expect(extractTrackingFromMcp(content)).toBeUndefined();
  });

  it("synthesises a minimal timeline when timeline array is empty", () => {
    const data = {
      order_number: "KP99999",
      status: "Processing",
    };
    const content = [{ type: "text", text: JSON.stringify(data) }];
    const tracking = extractTrackingFromMcp(content);
    expect(tracking?.timeline.length).toBeGreaterThanOrEqual(1);
    expect(tracking?.timeline[0].status).toBeTruthy();
  });

  it("falls back to progress array when timeline is absent", () => {
    const data = {
      order_number: "KP00001",
      status: "Delivered",
      progress: [
        { status: "delivered", label: "Delivered", done: true },
      ],
    };
    const content = [{ type: "text", text: JSON.stringify(data) }];
    const tracking = extractTrackingFromMcp(content);
    expect(tracking?.timeline).toHaveLength(1);
    expect(tracking?.timeline[0].status).toBe("delivered");
  });
});
