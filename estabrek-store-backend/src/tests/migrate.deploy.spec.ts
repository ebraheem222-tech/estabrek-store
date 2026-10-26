import { describe, test, expect } from "vitest";
// @ts-expect-error a plain .mjs script (no types)
import { hostOf, migrationUrl } from "../../scripts/migrate-deploy.mjs";

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
