// The vault page's words: the session countdown, what the vault's log lines
// mean, and the command that builds the launcher. Pure (tested).
import type { VaultEvent } from "../../api/vault.api";

/** "19:05" left of the session; null when it's over. */
export function countdown(expiresAt: string | null | undefined, now = Date.now()) {
  if (!expiresAt) return null;
  const s = Math.floor((Date.parse(expiresAt) - now) / 1000);
  if (!(s > 0)) return null;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const EVENTS: Record<string, string> = {
  "vault.started": "اشتغلت الخزنة",
  "session.opened": "انفتحت جلسة",
  "session.closed": "انسكّرت الجلسة",
  "session.expired": "خلصت مدة الجلسة",
  "file.added": "انرفع ملف",
  "file.removed": "انحذف ملف",
  "package.made": "انعملت نسخة لزبونة",
  "licence.signed": "انوقّع ترخيص جهاز",
  refused: "طلب مرفوض",
};

const REFUSED: Record<string, string> = {
  IP: "من عنوان مش مسموح",
  UNSIGNED: "بدون توقيع",
  BAD_SIGNATURE: "توقيع غلط",
  STALE: "قديم",
  REPLAYED: "مكرر",
};

/** One line of the vault's own log, in words. */
export function eventText(e: VaultEvent) {
  const what = EVENTS[e.event] ?? e.event;
  if (e.event === "refused") return `${what} (${REFUSED[String(e.why)] ?? String(e.why ?? "")})`;
  if (e.event === "file.added" || e.event === "file.removed") return `${what}: ${String(e.name ?? "")}`;
  if (e.event === "package.made") return `${what} (${Number(e.files ?? 0)} ملفات)`;
  return what;
}

/** Problems with the events (refusals) stand out. */
export const eventTone = (e: VaultEvent) => (e.event === "refused" ? "bad" : e.event.startsWith("session") ? "info" : "plain");

/** The command the owner runs on her PC to build the launcher for this shop. */
export function buildCommand(apiBase: string, version: string) {
  const api = (apiBase || "").replace(/\/v1\/?$/, "").replace(/\/+$/, "");
  return `powershell -ExecutionPolicy Bypass -File estabrek-launcher\\build.ps1 -ApiUrl ${api || "https://YOUR-API"} -Version ${version}`;
}

/** The next version after the newest one ("1.0.4" → "1.0.5"). */
export function nextVersion(latest: string | null | undefined) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(latest ?? "");
  return m ? `${m[1]}.${m[2]}.${Number(m[3]) + 1}` : "1.0.0";
}

/** "A1B2…C3D4": a key or hash, short. */
export const shortHash = (h: string) => (h.length > 12 ? `${h.slice(0, 6)}…${h.slice(-4)}` : h);
