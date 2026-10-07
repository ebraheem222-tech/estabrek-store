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
import { FULFILLMENT, KIND_LABELS, canFilter, fieldProblems, hasOptions, newFieldKey, parseOptions } from "./types/typeText";

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
  fields: Array<TypeField & { optionsText?: string }>;
};

type Fulfillment = ProductType["fulfillment"];

const emptyType = (): Draft => ({ name: "", description: "", colorLabel: "اللون", sizeLabel: "المقاس", showColor: true, showSize: true, fulfillment: "SHIPPING", fields: [] });

const toDraft = (t: ProductType): Draft => ({
  id: t.id,
  name: t.name,
  description: t.description ?? "",
  colorLabel: t.colorLabel,
  sizeLabel: t.sizeLabel,
  showColor: t.showColor,
  showSize: t.showSize,
  fulfillment: t.fulfillment ?? "SHIPPING",
  fields: t.fields.map((f) => ({ ...f, optionsText: (f.options ?? []).join("\n") })),
});

/** Ready-made starting points for common kinds. */
const TEMPLATES: Array<{ name: string; hint: string; draft: () => Draft }> = [
  {
    name: "تذكرة / حجز",
    hint: "موعد، مقاعد، كود دخول",
    draft: () => ({
      ...emptyType(),
      name: "تذكرة",
      sizeLabel: "الدرجة",
      showColor: false,
      fulfillment: "BOOKING",
      fields: [
        { key: "from_city", label: "من", kind: "text", showOnPage: true },
        { key: "to_city", label: "إلى", kind: "text", showOnPage: true },
      ],
    }),
  },
  {
    name: "كورس / ورشة",
    hint: "المدة، المستوى، الرابط",
    draft: () => ({
      ...emptyType(),
      name: "كورس",
      showColor: false,
      showSize: false,
      fulfillment: "BOOKING",
      fields: [
        { key: "hours", label: "المدة", kind: "number", unit: "ساعة", showOnPage: true },
        { key: "level", label: "المستوى", kind: "select", options: ["مبتدئ", "متوسط", "متقدم"], optionsText: "مبتدئ\nمتوسط\nمتقدم", filterable: true, showOnPage: true },
        { key: "course_link", label: "رابط الكورس", kind: "url", showOnPage: false },
      ],
    }),
  },
  {
    name: "منتج رقمي",
    hint: "ملفات بتنزل بعد الدفع",
    draft: () => ({
      ...emptyType(),
      name: "منتج رقمي",
      showColor: false,
      showSize: false,
      fulfillment: "DIGITAL",
      fields: [
        { key: "file_type", label: "نوع الملف", kind: "select", options: ["PDF", "صورة", "فيديو"], optionsText: "PDF\nصورة\nفيديو", showOnPage: true, filterable: true },
        { key: "pages", label: "عدد الصفحات", kind: "number", showOnPage: true },
      ],
    }),
  },
];

export default function ProductTypesPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("catalog:write");
  const q = useQuery({ queryKey: ["product-types"], queryFn: TypesAPI.listProductTypes });
  const [editing, setEditing] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState<ProductType | null>(null);
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
            {TEMPLATES.map((t) => (
              <button key={t.name} type="button" onClick={() => setEditing(t.draft())} className="rounded-full border border-white/10 px-3 py-1.5 hover:border-white/25">
                {t.name} <span className="text-white/40">· {t.hint}</span>
              </button>
            ))}
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
              if (nameMissing || Object.keys(problems).length) return;
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
