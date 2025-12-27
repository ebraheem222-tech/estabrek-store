import { execFile, type ExecFileException, type ExecFileOptionsWithStringEncoding } from "child_process";
import { env } from "../config/env.js";

function parseArgs(raw?: string) {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map((x) => String(x));
  } catch {
    // ignore
  }
  return trimmed.split(" ").map((x) => x.trim()).filter(Boolean);
}

export type AvScanResult = { ok: true } | { ok: false; code: "FILE_INFECTED" | "AV_SCAN_FAILED"; message?: string };

export async function scanFile(filePath: string): Promise<AvScanResult> {
  if (!env.AV_SCAN_ENABLED) return { ok: true };
  const cmd = env.AV_SCAN_CMD;
  if (!cmd) {
    return { ok: false, code: "AV_SCAN_FAILED", message: "AV_SCAN_CMD is not set" };
  }

  const args = [...parseArgs(env.AV_SCAN_ARGS), filePath];
  return new Promise((resolve) => {
    const options: ExecFileOptionsWithStringEncoding = {
      timeout: env.AV_SCAN_TIMEOUT_MS,
      windowsHide: true,
      encoding: "utf8",
    };
    execFile(
      cmd,
      args,
      options,
      (err: ExecFileException | null, stdout: string, stderr: string) => {
        if (!err) return resolve({ ok: true });
        const code = err.code;
        const codeNum = typeof code === "number" ? code : Number(code);
        if (codeNum === 1) {
          return resolve({ ok: false, code: "FILE_INFECTED", message: "Malware detected" });
        }
        const out = `${stdout ?? ""}${stderr ?? ""}`.trim();
        return resolve({ ok: false, code: "AV_SCAN_FAILED", message: out || err.message });
      }
    );
  });
}
