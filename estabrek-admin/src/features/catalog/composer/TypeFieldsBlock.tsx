// The product's kind (أنواع المنتجات) and its own fields, inside "الاسم والقسم".
import React from "react";
import { Link } from "react-router-dom";
import { cn } from "../../../components/ui/cn";
import type { ProductType, TypeField } from "../../../api/productTypes.api";
import type { ComposerDraft } from "./composerModel";
import { Chip, Toggle } from "./ui";
import { fieldCls } from "./styles";
import { ProductFilesBlock } from "./ProductFilesBlock";
import { FULFILLMENT } from "../types/typeText";

export function TypeFieldsBlock({
  types,
  active,
  draft,
  update,
  errors,
  onFix,
}: {
  types: ProductType[];
  active: ProductType | null;
  draft: ComposerDraft;
  update: (fn: (d: ComposerDraft) => ComposerDraft) => void;
  errors: Record<string, string>;
  onFix: (key: string) => void;
}) {
  if (!types.length || !active) return null;
  const values = draft.attributes ?? {};
  const set = (key: string, v: unknown) => {
    update((d) => ({ ...d, attributes: { ...(d.attributes ?? {}), [key]: v } }));
    if (errors[key]) onFix(key);
  };

  return (
    <div className="mt-5 border-t border-white/[0.06] pt-4" data-testid="type-fields">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-white/55">نوع القطعة</span>
        <Link to="/admin/catalog/types" className="text-xs text-accent-300 hover:underline">
          إدارة الأنواع والحقول
        </Link>
      </div>
      {types.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="نوع القطعة">
          {types.map((t) => (
            <Chip key={t.id} active={t.id === active.id} onClick={() => update((d) => ({ ...d, typeId: t.id }))}>
              {t.name}
            </Chip>
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/80">{active.name}</p>
      )}

      {active.fields.length ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {active.fields.map((f) => (
            <FieldInput key={f.key} field={f} value={values[f.key]} error={errors[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-white/45">هالنوع ما إله حقول بعد. بتقدري تضيفي حقول (مثل القماش أو الطول) من «إدارة الأنواع والحقول».</p>
      )}

      {active.fulfillment && active.fulfillment !== "SHIPPING" ? (
        <p className="mt-4 rounded-xl bg-white/[0.04] px-3 py-2 text-xs leading-5 text-white/65" data-testid="fulfillment-note">
          {FULFILLMENT[active.fulfillment].icon} <b className="text-white/85">{FULFILLMENT[active.fulfillment].label}:</b>{" "}
          {active.fulfillment === "DIGITAL"
            ? "ما في داعي للكمية — المنتج الرقمي ما بيخلص. الزبونة بتنزّل الملفات من صفحة طلبها بعد الدفع أونلاين أو لما تقبلي الطلب."
            : "الكمية بقسم المقاسات = عدد المقاعد. كل مقعد بيطلعله تذكرة بكود لما تنقبل الطلبية أو تندفع أونلاين."}
        </p>
      ) : null}
      {active.fulfillment === "BOOKING" ? <BookingFields draft={draft} update={update} /> : null}
      {active.fulfillment === "DIGITAL" ? <ProductFilesBlock productId={draft.edit?.productId ?? null} /> : null}
    </div>
  );
}

function BookingFields({ draft, update }: { draft: ComposerDraft; update: (fn: (d: ComposerDraft) => ComposerDraft) => void }) {
  const ev = draft.event ?? { startsAt: "", endsAt: "", location: "" };
  const set = (patch: Partial<typeof ev>) => update((d) => ({ ...d, event: { ...(d.event ?? { startsAt: "", endsAt: "", location: "" }), ...patch } }));
  const bad = ev.startsAt && ev.endsAt && ev.endsAt <= ev.startsAt;
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="booking-fields">
      <label className="block">
        <span className="mb-1.5 block text-xs text-white/55">بيبلش</span>
        <input type="datetime-local" dir="ltr" className={cn(fieldCls, "h-11")} value={ev.startsAt} onChange={(e) => set({ startsAt: e.target.value })} aria-label="موعد البداية" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs text-white/55">بيخلص (اختياري)</span>
        <input type="datetime-local" dir="ltr" className={cn(fieldCls, "h-11", bad && "border-red-500/50")} value={ev.endsAt} min={ev.startsAt || undefined} onChange={(e) => set({ endsAt: e.target.value })} aria-label="موعد النهاية" />
        {bad ? <span className="mt-1 block text-xs text-red-400">النهاية لازم تكون بعد البداية</span> : null}
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs text-white/55">المكان</span>
        <input className={cn(fieldCls, "h-11")} value={ev.location} onChange={(e) => set({ location: e.target.value })} placeholder="مثلاً: سخنين، قاعة البلدية — أو «أونلاين (Zoom)»" aria-label="المكان" />
      </label>
      <p className="text-[11px] text-white/40 sm:col-span-2">بعد ما يمرق الموعد، المتجر بيوقف يستقبل طلبات عليه لحاله.</p>
    </div>
  );
}

function FieldInput({ field: f, value, error, onChange }: { field: TypeField; value: unknown; error?: string; onChange: (v: unknown) => void }) {
  const id = `attr-${f.key}`;
  const wide = f.kind === "longtext" || f.kind === "multiselect" || (f.kind === "select" && (f.options?.length ?? 0) > 4);
  const str = value == null ? "" : String(value);
  const label = (
    <span className="mb-1.5 block text-xs text-white/55">
      {f.label}
      {f.required ? <span className="text-red-400"> *</span> : null}
      {f.unit ? <span className="text-white/35"> ({f.unit})</span> : null}
    </span>
  );
  let input: React.ReactNode;
  switch (f.kind) {
    case "longtext":
      input = <textarea id={id} rows={3} className={cn(fieldCls, "min-h-[84px] py-2", error && "border-red-500/50")} value={str} onChange={(e) => onChange(e.target.value)} placeholder={f.help} />;
      break;
    case "number":
      input = <input id={id} inputMode="decimal" dir="ltr" className={cn(fieldCls, "h-11 w-40", error && "border-red-500/50")} value={str} onChange={(e) => onChange(e.target.value)} placeholder={f.help} />;
      break;
    case "date":
      input = <input id={id} type="date" dir="ltr" className={cn(fieldCls, "h-11 w-48", error && "border-red-500/50")} value={str} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "url":
      input = <input id={id} type="url" dir="ltr" className={cn(fieldCls, "h-11", error && "border-red-500/50")} value={str} onChange={(e) => onChange(e.target.value)} placeholder="https://" />;
      break;
    case "boolean":
      input = <Toggle checked={value === true} onChange={(v) => onChange(v)} label={value === true ? "نعم" : "لا"} />;
      break;
    case "select":
      input = (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={f.label}>
          {(f.options ?? []).map((o) => (
            <Chip key={o} active={str === o} onClick={() => onChange(str === o ? "" : o)}>
              {o}
            </Chip>
          ))}
        </div>
      );
      break;
    case "multiselect": {
      const list = Array.isArray(value) ? (value as string[]) : [];
      input = (
        <div className="flex flex-wrap gap-2" role="group" aria-label={f.label}>
          {(f.options ?? []).map((o) => (
            <Chip key={o} active={list.includes(o)} onClick={() => onChange(list.includes(o) ? list.filter((x) => x !== o) : [...list, o])}>
              {o}
            </Chip>
          ))}
        </div>
      );
      break;
    }
    default:
      input = <input id={id} className={cn(fieldCls, "h-11", error && "border-red-500/50")} value={str} onChange={(e) => onChange(e.target.value)} placeholder={f.help} />;
  }
  return (
    <div className={cn(wide && "sm:col-span-2")} data-field={f.key}>
      {f.kind === "select" || f.kind === "multiselect" || f.kind === "boolean" ? label : <label htmlFor={id}>{label}</label>}
      {input}
      {f.help && f.kind !== "text" && f.kind !== "number" && f.kind !== "longtext" ? <p className="mt-1 text-[11px] text-white/40">{f.help}</p> : null}
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
