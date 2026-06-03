import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { KIRA_SYSTEM_PROMPT } from "@/lib/kira-prompt";
import { createMcpClient, listMcpTools, callMcpTool } from "@/lib/mcp-client";
import type { ChatRequest, ChatResponse, KiraProduct } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAX_TOOL_ROUNDS = 5;

export async function POST(req: NextRequest) {
  let mcpClient;

  try {
    const body: ChatRequest = await req.json();
    const { messages, cart, deliveryCity } = body;

    // Build cart context for the system prompt
    const cartContext =
      cart.length > 0
        ? `\n\nCurrent cart: ${cart.map((i) => `${i.product.name} (x${i.quantity})`).join(", ")}`
        : "";

    const deliveryContext = deliveryCity
      ? `\nDelivery city: ${deliveryCity}`
      : "";

    // Connect to Kapruka MCP
    mcpClient = await createMcpClient();
    const mcpTools = await listMcpTools(mcpClient);

    // Convert MCP tools to Anthropic tool format
    const tools: Anthropic.Tool[] = mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description ?? "",
      input_schema: (tool.inputSchema as Anthropic.Tool["input_schema"]) ?? {
        type: "object",
        properties: {},
      },
    }));

    // Agentic loop
    let currentMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let finalText = "";
    const collectedProducts: KiraProduct[] = [];
    let payLink: string | undefined;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: KIRA_SYSTEM_PROMPT + cartContext + deliveryContext,
        messages: currentMessages,
        tools,
      });

      if (response.stop_reason === "end_turn") {
        for (const block of response.content) {
          if (block.type === "text") {
            finalText = block.text;
          }
        }
        break;
      }

      if (response.stop_reason === "tool_use") {
        const assistantMessage: Anthropic.MessageParam = {
          role: "assistant",
          content: response.content,
        };
        currentMessages.push(assistantMessage);

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type === "text" && block.text) {
            finalText = block.text;
          }

          if (block.type === "tool_use") {
            const toolResult = await callMcpTool(
              mcpClient,
              block.name,
              block.input as Record<string, unknown>
            );

            const resultText = JSON.stringify(toolResult.content);

            // Extract products from search results
            if (
              block.name === "search_products" ||
              block.name === "get_categories"
            ) {
              try {
                const parsed = JSON.parse(resultText);
                const products = extractProducts(parsed);
                collectedProducts.push(...products);
              } catch {
                // non-JSON result, skip extraction
              }
            }

            // Extract pay link from create_order result
            if (block.name === "create_order") {
              try {
                const parsed = JSON.parse(resultText);
                payLink = extractPayLink(parsed);
              } catch {
                // skip
              }
            }

            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: resultText,
            });
          }
        }

        currentMessages.push({ role: "user", content: toolResults });
      }
    }

    const responsePayload: ChatResponse = {
      message: finalText,
      products: collectedProducts.length > 0 ? collectedProducts : undefined,
      payLink,
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { message: "Aiyo, something went wrong on my end. Try again in a sec?" },
      { status: 500 }
    );
  } finally {
    if (mcpClient) {
      try {
        await mcpClient.close();
      } catch {
        // ignore close errors
      }
    }
  }
}

function extractProducts(data: unknown): KiraProduct[] {
  if (!data || typeof data !== "object") return [];

  // Try common MCP response shapes
  const obj = data as Record<string, unknown>;
  const candidates =
    (obj.products as unknown[]) ??
    (obj.results as unknown[]) ??
    (obj.items as unknown[]) ??
    (Array.isArray(data) ? data : []);

  return candidates
    .slice(0, 4)
    .map((item) => {
      const p = item as Record<string, unknown>;
      return {
        id: String(p.id ?? p.productId ?? Math.random()),
        name: String(p.name ?? p.title ?? "Product"),
        price: Number(p.price ?? p.unitPrice ?? 0),
        currency: String(p.currency ?? "LKR"),
        image: p.image as string | undefined ?? p.imageUrl as string | undefined,
        category: p.category as string | undefined,
        url: p.url as string | undefined ?? p.productUrl as string | undefined,
      };
    })
    .filter((p) => p.name !== "Product" || p.price > 0);
}

function extractPayLink(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as Record<string, unknown>;
  return (
    (obj.payLink as string) ??
    (obj.paymentUrl as string) ??
    (obj.pay_link as string) ??
    (obj.checkoutUrl as string) ??
    undefined
  );
}
