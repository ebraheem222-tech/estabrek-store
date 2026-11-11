"use client";
import { useRef, useState } from "react";
import { tr } from "@/lib/words";
import { useLanguage } from "./cinematic/Language";

/**
 * General modest-wear measurements in centimetres. Edit these rows if your
 * pattern sizes differ — the product page reads them from here only.
 */
export const SIZE_GUIDE_ROWS: Array<{ size: string; local: string; bust: string; waist: string; hips: string }> = [
  { size: "S", local: "1", bust: "84–88", waist: "66–70", hips: "90–94" },
  { size: "M", local: "2", bust: "88–94", waist: "70–76", hips: "94–100" },
  { size: "L", local: "3", bust: "94–100", waist: "76–82", hips: "100–106" },
  { size: "XL", local: "4", bust: "100–108", waist: "82–90", hips: "106–114" },
  { size: "2XL", local: "5", bust: "108–116", waist: "90–98", hips: "114–122" },
];

type Row = (typeof SIZE_GUIDE_ROWS)[number];
type Measure = "bust" | "waist" | "hips";
const MEASURES: Measure[] = ["bust", "waist", "hips"];

const norm = (s: string) => s.trim().toUpperCase().replace(/^XXL$/, "2XL").replace(/^XXXL$/, "3XL");
/** The table's row for one of the piece's sizes ("M", "m", "2" or "XXL"), if it has one. */
export const guideRowFor = (key: string) => SIZE_GUIDE_ROWS.find((r) => norm(r.size) === norm(key) || r.local === key.trim());
const range = (text: string) => text.split(/[–-]/).map((n) => Number(n.trim())) as [number, number];

/**
 * The size her measurements point to: for each one she gave, the first size that holds it; the largest of those
 * (a piece has to fit everywhere). "bigger" when a measurement is past the table.
 */
export function sizeForMeasures(m: Partial<Record<Measure, number>>): Row | "bigger" | null {
  let at = -1;
  for (const key of MEASURES) {
    const v = m[key];
    if (!v || !Number.isFinite(v)) continue;
    const i = SIZE_GUIDE_ROWS.findIndex((r) => v <= range(r[key])[1]);
    if (i < 0) return "bigger";
    at = Math.max(at, i);
  }
  return at < 0 ? null : SIZE_GUIDE_ROWS[at];
}

/**
 * The size guide: what each size measures, which of them this piece comes in (and which she picked), a tap on one
 * to pick it, and her size from her own measurements (nothing kept). Without the piece's sizes it is the plain
 * table; for a piece whose sizes aren't in it (shoes, kids' ages) there is no guide at all.
 */
