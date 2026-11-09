/**
 * The selected element's triggers (triggers.ts): when something happens to it — a click, the
 * mouse, coming into sight, a time, the page scrolled — what to do, one action after another.
 * Ready triggers first; each trigger can be tried in the preview.
 */
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { Range } from "./LookPanels";
import { ColourPick } from "./StudioTreePanels";
import { say } from "./say";
import { ACTS, BURSTS, EVENTS, newAction, PLAY_WHAT, SOUNDS, TRIGGER_PRESETS, triggersOf, triggersOp, type Action, type ActKind, type Trigger, type TriggerEvent } from "./triggers";

type Ops = (label: string, ops: PageDraftOp[]) => void;
type Target = { id: string; label: string; type?: string };
const box = "space-y-2.5 rounded-xl border border-white/[0.08] p-3";
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] hover:bg-white/[0.1] disabled:opacity-40";
const sel = "mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white";
const L = () => say("المشغّلات|Triggers|טריגרים");

function Pick({ label, value, options, busy, onPick, testId }: { label: string; value: string; options: Array<[string, string]>; busy: boolean; onPick: (v: string) => void; testId?: string }) {
  return (
    <label className="block text-[11px] text-white/55">{label}
      <select className={sel} value={value} disabled={busy} onChange={(e) => onPick(e.target.value)} data-testid={testId}>
        {!options.some(([k]) => k === value) ? <option value={value}>{value}</option> : null}
        {options.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
      </select>
    </label>
  );
}
const named = (list: Array<[string, () => string]>): Array<[string, string]> => list.map(([k, n]) => [k, n()]);

function ActionFields({ a, lang, targets, busy, onSave }: { a: Action; lang: string; targets: Target[]; busy: boolean; onSave: (a: Action) => void }) {
  const aim = (only?: (t: Target) => boolean): Array<[string, string]> => [["self", say("هو نفسه|Itself|הוא עצמו")], ...targets.filter((t) => !only || only(t)).map((t): [string, string] => [t.id, `${t.label} (${t.id})`])];
  const target = "target" in a ? <Pick label={say("على أي عنصر|On which element|על איזה רכיב")} value={a.target} options={aim(a.act === "popup" ? (t) => t.type === "popup" : a.act === "scene" ? (t) => t.type === "scrollScene" : a.act === "video" ? (t) => t.type === "video" || t.type === "scrollScene" : undefined)} busy={busy} onPick={(target) => onSave({ ...a, target } as Action)} /> : null;
  const text = (v: Record<string, string> | undefined, label: string, set: (w: Record<string, string>) => void) => (
    <label className="block text-[11px] text-white/55">{label}
      <input className={sel} defaultValue={v?.[lang] ?? ""} maxLength={200} disabled={busy} onBlur={(e) => { const t = e.target.value.trim(); if (t !== (v?.[lang] ?? "")) set({ ...(v ?? {}), [lang]: t }); }} />
    </label>
  );
  switch (a.act) {
    case "play":
      return <>{target}
        <Pick label={say("أي حركة|Which motion|איזו תנועה")} value={a.what} options={named(PLAY_WHAT)} busy={busy} onPick={(what) => onSave({ ...a, what })} />
        {a.what === "keys" ? <Pick label={say("كيف|How|איך")} value={a.mode ?? "play"} busy={busy} onPick={(mode) => onSave({ ...a, mode: mode as "play" })}
          options={[["play", say("لقدّام|Forward|קדימה")], ["reverse", say("لورا|Back|אחורה")], ["toggle", say("قدّام/ورا بالتناوب|Forward/back in turn|קדימה/אחורה לסירוגין")], ["restart", say("من الأول|From the start|מההתחלה")]]} /> : null}
      </>;
    case "visible":
      return <>{target}<Pick label={say("شو يصير|What happens|מה קורה")} value={a.value} busy={busy} onPick={(value) => onSave({ ...a, value: value as "show" })} options={[["show", say("يبين|Show|הצגה")], ["hide", say("يختفي|Hide|הסתרה")], ["toggle", say("بالتناوب|Toggle|החלפה")]]} /></>;
    case "scrollTo":
      return <>{target}<Range label={say("مسافة فوقه|Space above it|מרווח מעליו")} min={-400} max={400} unit="px" busy={busy} value={a.offset ?? 0} onSave={(offset) => onSave({ ...a, offset })} /></>;
    case "scene":
      return <>{target}<Range label={say("للحظة|To the moment|לרגע")} min={0} max={100} unit="%" busy={busy} value={a.at} onSave={(at) => onSave({ ...a, at })} /></>;
    case "link":
      return <>
        <label className="block text-[11px] text-white/55">{say("الرابط|Link|קישור")}
          <input dir="ltr" className={sel} defaultValue={a.href} disabled={busy} onBlur={(e) => { const v = e.target.value.trim(); if (v !== a.href && /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)[^\s<>"'`\\]*$/i.test(v)) onSave({ ...a, href: v }); }} />
        </label>
        <label className="flex items-center gap-2 text-[11px] text-white/70"><input type="checkbox" checked={a.newTab === true} disabled={busy} onChange={(e) => onSave({ ...a, newTab: e.target.checked || undefined })} />{say("بتاب جديد|In a new tab|בכרטיסייה חדשה")}</label>
      </>;
    case "popup":
      return <>{target}<Pick label={say("شو يصير|What happens|מה קורה")} value={a.value} busy={busy} onPick={(value) => onSave({ ...a, value: value as "open" })} options={[["open", say("تنفتح|Open|פתיחה")], ["close", say("تتسكّر|Close|סגירה")]]} /></>;
    case "video":
      return <>{target}<Pick label={say("شو يصير|What happens|מה קורה")} value={a.value} busy={busy} onPick={(value) => onSave({ ...a, value: value as "play" })}
        options={[["play", say("شغّل|Play|הפעלה")], ["pause", say("وقّف|Pause|השהיה")], ["toggle", say("شغّل/وقّف|Play/pause|הפעלה/השהיה")], ["restart", say("من الأول|From the start|מההתחלה")], ["mute", say("كتم الصوت|Mute|השתקה")], ["unmute", say("رجّع الصوت|Unmute|ביטול השתקה")]]} /></>;
    case "burst":
      return <>
        <Pick label={say("شو بينفجر|What bursts|מה מתפרץ")} value={a.kind} options={named(BURSTS)} busy={busy} onPick={(kind) => onSave({ ...a, kind })} />
        <Range label={say("قديش|How many|כמה")} min={5} max={200} busy={busy} value={a.amount ?? 60} onSave={(amount) => onSave({ ...a, amount })} />
        <ColourPick label={say("لون واحد (فاضي = ألوان)|One colour (empty = many)|צבע אחד (ריק = הרבה)")} value={a.color} busy={busy} onPick={(c) => onSave({ ...a, color: c ?? undefined })} />
      </>;
    case "copy":
      return <>{text(a.text, say("شو ينسخ (مثلاً كود خصم)|What to copy (e.g. a discount code)|מה להעתיק (למשל קוד הנחה)"), (w) => onSave({ ...a, text: w }))}{text(a.note, say("الرسالة بعد النسخ|The message after copying|ההודעה אחרי ההעתקה"), (w) => onSave({ ...a, note: w }))}</>;
    case "toast":
      return text(a.text, say("الرسالة|The message|ההודעה"), (w) => onSave({ ...a, text: w }));
    case "sound":
      return <>
        <Pick label={say("أي صوت|Which sound|איזה צליל")} value={a.kind} options={named(SOUNDS)} busy={busy} onPick={(kind) => onSave({ ...a, kind })} />
        <Range label={say("الصوت|Volume|עוצמה")} min={0} max={1} step={0.05} busy={busy} value={a.volume ?? 0.35} onSave={(volume) => onSave({ ...a, volume })} />
      </>;
    case "wait":
      return <Range label={say("قديش|How long|כמה זמן")} min={0} max={10} step={0.1} unit="s" busy={busy} value={a.seconds} onSave={(seconds) => onSave({ ...a, seconds })} />;
    default:
      return null;
  }
}

export function TriggersPanel({ node, lang, targets, busy, onOps, onTest }: { node: PageTreeNode; lang: string; targets: Target[]; busy: boolean; onOps: Ops; onTest: (index: number) => void }) {
  const list = triggersOf(node);
  const save = (next: Trigger[]) => onOps(L(), [triggersOp(node, next)]);
  const setOne = (i: number, t: Trigger) => save(list.map((x, j) => (j === i ? t : x)));
  const others = targets.filter((t) => t.id !== node.id);
  return (
    <div className={box} data-testid="studio-triggers">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/80">{say("المشغّلات: لما يصير… اعمل…|Triggers: when… do…|טריגרים: כאשר… עשה…")}</div>
        <span className="text-[10px] text-white/40">{list.length}/8</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {TRIGGER_PRESETS.map((p) => (
          <button key={p.key} type="button" className={btn} disabled={busy || list.length >= 8} onClick={() => save([...list, p.make(lang)])} data-trigger-preset={p.key}>+ {p.name()}</button>
        ))}
      </div>
      {list.map((t, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2" data-testid={`trigger-${i}`}>
          <div className="grid grid-cols-2 gap-2">
            <Pick label={say("لما|When|כאשר")} value={t.on} options={named(EVENTS)} busy={busy} onPick={(on) => setOne(i, { ...t, on: on as TriggerEvent, ...(on === "scrolled" ? { at: t.at ?? 50 } : on === "timer" ? { at: t.at ?? 5 } : {}) })} testId={`trigger-${i}-on`} />
            <label className="flex items-center gap-2 pt-4 text-[11px] text-white/70"><input type="checkbox" checked={t.once === true} disabled={busy} onChange={(e) => setOne(i, { ...t, once: e.target.checked || undefined })} />{say("مرة وحدة بس|Only once|רק פעם אחת")}</label>
          </div>
          {t.on === "scrolled" ? <Range label={say("لما الصفحة تنزل لـ|When the page reaches|כשהעמוד מגיע ל־")} min={0} max={100} unit="%" busy={busy} value={t.at ?? 50} onSave={(at) => setOne(i, { ...t, at })} /> : null}
          {t.on === "timer" || t.on === "load" ? <Range label={say("بعد|After|אחרי")} min={0} max={120} unit="s" busy={busy} value={t.at ?? (t.on === "timer" ? 5 : 0)} onSave={(at) => setOne(i, { ...t, at })} /> : null}
          <ol className="space-y-1.5">
            {t.do.map((a, j) => (
              <li key={j} className="space-y-1.5 rounded-lg bg-white/[0.04] p-2">
                <div className="flex items-end gap-1">
                  <div className="flex-1"><Pick label={`${j + 1}. ${say("اعمل|Do|עשה")}`} value={a.act} options={named(ACTS)} busy={busy} onPick={(act) => setOne(i, { ...t, do: t.do.map((x, k) => (k === j ? newAction(act as ActKind, lang) : x)) })} testId={`trigger-${i}-act-${j}`} /></div>
                  <button type="button" className={btn} disabled={busy || j === 0} aria-label="↑" onClick={() => { const d = [...t.do]; [d[j - 1], d[j]] = [d[j], d[j - 1]]; setOne(i, { ...t, do: d }); }}>↑</button>
                  <button type="button" className={`${btn} text-red-300`} disabled={busy || t.do.length <= 1} aria-label={say("شيل|Remove|הסרה")} onClick={() => setOne(i, { ...t, do: t.do.filter((_, k) => k !== j) })}>×</button>
                </div>
                <ActionFields a={a} lang={lang} targets={others} busy={busy} onSave={(next) => setOne(i, { ...t, do: t.do.map((x, k) => (k === j ? next : x)) })} />
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-1">
            <button type="button" className={btn} disabled={busy || t.do.length >= 8} onClick={() => setOne(i, { ...t, do: [...t.do, newAction("wait", lang)] })}>+ {say("خطوة|Step|שלב")}</button>
            <button type="button" className={btn} onClick={() => onTest(i)} data-testid={`trigger-${i}-test`}>▶ {say("جرّب بالمعاينة|Try in the preview|לנסות בתצוגה")}</button>
            <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => save(list.filter((_, k) => k !== i))}>{say("شيل المشغّل|Remove the trigger|הסרת הטריגר")}</button>
          </div>
        </div>
      ))}
      <button type="button" className={btn} disabled={busy || list.length >= 8} onClick={() => save([...list, { on: "click", do: [newAction("play", lang)] }])} data-testid="trigger-add">+ {say("مشغّل جديد|New trigger|טריגר חדש")}</button>
      <p className="text-[10px] leading-4 text-white/35">{say("بالمعاينة الكبسة بتختار العناصر، فجرّب من هون. بالمتجر بتشتغل لحالها.|In the preview a click selects, so try from here. In the shop they run by themselves.|בתצוגה המקדימה לחיצה בוחרת, אז לנסות מכאן. בחנות הם פועלים לבד.")}</p>
    </div>
  );
}
