import pkg from "@/package.json";
import { hasGroqKeys } from "@/lib/kira/groq";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    app: "kira",
    status: "ok",
    version: pkg.version,
    groqConfigured: hasGroqKeys(),
  });
}
