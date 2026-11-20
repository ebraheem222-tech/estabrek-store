import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { COPY_FOLDERS, NAME_RULE, PRE_DEPLOY, adminName, copyPlan, copyUrls, copyVariables, madeSecret, nameProblem, tidyName } from "../lib/press.js";
import { PRESS_QUERIES } from "../lib/pressCheck.js";

// A client's copy at the press, by itself: the names it is asked for, the addresses they give,
// every variable each part gets (and that each is one its code reads), and the plan.

const ROOT = join(__dirname, "..", "..", "..");
/** Every source file under a folder, as one text. */
function sources(dir: string): string {
  let out = "";
  for (const name of readdirSync(dir)) {
    const at = join(dir, name);
    if (statSync(at).isDirectory()) {
      if (!["node_modules", "tests", "dist", ".next"].includes(name)) out += sources(at);
    } else if (/\.(ts|tsx|mjs|js)$/.test(name) && !/\.test\.|\.spec\./.test(name)) out += readFileSync(at, "utf8");
  }
  return out;
}

describe("A copy's names", () => {
  test("tidied as they are typed; refused with a reason when they can't be an address", () => {
    expect([tidyName("  My Shop "), tidyName("Rose_Store!!"), tidyName("a--b"), tidyName("-shop-")]).toEqual(["my-shop", "rose-store", "a-b", "shop"]);
    expect([nameProblem("ab"), nameProblem("x".repeat(31)), nameProblem("1shop"), nameProblem("shop-"), nameProblem("rose-store")]).toEqual([
      "A name is at least 3 letters",
      "A name is at most 30 letters",
      "A name starts with a letter",
      "A name is small letters, digits and single dashes, with no dash at the end",
      null,
    ]);
    expect(NAME_RULE.test("rose--store")).toBe(false);
  });

  test("the addresses they give: the server at Railway, the shop at Vercel, the admin at Cloudflare Pages", () => {
    expect(copyUrls("rose-api", "rose")).toEqual({ api: "https://rose-api.up.railway.app", shop: "https://rose.vercel.app", admin: "https://rose-admin.pages.dev" });
    expect(adminName("rose")).toBe("rose-admin");
  });
});

describe("A copy's variables", () => {
  const vars = copyVariables(copyUrls("rose-api", "rose"));

  test("link the three parts to each other and to their database; a secret's value is never in the plan", () => {
    const of = (list: typeof vars.api) => Object.fromEntries(list.map((v) => [v.name, v.value ?? `<${v.from}>`]));
    expect(of(vars.api)).toEqual({
      NODE_ENV: "production",
      DATABASE_URL: "<neon>",
      JWT_SECRET: "<made>",
      WEBHOOK_TOKEN: "<made>",
      CODES_ENCRYPTION_KEY: "<made>",
      BACKUP_ENCRYPTION_KEY: "<made>",
      CORS_ORIGINS: "https://rose.vercel.app,https://rose-admin.pages.dev",
      STOREFRONT_URL: "https://rose.vercel.app",
      STOREFRONT_REVALIDATE_URL: "https://rose.vercel.app/api/revalidate",
      STOREFRONT_REVALIDATE_SECRET: "<shared>",
      ADMIN_APP_URL: "https://rose-admin.pages.dev",
    });
    expect(of(vars.shop)).toEqual({ API_BASE_URL: "https://rose-api.up.railway.app/v1", NEXT_PUBLIC_API_BASE_URL: "https://rose-api.up.railway.app/v1", NEXT_PUBLIC_SITE_URL: "https://rose.vercel.app", ADMIN_ORIGIN: "https://rose-admin.pages.dev", REVALIDATE_SECRET: "<shared>" });
    expect(of(vars.admin)).toEqual({ VITE_API_BASE_URL: "https://rose-api.up.railway.app/v1", VITE_STOREFRONT_BASE_URL: "https://rose.vercel.app" });
    for (const v of [...vars.api, ...vars.shop, ...vars.admin]) expect(v.value === undefined).toBe(["made", "shared", "neon"].includes(v.from));
  });

  test("each is one its part's code reads (a renamed variable would leave a copy unlinked)", () => {
    const api = readFileSync(join(ROOT, COPY_FOLDERS.api, "src/config/env.ts"), "utf8");
    for (const v of vars.api) expect(api, v.name).toMatch(new RegExp(`\\b${v.name}:`));
    const shop = sources(join(ROOT, COPY_FOLDERS.shop, "src"));
    for (const v of vars.shop) expect(shop, v.name).toContain(`process.env.${v.name}`);
    const admin = sources(join(ROOT, COPY_FOLDERS.admin, "src"));
    for (const v of vars.admin) expect(admin, v.name).toContain(`import.meta.env.${v.name}`);
    // The server's step before each deploy is a script that is there.
    expect(statSync(join(ROOT, COPY_FOLDERS.api, PRE_DEPLOY.replace(/^node /, ""))).isFile()).toBe(true);
  });

  test("a secret made for a copy is long, and new each time", () => {
    const a = madeSecret();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(madeSecret()).not.toBe(a);
  });
});

describe("The plan", () => {
  test("in order: the database, the server, its owner's account, the shop, the admin", () => {
    const plan = copyPlan({ label: "Rose", server: "rose-api", site: "rose", repo: "acme/store", branch: "main", region: "aws-eu-central-1" });
    expect(plan.steps.map((s) => s.id)).toEqual(["neon", "railway", "owner", "vercel", "cloudflare"]);
    expect(plan.steps[2].facts).toEqual([["account", "https://rose-api.up.railway.app"], ["signin", "https://rose-admin.pages.dev/"]]);
    expect(plan.steps[1].facts).toEqual([["project", "Rose"], ["service", "api"], ["from", "acme/store (main)"], ["folder", "estabrek-store-backend"], ["before", "node scripts/migrate-deploy.mjs"], ["address", "https://rose-api.up.railway.app"]]);
    expect(plan.steps[4].facts).toContainEqual(["project", "rose-admin"]);
    expect(plan.steps.map((s) => s.variables?.length)).toEqual([undefined, 11, undefined, 5, 2]);
  });

  test("its questions only read: queries of its own, with the names as values", () => {
    for (const q of Object.values(PRESS_QUERIES)) {
      expect(q.startsWith("query")).toBe(true);
      expect(q).not.toMatch(/\{\{|\}\}|mutation/);
    }
  });
});
