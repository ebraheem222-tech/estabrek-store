import type { RequestHandler } from "express";
import { checkIpAccess } from "../config/ipAccess.js";

export const ipAccess: RequestHandler = (req, res, next) => {
  const verdict = checkIpAccess({ ip: req.ip || "", path: req.path || "" });
  if (verdict.allowed) return next();
  return res.status(403).json({ error: verdict.code });
};

