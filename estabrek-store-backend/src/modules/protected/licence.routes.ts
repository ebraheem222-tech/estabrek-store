/**
 * What the Windows launcher (estabrek-launcher) talks to. No account needed: the
 * serial and the PC fingerprint are the proof; calls are rate-limited.
 *   GET  /v1/licences/public-key          the keys licences are signed with (built into the launcher)
 *   POST /v1/licences/activate            serial + PC → a licence signed for that PC
 *   POST /v1/licences/check               the launcher's periodic check → a fresh licence
 *   GET  /v1/licences/launcher            the launcher on offer (version, size)
 *   GET  /v1/licences/launcher/download   the launcher itself
 */
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { activate, checkLicence, publicKeys } from "./activation.service.js";
import { currentLauncher, launcherFile } from "./launcher.service.js";

const r = Router();
r.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  next();
});

r.get(
  "/public-key",
  asyncHandler(async (_req, res) => {
    res.json({ keys: await publicKeys() });
  }),
);

const ActivateBody = z.object({
  serial: z.string().trim().min(10).max(60),
  deviceHash: z.string().trim().regex(/^[0-9a-fA-F]{64}$/),
  deviceName: z.string().trim().max(60).nullable().optional(),
  appVersion: z.string().trim().max(20).nullable().optional(),
});

r.post(
  "/activate",
  validate({ body: ActivateBody }),
  asyncHandler(async (req, res) => {
    res.json(await activate(req.body as z.infer<typeof ActivateBody>, { ip: req.ip }));
  }),
);

const CheckBody = z.object({ token: z.string().min(20).max(4000), deviceHash: z.string().trim().regex(/^[0-9a-fA-F]{64}$/) });

r.post(
  "/check",
  validate({ body: CheckBody }),
  asyncHandler(async (req, res) => {
    res.json(await checkLicence(req.body as z.infer<typeof CheckBody>, { ip: req.ip }));
  }),
);

r.get(
  "/launcher",
  asyncHandler(async (_req, res) => {
    const l = await currentLauncher();
    if (!l) return res.status(404).json({ error: "NO_LAUNCHER" });
    res.json(l);
  }),
);

r.get(
  "/launcher/download",
  asyncHandler(async (_req, res) => {
    const f = await launcherFile();
    res.setHeader("Content-Type", "application/vnd.microsoft.portable-executable");
    res.setHeader("Content-Disposition", `attachment; filename="${f.filename}"`);
    res.setHeader("Content-Length", String(f.data.length));
    res.end(f.data);
  }),
);

export default r;
