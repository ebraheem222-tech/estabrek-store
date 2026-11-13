import { deflateRawSync } from "node:zlib";
import { describe, expect, test } from "vitest";
import { columnName, columnOf, crc32, dayOf, isDateFormat, readXlsx, writeXlsx, zipEntries, zipFile, zipOf } from "./xlsx";

// Excel files in and out without a library: the ZIP around them, a workbook read as lines of
// cells, and lines of cells written as a workbook.

const enc = new TextEncoder();
const dec = new TextDecoder();

/** A ZIP as other programs write it: its files squeezed (deflate), unlike our own writer's. */
function squeezedZip(files: Record<string, string>): Uint8Array {
  const parts: Uint8Array[] = [];
  const dir: Uint8Array[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const raw = enc.encode(text);
    const packed = new Uint8Array(deflateRawSync(raw));
    const n = enc.encode(name);
    const local = new Uint8Array(30 + n.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(8, 8, true);
    lv.setUint32(14, crc32(raw), true);
    lv.setUint32(18, packed.length, true);
    lv.setUint32(22, raw.length, true);
    lv.setUint16(26, n.length, true);
    local.set(n, 30);
    const central = new Uint8Array(46 + n.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(10, 8, true);
    cv.setUint32(16, crc32(raw), true);
    cv.setUint32(20, packed.length, true);
    cv.setUint32(24, raw.length, true);
    cv.setUint16(28, n.length, true);
    cv.setUint32(42, offset, true);
    central.set(n, 46);
    parts.push(local, packed);
    dir.push(central);
    offset += local.length + packed.length;
  }
  const dirSize = dir.reduce((s, d) => s + d.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, dir.length, true);
  ev.setUint16(10, dir.length, true);
  ev.setUint32(12, dirSize, true);
  ev.setUint32(16, offset, true);
  const out = new Uint8Array(offset + dirSize + 22);
  let at = 0;
  for (const p of [...parts, ...dir, end]) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
/** A workbook the way Excel saves one: shared words, styles, the sheet named by a relationship. */
const excelBook = (over: Record<string, string> = {}) => ({
  "[Content_Types].xml": "<Types/>",
  "xl/workbook.xml": `<workbook ${NS}><workbookPr/><sheets><sheet name="Data" sheetId="1" r:id="rId3"/></sheets></workbook>`,
  "xl/_rels/workbook.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="styles.xml"/><Relationship Id="rId3" Target="worksheets/sheet7.xml"/></Relationships>',
  "xl/sharedStrings.xml": `<sst ${NS}><si><t>slug</t></si><si><t>العنوان</t></si><si><t>Price</t></si><si><r><t>Spring </t></r><r><t>dress</t></r><rPh><t>ignored</t></rPh></si><si><t xml:space="preserve"> فستان الربيع </t></si><si><t>Day</t></si><si><t>Active</t></si></sst>`,
  "xl/styles.xml": `<styleSheet ${NS}><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="0.00 &quot;days&quot;"/></numFmts><cellXfs count="4"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/><xf numFmtId="165"/></cellXfs></styleSheet>`,
  "xl/worksheets/sheet7.xml": `<worksheet ${NS}><sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>5</v></c><c r="E1" t="s"><v>6</v></c></row>
    <row r="2"><c r="A2" t="inlineStr"><is><t>spring</t></is></c><c r="B2" t="s"><v>4</v></c><c r="C2"><v>1250.5</v></c><c r="D2" s="1"><v>46339</v></c><c r="E2" t="b"><v>1</v></c></row>
    <row r="3"></row>
    <row r="4"><c r="A4" t="str"><f>LOWER("HAT")</f><v>hat</v></c><c r="C4"><v>0.30000000000000004</v></c><c r="D4" s="2"><v>46174.75</v></c><c r="E4" t="b"><v>0</v></c></row>
    <row r="5"><c r="B5" t="s"><v>3</v></c><c r="C5" s="3"><v>12</v></c><c r="D5" t="e"><v>#N/A</v></c></row>
  </sheetData></worksheet>`,
  ...over,
});

describe("The ZIP around a workbook", () => {
  test("files written are found and read back; squeezed ones too", async () => {
    const zip = zipOf([{ name: "a.txt", data: enc.encode("hello") }, { name: "dir/مرحبا.xml", data: enc.encode("<x>שלום</x>") }]);
    const entries = zipEntries(zip);
    expect(entries.map((e) => e.name)).toEqual(["a.txt", "dir/مرحبا.xml"]);
    expect(dec.decode(await zipFile(zip, entries[1]))).toBe("<x>שלום</x>");
    const squeezed = squeezedZip({ "big.txt": "spring ".repeat(500) });
    const [big] = zipEntries(squeezed);
    expect(big.method).toBe(8);
    expect(big.packed).toBeLessThan(200);
    expect(dec.decode(await zipFile(squeezed, big))).toBe("spring ".repeat(500));
    expect(crc32(enc.encode("123456789"))).toBe(0xcbf43926);
    expect(() => zipEntries(enc.encode("slug,title\nspring,Spring"))).toThrow("NOT_A_ZIP");
  });
});

describe("Reading a workbook", () => {
  test("the first sheet as lines of cells: words, numbers, yes/no, dates, gaps; empty lines left out", async () => {
    expect(await readXlsx(squeezedZip(excelBook()))).toEqual([
      ["slug", "العنوان", "Price", "Day", "Active"],
      ["spring", "فستان الربيع", "1250.5", "2026-11-13", "true"],
      ["hat", "", "0.3", "2026-06-01", "false"],
      ["", "Spring dress", "12", ""],
    ]);
  });

  test("old Mac files count their days from 1904; a file that isn't a workbook says so", async () => {
    const mac = excelBook({ "xl/workbook.xml": `<workbook ${NS}><workbookPr date1904="1"/><sheets><sheet name="Data" sheetId="1" r:id="rId3"/></sheets></workbook>` });
    expect((await readXlsx(squeezedZip(mac)))[1][3]).toBe("2030-11-14");
    await expect(readXlsx(squeezedZip({ "word/document.xml": "<w/>" }))).rejects.toThrow("NOT_A_WORKBOOK");
    await expect(readXlsx(enc.encode("not a zip at all"))).rejects.toThrow("NOT_A_ZIP");
  });

  test("columns, date formats and day numbers", () => {
    expect([columnOf("A1"), columnOf("Z9"), columnOf("AA10"), columnOf("AZ1")]).toEqual([0, 25, 26, 51]);
    expect([columnName(0), columnName(25), columnName(26), columnName(51), columnName(702)]).toEqual(["A", "Z", "AA", "AZ", "AAA"]);
    expect(isDateFormat("dd/mm/yyyy")).toBe(true);
    expect(isDateFormat("h:mm AM/PM")).toBe(true);
    expect(isDateFormat('0.00 "days"')).toBe(false);
    expect(isDateFormat("[Red]#,##0.00")).toBe(false);
    expect(isDateFormat("General")).toBe(false);
    expect(dayOf(46339)).toBe("2026-11-13");
    expect(dayOf(1)).toBe("1900-01-01");
    expect(dayOf(59)).toBe("1900-02-28");
    expect(dayOf(61)).toBe("1900-03-01");
  });
});

describe("Writing a workbook", () => {
  test("what is written reads back the same: words in any script, numbers, yes/no, gaps", async () => {
    const lines = [
      ["slug", "title.ar", "price", "active", "note"],
      ["spring", "فستان الربيع", 1250.5, true, 'say "hi" <b>&amp;</b>'],
      ["hat", "כובע קיץ", 0, false, null],
      ["", "two\nlines", -5, undefined, "  spaced  "],
    ];
    const book = writeXlsx(lines, "Products / 2026");
    expect(await readXlsx(book)).toEqual([
      ["slug", "title.ar", "price", "active", "note"],
      ["spring", "فستان الربيع", "1250.5", "true", 'say "hi" <b>&amp;</b>'],
      ["hat", "כובע קיץ", "0", "false"],
      ["", "two\nlines", "-5", "", "spaced"],
    ]);
    const files = zipEntries(book).map((e) => e.name);
    expect(files).toEqual(["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/worksheets/sheet1.xml"]);
    const workbook = dec.decode(await zipFile(book, zipEntries(book)[2]));
    expect(workbook).toContain('name="Products   2026"');
    // Characters XML doesn't allow are left out, so the file always opens.
    expect((await readXlsx(writeXlsx([["a\u0000b\u0008c"]])))[0][0]).toBe("abc");
  });
});
