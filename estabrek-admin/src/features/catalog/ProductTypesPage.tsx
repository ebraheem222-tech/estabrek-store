// أنواع المنتجات: kinds of products (clothes, tickets, courses…) and their own
// fields. Each product picks a kind; its fields show in the product form, on the
// product page, and (when marked) as filters in the shop.
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import * as TypesAPI from "../../api/productTypes.api";
import type { FieldKind, ProductType, TypeField } from "../../api/productTypes.api";
import { FIELD_KINDS } from "../../api/productTypes.api";
import { FULFILLMENT, KIND_LABELS, canFilter, deliveryLine, fieldProblems, hasOptions, newFieldKey, parseOptions } from "./types/typeText";
import { TEMPLATE_GROUPS, TYPE_TEMPLATES, findTemplates, type TemplateGroup, type TypeTemplate } from "./types/typeTemplates";
import { deliveryForSave, deliveryProblem } from "./composer/composerModel";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";

type Draft = {
  id?: string;
  name: string;
  description: string;
  colorLabel: string;
  sizeLabel: string;
  showColor: boolean;
  showSize: boolean;
  fulfillment: Fulfillment;
  /** Shipped kinds: where from and how many days (its products' unless they say otherwise). */
  delivery: { shipsFrom: string; minDays: string; maxDays: string };
  fields: Array<TypeField & { optionsText?: string }>;
};

type Fulfillment = ProductType["fulfillment"];

const noDelivery = { shipsFrom: "", minDays: "", maxDays: "" };
const emptyType = (): Draft => ({ name: "", description: "", colorLabel: "اللون", sizeLabel: "المقاس", showColor: true, showSize: true, fulfillment: "SHIPPING", delivery: noDelivery, fields: [] });

const toDraft = (t: ProductType): Draft => ({
  id: t.id,
  name: t.name,
  description: t.description ?? "",
  colorLabel: t.colorLabel,
  sizeLabel: t.sizeLabel,
  showColor: t.showColor,
  showSize: t.showSize,
  fulfillment: t.fulfillment ?? "SHIPPING",
  delivery: { shipsFrom: t.shipsFrom ?? "", minDays: t.deliveryMinDays == null ? "" : String(t.deliveryMinDays), maxDays: t.deliveryMaxDays == null ? "" : String(t.deliveryMaxDays) },
  fields: t.fields.map((f) => ({ ...f, optionsText: (f.options ?? []).join("\n") })),
});

const fromTemplate = (t: TypeTemplate): Draft => ({
  ...emptyType(),
  ...t.type,
  description: t.type.description ?? "",
  fields: t.type.fields.map((f) => ({ ...f, optionsText: (f.options ?? []).join("\n") })),
});

const typeDelivery = (t: ProductType) => deliveryLine({ shipsFrom: t.shipsFrom, minDays: t.deliveryMinDays, maxDays: t.deliveryMaxDays });

