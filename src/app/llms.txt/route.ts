import { buildLlmIndex } from "@/lib/agent-content";

export function GET() {
  return new Response(buildLlmIndex(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
