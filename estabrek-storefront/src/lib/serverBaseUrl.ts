export function baseUrl(): string {
  const env = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "http://localhost:4000/v1";
  return env.replace(/\/+$/, "");
}