export default function ProductTypesPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("catalog:write");
  const q = useQuery({ queryKey: ["product-types"], queryFn: TypesAPI.listProductTypes });
  const [editing, setEditing] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState<ProductType | null>(null);
  const [gallery, setGallery] = useState(false);
  const types = q.data ?? [];

  return (
    <div dir="rtl" className="space-y-4" data-testid="product-types-page">
      <div className={box}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">أنواع المنتجات</h1>
            <p className="mt-1 text-sm text-white/60">
              كل نوع إله حقوله: الملابس (قماش، طول، غسيل)، تذكرة (من، إلى، تاريخ)، كورس (مدة، رابط)… الحقول بتطلع بصفحة إضافة المنتج، وبصفحة القطعة بالمتجر، واللي بتعلّمي عليها «فلتر» بتصير فلاتر بالمتجر. ما بدها مطوّر.
            </p>
          </div>
          {canWrite ? (
            <Button variant="primary" className="shrink-0 whitespace-nowrap" onClick={() => setEditing(emptyType())}>
              + نوع جديد
            </Button>
          ) : null}
        </div>
        {canWrite ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-white/50">أو ابدئي من:</span>
            {TYPE_TEMPLATES.filter((t) => t.quick).map((t) => (
              <button key={t.id} type="button" onClick={() => setEditing(fromTemplate(t))} className="rounded-full border border-white/10 px-3 py-1.5 hover:border-white/25">
                {t.icon} {t.name}
              </button>
            ))}
            <button type="button" onClick={() => setGallery(true)} className="rounded-full bg-accent-500/15 px-3 py-1.5 text-accent-200 hover:bg-accent-500/25" data-testid="open-templates">
              كل القوالب ({TYPE_TEMPLATES.length}) ←
            </button>
          </div>
        ) : null}
      </div>

      {q.isLoading ? (
        <div className={`${box} flex items-center gap-2 text-sm`}>
          <Spinner /> جاري التحميل…
        </div>
      ) : q.isError ? (
        <div className={`${box} text-sm text-red-200`}>{getApiErrorMessage(q.error)}</div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2" data-testid="types-list">
          {types.map((t, i) => (
            <li key={t.id} className={box}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{t.name}</h2>
                    {i === 0 ? <Badge size="sm">الافتراضي للمنتجات الجديدة</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-white/50">
                    {FULFILLMENT[t.fulfillment ?? "SHIPPING"].icon} {FULFILLMENT[t.fulfillment ?? "SHIPPING"].label} · {t.products} منتج · {t.showColor ? t.colorLabel : "بدون ألوان"} · {t.showSize ? t.sizeLabel : "بدون مقاسات"}
                  </p>
                  {(t.fulfillment ?? "SHIPPING") === "SHIPPING" && typeDelivery(t) ? <p className="mt-0.5 text-xs text-white/45">🚚 {typeDelivery(t)}</p> : null}
                </div>
                {canWrite ? (
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(toDraft(t))}>
                      تعديل
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRemoving(t)}>
                      حذف
                    </Button>
                  </div>
                ) : null}
              </div>
              {t.fields.length ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {t.fields.map((f) => (
                    <li key={f.key} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs">
                      {f.label}
                      <span className="text-white/40"> · {KIND_LABELS[f.kind].label}</span>
                      {f.filterable ? <span className="text-accent-300"> · فلتر</span> : null}
                      {f.required ? <span className="text-red-300"> *</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-white/45">بدون حقول بعد.</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing ? <TypeEditor draft={editing} onClose={() => setEditing(null)} /> : null}
      {gallery ? (
        <TemplateGallery
          onPick={(t) => {
            setGallery(false);
            setEditing(fromTemplate(t));
          }}
          onClose={() => setGallery(false)}
        />
      ) : null}
      {removing ? <DeleteType type={removing} others={types.filter((t) => t.id !== removing.id)} onClose={() => setRemoving(null)} /> : null}
    </div>
  );
}

function TypeEditor({ draft: initial, onClose }: { draft: Draft; onClose: () => void }) {
  const qc = useQueryClient();
  const [d, setD] = useState<Draft>(initial);
  const [tried, setTried] = useState(false);
  const fields = useMemo(() => d.fields.map((f) => ({ ...f, options: hasOptions(f.kind) ? parseOptions(f.optionsText ?? "") : undefined })), [d.fields]);
  const problems = fieldProblems(fields);
  const nameMissing = !d.name.trim();
  const shipped = d.fulfillment === "SHIPPING";
  const daysProblem = shipped ? deliveryProblem(d) : null;
  const days = deliveryForSave(d);
  const preview = daysProblem ? null : deliveryLine({ shipsFrom: days.shipsFrom, minDays: days.deliveryMinDays, maxDays: days.deliveryMaxDays });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: d.name.trim(),
        description: d.description.trim() || null,
        colorLabel: d.colorLabel.trim() || "اللون",
        sizeLabel: d.sizeLabel.trim() || "المقاس",
        showColor: d.showColor,
        showSize: d.showSize,
        fulfillment: d.fulfillment,
        ...(shipped ? days : { shipsFrom: null, deliveryMinDays: null, deliveryMaxDays: null }),
        fields: fields.map((f) => ({
          key: f.key,
          kind: f.kind,
          required: f.required,
          showOnPage: f.showOnPage,
          label: f.label.trim(),
          unit: f.kind === "number" && f.unit?.trim() ? f.unit.trim() : undefined,
          help: f.help?.trim() || undefined,
          filterable: canFilter(f.kind) ? f.filterable === true : false,
          options: hasOptions(f.kind) ? f.options : undefined,
        })),
      };
      return d.id ? TypesAPI.updateProductType(d.id, body) : TypesAPI.createProductType(body);
    },
    onSuccess: () => {
      toast.success(d.id ? "انحفظ النوع" : "انعمل النوع");
      qc.invalidateQueries({ queryKey: ["product-types"] });
      onClose();
    },
    onError: (e) => toast.error("ما انحفظ", { description: getApiErrorMessage(e) }),
  });

  const setField = (i: number, patch: Partial<Draft["fields"][number]>) => setD((x) => ({ ...x, fields: x.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) }));
  const move = (i: number, by: number) =>
    setD((x) => {
      const list = [...x.fields];
      const j = i + by;
      if (j < 0 || j >= list.length) return x;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...x, fields: list };
    });
  const add = () =>
    setD((x) => ({ ...x, fields: [...x.fields, { key: newFieldKey(x.fields.map((f) => f.key)), label: "", kind: "text", showOnPage: true, optionsText: "" }] }));

  return (
    <Modal
      open
      title={d.id ? `تعديل «${initial.name}»` : "نوع جديد"}
      onClose={onClose}
      widthClassName="max-w-3xl"
      footer={
        <div className="flex gap-2">
          <Button
            variant="primary"
            isLoading={save.isPending}
            onClick={() => {
              setTried(true);
              if (nameMissing || daysProblem || Object.keys(problems).length) return;
              save.mutate();
            }}
          >
            حفظ
          </Button>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      }
    >
      <div dir="rtl" className="space-y-5 text-sm" data-testid="type-editor">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-white/55">اسم النوع</span>
            <input className={`${field} ${tried && nameMissing ? "border-red-500/60" : ""}`} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="مثلاً: عباية، تذكرة، كورس" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/55">وصف قصير (اختياري)</span>
            <input className={field} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
          </label>
        </div>

        <fieldset className="rounded-xl border border-white/10 p-3" data-testid="fulfillment-choice">
          <legend className="px-1 text-xs text-white/55">كيف بتوصل للزبونة؟</legend>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="طريقة التسليم">
            {(Object.keys(FULFILLMENT) as Fulfillment[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={d.fulfillment === k}
                onClick={() => setD({ ...d, fulfillment: k })}
                className={`rounded-xl border p-3 text-start transition ${d.fulfillment === k ? "border-accent-400/60 bg-accent-500/15" : "border-white/10 hover:border-white/25"}`}
              >
                <span className="block font-medium">
                  {FULFILLMENT[k].icon} {FULFILLMENT[k].label}
                </span>
                <span className="mt-1 block text-[11px] leading-5 text-white/50">{FULFILLMENT[k].hint}</span>
              </button>
            ))}
          </div>
          {initial.id && initial.fulfillment !== d.fulfillment ? (
            <p className="mt-2 text-[11px] text-amber-300/90">بتتغيّر لكل منتجات هالنوع. الطلبات القديمة ما بتتأثر.</p>
          ) : null}
        </fieldset>

        {shipped ? (
          <fieldset className="rounded-xl border border-white/10 p-3" data-testid="type-delivery">
            <legend className="px-1 text-xs text-white/55">التوصيل (لكل منتجات النوع، إلا إذا المنتج حط غيره)</legend>
            <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
              <label className="block">
                <span className="mb-1 block text-xs text-white/55">بينشحن من</span>
                <input className={field} value={d.delivery.shipsFrom} maxLength={80} onChange={(e) => setD({ ...d, delivery: { ...d.delivery, shipsFrom: e.target.value } })} placeholder="مثلاً: رام الله، تركيا، الصين" />
              </label>
              <div>
                <span className="mb-1 block text-xs text-white/55">التوصيل خلال (أيام)</span>
                <div className="flex items-center gap-2">
                  <input inputMode="numeric" dir="ltr" aria-label="أقل عدد أيام" className={`${field} max-w-[5rem] text-center ${daysProblem ? "border-red-500/60" : ""}`} value={d.delivery.minDays} onChange={(e) => setD({ ...d, delivery: { ...d.delivery, minDays: e.target.value } })} placeholder="2" />
                  <span className="text-xs text-white/45">لحد</span>
                  <input inputMode="numeric" dir="ltr" aria-label="أكثر عدد أيام" className={`${field} max-w-[5rem] text-center ${daysProblem ? "border-red-500/60" : ""}`} value={d.delivery.maxDays} onChange={(e) => setD({ ...d, delivery: { ...d.delivery, maxDays: e.target.value } })} placeholder="5" />
                </div>
              </div>
            </div>
            <p className={`mt-2 text-[11px] ${daysProblem ? "text-red-300" : "text-white/40"}`} data-testid="type-delivery-preview">
              {daysProblem ?? (preview ? `بالمتجر: «${preview}»` : "فاضي = ما بينكتب وقت التوصيل بصفحة المنتج.")}
            </p>
          </fieldset>
        ) : null}

        <fieldset className="rounded-xl border border-white/10 p-3">
          <legend className="px-1 text-xs text-white/55">الاختيارات عند الشراء</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <ChoiceRow label="الاختيار الأول (مع صورة)" value={d.colorLabel} on={d.showColor} onValue={(v) => setD({ ...d, colorLabel: v })} onToggle={(v) => setD({ ...d, showColor: v })} placeholder="اللون" />
            <ChoiceRow label="الاختيار الثاني" value={d.sizeLabel} on={d.showSize} onValue={(v) => setD({ ...d, sizeLabel: v })} onToggle={(v) => setD({ ...d, showSize: v })} placeholder="المقاس" />
          </div>
          <p className="mt-2 text-[11px] text-white/40">مثلاً للتذكرة: الثاني «الدرجة» (اقتصادي، رجال أعمال) والأول مخفي.</p>
        </fieldset>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">الحقول</span>
            <Button size="sm" variant="secondary" onClick={add}>
              + حقل
            </Button>
          </div>
          {d.fields.length ? (
            <ol className="space-y-3">
              {d.fields.map((f, i) => (
                <li key={f.key} className="rounded-xl border border-white/10 bg-white/[0.02] p-3" data-testid={`type-field-${i}`}>
                  <div className="grid gap-2 sm:grid-cols-[1fr_170px_auto]">
                    <input
                      aria-label="اسم الحقل"
                      className={`${field} ${tried && problems[f.key] && !f.label.trim() ? "border-red-500/60" : ""}`}
                      value={f.label}
                      onChange={(e) => setField(i, { label: e.target.value })}
                      placeholder="اسم الحقل، مثلاً: القماش"
                    />
                    <select aria-label="نوع الحقل" className={field} value={f.kind} onChange={(e) => setField(i, { kind: e.target.value as FieldKind })}>
                      {FIELD_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {KIND_LABELS[k].label}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" aria-label="لفوق" onClick={() => move(i, -1)} disabled={i === 0}>
                        ↑
                      </Button>
                      <Button size="sm" variant="ghost" aria-label="لتحت" onClick={() => move(i, 1)} disabled={i === d.fields.length - 1}>
                        ↓
                      </Button>
                      <Button size="sm" variant="ghost" aria-label="حذف الحقل" onClick={() => setD((x) => ({ ...x, fields: x.fields.filter((_, j) => j !== i) }))}>
                        ✕
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-white/40">{KIND_LABELS[f.kind].hint}</p>
                  {hasOptions(f.kind) ? (
                    <textarea
                      aria-label="الاختيارات"
                      rows={3}
                      className={`mt-2 w-full rounded-xl border bg-white/[0.03] p-2 text-sm ${tried && problems[f.key] && f.label.trim() ? "border-red-500/60" : "border-white/[0.08]"}`}
                      value={f.optionsText ?? ""}
                      onChange={(e) => setField(i, { optionsText: e.target.value })}
                      placeholder={"كل اختيار بسطر، مثلاً:\nكريب\nشيفون"}
                    />
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    {f.kind === "number" ? (
                      <label className="flex items-center gap-2">
                        الوحدة
                        <input className={`${field} h-8 w-24`} value={f.unit ?? ""} onChange={(e) => setField(i, { unit: e.target.value })} placeholder="سم" />
                      </label>
                    ) : null}
                    <Check label="مطلوب" checked={f.required === true} onChange={(v) => setField(i, { required: v })} />
                    {canFilter(f.kind) ? <Check label="فلتر بالمتجر" checked={f.filterable === true} onChange={(v) => setField(i, { filterable: v })} /> : null}
                    <Check label="يبيّن بصفحة القطعة" checked={f.showOnPage !== false} onChange={(v) => setField(i, { showOnPage: v })} />
                    <input className={`${field} h-8 min-w-0 flex-1`} value={f.help ?? ""} onChange={(e) => setField(i, { help: e.target.value })} placeholder="تلميح للي بتعبّي (اختياري)" />
                  </div>
                  {tried && problems[f.key] ? <p className="mt-1 text-xs text-red-300">{problems[f.key]}</p> : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-white/45">ما في حقول. اكبسي «+ حقل».</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ChoiceRow({ label, value, on, onValue, onToggle, placeholder }: { label: string; value: string; on: boolean; onValue: (v: string) => void; onToggle: (v: boolean) => void; placeholder: string }) {
  return (
    <div>
      <span className="mb-1 block text-xs text-white/55">{label}</span>
      <div className="flex items-center gap-2">
        <input className={field} value={value} disabled={!on} onChange={(e) => onValue(e.target.value)} placeholder={placeholder} />
        <Check label="يبيّن" checked={on} onChange={onToggle} />
      </div>
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function DeleteType({ type, others, onClose }: { type: ProductType; others: ProductType[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? "");
  const del = useMutation({
    mutationFn: () => TypesAPI.deleteProductType(type.id, type.products ? moveTo : undefined),
    onSuccess: (out) => {
      toast.success(out.moved ? `انحذف النوع وانتقل ${out.moved} منتج` : "انحذف النوع");
      qc.invalidateQueries({ queryKey: ["product-types"] });
      onClose();
    },
    onError: (e) => toast.error("ما انحذف", { description: getApiErrorMessage(e) }),
  });
  const blocked = type.products > 0 && !moveTo;
  return (
    <Modal
      open
      title={`حذف «${type.name}»`}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="danger" onClick={() => del.mutate()} isLoading={del.isPending} disabled={blocked}>
            حذف
          </Button>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      }
    >
      <div dir="rtl" className="space-y-3 text-sm">
        {type.products ? (
          others.length ? (
            <>
              <p>{`في ${type.products} منتج من هالنوع. لوين ينتقلوا؟ قيم حقولهم بتضل محفوظة، بس بتبيّن بس إذا النوع الجديد إله نفس الحقول.`}</p>
              <select className={field} value={moveTo} onChange={(e) => setMoveTo(e.target.value)} aria-label="النوع الجديد">
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <p>ما في نوع ثاني تنقلي إله المنتجات. اعملي نوع جديد أول.</p>
          )
        ) : (
          <p>ما في منتجات من هالنوع. بينحذف نهائياً.</p>
        )}
      </div>
    </Modal>
  );
}

/** The template library: search, groups, pick one to start a type from. */
function TemplateGallery({ onPick, onClose }: { onPick: (t: TypeTemplate) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<TemplateGroup | null>(null);
  const list = findTemplates(q, group);
  return (
    <Modal open title="قوالب الأنواع" onClose={onClose} widthClassName="max-w-4xl">
      <div dir="rtl" className="space-y-3 text-sm" data-testid="templates-gallery">
        <p className="text-xs text-white/55">اختاري قالب وبيفتح جاهز بحقوله واختياراته. بتقدري تعدّلي كل إشي قبل الحفظ.</p>
        <input className={field} value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّري: موبايل، عطر، Steam، كتب…" aria-label="بحث بالقوالب" />
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="القسم">
          {[{ id: null as TemplateGroup | null, label: "الكل" }, ...TEMPLATE_GROUPS].map((g) => (
            <button
              key={g.id ?? "all"}
              type="button"
              role="radio"
              aria-checked={group === g.id}
              onClick={() => setGroup(g.id)}
              className={`rounded-full border px-3 py-1 text-xs ${group === g.id ? "border-accent-400/60 bg-accent-500/15" : "border-white/10 text-white/70 hover:border-white/25"}`}
            >
              {g.label}
            </button>
          ))}
        </div>
        {list.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => onPick(t)} className="h-full w-full rounded-xl border border-white/10 p-3 text-start transition hover:border-accent-400/50 hover:bg-white/[0.03]" data-testid={`template-${t.id}`}>
                  <span className="block font-medium">
                    {t.icon} {t.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-white/50">{t.hint}</span>
                  <span className="mt-2 block text-[11px] text-white/40">
                    {FULFILLMENT[t.type.fulfillment].icon} {FULFILLMENT[t.type.fulfillment].label} · {t.type.fields.length} حقول
                    {t.type.showColor || t.type.showSize ? ` · ${[t.type.showColor ? t.type.colorLabel : "", t.type.showSize ? t.type.sizeLabel : ""].filter(Boolean).join(" × ")}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-xs text-white/50">ما في قالب هيك. ابدئي بنوع فاضي من «+ نوع جديد».</p>
        )}
      </div>
    </Modal>
  );
}
