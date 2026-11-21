import { NextResponse } from "next/server";

function baseUrl() {
  return (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4000/v1"
  ).replace(/\/$/, "");
}

function forwardedFor(req: Request): Record<string, string> {
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim();
  return xff && /^[0-9a-fA-F:.]{3,45}$/.test(xff) ? { "X-Forwarded-For": xff } : {};
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const message = String(body?.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ ok: false, error: "Missing message" }, { status: 400 });
  }

  const url = `${baseUrl()}/storefront/chatbot/message`;

  try {
    const res = await fetch(url, {
      method: "POST",
      // The shopper's own address, so the shop's AI limits count each shopper, not this server.
      headers: { "Content-Type": "application/json", ...forwardedFor(req) },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: (json as any)?.error || "Request failed" }, { status: 200 });
    }
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ ok: false, error: "Backend unavailable" }, { status: 200 });
  }
}

