/**
 * A client's copy, made at a press (admin → النظام → نسخ الزباين; platform plan, stage 6.1): the
 * same code as this store, given its own database (Neon), server (Railway), shop (Vercel) and
 * admin (Cloudflare Pages), in the owner's own accounts, through the ready connections of
 * lib/fnKindsInfra.ts. Here: the names a copy is asked for, the addresses they give, every
 * variable each part gets and where its value comes from, and the plan the owner reads before
 * anything is made. No network and no database.
 *
 * A copy runs the same repository and branch as this store, so every merge reaches it by
 * itself; its empty database is migrated by its first deploy (scripts/migrate-deploy.mjs).
 */
import { randomBytes } from "node:crypto";

export const PRESS_KINDS = ["neon", "railway", "vercel", "cloudflare"] as const;
export type PressKind = (typeof PRESS_KINDS)[number];
export const PRESS_LIMITS = { label: 60, name: { min: 3, max: 30 } } as const;

/**
 * A server's or a site's name: small letters, digits and single dashes, 3 to 30 of them, a
 * letter first and no dash last. It is what the addresses are made of, so the same rule holds
 * at Railway, Vercel and Cloudflare (whose admin project adds "-admin" to it).
 */
export const NAME_RULE = /^[a-z](?:[a-z0-9]|-(?!-))*[a-z0-9]$/;
/** A name as it is typed, made one: small letters, spaces and _ as dashes, nothing else. */
export function tidyName(typed: string): string {
  return typed
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PRESS_LIMITS.name.max);
}
/** What is wrong with a name, said as a problem; null when nothing is. */
export function nameProblem(name: string): string | null {
  if (name.length < PRESS_LIMITS.name.min) return `A name is at least ${PRESS_LIMITS.name.min} letters`;
  if (name.length > PRESS_LIMITS.name.max) return `A name is at most ${PRESS_LIMITS.name.max} letters`;
  if (!/^[a-z]/.test(name)) return "A name starts with a letter";
  if (!NAME_RULE.test(name)) return "A name is small letters, digits and single dashes, with no dash at the end";
  return null;
}
/** A GitHub repository as "owner/name". */
export const REPO_RULE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/;
export const BRANCH_RULE = /^[A-Za-z0-9._/-]{1,100}$/;
/** Neon's regions a copy may be made in (the database close to the server). */
export const NEON_REGIONS = ["aws-eu-central-1", "aws-us-east-1", "aws-us-east-2", "aws-us-west-2", "aws-eu-west-2", "aws-ap-southeast-1", "aws-ap-southeast-2", "azure-gwc"] as const;

/** Each part's folder in the repository, as this store's own deploys build it. */
export const COPY_FOLDERS = { api: "estabrek-store-backend", shop: "estabrek-storefront", admin: "estabrek-admin" } as const;
/** Run before each of the server's deploys: the database brought up to date (an empty one included). */
export const PRE_DEPLOY = "node scripts/migrate-deploy.mjs";

/**
 * A whole site's key (the admin's studio/templates/sites, e.g. site-restaurant): the site a copy's first setup
 * opens on, picked for the client while the copy is made. Only its shape is checked here: a key the copy's admin
 * doesn't know opens the setup as an online store, as it would have without one.
 */
