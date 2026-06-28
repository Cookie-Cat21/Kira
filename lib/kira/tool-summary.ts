import { getGroq } from "@/lib/kira/groq";
import { TOOL_SUMMARY_LABELS } from "@/lib/kira/sse";

// ─── Tool concurrency classification ─────────────────────────────────────────
// Read-only MCP tools are safe to run concurrently. kapruka_create_order has
// side-effects (places a real order) and must run alone after safe tools finish.
export const CONCURRENT_SAFE_TOOLS = new Set([
  "kapruka_search_products",
  "kapruka_list_categories",
  "kapruka_check_delivery",
  "kapruka_get_product",
  "kapruka_list_delivery_cities",
  "kapruka_track_order",
]);

// ─── Tool use summary (8B model) ──────────────────────────────────────────────
// Fired async after each tool batch. Uses the cheap 8B model so it resolves in
// ~0.5s — well within the next model call's latency — making it essentially free.
export async function generateToolSummary(toolNames: string[]): Promise<string> {
  // Build summary from deterministic labels first — avoids the 8B model call
  // leaking internal reasoning into the ThinkingBlock shown to users.
  const known = toolNames
    .map((n) => TOOL_SUMMARY_LABELS[n])
    .filter(Boolean);
  if (known.length > 0) return known.join(" · ");

  // Fallback: ask 8B model, but sanitise the output before returning.
  try {
    const label = toolNames.map((n) => n.replace("kapruka_", "")).join(", ");
    const res = await getGroq().chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content:
            `Summarize these API calls in ≤8 words, past tense, no articles: ${label}. ` +
            `Example: "Searched chocolates, checked Colombo delivery". Output the summary only — no internal reasoning, no "I need", no "I will".`,
        },
      ],
      max_tokens: 32,
    });
    const raw = res.choices[0]?.message?.content?.trim() ?? "";
    // Strip any lines that look like internal monologue (start with "I ")
    const clean = raw.split(/[.\n]/).filter(l => !/^I\s/i.test(l.trim())).join(". ").trim();
    return clean;
  } catch {
    return ""; // non-critical — swallow errors silently
  }
}
// ─── Tool result truncation ───────────────────────────────────────────────────
// Applied AFTER SSE side-effects (which read from the full resultContent) and
// BEFORE currentMessages.push so the model receives a lean payload.
// For product search results this can cut 4–6 KB down to ~600 bytes.
export function truncateForModel(toolName: string, resultText: string): string {
  if (
    toolName === "kapruka_search_products" ||
    toolName === "kapruka_list_categories"
  ) {
    try {
      const data = JSON.parse(resultText) as Record<string, unknown>;
      const raw =
        (data.products ?? data.results ?? data.items) as unknown[] | undefined;
      if (Array.isArray(raw)) {
        if (raw.length === 0) {
          return JSON.stringify({
            results: [],
            total: 0,
            message:
              "No products found for this search query. Try a broader term, a corrected spelling, or a related category.",
          });
        }
        type P = Record<string, unknown>;
        const slim = (raw as P[]).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price ?? p.sale_price,
          url: p.url ?? p.product_url,
          in_stock: p.in_stock ?? p.available,
        }));
        return JSON.stringify({ ...data, products: slim });
      }
    } catch { /* fall through to char cap */ }
  }

  const CAP: Record<string, number> = {
    kapruka_get_product: 1200,
    kapruka_check_delivery: 700,
    kapruka_list_delivery_cities: 500,
    kapruka_track_order: 900,
    kapruka_create_order: 900,
  };
  const limit = CAP[toolName] ?? 2000;
  if (resultText.length <= limit) return resultText;
  return (
    resultText.slice(0, limit) +
    `\n…[${resultText.length - limit} chars omitted]`
  );
}
