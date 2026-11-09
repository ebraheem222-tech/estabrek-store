import { useState } from "react";
import { tr } from "../../lib/words";
import { INTERACTION_EVENTS, readCardDesign, readPolicy, type CardDesign, type InteractionAction, type InteractionEvent, type InteractionPolicy } from "../../../../estabrek-storefront/src/lib/visualControls";
import { say } from "../../studio/say";
import { CARD_BADGE_NAMES, CARD_BUTTON_NAMES, CARD_ENTER_NAMES, CARD_HOVER_NAMES, CARD_LIFT_NAMES, CARD_PRESETS, CARD_RATIO_NAMES, withPreset } from "./cardPresets";
export type { CardDesign, InteractionPolicy };
const input = "w-full rounded-lg border border-white/15 bg-surface-925 px-2 py-1.5 text-xs";
const box = "space-y-3 rounded-xl border border-white/10 p-3";
type Target = { id: string; label: string };
export function CardDesignFields({ value, onChange, disabled = false }: { value?: unknown; onChange: (next: CardDesign | null | undefined) => void; disabled?: boolean }) {
  const d = readCardDesign(value);
  const set = (key: keyof CardDesign, v: unknown) => onChange({ ...d, [key]: v });
  const numbers: [keyof CardDesign, string, number, number, number][] = [
    ["radius", tr("استدارة البطاقة", "Card radius"), 0, 80, 16], ["padding", tr("الحشو", "Padding"), 0, 64, 12], ["gap", tr("المسافات", "Spacing"), 0, 48, 12],
    ["titleSize", tr("حجم العنوان", "Title size"), 10, 48, 17], ["priceSize", tr("حجم السعر", "Price size"), 10, 40, 15], ["swatchSize", tr("حجم دائرة اللون", "Swatch size"), 12, 64, 24], ["swatchGap", tr("المسافة بين الألوان", "Swatch spacing"), 0, 24, 8],
  ];
  return <fieldset disabled={disabled} className={box} data-testid="card-design-fields">
    <legend className="text-sm font-medium">{tr("تصميم بطاقة المنتج", "Product card design")}</legend>
    <select className={input} aria-label={tr("مصدر تصميم البطاقة", "Card design source")} data-testid="card-design-mode" value={d === undefined ? "inherit" : d === null ? "original" : "custom"} onChange={e => onChange(e.target.value === "inherit" ? undefined : e.target.value === "original" ? null : {})}>
      <option value="inherit">{tr("توريث", "Inherit")}</option><option value="original">{tr("تصميم القالب الأصلي", "Original template design")}</option><option value="custom">{tr("تصميم مخصص", "Custom design")}</option>
    </select>
    {d && <>
      <div className="space-y-1" data-testid="card-presets">
        <div className="text-xs">{say("تصاميم جاهزة|Ready designs|עיצובים מוכנים")}</div>
        <div className="grid grid-cols-2 gap-1">{CARD_PRESETS.map(p => <button key={p.key} type="button" data-card-preset={p.key} className="rounded-lg border border-white/15 px-2 py-1.5 text-start text-xs hover:border-white/40" onClick={() => onChange(withPreset(d, p.design))}>{say(p.name)}</button>)}</div>
      </div>
      <div className="grid grid-cols-1 gap-2" data-testid="card-motion">
        {([["hover", say("الصورة لما يمر الماوس|The picture on hover|התמונה במעבר עכבר"), CARD_HOVER_NAMES], ["cardHover", say("الكرت كله لما يمر الماوس|The whole card on hover|הכרטיס כולו במעבר עכבר"), CARD_LIFT_NAMES], ["enter", say("كيف بتدخل الكروت|How the cards come in|איך הכרטיסים נכנסים"), CARD_ENTER_NAMES], ["buttonStyle", say("شكل زر الإضافة|The add button's look|מראה כפתור ההוספה"), CARD_BUTTON_NAMES]] as [keyof CardDesign, string, [string, string][]][]).map(([key, label, options]) => <label key={key} className="block text-xs">{label}<select className={input} data-testid={`card-${key}`} value={String(d[key] ?? options[0][0])} onChange={e => set(key, e.target.value)}>{options.map(([v, text]) => <option key={v} value={v}>{say(text)}</option>)}</select></label>)}
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs">{say("الكلام|The words|הטקסט")}<select className={input} data-testid="card-align" value={d.align ?? "start"} onChange={e => set("align", e.target.value)}><option value="start">{say("من البداية|From the start|מההתחלה")}</option><option value="center">{say("بالنص|Centred|ממורכז")}</option></select></label>
          <label className="block text-xs">{say("الظل|Shadow|צל")}<select className={input} data-testid="card-shadow" value={d.shadow ?? "none"} onChange={e => set("shadow", e.target.value)}><option value="none">{say("بلا|None|ללא")}</option><option value="soft">{say("خفيف|Soft|רך")}</option><option value="deep">{say("عميق|Deep|עמוק")}</option></select></label>
          <label className="block text-xs">{say("أسطر الاسم|Name lines|שורות השם")}<select className={input} data-testid="card-titleLines" value={String(d.titleLines ?? 0)} onChange={e => { const n = Number(e.target.value); if (n) set("titleLines", n); else { const next = { ...d }; delete next.titleLines; onChange(next); } }}><option value="0">{say("كلها|All|הכל")}</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>
          <label className="block text-xs">{say("شكل شارة الخصم|Sale badge look|מראה תג ההנחה")}<select className={input} data-testid="card-badgeStyle" value={d.badgeStyle ?? "pill"} onChange={e => set("badgeStyle", e.target.value)}>{CARD_BADGE_NAMES.map(([v, text]) => <option key={v} value={v}>{say(text)}</option>)}</select></label>
        </div>
        <label className="flex justify-between text-xs">{say("شارة الخصم (−20%)|Sale badge (−20%)|תג הנחה (−20%)")}<input type="checkbox" data-testid="card-showBadge" checked={d.showBadge === true} onChange={e => set("showBadge", e.target.checked)} /></label>
      </div>
      {([["layout", tr("التخطيط", "Layout"), [["vertical", tr("رأسي", "Vertical")], ["horizontal", tr("أفقي", "Horizontal")]]], ["imageRatio", tr("نسبة الصورة", "Image ratio"), CARD_RATIO_NAMES.map(([k, n]) => [k, say(n)])], ["imageFit", tr("ملاءمة الصورة", "Image fit"), [["cover", tr("تعبئة", "Cover")], ["contain", tr("كاملة", "Contain")]]], ["swatchShape", tr("شكل اللون", "Swatch shape"), [["circle", tr("دائرة", "Circle")], ["rounded", tr("مستدير", "Rounded")], ["square", tr("مربع", "Square")]]]] as [keyof CardDesign, string, string[][]][]).map(([key, label, options]) => <label key={key} className="block text-xs">{label}<select className={input} data-testid={`card-${key}`} value={String(d[key] ?? options[0][0])} onChange={e => set(key, e.target.value)}>{options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}</select></label>)}
      <div className="grid grid-cols-2 gap-2">{numbers.map(([key, label, min, max, fallback]) => <label key={key} className="text-xs">{label}<input key={`${key}:${d[key] ?? fallback}`} className={input} type="number" min={min} max={max} data-testid={`card-${key}`} defaultValue={Number(d[key] ?? fallback)} onBlur={e => { const raw = e.target.value.trim(), v = Number(raw); const next = raw && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : Number(d[key] ?? fallback); e.currentTarget.value = String(next); set(key, next); }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} /></label>)}</div>
      <div className="grid grid-cols-2 gap-2">{([["background", tr("الخلفية", "Background")], ["textColor", tr("النص", "Text")], ["borderColor", tr("الحدود", "Border")], ["buttonColor", tr("خلفية الزر", "Button background")], ["buttonTextColor", tr("نص الزر", "Button text")]] as [keyof CardDesign, string][]).map(([key, label]) => <label key={key} className="text-xs">{label}<input type="color" aria-label={label} data-testid={`card-${key}`} value={String(d[key] ?? "#806080")} onChange={e => set(key, e.target.value)} /><button type="button" className="text-[10px] underline" onClick={() => { const next = { ...d }; delete next[key]; onChange(next); }}>{tr("لون الثيم", "Theme colour")}</button></label>)}</div>
      {([["showCategory", tr("التصنيف", "Category")], ["showPrice", tr("السعر", "Price")], ["showSwatches", tr("الألوان", "Swatches")], ["showButton", tr("زر الإضافة", "Add button")]] as [keyof CardDesign, string][]).map(([key, label]) => <label key={key} className="flex justify-between text-xs">{label}<input type="checkbox" data-testid={`card-${key}`} checked={d[key] !== false} onChange={e => set(key, e.target.checked)} /></label>)}
    </>}
  </fieldset>;
}
const eventLabel: Record<InteractionEvent, () => string> = {
  colorChange: () => tr("عند اختيار لون", "Colour selected"), cartClick: () => tr("عند الضغط على الإضافة", "Add button clicked"), cartAdded: () => tr("بعد قبول الإضافة للسلة", "Added to cart"), click: () => tr("عند الضغط", "Clicked"),
};
export function InteractionFields({ value, onChange, targets = [], disabled = false, onTest }: { value?: unknown; onChange: (next: InteractionPolicy | undefined) => void; targets?: Target[]; disabled?: boolean; onTest?: (event: InteractionEvent) => void }) {
  const policy = readPolicy(value);
  const update = (event: InteractionEvent, actions: InteractionAction[] | undefined) => {
    const bindings = { ...policy?.bindings };
    if (actions === undefined) delete bindings[event]; else bindings[event] = actions;
    onChange(Object.keys(bindings).length ? { version: 1, bindings } : undefined);
  };
  return <fieldset disabled={disabled} className={box} data-testid="interaction-fields"><legend className="text-sm font-medium">{tr("قواعد التفاعل", "Interaction rules")}</legend>
    <p className="text-[11px] text-white/55">{tr("كل حدث يرث إعداد العنصر الأقرب ثم الصفحة ثم المتجر. التعطيل يوقف سلوك اللون الأصلي أيضًا. التأثيرات لهذه الزيارة للصفحة.", "Each event inherits from the nearest element, then page, then store. Disabled also stops original colour behaviour. Effects last for this page visit.")}</p>
    {INTERACTION_EVENTS.map(event => <EventFields key={event} event={event} actions={policy?.bindings[event]} onChange={actions => update(event, actions)} targets={targets} onTest={onTest} />)}
  </fieldset>;
}
function EventFields({ event, actions, onChange, targets, onTest }: { event: InteractionEvent; actions?: InteractionAction[]; onChange: (value: InteractionAction[] | undefined) => void; targets: Target[]; onTest?: (event: InteractionEvent) => void }) {
  const [editing, setEditing] = useState(false);
  const mode = actions === undefined ? "inherit" : actions.length || editing ? "custom" : "disabled";
  const set = (i: number, action: InteractionAction) => onChange((actions ?? []).map((a, j) => j === i ? action : a));
  const initial = (type: string): InteractionAction => type === "themeReset" ? { type } : type === "theme" ? { type, color: event === "colorChange" ? "event" : "#806080" } : type === "scroll" ? { type, target: targets[0]?.id ?? "target" } : type === "visibility" ? { type, target: targets[0]?.id ?? "target", value: "toggle" } : { type: "animate", target: targets[0]?.id ?? "target", preset: "pulse" };
  return <div className="space-y-2 border-t border-white/10 pt-2"><label className="block text-xs">{eventLabel[event]()}<select className={input} data-testid={`interaction-${event}-mode`} value={mode} onChange={e => { setEditing(e.target.value === "custom"); onChange(e.target.value === "inherit" ? undefined : []); }}><option value="inherit">{tr("توريث", "Inherit")}</option><option value="disabled">{tr("تعطيل", "Disabled")}</option><option value="custom">{tr("إجراءات مخصصة", "Custom actions")}</option></select></label>
    {mode === "custom" && <>
      {(actions ?? []).map((action, i) => <div key={i} className="space-y-2 rounded-lg bg-white/5 p-2">
        <select className={input} aria-label={tr("الإجراء", "Action")} data-testid={`interaction-${event}-action-${i}`} value={action.type} onChange={e => set(i, initial(e.target.value))}>{[["theme", tr("تغيير الثيم", "Change theme")], ["themeReset", tr("إرجاع الثيم", "Reset theme")], ["visibility", tr("إظهار / إخفاء عنصر", "Show / hide element")], ["scroll", tr("انتقال إلى عنصر", "Scroll to element")], ["animate", tr("تشغيل حركة", "Animate element")]].map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>
        {action.type === "theme" && <div className="flex gap-2"><select className={input} aria-label={tr("مصدر اللون", "Colour source")} value={action.color === "event" ? "event" : "fixed"} onChange={e => set(i, { type: "theme", color: e.target.value === "event" ? "event" : "#806080" })}><option value="event">{tr("لون الحدث (اختيار لون فقط)", "Event colour (colour selection only)")}</option><option value="fixed">{tr("لون ثابت", "Fixed colour")}</option></select>{action.color !== "event" && <input aria-label={tr("لون الثيم", "Theme colour")} type="color" value={action.color} onChange={e => set(i, { ...action, color: e.target.value })} />}</div>}
        {"target" in action && <label className="block text-xs">{tr("العنصر المستهدف", "Target element")}{targets.length ? <select className={input} value={action.target} onChange={e => set(i, { ...action, target: e.target.value })}>{!targets.some(t => t.id === action.target) && <option value={action.target}>{action.target}</option>}{targets.map(t => <option key={t.id} value={t.id}>{t.label} ({t.id})</option>)}</select> : <input className={input} value={action.target} maxLength={40} pattern="[A-Za-z0-9_-]+" onChange={e => { if (/^[A-Za-z0-9_-]{1,40}$/.test(e.target.value)) set(i, { ...action, target: e.target.value }); }} />}</label>}
        {action.type === "visibility" && <select className={input} aria-label={tr("حالة العرض", "Visibility")} value={action.value} onChange={e => set(i, { ...action, value: e.target.value as "show" | "hide" | "toggle" })}>{[["show", tr("إظهار", "Show")], ["hide", tr("إخفاء", "Hide")], ["toggle", tr("تبديل", "Toggle")]].map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>}
        {action.type === "animate" && <select className={input} aria-label={tr("الحركة", "Animation")} value={action.preset} onChange={e => set(i, { ...action, preset: e.target.value as "pulse" | "fade" | "shake" })}>{[["pulse", tr("نبض", "Pulse")], ["fade", tr("ظهور", "Fade")], ["shake", tr("اهتزاز", "Shake")]].map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>}
        <div className="flex gap-3 text-xs"><button type="button" disabled={i === 0} onClick={() => { const next = [...actions!]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; onChange(next); }}>↑</button><button type="button" onClick={() => onChange(actions!.filter((_, j) => j !== i))}>{tr("حذف الإجراء", "Remove action")}</button></div>
      </div>)}
      <button type="button" className="text-xs underline" disabled={(actions?.length ?? 0) >= 8} data-testid={`interaction-${event}-add`} onClick={() => onChange([...(actions ?? []), initial("theme")])}>{tr("إضافة إجراء", "Add action")}</button>
    </>}
    {onTest && mode === "custom" && <button type="button" className="ms-3 text-xs underline" data-testid={`interaction-${event}-test`} onClick={() => onTest(event)}>{tr("محاكاة بالمعاينة", "Simulate in preview")}</button>}
  </div>;
}
