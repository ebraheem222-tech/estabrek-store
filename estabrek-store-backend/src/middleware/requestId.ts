import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";

const SAFE_REQUEST_ID_RE = /^[a-zA-Z0-9._-]{1,128}$/;

export const requestId: RequestHandler = (req, res, next) => {
  const raw = req.headers["x-request-id"];
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const id = typeof candidate === "string" && SAFE_REQUEST_ID_RE.test(candidate) ? candidate : randomUUID();
  req.id = id;
  res.setHeader("x-request-id", id);
  next();
};
