/**
 * The buyer's copy: her marked files and LICENCE.txt in a ZIP encrypted with her
 * serial. Pure (no database, no settings): the backend runs it when there's no
 * vault, the vault runs it when there is one.
 */
import { applyMark, ruleFor, type FileTypeRule, type Probe } from "./marks.js";
import { encryptedZip } from "./zipAes.js";

const DATE = new Intl.DateTimeFormat("ar", { timeZone: "Asia/Jerusalem", dateStyle: "long" });

export function licenceText(p: { title: string; orderShortId: string; markId: string; issuedAt: Date }) {
  const lines = [
    "نسخة مرخّصة",
    `المنتج: ${p.title}`,
    `الطلب: ${p.orderShortId}`,
    `التاريخ: ${DATE.format(p.issuedAt)}`,
    "",
    "هاي النسخة إلك لحالك. كل نسخة فيها علامة خاصة بطلبك، فإذا انتشرت منعرف من أي طلب طلعت.",
    "احفظي السيريال بمكان آمن: هو كلمة السر لفتح الملف.",
    "",
    `Licensed copy - ${p.title} - order ${p.orderShortId} - personal use only - estb:${p.markId}`,
  ];
  return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(lines.join("\r\n") + "\r\n", "utf8")]);
}

export type PackageInput = {
  serial: string;
  markId: string;
  orderShortId: string;
  title: string;
  slug?: string | null;
  issuedAt: Date;
  files: Array<{ name: string; ext: string; data: Buffer; probe: Probe }>;
  customTypes: FileTypeRule[];
};

export function packageFileName(slug: string | null | undefined, orderShortId: string) {
  const base = (slug || "protected").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "protected";
  return `${base}-${orderShortId}.zip`;
}

export function makePackage(p: PackageInput) {
  const info = { orderShortId: p.orderShortId, markId: p.markId };
  const entries = p.files.map((f) => ({ name: f.name, data: applyMark(f.data, ruleFor(f.ext, p.customTypes), info, f.probe).data }));
  entries.push({ name: "LICENCE.txt", data: licenceText({ title: p.title, orderShortId: p.orderShortId, markId: p.markId, issuedAt: p.issuedAt }) });
  return { filename: packageFileName(p.slug, p.orderShortId), data: encryptedZip(entries, p.serial) };
}
