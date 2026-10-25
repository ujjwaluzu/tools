import { NextRequest, NextResponse } from "next/server";

function requestsMarkdown(accept: string | null) {
  return (accept ?? "").split(",").some((entry) => {
    const [mediaType, ...parameters] = entry.trim().toLowerCase().split(";");
    if (mediaType !== "text/markdown") return false;
    const quality = parameters.find((parameter) => parameter.trim().startsWith("q="))?.trim().slice(2);
    return quality === undefined || Number(quality) > 0;
  });
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isHtmlPage = pathname === "/" || pathname === "/tools" || pathname.startsWith("/tools/") || pathname === "/terms" || pathname === "/privacy" || pathname === "/legal";
  if (!isHtmlPage) {
    return NextResponse.next();
  }

  if ((request.method !== "GET" && request.method !== "HEAD") || !requestsMarkdown(request.headers.get("accept"))) {
    const response = NextResponse.next();
    response.headers.append("Vary", "Accept");
    return response;
  }

  const destination = request.nextUrl.clone();
  destination.pathname = "/agent-markdown";
  destination.search = "";
  destination.searchParams.set("path", pathname);
  const response = NextResponse.rewrite(destination);
  response.headers.append("Vary", "Accept");
  return response;
}
