import pkg from "@/package.json";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    app: "kira",
    status: "ok",
    version: pkg.version,
    groqConfigured: Boolean(process.env.GROQ_API_KEY?.trim()),
  });
}
