/**
 * Every background job the server runs (lib/jobs.ts runs them; admin →
 * المهام بالخلفية shows, pauses and runs them). The server's own settings (env)
 * still decide what may run at all: a job they turn off stays off here.
 */
import { env } from "./config/env.js";
import { registerJob, type JobCounts } from "./lib/jobs.js";
import { processQueueOnce } from "./modules/outbox/outbox.service.js";
import { sweepStockAlerts } from "./modules/stockAlerts/stockAlerts.service.js";
import { maybeRunDailyBackup } from "./modules/backups/backup.service.js";
import { purgeOldPhotos } from "./modules/requests/requests.service.js";
import { flushPopularity, loadPopularity, refreshHot } from "./lib/popularity.js";
import { flushRum } from "./lib/rum.js";
import { sweepCaches } from "./lib/cache.js";
import { warmNow } from "./lib/cacheWarm.js";
import { conversionsWaiting } from "./lib/ffmpeg.js";
import { runCampaigns } from "./modules/admin/campaigns.service.js";
import { flushAb } from "./lib/experiments.js";
import { flushHomeStats } from "./lib/homeStats.js";
import { runScheduled } from "./modules/admin/schedule.service.js";
import { runAutomations, setVideoChecker } from "./modules/admin/automations.service.js";
import { checkProcessingVideos } from "./modules/admin/videos.controller.js";
import { retryPublicationDeliveries } from "./lib/pagePublicationDelivery.js";
import { checkDeploy, deployWatchOff } from "./lib/deployWatch.js";
import { purgeTrash } from "./lib/collections.js";
import { cleanRuns } from "./lib/runs.js";
import { cleanCallKeys } from "./lib/fnCallKeys.js";
import { cleanTasks, runTasks } from "./lib/tasks.js";
import { cleanDeliveries } from "./lib/webhooksOut.js";
import { runFnSchedule } from "./lib/fnTriggers.js";
import { sendQueuedPushes } from "./lib/push.js";
import { cleanFiles } from "./lib/shopperFiles.js";

const MIN = 60_000;
const HOUR = 60 * MIN;

