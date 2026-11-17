// src/routes/v1.ts
import { Router } from "express";
import admin from "../modules/admin/admin.routes.js";
import catalog from "../modules/catalog/catalog.routes.js";
import storefront from "../modules/storefront/storefront.routes.js";
import settingsPublic from "../modules/settings/settings.routes.js";
import ugcPublic from "../modules/ugc/ugc.public.routes.js";
import webhooks from "../modules/webhooks/webhooks.controller.js";
import auth from "../modules/auth/auth.routes.js";   // ← add this
import customer from "../modules/customer/customer.routes.js";
import stockAlerts from "../modules/stockAlerts/stockAlerts.routes.js";
import orderAccess from "../modules/fulfillment/orderAccess.routes.js";
import licences from "../modules/protected/licence.routes.js";
import razanPublic from "../modules/razan/razan.routes.js";
import requestsPublic from "../modules/requests/requests.routes.js";
import quizPublic from "../modules/quiz/quiz.routes.js";
import aiPublic from "../modules/ai/ai.routes.js";
import data from "../modules/data/data.routes.js";
import { fnCalls, fnHooks, fnRoutes } from "../modules/functions/fn.routes.js";
import { webhookRun } from "../middleware/runLog.js";
const r = Router();
r.use("/admin", admin);
r.use("/catalog", catalog);
r.use("/storefront", storefront);
r.use("/settings", settingsPublic);
r.use("/ugc", ugcPublic);
r.use("/webhooks", webhookRun, webhooks); // each one taken in goes to the run log
r.use("/auth", auth);
r.use("/customer", customer); // shopper accounts (sign in by email code)
r.use("/stock-alerts", stockAlerts); // "tell me when it's back"
r.use("/orders", orderAccess); // private order page: downloads and tickets
r.use("/licences", licences); // the Windows launcher: activate a serial on a PC, check it, download the launcher
r.use("/razan", razanPublic); // the storefront guide: usage counts and the owner's preview
r.use("/requests", requestsPublic); // «اطلبي قطعتكِ» and «بدي حدا يحكيني»
r.use("/quiz", quizPublic); // «سؤال وجواب» (a coupon prize)
r.use("/ai", aiPublic); // AI for shoppers (off until OPENAI_API_KEY + the admin switch)
r.use("/data", data); // the automatic API: the tables the owner opened, to a key or to everyone
r.use("/fn", fnCalls); // a function's own address: a shopper's button, a program with a key, or anyone
r.use("/hooks", fnHooks); // a webhook from another system starts a function
r.use("/api", fnRoutes); // the owner's own addresses: a method and a path, each a function's

export default r;
