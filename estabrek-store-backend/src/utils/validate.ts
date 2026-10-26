// src/utils/validate.ts
import type { RequestHandler } from "express";
import { ZodSchema } from "zod";

export function validate(schemas: {
  body?: ZodSchema<any>;
  query?: ZodSchema<any>;
  params?: ZodSchema<any>;
}): RequestHandler {
  return (req, _res, next) => {
    try {
      // NOTE: In newer router/express implementations, `req.query` can be a getter-only property.
      // Do NOT reassign `req.query` / `req.params`. Instead, mutate the existing objects.
      if (schemas.params) {
        const parsed = schemas.params.parse(req.params);
        const target = req.params as any;
        if (target && typeof target === "object") {
          for (const k of Object.keys(target)) delete target[k];
          Object.assign(target, parsed);
        }
      }

      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        const target = req.query as any;
        if (target && typeof target === "object") {
          for (const k of Object.keys(target)) delete target[k];
          Object.assign(target, parsed);
        }
      }

      if (schemas.body) (req as any).body = schemas.body.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}
