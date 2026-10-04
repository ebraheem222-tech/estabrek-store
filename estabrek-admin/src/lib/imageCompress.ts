// src/lib/imageCompress.ts
// ضغط/تصغير صور قبل الرفع (أسرع + أقل حجم) بدون مكتبات.

type Options = {
  maxW?: number;
  maxH?: number;
  quality?: number; // 0..1
  mime?: "image/jpeg" | "image/webp";
};

export async function compressImage(file: File, opts: Options = {}): Promise<File> {
  const maxW = opts.maxW ?? 1600;
  const maxH = opts.maxH ?? 1600;
  const quality = opts.quality ?? 0.85;
  const mime = opts.mime ?? "image/jpeg";

  // only compress raster images
  if (!file.type.startsWith("image/")) return file;

  const bmp = await createImageBitmap(file);
  const ratio = Math.min(1, maxW / bmp.width, maxH / bmp.height);
  const w = Math.max(1, Math.round(bmp.width * ratio));
  const h = Math.max(1, Math.round(bmp.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(bmp, 0, 0, w, h);
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
  if (!blob) return file;

  // keep original name but change ext
  const base = file.name.replace(/\.[^/.]+$/, "");
  const ext = mime === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${base}.${ext}`, { type: mime });
}
