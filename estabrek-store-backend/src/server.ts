// src/server.ts
import { createServer } from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { closeRedis } from "./lib/redis.js";
import { processQueueOnce } from "./modules/outbox/outbox.service.js";

const port = Number(env.PORT || 4000);
const host = "0.0.0.0";

let server: import("http").Server | undefined;
let workerTimer: NodeJS.Timeout | undefined;

// ---- Start Outbox Worker (optional) ----
function startOutboxWorker() {
  if (process.env.OUTBOX_WORKER !== "true") return;
  const intervalMs = Number(process.env.OUTBOX_INTERVAL_MS ?? 15_000);

  workerTimer = setInterval(() => {
    processQueueOnce(25).catch((e) => {
      console.error("[outbox.worker] error:", e);
    });
  }, intervalMs);

  console.log(`[outbox] worker enabled, interval=${intervalMs}ms`);
}

// ---- Graceful Shutdown ----
async function shutdown(code = 0) {
  try {
    if (workerTimer) clearInterval(workerTimer);
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
server = createServer(app);
server.headersTimeout = env.HTTP_HEADER_TIMEOUT_MS;
server.requestTimeout = env.HTTP_REQUEST_TIMEOUT_MS;
server.keepAliveTimeout = env.HTTP_KEEP_ALIVE_TIMEOUT_MS;
server.timeout = env.HTTP_SERVER_TIMEOUT_MS;
server.listen(port, host, () => {
  console.log(`estabrak-store API on http://${host}:${port}`);
  startOutboxWorker();
});
