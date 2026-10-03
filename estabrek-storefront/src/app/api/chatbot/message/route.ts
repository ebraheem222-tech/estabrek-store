import { NextResponse } from "next/server";

function baseUrl() {
  return (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4000/v1"
  ).replace(/\/$/, "");
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
      headers: { "Content-Type": "application/json" },
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