export const START_SITE_RULE = /^site-[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** The server variable that carries it to the copy (read by its setup's status, modules/admin/setup.controller.ts). */
export const START_SITE_VAR = "SETUP_SITE";
/** The site a server's own first setup opens on, from its START_SITE_VAR as it is set (null: none, or not a site's key). */
export function startSiteOf(raw: string | null | undefined): string | null {
  const key = raw?.trim() ?? "";
  return key.length <= 60 && START_SITE_RULE.test(key) ? key : null;
}

/** `startSite`: the whole site the copy's first setup opens on (null: it asks, an online store picked). */
export type CopyInput = { label: string; server: string; site: string; repo: string; branch: string; region: string; startSite: string | null };
export type CopyUrls = { api: string; shop: string; admin: string };

/**
 * The addresses a copy's names give. Vercel and Cloudflare give a nearby one when the name is
 * taken by someone else's project: the copy is then linked with what they gave.
 */
export function copyUrls(server: string, site: string): CopyUrls {
  return { api: `https://${server}.up.railway.app`, shop: `https://${site}.vercel.app`, admin: `https://${adminName(site)}.pages.dev` };
}
/** The admin's project at Cloudflare Pages. */
export const adminName = (site: string) => `${site}-admin`;

/**
 * Where a variable's value comes from: written here (`fixed`), an address of the copy (`url`),
 * made new for this copy and never shown (`made`), made new and given to two parts (`shared`),
 * or handed over by Neon when the database is made (`neon`; it holds the database's password).
 */
export type VarFrom = "fixed" | "url" | "made" | "shared" | "neon";
export type CopyVar = { name: string; from: VarFrom; /** Shown only for fixed and url values: the rest are secrets. */ value?: string };
export type CopyVars = { api: CopyVar[]; shop: CopyVar[]; admin: CopyVar[] };

/**
 * Every variable each part of a copy gets, linking the three to each other and to their database.
 * `startSite`: the whole site its first setup opens on, given to the server when one was picked.
 */
export function copyVariables(urls: CopyUrls, startSite: string | null = null): CopyVars {
  const v1 = `${urls.api}/v1`;
  const opens: CopyVar[] = startSite ? [{ name: START_SITE_VAR, from: "fixed", value: startSite }] : [];
  return {
    api: [
      { name: "NODE_ENV", from: "fixed", value: "production" },
      { name: "DATABASE_URL", from: "neon" },
      { name: "JWT_SECRET", from: "made" },
      { name: "WEBHOOK_TOKEN", from: "made" },
      // Its own keys for what it keeps sealed (functions' secrets, codes) and for its backups: not made from JWT_SECRET.
      { name: "CODES_ENCRYPTION_KEY", from: "made" },
      { name: "BACKUP_ENCRYPTION_KEY", from: "made" },
      { name: "CORS_ORIGINS", from: "url", value: `${urls.shop},${urls.admin}` },
      { name: "STOREFRONT_URL", from: "url", value: urls.shop },
      { name: "STOREFRONT_REVALIDATE_URL", from: "url", value: `${urls.shop}/api/revalidate` },
      { name: "STOREFRONT_REVALIDATE_SECRET", from: "shared" },
      { name: "ADMIN_APP_URL", from: "url", value: urls.admin },
      ...opens,
    ],
    shop: [
      { name: "API_BASE_URL", from: "url", value: v1 },
      { name: "NEXT_PUBLIC_API_BASE_URL", from: "url", value: v1 },
      { name: "NEXT_PUBLIC_SITE_URL", from: "url", value: urls.shop },
      { name: "ADMIN_ORIGIN", from: "url", value: urls.admin },
      { name: "REVALIDATE_SECRET", from: "shared" },
    ],
    admin: [
      { name: "VITE_API_BASE_URL", from: "url", value: v1 },
      { name: "VITE_STOREFRONT_BASE_URL", from: "url", value: urls.shop },
    ],
  };
}

/** A new secret for a copy: 32 random bytes, as letters an address or a header carries as they are. */
export const madeSecret = () => randomBytes(32).toString("base64url");

/** One part of the plan: what is made where, said in facts the page names in its own words. */
export type PlanStep = { id: PressKind | "owner"; facts: Array<[string, string]>; variables?: CopyVar[] };

/** What making the copy will do, in the order it is done (lib/pressMake.ts), before anything is done. */
export function copyPlan(input: CopyInput): { urls: CopyUrls; steps: PlanStep[] } {
  const urls = copyUrls(input.server, input.site);
  const vars = copyVariables(urls, input.startSite);
  const from = `${input.repo} (${input.branch})`;
  // The site its setup opens on, when one was picked (the page says it by its name).
  const opens: Array<[string, string]> = input.startSite ? [["opens", input.startSite]] : [];
  return {
    urls,
    steps: [
      { id: "neon", facts: [["project", input.label], ["region", input.region], ["postgres", "17"]] },
      { id: "railway", facts: [["project", input.label], ["service", "api"], ["from", from], ["folder", COPY_FOLDERS.api], ["before", PRE_DEPLOY], ["address", urls.api]], variables: vars.api },
      // The new store's owner account, made on its server once it answers, with the email and password typed when it is made.
      { id: "owner", facts: [["account", urls.api], ["signin", `${urls.admin}/`], ...opens] },
      { id: "vercel", facts: [["project", input.site], ["from", from], ["folder", COPY_FOLDERS.shop], ["framework", "Next.js"], ["address", urls.shop]], variables: vars.shop },
      { id: "cloudflare", facts: [["project", adminName(input.site)], ["from", from], ["folder", COPY_FOLDERS.admin], ["build", "npm run build"], ["output", "dist"], ["address", urls.admin]], variables: vars.admin },
    ],
  };
}
