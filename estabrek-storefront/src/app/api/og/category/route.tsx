import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
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
        <div style={{ fontSize: 28, opacity: 0.8 }}>Estabrek Store</div>
        <div style={{ fontSize: 72, lineHeight: 1.05, fontWeight: 900 }}>{title}</div>
        <div style={{ fontSize: 24, opacity: 0.6 }}>estabrek.store</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
