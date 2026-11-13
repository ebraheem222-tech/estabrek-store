/**
 * A CSV file into a table, in three steps: pick the file (its columns are matched to the table's
 * by themselves), check it (nothing is written; each refused row says why), then bring it in.
 * The rows go to the server a few hundred at a time.
 */
import { useMemo, useState } from "react";
import { toast } from "../../lib/toast";
import { getApiErrorMessage } from "../../api/http";
import { say } from "../../studio/say";
import { Modal } from "../../components/ui/Modal";
import type { Collection } from "../../api/collections.api";
import * as DataAPI from "../../api/data.api";
import type { ImportReport, Lang } from "../../api/data.api";
import { parseCsv } from "./csv";
import { readXlsx } from "./xlsx";
import { field, input } from "./GridCells";
import { LANGS, LANG_NAME, doubledTargets, guessTarget, issueSay, rowsFromCsv, targetName, targetsOf, type Target } from "./dataText";

const btn = "rounded-lg bg-white/[0.07] px-3 py-1.5 text-xs hover:bg-white/[0.12] disabled:opacity-40";
const primary = "rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white hover:brightness-110 disabled:opacity-40";
const MAX_BYTES = 20 * 1024 * 1024;
const SHOW_REJECTED = 50;

type Totals = { created: number; updated: number; rejected: Array<{ line: number; slug: string | null; issues: ImportReport["rejected"][number]["issues"] }> };

