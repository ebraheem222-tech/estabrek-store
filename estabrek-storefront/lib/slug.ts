export function paramsToSlug(params?: { slug?: string[] }) {
  const parts = params?.slug ?? [];
  const cleaned = parts.filter(Boolean).map((p) => String(p).trim()).filter(Boolean);
  if (!cleaned.length) return "/";
  return "/" + cleaned.join("/");
}
