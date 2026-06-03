import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { KIRA_SYSTEM_PROMPT } from "@/lib/kira-prompt";
import { createMcpClient, listMcpTools, callMcpTool } from "@/lib/mcp-client";
import type { ChatRequest, ChatResponse, KiraProduct } from "@/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";
const MAX_TOOL_ROUNDS = 5;

export async function POST(req: NextRequest) {
  let mcpClient;

  try {
    const body: ChatRequest = await req.json();
    const { messages, cart, deliveryCity } = body;

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

    // Convert MCP tools to OpenAI/Groq format.
    // Trim verbose multi-paragraph descriptions to first sentence only —
    // the free Groq tier has a 12k TPM cap and the full descriptions blow past it.
    const trimDesc = (desc: string) =>
      desc.split(/\n/)[0].split(". ")[0].slice(0, 120);

    const tools: Groq.Chat.Completions.ChatCompletionTool[] = mcpTools.map(
      (tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: trimDesc(tool.description ?? ""),
          parameters: (tool.inputSchema as Record<string, unknown>) ?? {
            type: "object",
            properties: {},
          },
        },
      })
    );

    // Build message history — system prompt is a separate message for Groq
    type GroqMessage = Groq.Chat.Completions.ChatCompletionMessageParam;

    let currentMessages: GroqMessage[] = [
      {
        role: "system",
        content: KIRA_SYSTEM_PROMPT + cartContext + deliveryContext,
      },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    let finalText = "";
    const collectedProducts: KiraProduct[] = [];
    let payLink: string | undefined;

    // Agentic loop
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await groq.chat.completions.create({
        model: MODEL,
        messages: currentMessages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
        max_tokens: 1024,
      });

      const choice = response.choices[0];
      const msg = choice.message;

      // Done — no more tool calls
      if (choice.finish_reason === "stop" || !msg.tool_calls?.length) {
        finalText = msg.content ?? "";
        break;
      }

      // Add assistant message (with tool_calls) to history
      currentMessages.push({
        role: "assistant",
        content: msg.content,
        tool_calls: msg.tool_calls,
      });

      // Execute all tool calls in this round
      for (const toolCall of msg.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs: Record<string, unknown> = {};
        try {
          toolArgs = JSON.parse(toolCall.function.arguments || "{}");
        } catch {
          // malformed args, proceed with empty
        }

        const toolResult = await callMcpTool(mcpClient, toolName, toolArgs);
        const resultText = JSON.stringify(toolResult.content);

        if (
          toolName === "kapruka_search_products" ||
          toolName === "kapruka_list_categories"
        ) {
          try {
            collectedProducts.push(...extractProducts(JSON.parse(resultText)));
          } catch {
            /* skip */
          }
        }

        if (toolName === "kapruka_create_order") {
          try {
            payLink = extractPayLink(JSON.parse(resultText));
          } catch {
            /* skip */
          }
        }

        currentMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: resultText,
        });
      }
    }

    return NextResponse.json({
      message: finalText,
      products: collectedProducts.length > 0 ? collectedProducts : undefined,
      payLink,
    } satisfies ChatResponse);
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
        /* ignore */
      }
    }
  }
}

// Real Kapruka MCP response shapes (verified against live API 2026-06-03)
// kapruka_search_products returns: { results: [...], next_cursor, applied_filters }
// Each result: { id, name, summary, price: { amount, currency }, image_url, url, in_stock, category: { name } }
// kapruka_create_order returns: { checkout_url, order_ref, summary: { grand_total, currency }, expires_at }

function extractProducts(data: unknown): KiraProduct[] {
  // MCP returns an array of content blocks: [{ type: "text", text: "..." }]
  // We may receive the parsed inner JSON or the outer content array
  let inner = data;
  if (Array.isArray(data)) {
    const textBlock = (data as { type: string; text: string }[]).find(
      (b) => b.type === "text"
    );
    if (textBlock) {
      try {
        inner = JSON.parse(textBlock.text);
      } catch {
        return [];
      }
    }
  }

  if (!inner || typeof inner !== "object") return [];
  const obj = inner as Record<string, unknown>;
  const candidates = (obj.results as unknown[]) ?? (Array.isArray(inner) ? inner : []);

  return candidates
    .slice(0, 4)
    .map((item) => {
      const p = item as Record<string, unknown>;
      const priceObj = p.price as { amount?: number; currency?: string } | undefined;
      const catObj = p.category as { name?: string } | undefined;
      return {
        id: String(p.id ?? Math.random()),
        name: String(p.name ?? "Product"),
        price: Number(priceObj?.amount ?? 0),
        currency: priceObj?.currency ?? "LKR",
        image: p.image_url as string | undefined,
        category: catObj?.name as string | undefined,
        url: p.url as string | undefined,
      };
    })
    .filter((p) => p.price > 0);
}

function extractPayLink(data: unknown): string | undefined {
  let inner = data;
  if (Array.isArray(data)) {
    const textBlock = (data as { type: string; text: string }[]).find(
      (b) => b.type === "text"
    );
    if (textBlock) {
      try {
        inner = JSON.parse(textBlock.text);
      } catch {
        return undefined;
      }
    }
  }
  if (!inner || typeof inner !== "object") return undefined;
  const obj = inner as Record<string, unknown>;
  // Real field: checkout_url (verified from kapruka_create_order schema)
  return (obj.checkout_url as string) ?? undefined;
}