/** A number of ms from the env; `fallback` when unset; null when 0 or off. */
function envMs(name: string, fallback: number): number | null {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function registerBackgroundJobs() {
  registerJob({ name: "cmsPublish", group: "cache", everyMs: 30_000, limits: { min: 15_000, max: 5 * MIN }, firstMs: 5_000, run: () => retryPublicationDeliveries() });
  const outboxEvery = envMs("OUTBOX_INTERVAL_MS", 15_000) ?? 15_000;
  registerJob({
    name: "outbox",
    group: "messages",
    everyMs: outboxEvery,
    limits: { min: 5_000, max: 10 * MIN },
    offReason: () => (process.env.OUTBOX_WORKER === "true" ? null : "OUTBOX_WORKER"),
    run: async () => {
      const r = await processQueueOnce(25);
      return { checked: r.checked, sent: r.sent, failed: r.failed };
    },
  });

  // Notifications to shoppers' phones (lib/push.ts): woken when one is queued; the timer only goes on
  // with a big one, or after a restart.
  registerJob({ name: "push", group: "messages", everyMs: MIN, limits: { min: 15_000, max: HOUR }, firstMs: 20_000, run: () => sendQueuedPushes() });
  // Files shoppers uploaded that no row holds a day later (lib/shopperFiles.ts).
  registerJob({ name: "dataFiles", group: "data", everyMs: HOUR, limits: { min: 10 * MIN, max: 24 * HOUR }, firstMs: 10 * MIN, run: () => cleanFiles() });

  const stockEvery = envMs("STOCK_ALERT_INTERVAL_MS", 2 * MIN);
  registerJob({
    name: "stockAlerts",
    group: "messages",
    everyMs: stockEvery == null ? 2 * MIN : Math.max(15_000, stockEvery),
    limits: { min: 15_000, max: HOUR },
    offReason: () => (stockEvery == null ? "STOCK_ALERT_INTERVAL_MS" : null),
    run: () => sweepStockAlerts(),
  });

  const backupEvery = envMs("BACKUP_CHECK_MS", 10 * MIN);
  registerJob({
    name: "backup",
    group: "data",
    everyMs: backupEvery == null ? 10 * MIN : Math.max(MIN, backupEvery),
    limits: { min: MIN, max: 2 * HOUR },
    firstMs: 5 * MIN,
    offReason: () => (backupEvery == null ? "BACKUP_CHECK_MS" : null),
    // A backup is made only when one is due (once a day); a failed one fails the run.
    run: async (): Promise<JobCounts> => {
      const run = await maybeRunDailyBackup();
      if (!run) return { made: 0 };
      if (run.status === "FAILED") throw new Error(run.error || "BACKUP_FAILED");
      return { made: 1, rows: run.rows ?? 0, bytes: run.sizeBytes ?? 0 };
    },
    stuckMs: HOUR,
  });

  registerJob({
    name: "requestPhotos",
    group: "data",
    everyMs: 6 * HOUR,
    limits: { min: HOUR, max: 48 * HOUR },
    firstMs: 2 * MIN,
    offReason: () => (env.NODE_ENV === "test" ? "NODE_ENV" : null),
    run: () => purgeOldPhotos(),
  });

  registerJob({
    name: "dataTrash",
    group: "data",
    // Rows deleted from the tables wait 30 days in the trash, then go for good.
    everyMs: 6 * HOUR,
    limits: { min: HOUR, max: 48 * HOUR },
    firstMs: 3 * MIN,
    run: () => purgeTrash(),
  });

  registerJob({
    name: "runsClean",
    group: "data",
    // The run log keeps a month (lib/runs.ts RUN_KEEP_DAYS); older runs go.
    everyMs: 6 * HOUR,
    limits: { min: HOUR, max: 48 * HOUR },
    firstMs: 4 * MIN,
    // (And the calls' own names for their requests, kept a day: lib/fnCallKeys.ts.)
    run: async () => {
      const out = await cleanRuns();
      await cleanCallKeys();
      return out;
    },
  });

  registerJob({
    name: "tasks",
    group: "control",
    // The queue's worker (lib/tasks.ts): at once when a task is added, and on this timer for the
    // ones whose retry is due or whose worker died mid-way. Paused: tasks wait, none is lost.
    everyMs: 15_000,
    limits: { min: 5_000, max: 5 * MIN },
    firstMs: 4_000,
    run: () => runTasks(),
  });

  registerJob({
    name: "fnSchedule",
    group: "control",
    // Functions on a schedule (lib/fnTriggers.ts): the ones that are due are put on the queue.
    everyMs: MIN,
    limits: { min: 30_000, max: 10 * MIN },
    firstMs: 25_000,
    run: () => runFnSchedule(),
  });

  registerJob({
    name: "tasksClean",
    group: "data",
    // Done tasks are kept a week, the ones set aside or dismissed a month (lib/tasks.ts TASK_KEEP_DAYS).
    everyMs: 6 * HOUR,
    limits: { min: HOUR, max: 48 * HOUR },
    firstMs: 5 * MIN,
    // (And the outgoing webhooks' delivery log, kept two weeks: lib/webhooksOut.ts.)
    run: async () => {
      const out = await cleanTasks();
      await cleanDeliveries();
      return out;
    },
  });

  registerJob({
    name: "popularitySave",
    group: "cache",
    everyMs: 30_000,
    limits: { min: 10_000, max: 10 * MIN },
    run: async () => ({ products: await flushPopularity() }),
  });

  registerJob({
    name: "popularityHot",
    group: "cache",
    everyMs: MIN,
    limits: { min: 15_000, max: 30 * MIN },
    run: async () => {
      refreshHot();
      return null;
    },
  });

  registerJob({
    name: "popularityLoad",
    group: "cache",
    everyMs: 5 * MIN,
    limits: { min: MIN, max: 2 * HOUR },
    firstMs: 3_000,
    run: async () => {
      await loadPopularity();
      return null;
    },
  });

  registerJob({
    name: "cacheWarm",
    group: "cache",
    // After a change or a purge (and 20 s after start): not on a timer.
    everyMs: null,
    firstMs: 20_000,
    run: async (trigger) => {
      const r = await warmNow(trigger === "admin" ? "admin" : trigger === "start" ? "start" : "change");
      return { products: r.products, built: r.built, skipped: r.skipped, errors: r.errors };
    },
  });

  registerJob({
    name: "cacheSweep",
    group: "cache",
    everyMs: 30_000,
    limits: { min: 10_000, max: 10 * MIN },
    run: async () => ({ removed: sweepCaches() }),
  });

  registerJob({
    name: "rumSave",
    group: "data",
    everyMs: MIN,
    limits: { min: 15_000, max: 30 * MIN },
    run: async () => ({ rows: await flushRum() }),
  });

  registerJob({
    name: "homeStatsSave",
    group: "selling",
    everyMs: MIN,
    limits: { min: 15_000, max: 30 * MIN },
    run: async () => ({ rows: await flushHomeStats() }),
  });

  registerJob({
    name: "abSave",
    group: "selling",
    everyMs: MIN,
    limits: { min: 15_000, max: 30 * MIN },
    run: async () => ({ rows: await flushAb() }),
  });

  registerJob({
    name: "campaigns",
    group: "selling",
    // Seasons start and end on the minute (their prices also end by themselves at the season's end).
    everyMs: MIN,
    limits: { min: 30_000, max: 10 * MIN },
    firstMs: 15_000,
    run: () => runCampaigns(),
  });

  registerJob({
    name: "scheduled",
    group: "control",
    // The timeline's changes happen (and go back) on the minute.
    everyMs: MIN,
    limits: { min: 30_000, max: 10 * MIN },
    firstMs: 10_000,
    run: () => runScheduled(),
  });

  setVideoChecker(checkProcessingVideos);
  registerJob({
    name: "automations",
    group: "control",
    // Stock below a rule's line, a product's popularity jumping, pinned ones due back,
    // and videos still converting (orders and failing jobs come in by themselves).
    everyMs: 2 * MIN,
    limits: { min: MIN, max: 30 * MIN },
    firstMs: 30_000,
    run: () => runAutomations(),
  });

  registerJob({
    name: "deployWatch",
    group: "control",
    // Is the code running here the branch's last commit? (admin → حالة السيرفر)
    everyMs: MIN,
    limits: { min: 30_000, max: 15 * MIN },
    firstMs: 20_000,
    // Only where the host says which commit runs (Railway).
    offReason: () => deployWatchOff(),
    run: () => checkDeploy(),
  });

  registerJob({
    name: "videoConvert",
    group: "media",
    // Conversions run one at a time when a video asks for one (lib/ffmpeg.ts).
    everyMs: null,
    canPause: false,
    canRunNow: false,
    stuckMs: 2 * HOUR,
    run: async () => null,
    live: () => ({ waiting: conversionsWaiting() }),
  });
}
