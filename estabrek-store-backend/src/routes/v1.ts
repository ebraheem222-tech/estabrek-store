// src/routes/v1.ts
import { Router } from "express";
import admin from "../modules/admin/admin.routes.js";
import catalog from "../modules/catalog/catalog.routes.js";
import storefront from "../modules/storefront/storefront.routes.js";
import settingsPublic from "../modules/settings/settings.routes.js";
import ugcPublic from "../modules/ugc/ugc.public.routes.js";
import webhooks from "../modules/webhooks/webhooks.controller.js";
import auth from "../modules/auth/auth.routes.js";   // ← add this
const r = Router();
r.use("/admin", admin);
r.use("/catalog", catalog);
r.use("/storefront", storefront);
r.use("/settings", settingsPublic);
r.use("/ugc", ugcPublic);
r.use("/webhooks", webhooks);   // ← add this
r.use("/auth", auth);

export default r;
