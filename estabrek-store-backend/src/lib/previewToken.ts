/**
 * A short ticket that lets the shop show one page's draft to the admin's new
 * editor (the page inside the editor's frame), without giving the shop any admin
 * rights: "<pageId>.<expires>.<signature>", signed with a key made from JWT_SECRET.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const PREVIEW_TTL_MS = 30 * 60_000;

// Read when used (config/env.ts checks it at start-up), so this file needs no database settings to load.
const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error("JWT_SECRET is missing");
  return s;
};
const key = () => createHmac("sha256", secret()).update("page-preview:v1").digest();
const sign = (body: string) => createHmac("sha256", key()).update(body).digest("base64url");

export function previewToken(pageId: string, now = Date.now()) {
  const expiresAt = now + PREVIEW_TTL_MS;
  const body = `${pageId}.${expiresAt}`;
  return { token: `${body}.${sign(body)}`, expiresAt: new Date(expiresAt).toISOString() };
}

/** The page the ticket is for, or null (broken, signed with another key, or expired). */
export function previewPageId(token: unknown, now = Date.now()): string | null {
  if (typeof token !== "string" || token.length > 200) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [pageId, exp, sig] = parts;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(pageId) || !/^\d{13}$/.test(exp)) return null;
  const want = Buffer.from(sign(`${pageId}.${exp}`));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  return Number(exp) > now ? pageId : null;
}
