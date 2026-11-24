/**
 * A form of the owner's own (the form element, kind "custom"; formFields.ts): where what was typed goes (one of
 * their functions, or a new row of one of their tables), its fields one by one, its button and what it says after.
 * The fields can be made in one press from what the function takes or from the table's fields; what doesn't fit
 * between the two is said.
 */
import { useQuery } from "@tanstack/react-query";
import * as DataAPI from "../api/dataApi.api";
import { say } from "./say";
import { useFnDoors } from "./fnDoors";
import { Line, Pick, btn, marks, note, part, sel, warn } from "./smallInputs";
import { FIELD_NAME, FORM_KINDS, FORM_MAX, fieldsOf, fromInputs, fromTable, misfit, newField, optionsFrom, optionsText, sendOf, type FormField, type FormKind, type FormSend } from "./formFields";

const VAR_NAME = /^[A-Za-z][A-Za-z0-9_]{0,23}$/;
const names = (list: string[]) => <bdi dir="ltr">{list.join(", ")}</bdi>;
const numberOk = (v: string) => v === "" || Number.isFinite(Number(v));

export function CustomFormFields({ p, lang, busy, setProps }: { p: Record<string, unknown>; lang: string; busy: boolean; setProps: (patch: Record<string, unknown>) => void }) {
  const fields = fieldsOf(p.fields);
  const send = sendOf(p.send);
  const fns = useFnDoors();
  // The tables a shop page may add a row to: opened by the owner to everyone, or to a signed-in shopper.
  const api = useQuery({ queryKey: ["data-api"], queryFn: DataAPI.getApi, staleTime: 60_000, retry: false, enabled: send.to === "table" });
  const tables = (api.data?.tables ?? []).filter((t) => t.access.create === "public" || t.access.create === "customer");
  const door = send.to === "fn" ? fns.doors.find((d) => d.address === send.fn) : undefined;
  const table = send.to === "table" ? tables.find((t) => t.slug === send.table) : undefined;

  const setSend = (next: FormSend) => setProps({ send: JSON.parse(JSON.stringify(next)) });
  const setFields = (next: FormField[]) => setProps({ fields: JSON.parse(JSON.stringify(next.slice(0, FORM_MAX.fields))) });
  const put = (i: number, f: FormField) => setFields(fields.map((x, k) => (k === i ? f : x)));
  const words = (v: Record<string, string> | undefined, text: string) => {
    const out = { ...(v ?? {}) };
    if (text) out[lang] = text;
    else delete out[lang];
    return out;
  };
  // The fields it doesn't have yet, from where it goes; the ones it has stay as the owner made them.
  const addMissing = (made: FormField[]) => setFields([...fields, ...made.filter((m) => !fields.some((f) => f.name === m.name))]);

  // What doesn't fit: what the other end needs with no field here, and fields it won't take.
  const fit = door
    ? misfit(fields, door.fn.takes.map((i) => ({ name: i.name, required: i.required === true })))
    : table
      ? misfit(fields, table.fields.filter((f) => !table.private.includes(f.id)).map((f) => ({ name: f.id, required: f.required })))
      : null;
  const fromTheTable = table ? fromTable(table.fields, lang, table.private) : null;

  return (
    <div className="space-y-2" data-testid="studio-form-custom">
      <div className={part}>{say("وين بيروح اللي انكتب|Where what was typed goes|לאן הולך מה שנכתב")}</div>
      <Pick label={say("بيروح لـ|It goes to|זה הולך ל")} value={send.to} busy={busy} testId="form-to"
        options={[["fn", say("function (منطق من عندك)|A function (logic of your own)|פונקציה (לוגיקה משלך)")], ["table", say("سطر جديد بجدول|A new row of a table|שורה חדשה בטבלה")]]}
        onPick={(to) => setSend(to === "table" ? { to: "table" } : { to: "fn" })} />

      {send.to === "fn" ? (
        <>
          {fns.loading ? <p className={note}>…</p> : fns.failed ? (
            <>
              <Line label={say("عنوان الـ function|The function's address|הכתובת של הפונקציה")} value={send.fn ?? ""} ltr max={41} hint="friend-request" busy={busy} ok={(v) => v === "" || /^[a-z0-9][a-z0-9-]{1,40}$/.test(v)} onSave={(fn) => setSend({ to: "fn", ...(fn ? { fn } : {}), ...(send.as ? { as: send.as } : {}) })} testId="form-fn-address" />
              <p className={note}>{say("ما قدرنا نجيب قائمة الـ Functions (يمكن ما عندك صلاحية تشوفها). اكتب العنوان متل ما هو بصفحتها.|The list of functions couldn't be read (you may not be allowed to see it). Type the address as its page shows it.|לא ניתן לקרוא את רשימת הפונקציות (אולי אין לך הרשאה). להקליד את הכתובת כפי שהיא בעמוד שלה.")}</p>
            </>
          ) : !fns.doors.length && !send.fn ? (
            <p className={warn} data-testid="form-fn-none">
              {say("ما في function إلها عنوان نداء من المتجر. افتح الـ Functions، وبقسم «شو بيشغّلها» زيد «نداء»، وانشرها.|No function has an address the shop can call yet. Open Functions, add “a call” under “What starts it”, and publish it.|אין עדיין פונקציה עם כתובת שהחנות יכולה לקרוא לה. לפתוח את הפונקציות, להוסיף «קריאה» תחת «מה מפעיל אותה», ולפרסם.")}{" "}
              <a className="underline" href="/admin/functions" target="_blank" rel="noreferrer">{say("الـ Functions ↗|Functions ↗|פונקציות ↗")}</a>
            </p>
          ) : (
            <Pick label={say("أي function|Which function|איזו פונקציה")} value={send.fn ?? ""} busy={busy} testId="form-fn"
              options={[["", say("اختار…|Pick one…|לבחור…")], ...fns.doors.map((d): [string, string] => [d.address, `${d.fn.name} · ${d.address}`])]}
              onPick={(fn) => setSend({ to: "fn", ...(fn ? { fn } : {}), ...(send.as ? { as: send.as } : {}) })} />
          )}
          {send.fn && fns.loaded && !door ? <p className={warn} data-testid="form-fn-gone">{say("هالعنوان مش موجود هلأ (انشال، تطفّى، أو صار لبرنامج بمفتاح). اختار غيره.|This address isn't there now (removed, switched off, or it became a key's). Pick another.|הכתובת הזו לא קיימת כרגע (הוסרה, כובתה, או הפכה לשל מפתח). לבחור אחרת.")}</p> : null}
          {door && (!door.fn.published || !door.fn.enabled) ? <p className={warn} data-testid="form-fn-off">{!door.fn.published ? say("هاي الـ function لسا مش منشورة: الفورم ما بينبعت لحد ما تنشرها.|This function isn't published yet: the form can't be sent until it is.|הפונקציה הזו עדיין לא פורסמה: הטופס לא יישלח עד שתפורסם.") : say("هاي الـ function مطفية: الفورم ما بينبعت لحد ما تشغّلها.|This function is switched off: the form can't be sent until it is on.|הפונקציה הזו כבויה: הטופס לא יישלח עד שתודלק.")}</p> : null}
          {door?.who === "customer" ? <p className={note} data-testid="form-who">{say("بتشتغل بس لزبون مسجّل دخوله (وبتعرف مين هو). الزائر بينقاله يسجّل دخول.|It runs only for a signed-in shopper (and knows who they are). A guest is asked to sign in.|רצה רק ללקוח מחובר (ויודעת מי הוא). אורח מתבקש להתחבר.")}</p> : null}
          {door ? <button type="button" className={btn} disabled={busy || fields.length >= FORM_MAX.fields} onClick={() => addMissing(fromInputs(door.fn.takes, lang))} data-testid="form-fill">+ {say("خانة لكل شي بتاخده|A field for each thing it takes|שדה לכל דבר שהיא מקבלת")}</button> : null}
          <Line label={say("احفظ جوابها بمتغيّر (اختياري)|Keep its answer in a variable (optional)|לשמור את התשובה במשתנה (לא חובה)")} value={send.as ?? ""} ltr max={24} hint="answer" busy={busy} ok={(v) => v === "" || VAR_NAME.test(v)} onSave={(as) => setSend({ to: "fn", ...(send.fn ? { fn: send.fn } : {}), ...(as ? { as } : {}) })} testId="form-as" />
        </>
      ) : (
        <>
          {api.isLoading ? <p className={note}>…</p> : api.isError ? (
            <>
              <Line label={say("عنوان الجدول|The table's address|הכתובת של הטבלה")} value={send.table ?? ""} ltr max={41} hint="friend-requests" busy={busy} ok={(v) => v === "" || /^[a-z0-9][a-z0-9-]{0,40}$/.test(v)} onSave={(t) => setSend({ to: "table", ...(t ? { table: t } : {}) })} testId="form-table-address" />
              <p className={note}>{say("ما قدرنا نجيب قائمة الجداول المفتوحة (يمكن ما عندك صلاحية «الـ API»). اكتب عنوان الجدول.|The list of open tables couldn't be read (you may not have the “API” permission). Type the table's address.|לא ניתן לקרוא את רשימת הטבלאות הפתוחות (אולי אין לך הרשאת «API»). להקליד את כתובת הטבלה.")}</p>
            </>
          ) : !tables.length && !send.table ? (
            <p className={warn} data-testid="form-table-none">
              {say("ما في جدول مفتوح للإضافة من المتجر. افتح «الـ API والمفاتيح»، وخلّي «إضافة» بالجدول = للجميع أو للزبون.|No table is open for the shop to add to. Open “API and keys” and set the table's “add” to everyone or to the shopper.|אין טבלה שפתוחה להוספה מהחנות. לפתוח «API ומפתחות» ולהגדיר «הוספה» בטבלה לכולם או ללקוח.")}{" "}
              <a className="underline" href="/admin/data-api" target="_blank" rel="noreferrer">{say("الـ API والمفاتيح ↗|API and keys ↗|API ומפתחות ↗")}</a>
            </p>
          ) : (
            <Pick label={say("أي جدول|Which table|איזו טבלה")} value={send.table ?? ""} busy={busy} testId="form-table"
              options={[["", say("اختار…|Pick one…|לבחור…")], ...tables.map((t): [string, string] => [t.slug, `${t.name?.[lang as "ar"] || t.name?.ar || t.name?.en || t.slug} · ${t.slug}`])]}
              onPick={(t) => setSend({ to: "table", ...(t ? { table: t } : {}), ...(t && t === send.table && send.set ? { set: send.set } : {}) })} />
          )}
          {send.set && Object.keys(send.set).length ? (
            <p className={note} data-testid="form-set">
              {say("بيبعت دايماً كمان:|It always sends too:|הוא תמיד שולח גם:")} <bdi dir="ltr">{Object.entries(send.set).map(([k, v]) => `${k} = ${String(v)}`).join(" · ")}</bdi>
            </p>
          ) : null}
          {send.table && api.data && !table ? <p className={warn} data-testid="form-table-gone">{say("هالجدول مش مفتوح للإضافة من المتجر هلأ. اختار غيره، أو افتحه من «الـ API والمفاتيح».|This table isn't open for the shop to add to now. Pick another, or open it in “API and keys”.|הטבלה הזו לא פתוחה כרגע להוספה מהחנות. לבחור אחרת, או לפתוח אותה ב«API ומפתחות».")}</p> : null}
          {table ? <p className={note} data-testid="form-who">{table.access.create === "customer"
            ? say("بس الزبون المسجّل دخوله بيضيف، والسطر بينكتب بإسمه. الزائر بينقاله يسجّل دخول.|Only a signed-in shopper adds, and the row is theirs. A guest is asked to sign in.|רק לקוח מחובר מוסיף, והשורה שלו. אורח מתבקש להתחבר.")
            : say("أي زائر بيضيف. السطر بينزل مسودة لحد ما تنشره من «الجداول».|Any visitor adds. The row waits as a draft until you publish it in “Tables”.|כל מבקר מוסיף. השורה ממתינה כטיוטה עד שתפורסם ב«טבלאות».")}</p> : null}
          {table && fromTheTable ? <button type="button" className={btn} disabled={busy || fields.length >= FORM_MAX.fields} onClick={() => addMissing(fromTheTable.fields)} data-testid="form-fill">+ {say("خانة لكل حقل بالجدول|A field for each of the table's fields|שדה לכל שדה בטבלה")}</button> : null}
          {table && fromTheTable?.skipped.length ? <p className={note} data-testid="form-skipped">{say("حقول ما بتنكتب من فورم (صور، ملفات، روابط لسطور…):|Fields a form can't write (pictures, files, links to rows…):|שדות שטופס לא יכול לכתוב (תמונות, קבצים, קישורים לשורות…):")} {fromTheTable.skipped.join("، ")}</p> : null}
        </>
      )}
      {fit?.missing.length ? <p className={warn} data-testid="form-missing">{send.to === "fn" ? say("الـ function لازمها وما إلها خانة:|The function needs these and no field gives them:|הפונקציה צריכה את אלה ואין להם שדה:") : say("حقول لازمة بالجدول وما إلها خانة:|The table needs these and no field gives them:|הטבלה צריכה את אלה ואין להם שדה:")} {names(fit.missing)}</p> : null}
      {send.to === "fn" && fields.some((f) => f.kind === "file") ? <p className={warn} data-testid="form-file-fn">{say("خانة الملف بتشتغل بس لما الفورم بيروح على جدول (الملف بينرفع لحقل الجدول باسمها).|A file box only works when the form goes to a table (the file is uploaded into the table's field of its name).|תיבת קובץ עובדת רק כשהטופס נשלח לטבלה (הקובץ מועלה לשדה הטבלה בשמה).")}</p> : null}
      {fit?.extra.length ? <p className={send.to === "table" ? warn : note} data-testid="form-extra">{send.to === "fn" ? say("الـ function ما بتاخد (بتتجاهلها):|The function doesn't take (it leaves them):|הפונקציה לא מקבלת (היא מתעלמת):") : say("الجدول ما فيه هالحقول (الإرسال رح ينرفض):|The table has no such fields (sending will be refused):|בטבלה אין שדות כאלה (השליחה תידחה):")} {names(fit.extra)}</p> : null}

      <div className={part}>{say("الخانات|The fields|השדות")} <span className="text-white/70">{fields.length}/{FORM_MAX.fields}</span></div>
      <ol className="space-y-1.5">
        {fields.map((f, i) => (
          <li key={i} className="space-y-1.5 rounded-lg bg-white/4 p-2" data-testid={`form-field-${i}`}>
            <div className="flex items-end gap-1">
              <div className="flex-1"><Pick label={`${i + 1}. ${say("النوع|Kind|סוג")}`} value={f.kind} options={FORM_KINDS.map(([k, n]): [string, string] => [k, n()])} busy={busy} testId={`form-field-${i}-kind`}
                onPick={(kind) => {
                  const fresh = newField(kind as FormKind, lang, []);
                  // The name and the words stay; what belongs to the old kind goes.
                  put(i, { name: f.name, kind: kind as FormKind, label: f.label, ...(f.hint ? { hint: f.hint } : {}), ...(f.required ? { required: true } : {}), ...(kind === "select" ? { options: f.options?.length ? f.options : fresh.options } : {}) });
                }} /></div>
              <button type="button" className={btn} disabled={busy || i === 0} aria-label="↑" onClick={() => { const d = [...fields]; [d[i - 1], d[i]] = [d[i], d[i - 1]]; setFields(d); }} data-testid={`form-field-${i}-up`}>↑</button>
              <button type="button" className={`${btn} text-red-300`} disabled={busy} aria-label={say("شيل|Remove|הסרה")} onClick={() => setFields(fields.filter((_, k) => k !== i))} data-testid={`form-field-${i}-remove`}>×</button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Line label={say("الكلام فوق الخانة|The words over it|הכיתוב מעליו")} value={f.label?.[lang] ?? ""} max={80} busy={busy} onSave={(v) => put(i, { ...f, label: words(f.label, v) })} testId={`form-field-${i}-label`} />
              <Line label={say("اسمها عند الإرسال|Its name when sent|השם שלו בשליחה")} value={f.name} ltr max={31} busy={busy} ok={(v) => FIELD_NAME.test(v) && !fields.some((x, k) => k !== i && x.name === v)} onSave={(name) => put(i, { ...f, name })} testId={`form-field-${i}-name`} />
            </div>
            <Line label={say("تلميح تحتها (اختياري)|A hint under it (optional)|רמז מתחתיו (לא חובה)")} value={f.hint?.[lang] ?? ""} max={120} busy={busy} testId={`form-field-${i}-hint`}
              onSave={(v) => { const hint = words(f.hint, v); const { hint: _old, ...rest } = f; put(i, Object.keys(hint).length ? { ...rest, hint } : rest); }} />
            {f.kind === "select" ? (
              <label className="block text-[11px] text-white/55">{say("الاختيارات، وحدة بكل سطر (اللي بينبعت = الكلام المعروض)|The choices, one a line (what is sent = the words shown)|האפשרויות, אחת בכל שורה (מה שנשלח = הכיתוב)")}
                <textarea key={optionsText(f.options, lang)} className={`${sel} min-h-[72px]`} defaultValue={optionsText(f.options, lang)} disabled={busy} data-testid={`form-field-${i}-options`}
                  onBlur={(e) => { if (e.target.value !== optionsText(f.options, lang)) put(i, { ...f, options: optionsFrom(e.target.value, lang, f.options) }); }} />
              </label>
            ) : null}
            {f.kind === "number" || f.kind === "text" || f.kind === "long" ? (
              <div className="grid grid-cols-2 gap-1.5">
                <Line label={f.kind === "number" ? say("أقل شي (اختياري)|At least (optional)|לפחות (לא חובה)") : say("أقل عدد حروف (اختياري)|Fewest letters (optional)|מינימום תווים (לא חובה)")} value={f.min === undefined ? "" : String(f.min)} ltr max={12} busy={busy} ok={numberOk} testId={`form-field-${i}-min`}
                  onSave={(v) => { const { min: _old, ...rest } = f; put(i, v === "" ? rest : { ...rest, min: Number(v) }); }} />
                <Line label={f.kind === "number" ? say("أكتر شي (اختياري)|At most (optional)|לכל היותר (לא חובה)") : say("أكتر عدد حروف (اختياري)|Most letters (optional)|מקסימום תווים (לא חובה)")} value={f.max === undefined ? "" : String(f.max)} ltr max={12} busy={busy} ok={numberOk} testId={`form-field-${i}-max`}
                  onSave={(v) => { const { max: _old, ...rest } = f; put(i, v === "" ? rest : { ...rest, max: Number(v) }); }} />
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-[11px] text-white/70"><input type="checkbox" checked={f.required === true} disabled={busy} onChange={(e) => { const { required: _old, ...rest } = f; put(i, e.target.checked ? { ...rest, required: true } : rest); }} data-testid={`form-field-${i}-required`} />{say("لازمة (ما بينبعت الفورم بدونها)|Needed (the form isn't sent without it)|חובה (הטופס לא נשלח בלעדיו)")}</label>
          </li>
        ))}
      </ol>
      <button type="button" className={btn} disabled={busy || fields.length >= FORM_MAX.fields} onClick={() => setFields([...fields, newField("text", lang, fields.map((f) => f.name))])} data-testid="form-add">+ {say("خانة|Field|שדה")}</button>

      <div className={part}>{say("الزر وشو بينقال بعده|The button and what is said after|הכפתור ומה נאמר אחריו")}</div>
      <div className="grid grid-cols-2 gap-1.5">
        <Line label={say("كلام الزر (فاضي = إرسال)|The button's words (empty = Send)|הכיתוב על הכפתור (ריק = שליחה)")} value={(p.button as Record<string, string> | undefined)?.[lang] ?? ""} max={40} busy={busy} onSave={(v) => setProps({ button: words(p.button as Record<string, string> | undefined, v) })} testId="form-button" />
        <Line label={say("بعد ما ينبعت (فاضي = انبعت ✓)|After it is sent (empty = Sent ✓)|אחרי השליחה (ריק = נשלח ✓)")} value={(p.done as Record<string, string> | undefined)?.[lang] ?? ""} max={200} busy={busy} onSave={(v) => setProps({ done: words(p.done as Record<string, string> | undefined, v) })} testId="form-done" />
      </div>
      <p className={note} data-testid="form-help">{marks(say(`كل خانة بتنبعت باسمها. اللي غلط بينقال تحت خانته، وإذا الـ function وقفت كلامها بيبين تحت الزر. جواب الـ function بيبين بأي نص هيك: {{${(send.to === "fn" && send.as) || "answer"}}}. بدك يصير شي بعد الإرسال (كونفيتي، نافذة، رابط)؟ زيد للفورم مشغّل «الفورم انبعت». بالمعاينة الفورم ما بينبعت، بس بينقال.|Each field is sent by its name. What is wrong is said under its field, and when the function stops its own words show under the button. The function's answer shows in any text like {{${(send.to === "fn" && send.as) || "answer"}}}. Want something to happen after it is sent (confetti, a popup, a link)? Give the form a trigger “the form was sent”. In the preview the form isn't sent, only said.|כל שדה נשלח בשמו. מה שלא תקין נאמר מתחת לשדה, וכשהפונקציה נעצרת המילים שלה מוצגות מתחת לכפתור. התשובה של הפונקציה מוצגת בכל טקסט כך: {{${(send.to === "fn" && send.as) || "answer"}}}. רוצים שיקרה משהו אחרי השליחה (קונפטי, חלון, קישור)? להוסיף לטופס טריגר «הטופס נשלח». בתצוגה המקדימה הטופס לא נשלח, רק נאמר.`))}</p>
    </div>
  );
}
