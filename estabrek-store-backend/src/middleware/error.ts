import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);

  if (err instanceof ZodError) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: err.flatten() });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return res.status(409).json({ error: "UNIQUE_CONSTRAINT", target: err.meta?.target });
    if (err.code === "P2025") return res.status(404).json({ error: "NOT_FOUND", message: (err.meta as any)?.cause || "Record not found" });
    if (err.code === "P2003") {
      return res.status(400).json({
        error: "FOREIGN_KEY",
        field: (err.meta as any)?.field_name ?? null,
        message: "Invalid reference (foreign key).",
      });
    }
  }

  if ((err as any)?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "INVALID_JSON", message: "Malformed JSON in request body" });
  }

  if (err?.name === "UnauthorizedError" || err?.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
  if (err?.name === "TokenExpiredError") {
    return res.status(401).json({ error: "TOKEN_EXPIRED" });
  }

  if (typeof (err as any)?.statusCode === "number") {
    const details = (err as any).details ?? (err as any).meta;
    return res.status((err as any).statusCode).json({
      error: (err as any).code || "ERROR",
      message: (err as any).message || "Request failed",
      ...(details !== undefined ? { details } : {}),
    });
  }

  return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
};
