/**
 * «إستبرق لينك» (wave G5 of docs/sites-300-plan.ar.md): a small piece the owner puts on their game server (a FiveM
 * resource; a Paper plugin next) that talks to their site. The site never reaches into the game server: no port opens
 * and no RCON password leaves it. What it does:
 *   - says hello every minute (how many play; the site answers whether its whitelist is on);
 *   - asks the site whether a player connecting may come in, while the whitelist is on: one accepted (a row in the
 *     site's whitelist table) by their Discord, their Steam, or the shop account their game account is linked to;
 *   - links a player's game account to their shop account by a code they type in the game (/link 482913), taken
 *     from «حسابي» on the shop (10 minutes, one at a time).
 *
 * Each download is stamped with the site's key, its name and the API's address (assets/link); a new download makes a
 * new key and the old one stops working. The key is kept hashed. Nothing in it names the platform (a store is its own).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { settingsOfFeature } from "./siteSettings.js";
import { plainZip } from "./plainZip.js";

export const LINK_GAMES = ["fivem", "minecraft"] as const;
export type LinkGame = (typeof LINK_GAMES)[number];
export const LINK_LIMITS = { codeMinutes: 10, name: 40, id: 80 } as const;
/** estabrek-store-backend/assets/link (the same from src/ and dist/). */
export const LINK_ASSETS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../assets/link");

type Lang = "ar" | "en" | "he";
type Words = Record<Lang, string>;
const langOf = (v: unknown): Lang => (v === "en" || v === "he" ? v : "ar");
const hash = (key: string) => crypto.createHash("sha256").update(key).digest("hex");

/* ---------------- The site's key ---------------- */

/** A new key for a site's game server (the old one stops working); kept hashed, said once. */
export async function issueLinkKey(featureId: string): Promise<string> {
  const key = `lk_${crypto.randomBytes(24).toString("base64url")}`;
  await prisma.siteLink.upsert({
    where: { featureId },
    create: { featureId, keyHash: hash(key), keyHint: key.slice(-4) },
    update: { keyHash: hash(key), keyHint: key.slice(-4), createdAt: new Date(), lastSeenAt: null, lastGame: null, lastVersion: null, lastPlayers: null },
  });
  return key;
}
/** The site a game server's key belongs to (switched on), or null. */
export async function siteOfKey(key: unknown): Promise<string | null> {
  if (typeof key !== "string" || !/^lk_[A-Za-z0-9_-]{20,80}$/.test(key)) return null;
  const link = await prisma.siteLink.findUnique({ where: { keyHash: hash(key) }, select: { featureId: true } });
  if (!link) return null;
  const on = await prisma.feature.findFirst({ where: { id: link.featureId, enabled: true }, select: { id: true } });
  return on ? link.featureId : null;
}

/* ---------------- Hello ---------------- */

/** A game server's hello: kept for the panel; the site says whether its whitelist is on. */
export async function linkHello(featureId: string, said: { game?: unknown; version?: unknown; players?: unknown }) {
  const game = LINK_GAMES.find((g) => g === said.game) ?? null;
  const players = typeof said.players === "number" && Number.isInteger(said.players) && said.players >= 0 && said.players < 100_000 ? said.players : null;
  const version = typeof said.version === "string" ? said.version.slice(0, 20) : null;
  await prisma.siteLink.update({ where: { featureId }, data: { lastSeenAt: new Date(), lastGame: game, lastVersion: version, lastPlayers: players } });
  const s = await settingsOfFeature(featureId);
  return { whitelist: s?.values.whitelistOn === true };
}

/* ---------------- The whitelist ---------------- */

/** A text field's words in any language, or a plain value, is one of these (trimmed, in any case). */
function heldIn(field: string, values: string[]): Prisma.Sql {
  const wanted = [...new Set(values.map((v) => v.trim().toLowerCase()).filter(Boolean))];
  if (!wanted.length) return Prisma.sql`FALSE`;
  return Prisma.sql`(lower(btrim(coalesce(i."data"->>${field}, ''))) IN (${Prisma.join(wanted)}) OR (jsonb_typeof(i."data"->${field}) = 'object' AND EXISTS (SELECT 1 FROM jsonb_each_text(i."data"->${field}) AS w(k, v) WHERE lower(btrim(w.v)) IN (${Prisma.join(wanted)}))))`;
}
/** FiveM's Steam identifier is the SteamID64 in hex. */
export function steamFromHex(hex: unknown): string | null {
  if (typeof hex !== "string" || !/^[0-9a-f]{1,16}$/i.test(hex)) return null;
  const id = BigInt(`0x${hex}`).toString();
  return /^\d{17}$/.test(id) ? id : null;
}
const clean = (v: unknown, max: number = LINK_LIMITS.id) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

