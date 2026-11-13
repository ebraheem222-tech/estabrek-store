/**
 * Excel files (.xlsx) in and out in the browser, without a library (the data grid's import and
 * export). An .xlsx is a ZIP of XML: here its first sheet is read as lines of cells (like a CSV
 * file's), and lines of cells are written as a one-sheet workbook.
 *
 * Reading: shared and inline words, numbers, yes/no, and dates (a date is a number with a date
 * format: it comes out as 2026-11-13). Formulas give their last worked-out value. Not read: other
 * sheets, merged cells' spans, files over 4 GB (ZIP64) or locked with a password.
 */

/* ---------------- ZIP ---------------- */

type Entry = { name: string; method: number; packed: number; offset: number };
const u16 = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8);
const u32 = (b: Uint8Array, at: number) => (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;

/** The files a ZIP holds (from its directory at the end). Throws when it isn't a ZIP. */
export function zipEntries(bytes: Uint8Array): Entry[] {
  // The end record is the last 22 bytes, or a little earlier when the file carries a comment.
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (u32(bytes, i) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("NOT_A_ZIP");
  const count = u16(bytes, end + 10);
  let at = u32(bytes, end + 16);
  const names = new TextDecoder();
  const out: Entry[] = [];
  for (let n = 0; n < count && at + 46 <= bytes.length && u32(bytes, at) === 0x02014b50; n++) {
    const nameLen = u16(bytes, at + 28);
    out.push({ name: names.decode(bytes.subarray(at + 46, at + 46 + nameLen)), method: u16(bytes, at + 10), packed: u32(bytes, at + 20), offset: u32(bytes, at + 42) });
    at += 46 + nameLen + u16(bytes, at + 30) + u16(bytes, at + 32);
  }
  return out;
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new DecompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  // Written and read at once: the reader below takes what the writer gives.
  const written = writer.write(data as unknown as BufferSource).then(() => writer.close());
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  await written;
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** One file's bytes out of the ZIP. */
export async function zipFile(bytes: Uint8Array, entry: Entry): Promise<Uint8Array> {
  const at = entry.offset;
  if (u32(bytes, at) !== 0x04034b50) throw new Error("BAD_ZIP");
  const start = at + 30 + u16(bytes, at + 26) + u16(bytes, at + 28);
  const data = bytes.subarray(start, start + entry.packed);
  if (entry.method === 0) return data;
  if (entry.method === 8) return inflate(data);
  throw new Error("ZIP_METHOD");
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A ZIP of files kept as they are (not squeezed: a spreadsheet opens it the same). */
export function zipOf(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const dir: Uint8Array[] = [];
  let offset = 0;
  const head = (size: number) => {
    const b = new Uint8Array(size);
    return { b, v: new DataView(b.buffer) };
  };
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const local = head(30 + name.length);
    local.v.setUint32(0, 0x04034b50, true);
    local.v.setUint16(4, 20, true);
    local.v.setUint16(6, 0x0800, true); // names are UTF-8
    local.v.setUint32(14, crc, true);
    local.v.setUint32(18, f.data.length, true);
    local.v.setUint32(22, f.data.length, true);
    local.v.setUint16(26, name.length, true);
    local.b.set(name, 30);
    const central = head(46 + name.length);
    central.v.setUint32(0, 0x02014b50, true);
    central.v.setUint16(4, 20, true);
    central.v.setUint16(6, 20, true);
    central.v.setUint16(8, 0x0800, true);
    central.v.setUint32(16, crc, true);
    central.v.setUint32(20, f.data.length, true);
    central.v.setUint32(24, f.data.length, true);
    central.v.setUint16(28, name.length, true);
    central.v.setUint32(42, offset, true);
    central.b.set(name, 46);
    parts.push(local.b, f.data);
    dir.push(central.b);
    offset += local.b.length + f.data.length;
  }
  const dirSize = dir.reduce((n, d) => n + d.length, 0);
  const end = head(22);
  end.v.setUint32(0, 0x06054b50, true);
  end.v.setUint16(8, files.length, true);
  end.v.setUint16(10, files.length, true);
  end.v.setUint32(12, dirSize, true);
  end.v.setUint32(16, offset, true);
  const out = new Uint8Array(offset + dirSize + 22);
  let at = 0;
  for (const p of [...parts, ...dir, end.b]) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/* ---------------- Reading a workbook ---------------- */

const xml = (text: string) => new DOMParser().parseFromString(text, "application/xml");
const all = (node: Document | Element, name: string) => Array.from(node.getElementsByTagNameNS("*", name));

/** "B12" → 1 (the column's place; A is 0). */
export function columnOf(ref: string): number {
  let n = 0;
  for (const ch of ref) {
    const c = ch.charCodeAt(0);
    if (c < 65 || c > 90) break;
    n = n * 26 + (c - 64);
  }
  return n - 1;
}

const BUILT_IN_DATES = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);
/** Does a number format show a date or a time? (Letters inside quotes and brackets don't count.) */
export function isDateFormat(code: string): boolean {
  const bare = code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "").replace(/\\./g, "");
  return /[dmyhs]/i.test(bare) && !/general/i.test(bare);
}

/** A spreadsheet's day number as 2026-11-13 (its day 1 is 1 January 1900, or 1904 on old Mac files). */
export function dayOf(serial: number, from1904 = false): string {
  const start = from1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  // Spreadsheets count a 29 February 1900 that never was: the days before it sit one later.
  const days = Math.floor(serial) + (!from1904 && serial < 60 ? 1 : 0);
  const d = new Date(start + days * 86_400_000);
  return Number.isNaN(d.getTime()) ? String(serial) : d.toISOString().slice(0, 10);
}

/** The first sheet's lines of cells, as words (empty lines left out, like a CSV file's). */
export async function readXlsx(input: ArrayBuffer | Uint8Array): Promise<string[][]> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const entries = new Map(zipEntries(bytes).map((e) => [e.name, e]));
  const text = async (name: string) => {
    const e = entries.get(name);
    return e ? new TextDecoder().decode(await zipFile(bytes, e)) : null;
  };
  const book = await text("xl/workbook.xml");
  if (!book) throw new Error("NOT_A_WORKBOOK");
  const bookDoc = xml(book);
  const from1904 = all(bookDoc, "workbookPr").some((p) => p.getAttribute("date1904") === "1" || p.getAttribute("date1904") === "true");

  // The first sheet's file, by the workbook's own list.
  let sheetPath = "xl/worksheets/sheet1.xml";
  const first = all(bookDoc, "sheet")[0];
  const rid = first ? first.getAttribute("r:id") ?? first.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") : null;
  const rels = await text("xl/_rels/workbook.xml.rels");
  if (rid && rels) {
    const target = all(xml(rels), "Relationship").find((r) => r.getAttribute("Id") === rid)?.getAttribute("Target");
    if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
  }
  const sheet = await text(sheetPath);
  if (!sheet) throw new Error("NO_SHEET");

  const sharedText = await text("xl/sharedStrings.xml");
  const shared = sharedText
    ? all(xml(sharedText), "si").map((si) =>
        all(si, "t")
          // Not the reading aid some languages add beside the words.
          .filter((t) => t.parentElement?.localName !== "rPh")
          .map((t) => t.textContent ?? "")
          .join(""),
      )
    : [];

  // Which cell styles show a date.
  const stylesText = await text("xl/styles.xml");
  const dateStyle: boolean[] = [];
  if (stylesText) {
    const doc = xml(stylesText);
    const custom = new Map(all(doc, "numFmt").map((f) => [Number(f.getAttribute("numFmtId")), f.getAttribute("formatCode") ?? ""]));
    const xfs = all(doc, "cellXfs")[0];
    if (xfs) {
      for (const xf of all(xfs, "xf")) {
        const id = Number(xf.getAttribute("numFmtId") ?? 0);
        dateStyle.push(custom.has(id) ? isDateFormat(custom.get(id)!) : BUILT_IN_DATES.has(id));
      }
    }
  }

  const lines: string[][] = [];
  for (const row of all(xml(sheet), "row")) {
    const cells: string[] = [];
    let next = 0;
    for (const c of all(row, "c")) {
      const ref = c.getAttribute("r");
      const at = ref ? columnOf(ref) : next;
      next = at + 1;
      const type = c.getAttribute("t");
      const v = all(c, "v")[0]?.textContent ?? "";
      let value: string;
      if (type === "s") value = shared[Number(v)] ?? "";
      else if (type === "inlineStr") value = all(c, "t").map((t) => t.textContent ?? "").join("");
      else if (type === "b") value = v === "1" ? "true" : "false";
      else if (type === "str" || type === "e") value = type === "e" ? "" : v;
      else if (v === "") value = "";
      else if (dateStyle[Number(c.getAttribute("s") ?? -1)]) value = dayOf(Number(v), from1904);
      // A number as it reads, without the noise a stored fraction can carry.
      else value = Number.isFinite(Number(v)) ? String(Number(Number(v).toPrecision(15))) : v;
      if (at >= 0) {
        while (cells.length < at) cells.push("");
        cells[at] = value.trim();
      }
    }
    if (cells.some((x) => x !== "")) lines.push(cells);
  }
  return lines;
}

/* ---------------- Writing a workbook ---------------- */

export type Cell = string | number | boolean | null | undefined;

/** Words safe inside XML (and without the characters XML doesn't allow at all). */
const esc = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 0 → "A", 26 → "AA". */
export function columnName(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Lines of cells as a one-sheet workbook. The first line is the headings (kept in view when scrolling). */
export function writeXlsx(lines: Cell[][], sheetName = "Sheet1"): Uint8Array {
  const enc = new TextEncoder();
  const rows = lines
    .map((cells, r) => {
      const out = cells
        .map((v, c) => {
          if (v === null || v === undefined || v === "") return "";
          const ref = `${columnName(c)}${r + 1}`;
          if (typeof v === "number") return Number.isFinite(v) ? `<c r="${ref}"><v>${v}</v></c>` : "";
          if (typeof v === "boolean") return `<c r="${ref}" t="b"><v>${v ? 1 : 0}</v></c>`;
          return `<c r="${ref}" t="inlineStr"${r === 0 ? ' s="1"' : ""}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${out}</row>`;
    })
    .join("");
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const name = esc(sheetName.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet1");
  const files: Array<[string, string]> = [
    [
      "[Content_Types].xml",
      `${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    ],
    ["_rels/.rels", `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `${head}<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    [
      "xl/_rels/workbook.xml.rels",
      `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${rel}/styles" Target="styles.xml"/></Relationships>`,
    ],
    [
      "xl/styles.xml",
      `${head}<styleSheet xmlns="${ns}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`,
    ],
    ["xl/worksheets/sheet1.xml", `${head}<worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${rows}</sheetData></worksheet>`],
  ];
  return zipOf(files.map(([n, text]) => ({ name: n, data: enc.encode(text) })));
}

export const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
