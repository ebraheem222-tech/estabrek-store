/**
 * The Windows launcher is one blank program for every shop (assets/launcher,
 * built by estabrek-launcher/build.ps1 -Blank). When it is downloaded, the shop
 * writes its address, its name and its licence keys at the end of the file,
 * where the launcher reads them (estabrek-launcher/src/Config.cs):
 *
 *   <program> <JSON, UTF-8> <JSON length, 4 bytes little-endian> "ESTBCFG1"
 *
 * Windows ignores bytes after a program's last section, so it still runs. Like a
 * key built into the program, this is no lock against someone who edits the
 * file; the licence's PC binding and the online checks are what hold.
 */
import type { PublicKeyInfo } from "./licenceToken.js";

const MAGIC = Buffer.from("ESTBCFG1", "ascii");
const MAX_JSON = 65_536;

export type LauncherStamp = {
  /** The shop's API address, without /v1 (the launcher adds /v1/licences/...). */
  api: string;
  /** The shop's name, the launcher's window title. */
  name: string;
  keys: PublicKeyInfo[];
};

const KEY_PART = /^[A-Za-z0-9_-]{1,100}$/;

/** The blank program with this shop's details written at its end. */
export function stampLauncher(blank: Buffer, s: LauncherStamp): Buffer {
  if (readStamp(blank)) throw new Error("This launcher already carries a shop's details");
  const api = s.api.trim().replace(/\/+$/, "").replace(/\/v1$/, "");
  if (!/^https?:\/\/[^\s"\\]+$/.test(api)) throw new Error("Bad address");
  const keys = s.keys.map((k) => ({ kid: k.kid, x: k.x, y: k.y }));
  if (!keys.length || keys.some((k) => !KEY_PART.test(k.kid) || !KEY_PART.test(k.x) || !KEY_PART.test(k.y))) throw new Error("Bad keys");
  const json = Buffer.from(JSON.stringify({ v: 1, api, name: s.name.trim().slice(0, 60), keys }), "utf8");
  if (json.length > MAX_JSON) throw new Error("Too long");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(json.length);
  return Buffer.concat([blank, json, len, MAGIC]);
}

/** The details at the end of a launcher, or null. */
export function readStamp(exe: Buffer): LauncherStamp | null {
  if (exe.length < 12 || !exe.subarray(exe.length - 8).equals(MAGIC)) return null;
  const len = exe.readUInt32LE(exe.length - 12);
  if (!len || len > MAX_JSON || len > exe.length - 12) return null;
  try {
    const j = JSON.parse(exe.subarray(exe.length - 12 - len, exe.length - 12).toString("utf8"));
    return { api: String(j.api ?? ""), name: String(j.name ?? ""), keys: Array.isArray(j.keys) ? j.keys : [] };
  } catch {
    return null;
  }
}

/**
 * The address a request reached this server by ("https://api.example.com"), for
 * the launcher to call back. Behind Railway's proxy the X-Forwarded headers say it.
 */
export function publicOrigin(req: { protocol: string; get(name: string): string | undefined }): string | null {
  const first = (v: string | undefined) => (v ?? "").split(",")[0].trim();
  const host = first(req.get("x-forwarded-host")) || first(req.get("host"));
  if (!/^[A-Za-z0-9.-]+(:\d{1,5})?$/.test(host)) return null;
  let proto = first(req.get("x-forwarded-proto")) || req.protocol;
  if (proto !== "https" && proto !== "http") proto = "https";
  return `${proto}://${host}`;
}
