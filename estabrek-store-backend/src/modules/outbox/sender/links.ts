import { env } from "../../../config/env.js";

/** Link to the admin page where a member sets a password (null when ADMIN_APP_URL isn't set). */
export function adminPasswordLink(token: string, kind: "invite" | "reset") {
  const base = (env.ADMIN_APP_URL ?? "").replace(/\/+$/, "");
  if (!base) return null;
  const q = new URLSearchParams({ token });
  if (kind === "invite") q.set("invite", "1");
  return `${base}/login/reset?${q.toString()}`;
}

/** "Chrome · Windows" from a user agent. */
export function deviceName(ua?: string | null) {
  const s = ua ?? "";
  const browser = /Edg\//.test(s) ? "Edge" : /OPR\//.test(s) ? "Opera" : /Firefox\//.test(s) ? "Firefox" : /Chrome\//.test(s) ? "Chrome" : /Safari\//.test(s) ? "Safari" : "متصفح";
  const os = /iPhone|iPad/.test(s) ? "iPhone" : /Android/.test(s) ? "Android" : /Windows/.test(s) ? "Windows" : /Mac OS X/.test(s) ? "Mac" : /Linux/.test(s) ? "Linux" : "";
  return os ? `${browser} · ${os}` : browser;
}

export function israelTime(d = new Date()) {
  try {
    return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jerusalem" }).format(d);
  } catch {
    return d.toISOString();
  }
}
