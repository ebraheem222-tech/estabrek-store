import { describe, test, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
// @ts-expect-error a plain .mjs script (no types)
import { alreadyThere, createOnly, failedMigrations, fixOf, fixPath, hostOf, migrationUrl, nextStep } from "../../scripts/migrate-deploy.mjs";

// Which address the pre-deploy migrations use (scripts/migrate-deploy.mjs).

const pooled = "postgresql://shop:secret@ep-cool-darkness-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true";

describe("Migrations over a direct connection", () => {
  test("DIRECT_URL wins", () => {
    expect(migrationUrl({ DATABASE_URL: pooled, DIRECT_URL: "postgresql://x@direct.example/db" })).toEqual({ url: "postgresql://x@direct.example/db", source: "DIRECT_URL" });
  });

  test("Neon's pooled address becomes its direct endpoint (same database, PgBouncer settings dropped)", () => {
    const r = migrationUrl({ DATABASE_URL: pooled });
    expect(r.source).toBe("DATABASE_URL (Neon direct endpoint)");
    const u = new URL(r.url);
    expect(u.hostname).toBe("ep-cool-darkness-123456.us-east-2.aws.neon.tech");
    expect(u.username).toBe("shop");
    expect(u.password).toBe("secret");
    expect(u.pathname).toBe("/neondb");
    expect(u.searchParams.get("sslmode")).toBe("require");
    expect(u.searchParams.has("pgbouncer")).toBe(false);
  });

  test("anything else is used as it is; the logs never show the password", () => {
    const direct = "postgresql://shop:secret@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require";
    expect(migrationUrl({ DATABASE_URL: direct })).toEqual({ url: direct, source: "DATABASE_URL" });
    const railway = "postgresql://u:p@postgres.railway.internal:5432/railway";
    expect(migrationUrl({ DATABASE_URL: railway }).url).toBe(railway);
    expect(migrationUrl({})).toEqual({ url: null, source: "missing" });
    expect(hostOf(pooled)).toBe("ep-cool-darkness-123456-pooler.us-east-2.aws.neon.tech/neondb");
    expect(hostOf(pooled)).not.toContain("secret");
  });
});

// What Railway's deploy log showed on 2026-11-12, after three deploys migrated at once through the pooler.
const P3009 = `69 migrations found in prisma/migrations
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve
The \`20261111200000_home_section_stats\` migration started at 2026-11-12 02:25:16.595711 UTC failed`;
const P3018 = `Error: P3018
A migration failed to apply. New migrations cannot be applied before the error is recovered from.
Migration name: 20261111200000_home_section_stats

Database error code: 42P07

Database error:
ERROR: relation "HomeSectionDay" already exists`;
const NAME = "20261111200000_home_section_stats";
const TABLE = 'CREATE TABLE "HomeSectionDay" (\n  "day" DATE NOT NULL,\n  CONSTRAINT "HomeSectionDay_pkey" PRIMARY KEY ("day")\n);';

describe("A failed migration left on record", () => {
  const fresh = () => ({ lockTries: 0, cleared: [] as string[], applied: [] as string[] });

  test("its name is read from Prisma's message", () => {
    expect(failedMigrations(P3009)).toEqual([NAME]);
    expect(failedMigrations("Error: P1002 timed out")).toEqual([]);
    expect(alreadyThere(P3018)).toBe(NAME);
    expect(alreadyThere(P3018.replace("42P07", "23505"))).toBeNull();
  });

  test("only a migration that creates tables and indexes counts as already there", () => {
    expect(createOnly(`-- a comment\n${TABLE}\nCREATE UNIQUE INDEX "x" ON "HomeSectionDay"("day");`)).toBe(true);
    expect(createOnly(`${TABLE}\nALTER TABLE "Order" DROP COLUMN "note";`)).toBe(false);
    expect(createOnly('UPDATE "Product" SET "price" = 0;')).toBe(false);
    expect(createOnly("-- nothing")).toBe(false);
  });

  test("the failed record is cleared once, then the deploy is tried again", () => {
    expect(nextStep(P3009, fresh(), () => TABLE)).toEqual({ do: "rolled-back", names: [NAME] });
    // Still failed after clearing it: stop, don't loop.
    expect(nextStep(P3009, { ...fresh(), cleared: [NAME] }, () => TABLE)).toEqual({ do: "stop" });
  });

  test("applied again and stopped on «already exists»: marked applied, only for one this run cleared and that only creates", () => {
    expect(nextStep(P3018, { ...fresh(), cleared: [NAME] }, () => TABLE)).toEqual({ do: "applied", names: [NAME] });
    expect(nextStep(P3018, fresh(), () => TABLE)).toEqual({ do: "stop" });
    expect(nextStep(P3018, { ...fresh(), cleared: [NAME] }, () => 'ALTER TABLE "Order" ADD COLUMN "x" TEXT;')).toEqual({ do: "stop" });
    expect(nextStep(P3018, { ...fresh(), cleared: [NAME], applied: [NAME] }, () => TABLE)).toEqual({ do: "stop" });
    expect(nextStep(P3018, { ...fresh(), cleared: [NAME] }, () => null)).toEqual({ do: "stop" });
  });

  test("a busy lock waits three times, then stops; any other error stops at once", () => {
    expect(nextStep("Error: P1002 advisory lock", fresh(), () => null)).toEqual({ do: "wait" });
    expect(nextStep("Error: P1002", { ...fresh(), lockTries: 3 }, () => null)).toEqual({ do: "stop" });
    expect(nextStep("Error: P1001 can't reach database", fresh(), () => null)).toEqual({ do: "stop" });
  });
});

// What `migrate deploy` printed on a new client's empty database (2026-11-18, and on every deploy there since 2026-11-14).
const PAYMENTS = "20260205140000_add_payments";
const P3018_COLUMN = `Applying migration \`${PAYMENTS}\`
Error: P3018

A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: ${PAYMENTS}

Database error code: 42701

Database error:
ERROR: column "checkoutMode" of relation "SiteSettings" already exists`;
const P3009_PAYMENTS = P3009.replaceAll(NAME, PAYMENTS);
const ADD_COLUMN = 'ALTER TABLE "SiteSettings" ADD COLUMN "checkoutMode" TEXT;';

describe("An old migration that can't run on an empty database", () => {
  const fresh = () => ({ lockTries: 0, cleared: [] as string[], applied: [] as string[] });
  const hasFix = (name: string) => (name === PAYMENTS ? "-- safe copy" : null);

  test("a column already there counts as «already exists»", () => {
    expect(alreadyThere(P3018_COLUMN)).toBe(PAYMENTS);
  });

  test("an empty database: its safe copy runs on the first failure, once", () => {
    expect(nextStep(P3018_COLUMN, fresh(), () => ADD_COLUMN, hasFix)).toEqual({ do: "fix", names: [PAYMENTS] });
    expect(nextStep(P3018_COLUMN, { ...fresh(), applied: [PAYMENTS] }, () => ADD_COLUMN, hasFix)).toEqual({ do: "stop" });
  });

  test("a database with its failed records piled up: cleared first, then the safe copy", () => {
    const state = fresh();
    expect(nextStep(P3009_PAYMENTS, state, () => ADD_COLUMN, hasFix)).toEqual({ do: "rolled-back", names: [PAYMENTS] });
    expect(nextStep(P3018_COLUMN, { ...state, cleared: [PAYMENTS] }, () => ADD_COLUMN, hasFix)).toEqual({ do: "fix", names: [PAYMENTS] });
  });

  test("without a safe copy, a migration that adds columns still stops (as before)", () => {
    expect(nextStep(P3018_COLUMN, fresh(), () => ADD_COLUMN)).toEqual({ do: "stop" });
    expect(nextStep(P3018_COLUMN, { ...fresh(), cleared: [PAYMENTS] }, () => ADD_COLUMN, () => null)).toEqual({ do: "stop" });
    // Any other error on a migration with a safe copy stops too.
    expect(nextStep(P3018_COLUMN.replace("42701", "23502"), fresh(), () => ADD_COLUMN, hasFix)).toEqual({ do: "stop" });
  });

  test("the safe copies are read from scripts/migration-fixes, by a plain migration name only", () => {
    expect(fixPath(PAYMENTS)).toBe(`scripts/migration-fixes/${PAYMENTS}.sql`);
    expect(fixOf(PAYMENTS)).toContain('ADD COLUMN IF NOT EXISTS "checkoutMode"');
    expect(fixOf(NAME)).toBeNull();
    expect(fixOf("../../prisma/schema")).toBeNull();
  });
});

describe("Every safe copy in scripts/migration-fixes", () => {
  const backend = path.resolve(__dirname, "../..");
  const fixes = readdirSync(path.join(backend, "scripts", "migration-fixes")).filter((f) => f.endsWith(".sql"));
  /** The SQL's statements without comments, BEGIN/COMMIT and «IF NOT EXISTS», in one spacing. */
  const plain = (sql: string) =>
    sql.replace(/--[^\n]*/g, "").split(";").map((x) => x.replace(/\bIF NOT EXISTS\b/gi, "").replace(/\s+/g, " ").replace(/\s*([(),])\s*/g, "$1").trim())
      .filter((x) => x && !/^(BEGIN|COMMIT)$/i.test(x));

  test("there is at least the one for add_payments", () => {
    expect(fixes).toContain(`${PAYMENTS}.sql`);
  });

  test.each(fixes)("%s names a real migration and makes exactly what it makes, each only if it isn't there", (file) => {
    const name = file.replace(/\.sql$/, "");
    const migration = readFileSync(path.join(backend, "prisma", "migrations", name, "migration.sql"), "utf8");
    const fix = readFileSync(path.join(backend, "scripts", "migration-fixes", file), "utf8");
    expect(plain(fix)).toEqual(plain(migration));
    const body = fix.replace(/--[^\n]*/g, "");
    // Every table, index and column it makes is guarded…
    expect(body.match(/\bCREATE\s+(UNIQUE\s+)?(TABLE|INDEX)\s+(?!IF NOT EXISTS\b)/gi) ?? []).toEqual([]);
    expect(body.match(/\bADD\s+COLUMN\s+(?!IF NOT EXISTS\b)/gi) ?? []).toEqual([]);
    // …and it does nothing else: no data changes, no drops, no renames.
    for (const s of plain(fix)) expect(s).toMatch(/^(CREATE (UNIQUE )?(TABLE|INDEX) |ALTER TABLE "[^"]+" ADD COLUMN )/i);
    // All of it in one transaction.
    expect(body.trim()).toMatch(/^BEGIN;[\s\S]*COMMIT;$/);
  });
});

