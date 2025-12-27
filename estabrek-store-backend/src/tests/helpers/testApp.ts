// tests/helpers/testApp.ts
import express from "express";
import type { RequestHandler } from "express";
import adminRoutes from "../../modules/admin/admin.routes.js";
import catalogRoutes from "../../modules/catalog/catalog.routes.js";
import webhooksRoutes from "../../modules/webhooks/webhooks.routes.js"; // if you named it differently, adjust import
import { errorHandler } from "../../middleware/error.js";
import app from "../../app.js";
export default app;

export function buildTestApp() {
  const app = express();
  app.use(express.json());

  // stub auth middlewares: set SUPERADMIN user for admin routes
  const fakeAuth: RequestHandler = (req, _res, next) => {
    (req as any).user = { sub: "admin-1", role: "SUPERADMIN", email: "admin@local" };
    next();
  };
  const allow: RequestHandler = (_req, _res, next) => next();

  // Mount routes the same way v1.ts does, but inject stubs
  const v1 = express.Router();
  v1.use("/admin", fakeAuth, allow, adminRoutes);
  v1.use("/catalog", catalogRoutes);
  v1.use("/webhooks", webhooksRoutes);

  app.use("/v1", v1);

  // error handler
  app.use(errorHandler);
  return app;
}
