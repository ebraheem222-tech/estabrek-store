/**
 * The vault (phase 3): a small private service that keeps the protected products'
 * master files and the licence signing key, away from the public backend.
 *
 *   - Reached only from the backend: every request is signed (requestSigning.ts),
 *     and VAULT_ALLOW_IPS can narrow it to the private network or Tailscale. It
 *     has no public address of its own (don't publish it; never use Tailscale Funnel).
 *   - Masters are kept encrypted on its own disk (VAULT_MASTER_KEY).
 *   - Changing them (upload, delete) needs an owner session: at most 20 minutes,
 *     opened by the backend only after the owner re-enters her password and code.
 *   - Deliveries and activations need no session: a sale at 3 a.m. still works.
 *     It makes each buyer's copy (package.ts) and signs licences (licenceToken.ts).
 *   - Everything is written to its own audit log.
 *
 * Runs from the backend's own build: `npm run start:vault` (dist/vault/main.js).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction } from "express";
import { ipAllowed, makeVerifier } from "../modules/vault/requestSigning.js";
import { keyFromPem, keyToPem, newSigningKey, signToken, type SigningKey } from "../modules/protected/licenceToken.js";
import { extOf, probeFile, type FileTypeRule, type Probe } from "../modules/protected/marks.js";
import { makePackage } from "../modules/protected/package.js";
import { safeEntryName } from "../modules/protected/zipAes.js";

export const VAULT_VERSION = "1.0.0";
export const MAX_SESSION_MINUTES = 20;

export type VaultConfig = {
  dataDir: string;
  sharedSecret: string;
  masterKey: string;
  allowIps: string[];
  /** PEM; empty = made on first start and kept in dataDir/signing-key.pem. */
  signingKeyPem?: string | null;
  maxUploadMb: number;
  sessionMinutes: number;
};

