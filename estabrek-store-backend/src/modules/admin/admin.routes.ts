import { Router } from "express";
import { authenticate, requireSuperAdmin } from "../../middleware/auth.js";

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

const r = Router();

// protect everything
r.use(authenticate, requireSuperAdmin);

// top-level core
r.use("/", core);

// groups
r.use("/settings", settings);
r.use("/nav", nav);
r.use("/pages", pages);
r.use("/catalog", catalog);
r.use("/orders", orders);
r.use("/ugc", ugc);
r.use("/outbox", outbox);
r.use("/uploads", uploads);
r.use("/inventory", inventory);
r.use("/coupons", coupons);
r.use("/chatbot", chatbot);

export default r;
