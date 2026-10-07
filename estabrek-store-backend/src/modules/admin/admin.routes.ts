import { Router } from "express";
import type { Request } from "express-serve-static-core";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middleware/auth.js";
import { loadAccess, areaAccess, requirePermission, requireTwoFactorSetup } from "../../middleware/access.js";
import { auditLog } from "../../middleware/auditLog.js";

import core from "./admin.controller.js";
import settings from "./settings.controller.js";
import nav from "./nav.controller.js";
import pages from "./pages.controller.js";
import catalog from "./catalog.controller.js";
import orders from "./orders.controller.js";
import outbox from "./outbox.controller.js";
import ugc from "../ugc/ugc.controller.js";
import uploads from "./uploads.controller.js";
import inventory from "./inventory.controller.js";
import coupons from "./coupons.controller.js";
import chatbot from "./chatbot.controller.js";
import staff, { activity } from "./staff.controller.js";
import system from "./system.controller.js";
import customers from "./customers.controller.js";
import stockAlerts from "./stockAlerts.controller.js";
import features from "./features.controller.js";
import traffic from "./traffic.controller.js";
import backups from "./backups.controller.js";
import productTypes from "./productTypes.controller.js";
import { orderDelivery, productFiles, tickets } from "./fulfillment.controller.js";
import razan from "./razan.controller.js";
import { requestsInbox, requestsSettings } from "./requests.controller.js";
import { quizAdmin } from "./quiz.controller.js";
import { aiAskAdmin, aiCatalogAdmin, aiOrdersAdmin, aiSettingsAdmin } from "./ai.controller.js";
import { kickStockAlerts } from "../stockAlerts/stockAlerts.service.js";
import { kickDeliveryEmails } from "../fulfillment/fulfillment.service.js";

const r = Router();

// Everything needs a signed-in, active admin. Owners can do everything; team
// members only what their role allows (see permissions.ts). Every change is logged.
r.use(authenticate, loadAccess, requireTwoFactorSetup, auditLog);

// Own account (profile, password, sessions) is open to every member; the
// dashboard numbers need dashboard:read.
r.use("/overview", requirePermission("dashboard:read"));
r.use("/", core);

/**
 * Publishing, unpublishing or scheduling a page needs pages:publish on top of
 * pages:write. The page form always sends its status and dates, so only a real
 * change counts.
 */
async function pagePublishing(req: Request): Promise<string | null> {
  if (req.method !== "PATCH" && req.method !== "PUT") return null;
  const m = /^\/([^/]+)$/.exec(req.path);
  if (!m) return null;
  const b = (req.body ?? {}) as Record<string, unknown>;
  const touches = "status" in b || "publishAt" in b || "unpublishAt" in b;
  if (!touches) return null;
  const page = await prisma.page.findUnique({
    where: { id: m[1] },
    select: { status: true, publishAt: true, unpublishAt: true },
  });
  if (!page) return null; // the controller answers 404
  const time = (v: unknown) => (v ? new Date(String(v)).getTime() : null);
  const statusChanges = "status" in b && b.status !== page.status && (b.status === "PUBLISHED" || page.status === "PUBLISHED");
  const publishAtChanges = "publishAt" in b && time(b.publishAt) !== time(page.publishAt);
  const unpublishAtChanges = "unpublishAt" in b && time(b.unpublishAt) !== time(page.unpublishAt);
  return statusChanges || publishAtChanges || unpublishAtChanges ? "pages:publish" : null;
}

// Stock may have come back (products, inventory, cancelled orders): back-in-stock emails go out a few seconds later.
r.use(["/catalog", "/inventory", "/orders"], (req, res, next) => {
  if (req.method !== "GET") res.on("finish", () => res.statusCode < 400 && kickStockAlerts());
  next();
});
// An accepted order with files/tickets: the delivery email goes out a second later.
r.use("/orders", (req, res, next) => {
  if (req.method !== "GET") res.on("finish", () => res.statusCode < 400 && kickDeliveryEmails());
  next();
});

// groups
r.use("/settings", areaAccess({ read: "settings:read", write: "settings:write" }), settings);
r.use("/features", areaAccess({ read: "settings:read", write: "settings:write" }), features);
r.use("/razan", areaAccess({ read: "settings:read", write: "settings:write" }), razan);
r.use("/nav", areaAccess({ read: ["nav:read", "nav:write"], write: "nav:write" }), nav);
r.use("/pages", areaAccess({ read: "pages:read", write: "pages:write", extra: pagePublishing }), pages);
r.use("/catalog/products/:productId/files", areaAccess({ read: "catalog:read", write: "catalog:write" }), productFiles);
r.use("/catalog/product-types", areaAccess({ read: "catalog:read", write: "catalog:write" }), productTypes);
r.use("/catalog", areaAccess({ read: "catalog:read", write: "catalog:write" }), catalog);
r.use("/orders", areaAccess({ read: "orders:read", write: "orders:write" }), orderDelivery, orders);
r.use("/tickets", areaAccess({ read: "orders:read", write: "orders:write" }), tickets);
r.use("/requests-settings", areaAccess({ read: "settings:read", write: "settings:write" }), requestsSettings);
r.use("/requests", areaAccess({ read: "orders:read", write: "orders:write" }), requestsInbox);
r.use("/quiz", areaAccess({ read: "settings:read", write: "settings:write" }), quizAdmin);
r.use("/ai-catalog", areaAccess({ read: "catalog:read", write: "catalog:write" }), aiCatalogAdmin);
r.use("/ai-orders", areaAccess({ read: "orders:read", write: "orders:write" }), aiOrdersAdmin);
r.use("/ai-ask", areaAccess({ read: "dashboard:read", write: "dashboard:read" }), aiAskAdmin);
r.use("/ai", areaAccess({ read: "settings:read", write: "settings:write" }), aiSettingsAdmin);
r.use("/ugc", areaAccess({ read: "ugc:read", write: "ugc:write" }), ugc);
r.use("/outbox", areaAccess({ read: "outbox:read", write: "outbox:write" }), outbox);
// Images are uploaded from products, pages and settings as well as the media page.
r.use(
  "/uploads",
  areaAccess({
    read: ["media:read", "catalog:read", "pages:read", "settings:read"],
    write: ["media:write", "catalog:write", "pages:write", "settings:write"],
  }),
  uploads,
);
r.use("/inventory", areaAccess({ read: "inventory:read", write: "inventory:write" }), inventory);
r.use("/coupons", areaAccess({ read: "discounts:read", write: "discounts:write" }), coupons);
r.use("/chatbot", areaAccess({ read: "chatbot:read", write: "chatbot:write" }), chatbot);
r.use("/staff", areaAccess({ read: "staff:read", write: "staff:write" }), staff);
r.use("/activity", requirePermission("activity:read"), activity);
r.use("/system/traffic", areaAccess({ read: "system:read", write: "system:write" }), traffic);
r.use("/system/backups", areaAccess({ read: "system:read", write: "system:write" }), backups);
r.use("/system", areaAccess({ read: "system:read", write: "system:write" }), system);
r.use("/customers", areaAccess({ read: "customers:read", write: "customers:write" }), customers);
r.use("/stock-alerts", areaAccess({ read: "inventory:read", write: "inventory:write" }), stockAlerts);

export default r;
