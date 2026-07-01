import { NextRequest, NextResponse } from "next/server";
import { rateLimit, sweep } from "@/lib/rate-limit";

// Tune to Groq free-tier + MCP limits: chat is expensive, checkout places orders.
const LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "/api/chat": { limit: 20, windowMs: 60_000 },
  "/api/checkout": { limit: 8, windowMs: 60_000 },
};

export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  const path = req.nextUrl.pathname;
  const cfg = LIMITS[path];
  if (!cfg) return NextResponse.next();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  sweep();
  const { allowed, retryAfterSec } = rateLimit(
    `${ip}:${path}`,
    cfg.limit,
    cfg.windowMs
  );
  if (allowed) return NextResponse.next();

  return NextResponse.json(
    { error: "Too many requests — please slow down a moment." },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}

export const config = {
  matcher: ["/api/chat", "/api/checkout"],
};
