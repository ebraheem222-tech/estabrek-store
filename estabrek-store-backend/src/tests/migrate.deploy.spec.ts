import { describe, test, expect } from "vitest";
// @ts-expect-error a plain .mjs script (no types)
import { alreadyThere, createOnly, failedMigrations, hostOf, migrationUrl, nextStep } from "../../scripts/migrate-deploy.mjs";

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

