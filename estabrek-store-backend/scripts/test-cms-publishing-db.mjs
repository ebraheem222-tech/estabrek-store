/** CI-only disposable fixture: validate the additive migration against the pre-feature schema. */
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const url = new URL(process.env.DATABASE_URL || "http://invalid");
if (process.env.TEST_DATABASE_ISOLATED !== "true" || !["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/estabrek_cms_publish_test") {
  throw new Error("Only the explicit localhost estabrek_cms_publish_test fixture is allowed.");
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = await readFile(path.join(root, "prisma/schema.prisma"), "utf8");
const field = /^\s*publicationDelivery Json\?\s*$/gm;
const controlsField = /^\s*visualControls Json\?\s*$/gm;
if ([...schema.matchAll(field)].length !== 1) throw new Error("Expected exactly one publicationDelivery field in the current schema.");
const dir = await mkdtemp(path.join(tmpdir(), "estabrek-cms-fixture-"));
const baseline = path.join(dir, "schema.prisma");
await writeFile(baseline, schema.replace(field, "").replace(controlsField, ""));
const cli = path.join(root, "node_modules/prisma/build/index.js");
for (const args of [
  ["db", "push", "--schema", baseline, "--skip-generate"],
  ["db", "execute", "--schema", baseline, "--file", path.join(root, "prisma/migrations/20261107110000_page_publication_delivery/migration.sql")],
  ["db", "execute", "--schema", baseline, "--file", path.join(root, "prisma/migrations/20261107160000_visual_controls/migration.sql")],
]) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, env: process.env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
