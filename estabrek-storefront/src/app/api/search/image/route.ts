import { NextResponse } from "next/server";

function baseUrl() {
  return (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4000/v1"
  ).replace(/\/$/, "");
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "NO_FILE", message: "Image file is required" }, { status: 400 });
  }

  const url = `${baseUrl()}/storefront/search/image`;
  try {
    const res = await fetch(url, {
      method: "POST",
      body: form,
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    return NextResponse.json(json, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: "SEARCH_FAILED", message: e?.message ?? "Request failed" }, { status: 503 });
  }
}