export function SizeGuide({ sizes, selected, available, onPick }: {
  /** The piece's own sizes (as its variants name them). */
  sizes?: string[];
  selected?: string;
  /** Can this size be picked now (in stock)? */
  available?: (key: string) => boolean;
  onPick?: (key: string) => void;
} = {}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { language: lang } = useLanguage();
  const [measures, setMeasures] = useState<Partial<Record<Measure, string>>>({});
  const pieceRows = sizes ? new Map(sizes.flatMap((key) => { const r = guideRowFor(key); return r ? [[r.size, key] as const] : []; })) : null;
  if (pieceRows && pieceRows.size === 0) return null;

  const label = (r: Row) => `${r.local} (${r.size})`;
  const headers: Record<Measure, string> = { bust: tr(lang, "الصدر", "Bust"), waist: tr(lang, "الخصر", "Waist"), hips: tr(lang, "الورك", "Hips") };
  const close = () => dialog.current?.close();
  const pick = (r: Row) => {
    const key = pieceRows?.get(r.size);
    if (!key || !onPick || (available && !available(key))) return;
    onPick(key);
    close();
  };
  const canPick = (r: Row) => {
    const key = pieceRows?.get(r.size);
    return Boolean(key && onPick && (!available || available(key)));
  };
  const found = sizeForMeasures(Object.fromEntries(MEASURES.map((k) => [k, Number(measures[k])])) as Partial<Record<Measure, number>>);
  const isSelected = (r: Row) => Boolean(selected && pieceRows?.get(r.size) === selected);

  return (
    <>
      <button type="button" className="size-guide-trigger" onClick={() => { dialog.current?.classList.add("is-open"); dialog.current?.showModal(); }}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="2.5" y="8" width="19" height="8" rx="1.5" />
          <path d="M6.5 8v3M10 8v4.5M13.5 8v3M17 8v4.5" />
        </svg>
        {tr(lang, "دليل المقاسات", "Size guide")}
      </button>
      <dialog
        ref={dialog}
        className="size-guide-dialog"
        dir={lang === "en" ? "ltr" : "rtl"}
        aria-labelledby="size-guide-title"
        onClose={() => dialog.current?.classList.remove("is-open")}
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
      >
        <div className="size-guide-body">
          <div className="size-guide-head">
            <h2 id="size-guide-title">{tr(lang, "دليل المقاسات", "Size guide")}</h2>
            <button type="button" aria-label={tr(lang, "إغلاق", "Close")} onClick={close}>✕</button>
          </div>
          <p>{tr(lang, "القياسات بالسنتيمتر، وتُؤخذ على الجسم مباشرة بشريط قياس مرن.", "In centimetres, measured on the body with a soft tape.")}</p>
          {pieceRows ? (
            <p className="size-guide-legend">
              <i aria-hidden="true" />
              {onPick ? tr(lang, "المقاسات اللي بتيجي فيها هالقطعة مميّزة. اضغطي على مقاس لتختاريه.", "The sizes this piece comes in are marked. Tap one to pick it.") : tr(lang, "المقاسات اللي بتيجي فيها هالقطعة مميّزة.", "The sizes this piece comes in are marked.")}
            </p>
          ) : null}
          <div className="size-guide-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">{tr(lang, "المقاس", "Size")}</th>
                  {MEASURES.map((k) => <th key={k} scope="col">{headers[k]}</th>)}
                </tr>
              </thead>
              <tbody>
                {SIZE_GUIDE_ROWS.map((row) => {
                  const has = pieceRows?.has(row.size);
                  const out = has && available ? !available(pieceRows!.get(row.size)!) : false;
                  return (
                    <tr key={row.size} data-has={has || undefined} data-picked={isSelected(row) || undefined} data-out={out || undefined} data-found={found && found !== "bigger" && found.size === row.size ? true : undefined}>
                      <th scope="row">
                        {canPick(row) ? (
                          <button type="button" onClick={() => pick(row)} aria-pressed={isSelected(row)} aria-label={tr(lang, `اختيار المقاس ${label(row)}`, "Pick size {0}", [label(row)])}>
                            {row.local} <span dir="ltr">({row.size})</span>
                          </button>
                        ) : (
                          <>{row.local} <span dir="ltr">({row.size})</span>{out ? <small> · {tr(lang, "نفد", "sold out")}</small> : null}</>
                        )}
                      </th>
                      {MEASURES.map((k) => <td key={k} dir="ltr">{row[k]}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <fieldset className="size-guide-finder" data-testid="size-finder">
            <legend>{tr(lang, "اعرفي مقاسكِ", "Find your size")}</legend>
            <small>{tr(lang, "اكتبي قياس واحد أو أكتر بالسنتيمتر. ما بنحفظ إشي.", "Enter one or more measurements in centimetres. Nothing is kept.")}</small>
            <div className="size-guide-inputs">
              {MEASURES.map((k) => (
                <label key={k}>
                  <span>{headers[k]}</span>
                  <input inputMode="numeric" maxLength={3} value={measures[k] ?? ""} placeholder="cm" dir="ltr" onChange={(e) => setMeasures((m) => ({ ...m, [k]: e.target.value.replace(/\D/g, "").slice(0, 3) }))} />
                </label>
              ))}
            </div>
            {found === "bigger" ? (
              <p role="status">{tr(lang, "أكبر من الجدول: راسلينا ونساعدكِ بالمقاس.", "Larger than the table: message us and we'll help with the size.")}</p>
            ) : found ? (
              <p role="status" className="size-guide-found">
                <span>{tr(lang, `مقاسكِ الأقرب: ${label(found)}`, "Your closest size: {0}", [label(found)])}</span>
                {canPick(found) ? (
                  <button type="button" onClick={() => pick(found)}>{tr(lang, `اختاري ${found.size}`, "Pick {0}", [found.size])}</button>
                ) : pieceRows && !pieceRows.has(found.size) ? (
                  <small>{tr(lang, "هالقطعة ما بتيجي بهالمقاس.", "This piece doesn't come in that size.")}</small>
                ) : null}
              </p>
            ) : null}
          </fieldset>

          <ul className="size-guide-tips">
            <li><strong>{headers.bust}:</strong> {tr(lang, "حول أعرض نقطة في الصدر، مع إبقاء الشريط أفقياً.", "around the fullest part, keeping the tape level.")}</li>
            <li><strong>{headers.waist}:</strong> {tr(lang, "حول أضيق نقطة فوق السرّة.", "around the narrowest part, above the navel.")}</li>
            <li><strong>{headers.hips}:</strong> {tr(lang, "حول أعرض نقطة في الورك.", "around the fullest part of the hips.")}</li>
            <li>{tr(lang, "بين مقاسين؟ اختاري الأكبر لقصّة أكثر راحة، أو راسلينا عبر واتساب وسنساعدكِ.", "Between two sizes? Take the larger for an easier fit, or message us on WhatsApp and we'll help.")}</li>
          </ul>
        </div>
      </dialog>
    </>
  );
}
