import { buildMarkdownNotFound, renderMarkdownPage } from "@/lib/agent-content";

function createResponse(request: Request) {
  const pathname = new URL(request.url).searchParams.get("path") ?? "/";
  const markdown = renderMarkdownPage(pathname);
  const body = markdown ?? buildMarkdownNotFound(pathname);
  return new Response(body, {
    status: markdown ? 200 : 404,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Vary": "Accept",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

export function GET(request: Request) {
  return createResponse(request);
}

export function HEAD(request: Request) {
  const response = createResponse(request);
  return new Response(null, { status: response.status, headers: response.headers });
}
