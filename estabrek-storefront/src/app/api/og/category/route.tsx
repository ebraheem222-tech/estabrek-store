import { ImageResponse } from "next/og";
import { getPublicSettings } from "@/lib/api";
import { identityOf, nameOf } from "@/lib/storeIdentity";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const settings = await getPublicSettings().catch(() => null);
  const storeLabel = nameOf(identityOf((settings as any)?.site), "en");
  const host = (() => { try { return new URL(process.env.NEXT_PUBLIC_SITE_URL || "").host; } catch { return ""; } })();
  const title = searchParams.get("title") || "Category";
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background: "linear-gradient(135deg, #0a0a0a 0%, #0f172a 100%)",
          color: "white",
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.8 }}>{storeLabel}</div>
        <div style={{ fontSize: 72, lineHeight: 1.05, fontWeight: 900 }}>{title}</div>
        <div style={{ fontSize: 24, opacity: 0.6 }}>{host}</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
