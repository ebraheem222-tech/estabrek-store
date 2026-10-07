import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";

/**
 * Activity log: every change made from the admin (who, what, when, from where).
 * Runs on the admin router after `loadAccess`, records once the response is sent,
 * and only for changes that succeeded. Field names are kept, never their values.
 */

const SKIP = [
  /^\/account\/security-events$/, // the admin's own client-side events
  /^\/audit\/events$/,
  /^\/pages\/sections\/validate$/, // checks only, nothing is saved
];

const CUID = /^c[a-z0-9]{20,32}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUM = /^\d+$/;
const TOKENISH = /^(?=.*\d)[a-z0-9_-]{16,}$/i;

const isId = (seg: string) => CUID.test(seg) || UUID.test(seg) || NUM.test(seg) || TOKENISH.test(seg);

export function describeAdminPath(method: string, rawPath: string) {
  const segments = (rawPath.split("?")[0] || "/").split("/").filter(Boolean).slice(0, 10);
  let targetId: string | null = null;
  const shape = segments.map((seg) => {
    if (isId(seg)) {
      if (!targetId) targetId = seg.slice(0, 64);
      return ":id";
    }
    return seg.length > 48 ? ":seg" : seg;
  });
  const area = shape[0] && shape[0] !== ":id" ? shape[0] : "admin";
  const path = `/${shape.join("/")}`;
  const lastIsId = shape[shape.length - 1] === ":id";
  const verb =
    method === "DELETE"
      ? "delete"
      : method === "PATCH" || method === "PUT"
        ? "update"
        : shape.includes(":id") && !lastIsId
          ? "action"
          : "create";
  return { area, path, targetId, verb };
}

let writes = 0;
const KEEP_DAYS = 400;

export const auditLog: RequestHandler = (req, res, next) => {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();
  const rawPath = req.path;
  if (SKIP.some((re) => re.test(rawPath))) return next();

  const access = req.access;
  const body = req.body;
  const fields =
    body && typeof body === "object" && !Array.isArray(body) ? Object.keys(body).slice(0, 40).map((k) => k.slice(0, 64)) : [];
  const ip = req.ip;
  const userAgent = (req.get("user-agent") ?? "").slice(0, 300) || null;

  res.on("finish", () => {
    if (res.statusCode >= 400) return;
    const { area, path, targetId, verb } = describeAdminPath(method, rawPath);
    const bypass = req.user?.bypass === true;
    prisma.adminAuditLog
      .create({
        data: {
          adminUserId: bypass ? null : access?.adminId ?? null,
          actorEmail: access?.email ?? req.user?.email ?? null,
          area,
          verb,
          method,
          path,
          targetId,
          status: res.statusCode,
          fields,
          ip,
          userAgent,
        },
      })
      .catch(() => {
        /* logging must never break the admin */
      });

    writes += 1;
    if (writes % 500 === 0) {
      prisma.adminAuditLog
        .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - KEEP_DAYS * 86_400_000) } } })
        .catch(() => {});
    }
  });

  next();
};
