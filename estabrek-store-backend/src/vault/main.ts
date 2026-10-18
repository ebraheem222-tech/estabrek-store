/**
 * Starts the vault (see vault.ts). Deploy it as its own service from this same
 * repository, with start command `npm run start:vault`, a persistent volume at
 * VAULT_DATA_DIR, and no public domain. Set the backend's VAULT_URL to its
 * private address (Railway private network, or its Tailscale name later).
 */
import { configFromEnv, createVault, VAULT_VERSION } from "./vault.js";

const cfg = configFromEnv();
const { app, key } = createVault(cfg);
const port = Number(process.env.VAULT_PORT || process.env.PORT || 4400);
// "::" listens on IPv6 too (Railway's private network is IPv6).
app.listen(port, process.env.VAULT_HOST || "::", () => {
  console.log(`[vault] ${VAULT_VERSION} on port ${port} · signing key ${key.info.kid} · ${cfg.allowIps.length ? `only from ${cfg.allowIps.join(", ")}` : "any address (signed requests only)"}`);
});
