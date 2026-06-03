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

    // Convert MCP tools to OpenAI/Groq format
    const tools: Groq.Chat.Completions.ChatCompletionTool[] = mcpTools.map(
      (tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description ?? "",
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

        if (toolName === "search_products" || toolName === "get_categories") {
          try {
            collectedProducts.push(...extractProducts(JSON.parse(resultText)));
          } catch {
            /* skip */
          }
        }

        if (toolName === "create_order") {
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

function extractProducts(data: unknown): KiraProduct[] {
  if (!data || typeof data !== "object") return [];

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
        image:
          (p.image as string | undefined) ??
          (p.imageUrl as string | undefined),
        category: p.category as string | undefined,
        url:
          (p.url as string | undefined) ??
          (p.productUrl as string | undefined),
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
