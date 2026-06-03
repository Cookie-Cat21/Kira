import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { KIRA_SYSTEM_PROMPT } from "@/lib/kira-prompt";
import { createMcpClient, listMcpTools, callMcpTool } from "@/lib/mcp-client";
import type { ChatRequest, ChatResponse, KiraProduct } from "@/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
// llama-3.3-70b-versatile: best quality, but 12k TPM / 100k TPD free-tier limits
// meta-llama/llama-4-scout-17b-16e-instruct: Llama 4, agentic tool use, separate quota
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
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

    // The Kapruka MCP wraps all args in a `params` key (Pydantic model pattern).
    // Groq validates tool call args against the schema and rejects calls that
    // don't include `params`. Fix: flatten the schema for Groq, then re-wrap
    // the args before calling the MCP.
    //
    // Also trim verbose descriptions — free Groq tier has a 12k TPM cap.
    const trimDesc = (desc: string) =>
      desc.split(/\n/)[0].split(". ")[0].slice(0, 120);

    // Returns the inner SearchProductsInput schema (without the `params` wrapper)
    // and a flag so we know to re-wrap when calling the tool.
    function resolveSchema(rawSchema: Record<string, unknown>): {
      schema: Record<string, unknown>;
      needsParamsWrap: boolean;
    } {
      const props = rawSchema.properties as Record<string, unknown> | undefined;
      const required = rawSchema.required as string[] | undefined;
      const defs = rawSchema.$defs as Record<string, unknown> | undefined;

      if (
        props &&
        required?.length === 1 &&
        required[0] === "params" &&
        props.params
      ) {
        const paramsEntry = props.params as Record<string, unknown>;
        const ref = paramsEntry.$ref as string | undefined;
        if (ref && defs) {
          const refName = ref.split("/").pop()!;
          const inner = defs[refName] as Record<string, unknown> | undefined;
          if (inner) {
            // Keep outer $defs so any $ref pointers inside the inner schema
            // (e.g. CreateOrderInput references $defs/Sender, $defs/Recipient)
            // still resolve correctly.
            return { schema: { ...inner, $defs: defs }, needsParamsWrap: true };
          }
        }
      }
      return { schema: rawSchema, needsParamsWrap: false };
    }

    const toolMeta: { needsParamsWrap: boolean }[] = [];
    const tools: Groq.Chat.Completions.ChatCompletionTool[] = mcpTools.map(
      (tool) => {
        const raw = (tool.inputSchema as Record<string, unknown>) ?? {
          type: "object",
          properties: {},
        };
        const { schema, needsParamsWrap } = resolveSchema(raw);
        toolMeta.push({ needsParamsWrap });
        return {
          type: "function",
          function: {
            name: tool.name,
            description: trimDesc(tool.description ?? ""),
            parameters: schema,
          },
        };
      }
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
        const raw = msg.content ?? "";
        // Weaker models sometimes leak raw <function=...> blobs into content.
        // Strip them so they never reach the UI.
        finalText = raw.replace(/<function=[^>]+>[\s\S]*?<\/function>/g, "").trim();
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

        // Re-wrap args in `params` if this tool uses the Pydantic wrapper pattern
        const toolIndex = mcpTools.findIndex((t) => t.name === toolName);
        const needsWrap = toolIndex >= 0 && toolMeta[toolIndex]?.needsParamsWrap;
        const mcpArgs = needsWrap ? { params: toolArgs } : toolArgs;

        const toolResult = await callMcpTool(mcpClient, toolName, mcpArgs);
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