export function configFromEnv(e: NodeJS.ProcessEnv = process.env): VaultConfig {
  const need = (name: string, min: number) => {
    const v = e[name] ?? "";
    if (v.length < min) throw new Error(`${name} must be set (at least ${min} characters)`);
    return v;
  };
  return {
    dataDir: e.VAULT_DATA_DIR || path.resolve("vault-data"),
    sharedSecret: need("VAULT_SHARED_SECRET", 32),
    masterKey: need("VAULT_MASTER_KEY", 32),
    allowIps: (e.VAULT_ALLOW_IPS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    signingKeyPem: e.VAULT_SIGNING_KEY ? e.VAULT_SIGNING_KEY.replace(/\\n/g, "\n") : null,
    maxUploadMb: Math.max(1, Math.min(200, Number(e.VAULT_MAX_UPLOAD_MB) || 50)),
    sessionMinutes: Math.max(1, Math.min(MAX_SESSION_MINUTES, Number(e.VAULT_SESSION_MINUTES) || MAX_SESSION_MINUTES)),
  };
}

/* ---------------- Storage ---------------- */

type FileMeta = { id: string; productId: string; name: string; ext: string; bytes: number; sha256: string; probe: Probe; position: number; createdAt: string };
type Index = { version: 1; files: Record<string, FileMeta> };

function sealer(masterKey: string) {
  const key = Buffer.from(crypto.hkdfSync("sha256", Buffer.from(masterKey, "utf8"), Buffer.from("estabrek/vault", "utf8"), Buffer.from("files", "utf8"), 32));
  return {
    seal(plain: Buffer) {
      const iv = crypto.randomBytes(12);
      const c = crypto.createCipheriv("aes-256-gcm", key, iv);
      const ct = Buffer.concat([c.update(plain), c.final()]);
      return Buffer.concat([Buffer.from("VB1"), iv, c.getAuthTag(), ct]);
    },
    open(sealed: Buffer) {
      if (!sealed.subarray(0, 3).equals(Buffer.from("VB1"))) throw new Error("VAULT_FILE_FORMAT");
      const d = crypto.createDecipheriv("aes-256-gcm", key, sealed.subarray(3, 15));
      d.setAuthTag(sealed.subarray(15, 31));
      return Buffer.concat([d.update(sealed.subarray(31)), d.final()]);
    },
  };
}

function writeAtomic(file: string, data: string | Buffer, mode = 0o600) {
  const tmp = `${file}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  fs.writeFileSync(tmp, data, { mode });
  fs.renameSync(tmp, file);
}

function openStore(cfg: VaultConfig) {
  const filesDir = path.join(cfg.dataDir, "files");
  fs.mkdirSync(filesDir, { recursive: true, mode: 0o700 });
  const indexFile = path.join(cfg.dataDir, "index.json");
  const auditFile = path.join(cfg.dataDir, "audit.log");
  const box = sealer(cfg.masterKey);
  let index: Index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, "utf8")) : { version: 1, files: {} };
  const save = () => writeAtomic(indexFile, JSON.stringify(index));
  const blob = (id: string) => path.join(filesDir, `${id.replace(/[^a-z0-9]/gi, "")}.bin`);
  return {
    add(productId: string, name: string, data: Buffer) {
      const id = crypto.randomBytes(12).toString("hex");
      const clean = safeEntryName(name);
      const position = Object.values(index.files).filter((f) => f.productId === productId).reduce((m, f) => Math.max(m, f.position + 1), 0);
      const meta: FileMeta = { id, productId, name: clean, ext: extOf(clean), bytes: data.length, sha256: crypto.createHash("sha256").update(data).digest("hex"), probe: probeFile(data), position, createdAt: new Date().toISOString() };
      writeAtomic(blob(id), box.seal(data));
      index = { ...index, files: { ...index.files, [id]: meta } };
      save();
      return meta;
    },
    remove(id: string) {
      const meta = index.files[id];
      if (!meta) return null;
      const { [id]: _gone, ...rest } = index.files;
      index = { ...index, files: rest };
      save();
      fs.rmSync(blob(id), { force: true });
      return meta;
    },
    list(productId?: string | null) {
      return Object.values(index.files)
        .filter((f) => !productId || f.productId === productId)
        .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
    },
    read(id: string) {
      return box.open(fs.readFileSync(blob(id)));
    },
    audit(event: string, detail: Record<string, unknown> = {}) {
      fs.appendFileSync(auditFile, JSON.stringify({ at: new Date().toISOString(), event, ...detail }) + "\n", { mode: 0o600 });
    },
    recentAudit(n = 200) {
      if (!fs.existsSync(auditFile)) return [];
      const lines = fs.readFileSync(auditFile, "utf8").trim().split("\n").filter(Boolean);
      return lines.slice(-n).reverse().map((l) => JSON.parse(l));
    },
  };
}

function loadSigningKey(cfg: VaultConfig): SigningKey {
  if (cfg.signingKeyPem) return keyFromPem(cfg.signingKeyPem);
  const file = path.join(cfg.dataDir, "signing-key.pem");
  if (fs.existsSync(file)) return keyFromPem(fs.readFileSync(file, "utf8"));
  const k = newSigningKey();
  writeAtomic(file, keyToPem(k));
  return k;
}

/* ---------------- The service ---------------- */

type Session = { id: string; adminId: string; email: string; openedAt: number; expiresAt: number };

export function createVault(cfg: VaultConfig) {
  fs.mkdirSync(cfg.dataDir, { recursive: true, mode: 0o700 });
  const store = openStore(cfg);
  const key = loadSigningKey(cfg);
  const verify = makeVerifier(cfg.sharedSecret);
  const sessions = new Map<string, Session>();
  const started = Date.now();

  const app = express();
  app.disable("x-powered-by");
  // Raw bytes for every request: the signature covers them exactly as sent.
  app.use(express.raw({ type: () => true, limit: `${cfg.maxUploadMb + 1}mb` }));

  const fail = (res: any, status: number, error: string) => res.status(status).json({ error });
  const body = (req: any) => (Buffer.isBuffer(req.body) ? (req.body as Buffer) : Buffer.alloc(0));
  const json = <T>(req: any): T => {
    const b = body(req);
    return (b.length ? JSON.parse(b.toString("utf8")) : {}) as T;
  };

  app.get("/health", (_req, res) => res.json({ ok: true, version: VAULT_VERSION, uptimeSeconds: Math.round((Date.now() - started) / 1000) }));

  app.use((req: any, res: any, next: NextFunction) => {
    const ip = req.socket.remoteAddress ?? "";
    if (!ipAllowed(ip, cfg.allowIps)) {
      store.audit("refused", { why: "IP", ip, path: req.path });
      return fail(res, 403, "IP_NOT_ALLOWED");
    }
    const r = verify(req.method, req.originalUrl, req.headers as Record<string, string>, body(req));
    if (!r.ok) {
      store.audit("refused", { why: r.why, ip, path: req.path });
      return fail(res, 401, r.why);
    }
    next();
  });

  const sessionOf = (req: any) => {
    const id = String(req.get("x-vault-session") ?? "");
    const s = sessions.get(id);
    if (!s) return null;
    if (s.expiresAt <= Date.now()) {
      sessions.delete(id);
      store.audit("session.expired", { session: id.slice(0, 8), adminId: s.adminId });
      return null;
    }
    return s;
  };
  const needSession = (req: any, res: any, next: NextFunction) => {
    const s = sessionOf(req);
    if (!s) return fail(res, 423, "VAULT_LOCKED");
    (req as any).vaultSession = s;
    next();
  };

  app.get("/v1/public-key", (_req, res) => res.json({ keys: [key.info] }));

  /* Owner sessions: the backend asks only after checking her password and code. */
  app.post("/v1/sessions", (req, res) => {
    const b = json<{ adminId?: string; email?: string; minutes?: number; ip?: string }>(req);
    if (!b.adminId) return fail(res, 400, "ADMIN_REQUIRED");
    const minutes = Math.max(1, Math.min(cfg.sessionMinutes, Number(b.minutes) || cfg.sessionMinutes));
    const s: Session = { id: crypto.randomBytes(24).toString("base64url"), adminId: String(b.adminId), email: String(b.email ?? ""), openedAt: Date.now(), expiresAt: Date.now() + minutes * 60_000 };
    sessions.set(s.id, s);
    store.audit("session.opened", { session: s.id.slice(0, 8), adminId: s.adminId, email: s.email, ip: b.ip ?? null, minutes });
    res.status(201).json({ id: s.id, expiresAt: new Date(s.expiresAt).toISOString() });
  });
  app.get("/v1/sessions/:id", (req, res) => {
    const s = sessions.get(req.params.id);
    if (!s || s.expiresAt <= Date.now()) return res.json({ open: false });
    res.json({ open: true, expiresAt: new Date(s.expiresAt).toISOString() });
  });
  app.delete("/v1/sessions/:id", (req, res) => {
    const s = sessions.get(req.params.id);
    if (s) {
      sessions.delete(req.params.id);
      store.audit("session.closed", { session: req.params.id.slice(0, 8), adminId: s.adminId });
    }
    res.json({ ok: true });
  });

  /* Master files. */
  app.get("/v1/files", (req, res) => res.json({ files: store.list(typeof req.query.productId === "string" ? req.query.productId : null) }));
  app.post("/v1/files", needSession, (req, res) => {
    const productId = String(req.get("x-product-id") ?? "");
    const name = Buffer.from(String(req.get("x-file-name") ?? ""), "base64url").toString("utf8");
    const data = body(req);
    if (!productId || !data.length) return fail(res, 400, "FILE_REQUIRED");
    if (data.length > cfg.maxUploadMb * 1024 * 1024) return fail(res, 413, "FILE_TOO_BIG");
    const meta = store.add(productId, name || "file", data);
    store.audit("file.added", { adminId: (req as any).vaultSession.adminId, productId, file: meta.id, name: meta.name, bytes: meta.bytes, sha256: meta.sha256 });
    res.status(201).json(meta);
  });
  app.delete("/v1/files/:id", needSession, (req, res) => {
    const meta = store.remove(req.params.id);
    if (!meta) return fail(res, 404, "FILE_NOT_FOUND");
    store.audit("file.removed", { adminId: (req as any).vaultSession.adminId, productId: meta.productId, file: meta.id, name: meta.name });
    res.json({ ok: true });
  });

  /* A buyer's copy (no session: deliveries happen on their own). */
  app.post("/v1/package", (req, res) => {
    const b = json<{ productId: string; serial: string; markId: string; orderShortId: string; title: string; slug?: string | null; issuedAt: string; customTypes?: FileTypeRule[]; licenceId?: string }>(req);
    if (!b.productId || !b.serial || !b.markId) return fail(res, 400, "PACKAGE_INPUT");
    const metas = store.list(b.productId);
    if (!metas.length) return fail(res, 409, "NOT_READY");
    const pkg = makePackage({
      serial: b.serial,
      markId: b.markId,
      orderShortId: b.orderShortId,
      title: b.title,
      slug: b.slug,
      issuedAt: new Date(b.issuedAt),
      customTypes: b.customTypes ?? [],
      files: metas.map((m) => ({ name: m.name, ext: m.ext, probe: m.probe, data: store.read(m.id) })),
    });
    store.audit("package.made", { productId: b.productId, licenceId: b.licenceId ?? null, mark: b.markId, files: metas.length });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("x-file-name", Buffer.from(pkg.filename, "utf8").toString("base64url"));
    res.end(pkg.data);
  });

  /* Licences for the launcher (activation and checks run through the backend). */
  app.post("/v1/sign", (req, res) => {
    const b = json<{ payload?: Record<string, unknown> }>(req);
    const p = b.payload;
    if (!p || p.v !== 1 || typeof p.lic !== "string" || typeof p.dev !== "string" || !/^[0-9a-f]{64}$/.test(p.dev)) return fail(res, 400, "PAYLOAD");
    store.audit("licence.signed", { licenceId: p.lic, activation: p.act ?? null, device: String(p.dev).slice(0, 12) });
    res.json({ token: signToken(p, key), kid: key.info.kid });
  });

  app.get("/v1/audit", needSession, (_req, res) => res.json({ events: store.recentAudit(200) }));

  // Sessions run out even when nobody asks.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [id, s] of sessions) if (s.expiresAt <= now) {
      sessions.delete(id);
      store.audit("session.expired", { session: id.slice(0, 8), adminId: s.adminId });
    }
  }, 30_000);
  sweep.unref();

  store.audit("vault.started", { version: VAULT_VERSION, kid: key.info.kid, files: store.list().length });
  return { app, key, close: () => clearInterval(sweep) };
}
