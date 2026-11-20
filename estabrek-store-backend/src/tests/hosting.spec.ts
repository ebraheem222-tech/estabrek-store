import { describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { databaseOf, hostingView } from "../lib/hostingView.js";

// Admin → الاستضافة: where the store runs, as its server knows it (lib/hostingView.ts). Names and
// places only: the database's address, its password and any token never come out.
describe("where the store runs", () => {
  test("the database's maker and place from its host name", () => {
    expect(databaseOf("postgresql://u:secret@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require")).toEqual({ provider: "neon", region: "us-east-2", pooled: true });
    expect(databaseOf("postgresql://u:secret@ep-cool-name-123456.eastus2.azure.neon.tech/neondb")).toEqual({ provider: "neon", region: "eastus2", pooled: false });
    expect(databaseOf("postgresql://u:p@postgres.railway.internal:5432/railway").provider).toBe("railway");
    expect(databaseOf("postgresql://u:p@monorail.proxy.rlwy.net:41234/railway").provider).toBe("railway");
    expect(databaseOf("postgresql://test@127.0.0.1:55433/estabrek_test").provider).toBe("local");
    expect(databaseOf("postgresql://u:p@db.example.com/x").provider).toBe("other");
    expect(databaseOf(undefined).provider).toBe("none");
    expect(databaseOf("not an address").provider).toBe("none");
  });

  test("on Railway: its project, environment, service, address and version; no secret in the answer", () => {
    const vars = {
      RAILWAY_ENVIRONMENT_NAME: "production",
      RAILWAY_PROJECT_NAME: "samoray",
      RAILWAY_SERVICE_NAME: "api",
      RAILWAY_PUBLIC_DOMAIN: "api-samoray.up.railway.app",
      RAILWAY_GIT_COMMIT_SHA: "DD76E89aaaabbbbccccddddeeeeffff00001111",
      DATABASE_URL: "postgresql://owner:Sup3rSecret@ep-x-1-pooler.eu-central-1.aws.neon.tech/neondb",
      STOREFRONT_URL: "https://samoray.vercel.app/",
      JWT_SECRET: "a-very-secret-signing-key-0123456789",
    };
    const view = hostingView(vars, { ok: true, ms: 4 }, new Date("2026-11-20T16:20:53.904Z"));
    expect(view).toEqual({
      server: { host: "railway", project: "samoray", environment: "production", service: "api", address: "https://api-samoray.up.railway.app", commit: "dd76e89", startedAt: "2026-11-20T16:20:53.904Z" },
      database: { provider: "neon", region: "eu-central-1", pooled: true, ok: true, ms: 4 },
      shop: { address: "https://samoray.vercel.app" },
    });
    const said = JSON.stringify(view);
    for (const secret of ["Sup3rSecret", "owner", "ep-x-1", "a-very-secret"]) expect(said).not.toContain(secret);
  });

  test("elsewhere: nothing made up", () => {
    expect(hostingView({}, { ok: false, ms: null }, new Date(0))).toMatchObject({
      server: { host: "other", project: null, address: null, commit: null },
      database: { provider: "none", ok: false, ms: null },
      shop: { address: null },
    });
    // A domain or a commit that isn't one is left out.
    expect(hostingView({ RAILWAY_PROJECT_ID: "p", RAILWAY_PUBLIC_DOMAIN: "evil.com/<x>", RAILWAY_GIT_COMMIT_SHA: "not-a-sha", STOREFRONT_URL: "javascript:alert(1)" }, { ok: true, ms: 1 }, new Date(0))).toMatchObject({
      server: { host: "railway", address: null, commit: null },
      shop: { address: null },
    });
  });

  test("the admin's page asks the server, which asks its database", async () => {
    const res = await request(app).get("/v1/admin/system/hosting").expect(200);
    expect(res.body.database).toMatchObject({ provider: "local", ok: true });
    expect(typeof res.body.database.ms).toBe("number");
    expect(res.body.server.startedAt).toMatch(/^\d{4}-/);
    expect(JSON.stringify(res.body)).not.toContain("55433");
  });
});
