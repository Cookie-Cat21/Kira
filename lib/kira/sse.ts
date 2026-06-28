export const enc = new TextEncoder();
export function sse(t: string, v?: unknown): Uint8Array {
  return enc.encode(
    `data: ${JSON.stringify(v !== undefined ? { t, v } : { t })}\n\n`
  );
}
export const TOOL_STEPS: Record<string, string> = {
  kapruka_search_products: "Searching Kapruka catalog",
  kapruka_list_categories: "Browsing categories",
  kapruka_check_delivery: "Checking delivery availability",
  kapruka_get_product: "Getting product details",
  kapruka_create_order: "Placing your order",
  kapruka_list_delivery_cities: "Resolving delivery city",
  kapruka_track_order: "Tracking your order",
};
export async function streamWords(
  controller: ReadableStreamDefaultController<Uint8Array>,
  text: string
) {
  const words = text.match(/\S+\s*/g) ?? [];
  for (const word of words) {
    controller.enqueue(sse("token", word));
    await new Promise((resolve) => setTimeout(resolve, 12));
  }
}
export const TOOL_SUMMARY_LABELS: Record<string, string> = {
  kapruka_search_products: "Searched Kapruka catalog",
  kapruka_list_categories: "Listed Kapruka categories",
  kapruka_check_delivery: "Checked delivery availability",
  kapruka_get_product: "Retrieved product details",
  kapruka_create_order: "Placed your order",
  kapruka_list_delivery_cities: "Resolved delivery city",
  kapruka_track_order: "Fetched order status",
};
