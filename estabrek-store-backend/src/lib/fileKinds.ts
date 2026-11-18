/**
 * Files from shoppers (stage 2, item 4): what a picture or a file field lets a shopper upload (a field's `upload`
 * rules: up to how many MB, which kinds, kept private or not), and what a file really is, read from its own first
 * bytes (its name and the browser's word for it are never believed alone). Pure: no storage and no database here
 * (lib/shopperFiles.ts keeps them).
 */
import { z } from "zod";

/** The kinds a file field can take; a picture field takes pictures only. */
export const FILE_KINDS = ["image", "pdf", "doc", "sheet", "text", "zip", "audio"] as const;
export type FileKind = (typeof FILE_KINDS)[number];
export const UPLOAD_MAX_MB = 25;
/** A picture is made a plain webp of at most this many pixels a side (no place or camera data kept). */
export const IMAGE_SIDE = 2400;

export const UploadSchema = z
  .object({
    /** Up to how many MB one file may be. */
    maxMb: z.number().int().min(1).max(UPLOAD_MAX_MB),
    /** Which kinds (a picture field: pictures only, whatever is said). */
    kinds: z.array(z.enum(FILE_KINDS)).min(1).max(FILE_KINDS.length).optional(),
    /** Kept private: only who may read the row opens it, through a link that runs out. */
    private: z.boolean().optional(),
  })
  .strict();
export type UploadRules = z.infer<typeof UploadSchema>;

/** The kinds a field takes, as kept. */
export const kindsOf = (fieldType: string, rules: UploadRules): FileKind[] => (fieldType === "image" ? ["image"] : [...new Set(rules.kinds?.length ? rules.kinds : (["image", "pdf"] as FileKind[]))]);

/** A row's value that is a private file kept here: "file:<id>". */
export const FILE_REF = /^file:([a-z0-9]{20,40})$/;
export const fileRefId = (v: unknown): string | null => (typeof v === "string" ? FILE_REF.exec(v)?.[1] ?? null : null);

export type Sniffed = { kind: FileKind; ext: string; mime: string };
const startsWith = (b: Buffer, hex: string, at = 0) => b.length >= at + hex.length / 2 && b.subarray(at, at + hex.length / 2).equals(Buffer.from(hex, "hex"));
const extOf = (name: string) => (/\.([a-z0-9]{1,8})$/i.exec(name.trim())?.[1] ?? "").toLowerCase();

const IMAGES: Array<[string, string, string]> = [
  ["ffd8ff", "jpg", "image/jpeg"],
  ["89504e470d0a1a0a", "png", "image/png"],
  ["47494638", "gif", "image/gif"],
];
const OFFICE: Record<string, [FileKind, string]> = {
  docx: ["doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  odt: ["doc", "application/vnd.oasis.opendocument.text"],
  pptx: ["doc", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  xlsx: ["sheet", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ods: ["sheet", "application/vnd.oasis.opendocument.spreadsheet"],
};
const OLD_OFFICE: Record<string, [FileKind, string]> = {
  doc: ["doc", "application/msword"],
  xls: ["sheet", "application/vnd.ms-excel"],
  ppt: ["doc", "application/vnd.ms-powerpoint"],
};
const TEXTS: Record<string, [FileKind, string]> = { txt: ["text", "text/plain"], csv: ["sheet", "text/csv"], rtf: ["doc", "application/rtf"], md: ["text", "text/markdown"] };

/** Plain words: valid UTF-8, no NUL. */
function isText(b: Buffer) {
  if (b.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(b.subarray(0, Math.min(b.length, 64 * 1024)));
    return true;
  } catch {
    // A cut in the middle of a letter at the end of the sample is still words.
    return b.length > 64 * 1024;
  }
}

/** What a file really is, from its first bytes (and, for the formats that share a wrapper, its name); null: none we take. */
export function sniff(b: Buffer, name: string): Sniffed | null {
  const ext = extOf(name);
  for (const [magic, e, mime] of IMAGES) if (startsWith(b, magic)) return { kind: "image", ext: e, mime };
  if (startsWith(b, "52494646") && b.subarray(8, 12).toString("latin1") === "WEBP") return { kind: "image", ext: "webp", mime: "image/webp" };
  if (b.subarray(4, 8).toString("latin1") === "ftyp") {
    const brand = b.subarray(8, 12).toString("latin1");
    if (/^(heic|heix|mif1|msf1|avif|hevc)$/.test(brand)) return { kind: "image", ext: brand === "avif" ? "avif" : "heic", mime: brand === "avif" ? "image/avif" : "image/heic" };
    if (/^(M4A |M4B )$/.test(brand)) return { kind: "audio", ext: "m4a", mime: "audio/mp4" };
  }
  if (startsWith(b, "255044462d")) return { kind: "pdf", ext: "pdf", mime: "application/pdf" };
  if (startsWith(b, "504b0304")) {
    if (OFFICE[ext]) return { kind: OFFICE[ext][0], ext, mime: OFFICE[ext][1] };
    return { kind: "zip", ext: "zip", mime: "application/zip" };
  }
  if (startsWith(b, "d0cf11e0a1b11ae1") && OLD_OFFICE[ext]) return { kind: OLD_OFFICE[ext][0], ext, mime: OLD_OFFICE[ext][1] };
  if (startsWith(b, "494433") || startsWith(b, "fffb") || startsWith(b, "fff3") || startsWith(b, "fff2")) return { kind: "audio", ext: "mp3", mime: "audio/mpeg" };
  if (startsWith(b, "52494646") && b.subarray(8, 12).toString("latin1") === "WAVE") return { kind: "audio", ext: "wav", mime: "audio/wav" };
  if (startsWith(b, "4f676753")) return { kind: "audio", ext: "ogg", mime: "audio/ogg" };
  if (TEXTS[ext] && isText(b)) return { kind: TEXTS[ext][0], ext, mime: TEXTS[ext][1] };
  return null;
}

/** A file's name as kept and shown: its own, without a path or odd letters, at most 120 letters. */
export function cleanName(name: string, ext: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "").replace(/[\u0000-\u001f<>:"|?*]/g, "").replace(/\s+/g, " ").trim();
  const stem = base.replace(/\.[a-z0-9]{1,8}$/i, "").slice(0, 100) || "file";
  return `${stem}.${ext}`;
}
