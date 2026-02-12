import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

async function handler(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const target = new URL(`${BACKEND_URL.replace(/\/$/, "")}/${path.join("/")}`);
  target.search = url.search;

  // Rebuild headers to avoid RequestContentLengthMismatchError and hop-by-hop leakage.
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (HOP_BY_HOP.has(k)) return;
    headers.set(key, value);
  });

  // If we rebuild the body, we must also rebuild content-type.
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const isGetHead = req.method === "GET" || req.method === "HEAD";
  const reqBody = isGetHead ? undefined : await req.arrayBuffer();

  const init: RequestInit = {
    method: req.method,
    headers,
    body: reqBody,
    cache: "no-store",
  };

  const upstream = await fetch(target, init);
  const resBody = await upstream.arrayBuffer();

  // Pass-through response headers, but avoid hop-by-hop headers.
  const outHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (HOP_BY_HOP.has(k)) return;
    outHeaders.set(key, value);
  });

  return new Response(resBody, {
    status: upstream.status,
    headers: outHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;


