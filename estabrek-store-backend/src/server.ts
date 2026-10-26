// src/server.ts
import { createServer } from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { closeRedis } from "./lib/redis.js";
import { loadPolicy } from "./lib/securityPolicy.js";
import { stopStockAlertKicks } from "./modules/stockAlerts/stockAlerts.service.js";
import { loadCacheConfig } from "./lib/cacheConfig.js";
import { loadMediaSettings } from "./lib/mediaSettings.js";
import { loadTrafficConfig } from "./lib/traffic.js";
import { stopRum } from "./lib/rum.js";
import { flushAb } from "./lib/experiments.js";
import { stopPopularity } from "./lib/popularity.js";
import { registerCatalogWarmers } from "./modules/catalog/catalog.warm.js";
import { loadJobsConfig, startJobs, stopJobs } from "./lib/jobs.js";
import { registerBackgroundJobs } from "./jobs.js";
import { startAutomations } from "./modules/admin/automations.service.js";

const port = Number(env.PORT || 4000);
const host = "0.0.0.0";

let server: import("http").Server | undefined;

// ---- Graceful Shutdown ----
async function shutdown(code = 0) {
  try {
    // Background jobs: no new runs; the ones going get a few seconds to finish.
    await stopJobs();
    stopStockAlertKicks();
    // What shoppers did since the last save (product popularity).
    await stopPopularity();
    await stopRum();
    await flushAb().catch(() => undefined);
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    await prisma.$disconnect();
    await closeRedis();
  } catch (e) {
    console.error("Error during shutdown:", e);
  } finally {
    process.exit(code);
  }
}

process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down...");
  shutdown(0);
});
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down...");
  shutdown(0);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  shutdown(1);
});

// ---- Boot ----
// Security rules from the admin (falls back to env until loaded).
void loadPolicy();
// Cache settings from the admin (Performance → Cache; defaults until loaded).
void loadCacheConfig();
void loadMediaSettings();
void loadTrafficConfig();
registerCatalogWarmers();
// Admin → المهام بالخلفية: every job the server runs on its own.
registerBackgroundJobs();
// Admin → التلقائيات: events reach the owner's rules.
startAutomations();
server = createServer(app);
server.headersTimeout = env.HTTP_HEADER_TIMEOUT_MS;
server.requestTimeout = env.HTTP_REQUEST_TIMEOUT_MS;
server.keepAliveTimeout = env.HTTP_KEEP_ALIVE_TIMEOUT_MS;
server.timeout = env.HTTP_SERVER_TIMEOUT_MS;
server.listen(port, host, () => {
  console.log(`estabrak-store API on http://${host}:${port}`);
  // The messages, back-in-stock emails, daily backup, popularity, shoppers' speed,
  // cache housekeeping… (src/jobs.ts), with what the admin paused or changed.
  void loadJobsConfig().finally(() => {
    startJobs();
    if (process.env.OUTBOX_WORKER === "true") console.log("[outbox] worker enabled");
  });
});