export function ImportDialog({ table, lang, wordsLang, batch, onClose, onDone }: { table: Collection; lang: Lang; wordsLang: Lang; batch: number; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<{ name: string; head: string[]; lines: string[][] } | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [mode, setMode] = useState<"create" | "upsert">("create");
  const [textLang, setTextLang] = useState<Lang>(wordsLang);
  const [busy, setBusy] = useState<{ done: number; of: number; dry: boolean } | null>(null);
  const [checked, setChecked] = useState<Totals | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const options = useMemo(() => targetsOf(table.fields), [table.fields]);
  const doubled = doubledTargets(targets);
  const mapped = targets.some(Boolean);

  async function read(f: File | undefined) {
    setProblem(null);
    setChecked(null);
    if (!f) return;
    if (f.size > MAX_BYTES) return setProblem(say("الملف أكبر من 20 ميجا.|The file is over 20 MB.|הקובץ גדול מ־20MB."));
    let all: string[][];
    if (/\.xls$/i.test(f.name)) return setProblem(say("ملفات ‎.xls القديمة ما بتنقرأ: احفظه ‎.xlsx أو CSV.|Old .xls files aren't read: save it as .xlsx or CSV.|קובצי ‎.xls ישנים לא נקראים: שמור כ־‎.xlsx או CSV."));
    if (/\.xlsx$/i.test(f.name)) {
      try {
        all = await readXlsx(await f.arrayBuffer());
      } catch {
        return setProblem(say("ما قدرت أقرأ ملف الـ Excel (ممكن يكون مقفول بكلمة سر أو مش ‎.xlsx حقيقي).|The Excel file couldn't be read (it may be locked with a password, or not a real .xlsx).|לא ניתן לקרוא את קובץ ה־Excel (ייתכן שהוא נעול בסיסמה או אינו ‎.xlsx אמיתי)."));
      }
    } else all = parseCsv(await f.text());
    if (all.length < 2) return setProblem(say("الملف لازم يكون فيه سطر عناوين وسطر واحد عالأقل.|The file needs a heading line and at least one row.|הקובץ צריך שורת כותרות ולפחות שורה אחת."));
    const [head, ...lines] = all;
    setFile({ name: f.name, head, lines });
    setTargets(head.map((h) => guessTarget(h, table.fields, wordsLang)));
  }

  /** Sends every row, a batch at a time; a dry run only gathers the report. */
  async function run(dry: boolean) {
    if (!file) return;
    setProblem(null);
    const rows = rowsFromCsv(file.lines, targets);
    const totals: Totals = { created: 0, updated: 0, rejected: [] };
    try {
      for (let at = 0; at < rows.length; at += batch) {
        setBusy({ done: at, of: rows.length, dry });
        const out = await DataAPI.importRows(table.id, { rows: rows.slice(at, at + batch), mode, lang: textLang, dryRun: dry });
        totals.created += out.created;
        totals.updated += out.updated;
        // Line numbers as the file shows them: the headings are line 1.
        for (const r of out.rejected) totals.rejected.push({ line: at + r.row + 2, slug: r.slug, issues: r.issues });
      }
    } catch (e) {
      setBusy(null);
      // What went in before the failure stays in; say how far it got.
      setProblem(`${getApiErrorMessage(e)}${!dry && totals.created + totals.updated ? ` · ${say(`دخل ${totals.created + totals.updated} سطر قبل الخطأ|${totals.created + totals.updated} rows went in before the error|${totals.created + totals.updated} שורות נכנסו לפני השגיאה`)}` : ""}`);
      if (!dry && totals.created + totals.updated) setChecked(null);
      return;
    }
    setBusy(null);
    if (dry) return setChecked(totals);
    toast.success(say(`انضاف ${totals.created} وتعدّل ${totals.updated}|${totals.created} added, ${totals.updated} changed|${totals.created} נוספו, ${totals.updated} שונו`), {
      description: totals.rejected.length ? say(`${totals.rejected.length} سطر ما دخلوا|${totals.rejected.length} rows were left out|${totals.rejected.length} שורות לא נכנסו`) : undefined,
    });
    onDone();
  }

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      disableBackdropClose
      title={say("استيراد Excel أو CSV|Import Excel or CSV|ייבוא Excel או CSV")}
      widthClassName="max-w-3xl"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {busy ? <span className="me-auto text-xs text-white/60" data-testid="import-progress">{`${busy.done.toLocaleString("en")} / ${busy.of.toLocaleString("en")}`}</span> : null}
          <button type="button" className={btn} disabled={!file || !mapped || doubled.length > 0 || !!busy} onClick={() => void run(true)} data-testid="import-check">
            {say("افحص الملف|Check the file|בדוק את הקובץ")}
          </button>
          <button type="button" className={primary} disabled={!checked || !!busy || checked.created + checked.updated === 0} onClick={() => void run(false)} data-testid="import-run">
            {checked ? say(`استورد ${checked.created + checked.updated} سطر|Import ${checked.created + checked.updated} rows|ייבא ${checked.created + checked.updated} שורות`) : say("استورد|Import|ייבא")}
          </button>
        </div>
      }
    >
      <div className="max-h-[65vh] space-y-4 overflow-y-auto pe-1 text-sm" data-testid="import-dialog">
        <label className="block">
          <span className="text-xs text-white/60">{say("ملف Excel (‎.xlsx، أول ورقة) أو CSV. أول سطر هو العناوين.|An Excel file (.xlsx, its first sheet) or a CSV. The first line is the headings.|קובץ Excel (‎.xlsx, הגיליון הראשון) או CSV. השורה הראשונה היא הכותרות.")}</span>
          <input type="file" accept=".xlsx,.csv,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="mt-1 block w-full text-xs" onChange={(e) => void read(e.target.files?.[0])} data-testid="import-file" />
        </label>
        {problem ? <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-xs text-red-200" data-testid="import-problem">{problem}</p> : null}

        {file ? (
          <>
            <p className="text-xs text-white/60" data-testid="import-summary">
              {say(`${file.name}: ${file.lines.length.toLocaleString("en")} سطر، ${file.head.length} عمود.|${file.name}: ${file.lines.length.toLocaleString("en")} rows, ${file.head.length} columns.|${file.name}: ${file.lines.length.toLocaleString("en")} שורות, ${file.head.length} עמודות.`)}
            </p>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-xs">
                <thead className="bg-white/[0.04] text-white/60">
                  <tr>
                    <th className="px-2 py-1.5 text-start font-medium">{say("عمود الملف|The file's column|עמודת הקובץ")}</th>
                    <th className="px-2 py-1.5 text-start font-medium">{say("أول قيمة|First value|ערך ראשון")}</th>
                    <th className="px-2 py-1.5 text-start font-medium">{say("بيروح على|Goes to|עובר אל")}</th>
                  </tr>
                </thead>
                <tbody>
                  {file.head.map((h, i) => (
                    <tr key={i} className="border-t border-white/[0.06]">
                      <td className="px-2 py-1.5 font-medium">{h || `#${i + 1}`}</td>
                      <td className="max-w-[14rem] truncate px-2 py-1.5 text-white/55">{file.lines[0]?.[i] ?? ""}</td>
                      <td className="px-2 py-1.5">
                        <select
                          className={`${input} ${targets[i] && doubled.includes(targets[i]) ? "border-red-400/60" : ""}`}
                          value={targets[i] ?? ""}
                          data-testid={`import-target-${i}`}
                          onChange={(e) => {
                            setChecked(null);
                            setTargets((was) => was.map((t, k) => (k === i ? e.target.value : t)));
                          }}
                        >
                          <option value="">{say("— ما تستورده —|— leave it out —|— לא לייבא —")}</option>
                          {options.map((t) => (
                            <option key={t} value={t}>
                              {t === "slug" || t === "status" ? say(targetName(t, table.fields, lang)) : targetName(t, table.fields, lang)}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {doubled.length ? <p className="text-xs text-red-300" data-testid="import-doubled">{say("عمودين رايحين على نفس الخانة: غيّر واحد منهم.|Two columns go to the same cell: change one of them.|שתי עמודות עוברות לאותו תא: שנה אחת מהן.")}</p> : null}

            <div className="flex flex-wrap items-center gap-4 text-xs text-white/70">
              <label className="flex items-center gap-2">
                {say("إذا العنوان موجود|When the address exists|כשהכתובת קיימת")}
                <select className={field} value={mode} onChange={(e) => { setChecked(null); setMode(e.target.value as "create" | "upsert"); }} data-testid="import-mode">
                  <option value="create">{say("ارفض السطر|refuse the row|דחה את השורה")}</option>
                  <option value="upsert">{say("عدّل السطر الموجود|change the row that's there|עדכן את השורה הקיימת")}</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                {say("أعمدة الكلام بدون لغة هي|Word columns without a language are|עמודות טקסט ללא שפה הן")}
                <select className={field} value={textLang} onChange={(e) => { setChecked(null); setTextLang(e.target.value as Lang); }} data-testid="import-lang">
                  {LANGS.map((l) => (
                    <option key={l} value={l}>
                      {LANG_NAME[l]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        ) : null}

        {checked ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs" data-testid="import-report">
            <p className="font-medium text-white">
              {say(
                `رح ينضاف ${checked.created}، يتعدّل ${checked.updated}، وينرفض ${checked.rejected.length}.|${checked.created} will be added, ${checked.updated} changed, ${checked.rejected.length} refused.|${checked.created} יתווספו, ${checked.updated} ישתנו, ${checked.rejected.length} יידחו.`,
              )}
            </p>
            {checked.rejected.length ? (
              <ul className="mt-2 space-y-1 text-white/70">
                {checked.rejected.slice(0, SHOW_REJECTED).map((r) => (
                  <li key={r.line} data-testid="import-rejected">
                    <span className="text-white/45">{`${say("سطر|line|שורה")} ${r.line}${r.slug ? ` (${r.slug})` : ""}: `}</span>
                    {r.issues
                      .map((i) => {
                        const words = issueSay(i, lang);
                        return `${i.field}: ${"own" in words ? words.own : say(words.general)}`;
                      })
                      .join(" · ")}
                  </li>
                ))}
                {checked.rejected.length > SHOW_REJECTED ? <li className="text-white/45">{say(`و${checked.rejected.length - SHOW_REJECTED} غيرهم…|and ${checked.rejected.length - SHOW_REJECTED} more…|ועוד ${checked.rejected.length - SHOW_REJECTED}…`)}</li> : null}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