const NOT_LISTED: Words = {
  ar: "إنت مش عالوايتلست لسّا. قدّم من صفحة «التقديم» بموقعنا، وبعد ما تنقبل بتقدر تفوت.",
  en: "You're not on the whitelist yet. Apply on our site's «Apply» page; once accepted, you can join.",
  he: "אתם עוד לא ברשימה הלבנה. הגישו בקשה בעמוד «הגשה» באתר שלנו; אחרי שתתקבלו תוכלו להיכנס.",
};

/**
 * Whether a player connecting may come in: the whitelist off, or a row of the site's whitelist table names them by
 * their Discord, their Steam, or the email of the shop account their game account is linked to.
 */
export async function whitelistAnswer(featureId: string, said: { ids?: unknown; lang?: unknown }): Promise<{ allowed: boolean; message?: string }> {
  const s = await settingsOfFeature(featureId);
  if (s?.values.whitelistOn !== true) return { allowed: true };
  const lang = langOf(said.lang);
  const ids = said.ids && typeof said.ids === "object" ? (said.ids as Record<string, unknown>) : {};
  const discord = clean(ids.discord);
  const steam = steamFromHex(ids.steam);
  const license = clean(ids.license);
  const uuid = clean(ids.uuid);
  const linked = license || uuid ? await prisma.user.findFirst({ where: license ? { fivemLicense: license } : { minecraftUuid: uuid! }, select: { email: true, discordId: true, steamId: true } }) : null;
  const feature = await prisma.feature.findUnique({ where: { id: featureId }, select: { template: true } });
  const table = (feature?.template as { ids?: { table?: Record<string, string> } } | null)?.ids?.table?.whitelist;
  const words = s.values.whitelistMessage;
  const refusal = { allowed: false, message: (words && typeof words === "object" ? ((words as Partial<Words>)[lang] ?? "").trim() : "") || NOT_LISTED[lang] };
  if (!table) return refusal;
  const discords = [discord, linked?.discordId].filter((v): v is string => !!v);
  const steams = [steam, linked?.steamId].filter((v): v is string => !!v);
  const emails = linked?.email ? [linked.email] : [];
  const found = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT i."id" FROM "CollectionItem" i
    WHERE i."collectionId" = ${table} AND i."deletedAt" IS NULL AND (${heldIn("discordId", discords)} OR ${heldIn("steamId", steams)} OR ${heldIn("email", emails)})
    LIMIT 1`);
  return found.length ? { allowed: true } : refusal;
}

/* ---------------- Linking a game account ---------------- */

/** A code a signed-in player types in the game (one at a time; 10 minutes). */
export async function issueLinkCode(userId: string, now = Date.now()): Promise<{ code: string; expiresAt: string }> {
  await prisma.gameLinkCode.deleteMany({ where: { OR: [{ userId }, { expiresAt: { lt: new Date(now) } }] } });
  for (let tries = 0; tries < 8; tries++) {
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    try {
      const made = await prisma.gameLinkCode.create({ data: { code, userId, expiresAt: new Date(now + LINK_LIMITS.codeMinutes * 60_000) } });
      return { code: made.code, expiresAt: made.expiresAt.toISOString() };
    } catch {
      // That code is someone else's right now: another one.
    }
  }
  throw new Error("No free code");
}

const CLAIM: Record<"done" | "bad" | "taken", Words> = {
  done: { ar: "تم! حساب اللعبة صار مربوط بحساب {name} بالموقع.", en: "Done! This game account is now linked to {name}'s account on the site.", he: "בוצע! חשבון המשחק מקושר עכשיו לחשבון של {name} באתר." },
  bad: { ar: "الكود غلط أو خلص وقته. خود كود جديد من «حسابي» بالموقع.", en: "That code is wrong or has run out. Get a new one from «My account» on the site.", he: "הקוד שגוי או שפג תוקפו. קחו קוד חדש מ«החשבון שלי» באתר." },
  taken: { ar: "حساب اللعبة هاد مربوط بحساب تاني بالموقع.", en: "This game account is linked to another account on the site.", he: "חשבון המשחק הזה מקושר לחשבון אחר באתר." },
};

/** /link 482913 typed in the game: the code's shop account takes this game account. */
export async function claimLinkCode(said: { code?: unknown; game?: unknown; account?: unknown; lang?: unknown }, now = Date.now()): Promise<{ ok: boolean; message: string }> {
  const lang = langOf(said.lang);
  const game = LINK_GAMES.find((g) => g === said.game);
  const account = said.account && typeof said.account === "object" ? (said.account as Record<string, unknown>) : {};
  const id = clean(account.id);
  const name = clean(account.name, LINK_LIMITS.name);
  const code = typeof said.code === "string" && /^\d{6}$/.test(said.code) ? said.code : null;
  if (!game || !id || !code) return { ok: false, message: CLAIM.bad[lang] };
  const live = await prisma.gameLinkCode.findUnique({ where: { code } });
  if (!live || live.expiresAt.getTime() < now) return { ok: false, message: CLAIM.bad[lang] };
  const field = game === "fivem" ? { fivemLicense: id } : { minecraftUuid: id };
  const other = await prisma.user.findFirst({ where: { ...field, NOT: { id: live.userId } }, select: { id: true } });
  if (other) return { ok: false, message: CLAIM.taken[lang] };
  const user = await prisma.user.update({ where: { id: live.userId }, data: game === "fivem" ? { fivemLicense: id, fivemName: name } : { minecraftUuid: id, minecraftName: name }, select: { name: true, email: true } });
  await prisma.gameLinkCode.delete({ where: { code } });
  return { ok: true, message: CLAIM.done[lang].replace("{name}", (user.name || user.email).split(/\s+/)[0]) };
}

/** A shopper's game accounts as they are told, and whether this store has a game server to link to. */
export async function gameAccountsOf(userId: string) {
  const [user, sites] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { fivemName: true, fivemLicense: true, minecraftName: true, minecraftUuid: true } }),
    prisma.siteLink.count({ where: { featureId: { in: (await prisma.feature.findMany({ where: { enabled: true }, select: { id: true } })).map((f) => f.id) } } }),
  ]);
  return { available: sites > 0, fivem: user?.fivemLicense ? user.fivemName || "FiveM" : null, minecraft: user?.minecraftUuid ? user.minecraftName || "Minecraft" : null };
}
/** A shopper lets go of a game account. */
export async function unlinkGame(userId: string, game: LinkGame) {
  await prisma.user.update({ where: { id: userId }, data: game === "fivem" ? { fivemLicense: null, fivemName: null } : { minecraftUuid: null, minecraftName: null } });
}

/* ---------------- The panel and the download ---------------- */

/** What a site's panel says of its game server's link. */
export async function linkView(featureId: string) {
  const link = await prisma.siteLink.findUnique({ where: { featureId } });
  const s = await settingsOfFeature(featureId);
  const game: LinkGame | null = s?.values.game === "fivem" ? "fivem" : s?.values.game === "minecraft" ? "minecraft" : null;
  return { game, made: !!link, keyHint: link?.keyHint ?? null, lastSeenAt: link?.lastSeenAt?.toISOString() ?? null, lastVersion: link?.lastVersion ?? null, lastPlayers: link?.lastPlayers ?? null, whitelist: s?.values.whitelistOn === true };
}

/** A game the link has a download for, now. */
export const DOWNLOADS: Partial<Record<LinkGame, { name: string; type: string }>> = { fivem: { name: "site-link.zip", type: "application/zip" } };

/** The site's link for its game, stamped with a new key and where the API answers. */
export async function linkDownload(featureId: string, apiBase: string, lang: Lang, siteName: string): Promise<{ name: string; type: string; data: Buffer } | null> {
  const view = await linkView(featureId);
  const what = view.game ? DOWNLOADS[view.game] : undefined;
  if (!view.game || !what) return null;
  const key = await issueLinkKey(featureId);
  const dir = path.join(LINK_ASSETS, view.game);
  // The site's own name before its messages (a store never shows the platform's); quotes and backslashes can't break the Lua string.
  // (A site's feature is named "the kind: the name": players see the name.)
  const name = (siteName.split(":").pop() ?? siteName).replace(/[\\"\r\n]/g, " ").trim().slice(0, 40) || "Server";
  const stamp = (text: string) => text.replace("__SITE_NAME__", () => name).replace("__SITE_API__", () => apiBase).replace("__SITE_KEY__", () => key).replace("__SITE_LANG__", () => lang);
  const files = ["fxmanifest.lua", "config.lua", "server.lua"].map((file) => ({ name: `site-link/${file}`, data: stamp(fs.readFileSync(path.join(dir, file), "utf8")) }));
  return { ...what, data: plainZip(files) };
}
