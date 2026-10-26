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
import { TranslationsPanel } from "../../components/TranslationsPanel";
import { useSettings } from "../../hooks/useSettings";
import { tidyTranslations, translationLangs, translationsOf, type TranslationRow, type Translations } from "../../lib/translations";
import { tr } from "@/lib/words";

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
  /** Name, the two choices' names, and each field's label, unit and choices in the shop's other languages. */
  translations: Translations;
};

type Fulfillment = ProductType["fulfillment"];

const noDelivery = { shipsFrom: "", minDays: "", maxDays: "" };
const emptyType = (): Draft => ({ name: "", description: "", colorLabel: "اللون", sizeLabel: "المقاس", showColor: true, showSize: true, fulfillment: "SHIPPING", delivery: noDelivery, fields: [], translations: {} });

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
  translations: translationsOf(t.translations),
});

const fromTemplate = (t: TypeTemplate): Draft => ({
  ...emptyType(),
  ...t.type,
  description: t.type.description ?? "",
  fields: t.type.fields.map((f) => ({ ...f, optionsText: (f.options ?? []).join("\n") })),
});

/** What the shop shows of a type: its name, the two choices' names, and the fields (label, unit, each choice). */
function typeRows(d: Draft, fields: Array<TypeField>): TranslationRow[] {
  const rows: TranslationRow[] = [{ path: ["name"], label: tr("اسم النوع", "Type name"), base: d.name, max: 60 }];
  if (d.showColor) rows.push({ path: ["colorLabel"], label: tr("الاختيار الأول", "First choice"), base: d.colorLabel, max: 30 });
  if (d.showSize) rows.push({ path: ["sizeLabel"], label: tr("الاختيار الثاني", "Second choice"), base: d.sizeLabel, max: 30 });
  for (const f of fields) {
    const group = tr(`حقل «${f.label || f.key}»`, "Field “{0}”", [f.label || f.key]);
    rows.push({ path: ["fields", f.key, "label"], label: tr("اسم الحقل", "Field name"), base: f.label, max: 60, group });
    if (f.kind === "number" && f.unit) rows.push({ path: ["fields", f.key, "unit"], label: tr("الوحدة", "Unit"), base: f.unit, max: 16, group });
    for (const o of f.options ?? []) rows.push({ path: ["fields", f.key, "options", o], label: o, base: o, max: 60, group });
  }
  return rows;
}

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
    <div className="space-y-4" data-testid="product-types-page">
      <div className={box}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">{tr("أنواع المنتجات", "Product types")}</h1>
            <p className="mt-1 text-sm text-white/60">
              {tr("كل نوع إله حقوله: الملابس (قماش، طول، غسيل)، تذكرة (من، إلى، تاريخ)، كورس (مدة، رابط)… الحقول بتطلع بصفحة إضافة المنتج، وبصفحة القطعة بالمتجر، واللي عليها علامة «فلتر» بتصير فلاتر بالمتجر. ما بدها مطوّر.", "Each type has its own fields: clothes (fabric, length, washing), a ticket (from, to, date), a course (duration, link)… The fields show on the add-product page and on the product page in the store; the ones marked “filter” become store filters. No developer needed.")}
            </p>
          </div>
          {canWrite ? (
            <Button variant="primary" className="shrink-0 whitespace-nowrap" onClick={() => setEditing(emptyType())}>
              {tr("+ نوع جديد", "+ New type")}
            </Button>
          ) : null}
        </div>
        {canWrite ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-white/50">{tr("أو البداية من:", "Or start from:")}</span>
            {TYPE_TEMPLATES.filter((t) => t.quick).map((t) => (
              <button key={t.id} type="button" onClick={() => setEditing(fromTemplate(t))} className="rounded-full border border-white/10 px-3 py-1.5 hover:border-white/25">
                {t.icon} {t.name}
              </button>
            ))}
            <button type="button" onClick={() => setGallery(true)} className="rounded-full bg-accent-500/15 px-3 py-1.5 text-accent-200 hover:bg-accent-500/25" data-testid="open-templates">
              {tr("كل القوالب (", "All templates (")}{TYPE_TEMPLATES.length}) ←
            </button>
          </div>
        ) : null}
      </div>

      {q.isLoading ? (
        <div className={`${box} flex items-center gap-2 text-sm`}>
          <Spinner /> {tr("جاري التحميل…", "Loading…")}
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
                    {i === 0 ? <Badge size="sm">{tr("الافتراضي للمنتجات الجديدة", "Default for new products")}</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-white/50">
                    {FULFILLMENT[t.fulfillment ?? "SHIPPING"].icon} {FULFILLMENT[t.fulfillment ?? "SHIPPING"].label} · {t.products} {tr("منتج ·", "products ·")} {t.showColor ? t.colorLabel : tr("بدون ألوان", "No colours")} · {t.showSize ? t.sizeLabel : tr("بدون مقاسات", "No sizes")}
                  </p>
                  {(t.fulfillment ?? "SHIPPING") === "SHIPPING" && typeDelivery(t) ? <p className="mt-0.5 text-xs text-white/45">🚚 {typeDelivery(t)}</p> : null}
                </div>
                {canWrite ? (
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(toDraft(t))}>
                      {tr("تعديل", "Edit")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRemoving(t)}>
                      {tr("حذف", "Delete")}
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
                      {f.filterable ? <span className="text-accent-300"> {tr("· فلتر", "· filter")}</span> : null}
                      {f.required ? <span className="text-red-300"> *</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-white/45">{tr("بدون حقول بعد.", "No fields yet.")}</p>
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
  const { main, others } = translationLangs(useSettings().data?.header);
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
        translations: tidyTranslations(d.translations),
      };
      return d.id ? TypesAPI.updateProductType(d.id, body) : TypesAPI.createProductType(body);
    },
    onSuccess: () => {
      toast.success(d.id ? tr("انحفظ النوع", "Type saved") : tr("انعمل النوع", "Type created"));
      qc.invalidateQueries({ queryKey: ["product-types"] });
      onClose();
    },
    onError: (e) => toast.error(tr("ما انحفظ", "Not saved"), { description: getApiErrorMessage(e) }),
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
      title={d.id ? tr(`تعديل «${initial.name}»`, "Edit “{0}”", [initial.name]) : tr("نوع جديد", "New type")}
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
            {tr("حفظ", "Save")}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {tr("إلغاء", "Cancel")}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 text-sm" data-testid="type-editor">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-white/55">{tr("اسم النوع", "Type name")}</span>
            <input className={`${field} ${tried && nameMissing ? "border-red-500/60" : ""}`} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder={tr("مثلاً: عباية، تذكرة، كورس", "e.g. abaya, ticket, course")} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/55">{tr("وصف قصير (اختياري)", "Short description (optional)")}</span>
            <input className={field} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
          </label>
        </div>

        <fieldset className="rounded-xl border border-white/10 p-3" data-testid="fulfillment-choice">
          <legend className="px-1 text-xs text-white/55">{tr("كيف بتوصل للزبون؟", "How does it reach the customer?")}</legend>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={tr("طريقة التسليم", "Delivery method")}>
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
            <p className="mt-2 text-[11px] text-amber-300/90">{tr("بتتغيّر لكل منتجات هالنوع. الطلبات القديمة ما بتتأثر.", "It changes for every product of this type. Old orders aren't affected.")}</p>
          ) : null}
        </fieldset>

        {shipped ? (
          <fieldset className="rounded-xl border border-white/10 p-3" data-testid="type-delivery">
            <legend className="px-1 text-xs text-white/55">{tr("التوصيل (لكل منتجات النوع، إلا إذا المنتج حط غيره)", "Delivery (for every product of the type, unless the product sets its own)")}</legend>
            <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
              <label className="block">
                <span className="mb-1 block text-xs text-white/55">{tr("بينشحن من", "Ships from")}</span>
                <input className={field} value={d.delivery.shipsFrom} maxLength={80} onChange={(e) => setD({ ...d, delivery: { ...d.delivery, shipsFrom: e.target.value } })} placeholder={tr("مثلاً: رام الله، تركيا، الصين", "e.g. Ramallah, Turkey, China")} />
              </label>
              <div>
                <span className="mb-1 block text-xs text-white/55">{tr("التوصيل خلال (أيام)", "Delivery in (days)")}</span>
                <div className="flex items-center gap-2">
                  <input inputMode="numeric" dir="ltr" aria-label={tr("أقل عدد أيام", "Fewest days")} className={`${field} max-w-[5rem] text-center ${daysProblem ? "border-red-500/60" : ""}`} value={d.delivery.minDays} onChange={(e) => setD({ ...d, delivery: { ...d.delivery, minDays: e.target.value } })} placeholder="2" />
                  <span className="text-xs text-white/45">{tr("لحد", "to")}</span>
                  <input inputMode="numeric" dir="ltr" aria-label={tr("أكثر عدد أيام", "Most days")} className={`${field} max-w-[5rem] text-center ${daysProblem ? "border-red-500/60" : ""}`} value={d.delivery.maxDays} onChange={(e) => setD({ ...d, delivery: { ...d.delivery, maxDays: e.target.value } })} placeholder="5" />
                </div>
              </div>
            </div>
            <p className={`mt-2 text-[11px] ${daysProblem ? "text-red-300" : "text-white/40"}`} data-testid="type-delivery-preview">
              {daysProblem ?? (preview ? tr(`بالمتجر: «${preview}»`, "In the store: “{0}”", [preview]) : tr("فاضي = ما بينكتب وقت التوصيل بصفحة المنتج.", "Empty = no delivery time on the product page."))}
            </p>
          </fieldset>
        ) : null}

        <fieldset className="rounded-xl border border-white/10 p-3">
          <legend className="px-1 text-xs text-white/55">{tr("الاختيارات عند الشراء", "Choices when buying")}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <ChoiceRow label={tr("الاختيار الأول (مع صورة)", "First choice (with a photo)")} value={d.colorLabel} on={d.showColor} onValue={(v) => setD({ ...d, colorLabel: v })} onToggle={(v) => setD({ ...d, showColor: v })} placeholder="اللون" />
            <ChoiceRow label={tr("الاختيار الثاني", "Second choice")} value={d.sizeLabel} on={d.showSize} onValue={(v) => setD({ ...d, sizeLabel: v })} onToggle={(v) => setD({ ...d, showSize: v })} placeholder="المقاس" />
          </div>
          <p className="mt-2 text-[11px] text-white/40">{tr("مثلاً للتذكرة: الثاني «الدرجة» (اقتصادي، رجال أعمال) والأول مخفي.", "e.g. for a ticket: the second is “Class” (economy, business) and the first is hidden.")}</p>
        </fieldset>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">{tr("الحقول", "Fields")}</span>
            <Button size="sm" variant="secondary" onClick={add}>
              {tr("+ حقل", "+ Field")}
            </Button>
          </div>
          {d.fields.length ? (
            <ol className="space-y-3">
              {d.fields.map((f, i) => (
                <li key={f.key} className="rounded-xl border border-white/10 bg-white/[0.02] p-3" data-testid={`type-field-${i}`}>
                  <div className="grid gap-2 sm:grid-cols-[1fr_170px_auto]">
                    <input
                      aria-label={tr("اسم الحقل", "Field name")}
                      className={`${field} ${tried && problems[f.key] && !f.label.trim() ? "border-red-500/60" : ""}`}
                      value={f.label}
                      onChange={(e) => setField(i, { label: e.target.value })}
                      placeholder={tr("اسم الحقل، مثلاً: القماش", "Field name, e.g. fabric")}
                    />
                    <select aria-label={tr("نوع الحقل", "Field kind")} className={field} value={f.kind} onChange={(e) => setField(i, { kind: e.target.value as FieldKind })}>
                      {FIELD_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {KIND_LABELS[k].label}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" aria-label={tr("لفوق", "Up")} onClick={() => move(i, -1)} disabled={i === 0}>
                        ↑
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={tr("لتحت", "Down")} onClick={() => move(i, 1)} disabled={i === d.fields.length - 1}>
                        ↓
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={tr("حذف الحقل", "Delete field")} onClick={() => setD((x) => ({ ...x, fields: x.fields.filter((_, j) => j !== i) }))}>
                        ✕
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-white/40">{KIND_LABELS[f.kind].hint}</p>
                  {hasOptions(f.kind) ? (
                    <textarea
                      aria-label={tr("الاختيارات", "Choices")}
                      rows={3}
                      className={`mt-2 w-full rounded-xl border bg-white/[0.03] p-2 text-sm ${tried && problems[f.key] && f.label.trim() ? "border-red-500/60" : "border-white/[0.08]"}`}
                      value={f.optionsText ?? ""}
                      onChange={(e) => setField(i, { optionsText: e.target.value })}
                      placeholder={tr("كل اختيار بسطر، مثلاً:\nكريب\nشيفون", "One choice per line, e.g.:\nCrepe\nChiffon")}
                    />
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    {f.kind === "number" ? (
                      <label className="flex items-center gap-2">
                        {tr("الوحدة", "Unit")}
                        <input className={`${field} h-8 w-24`} value={f.unit ?? ""} onChange={(e) => setField(i, { unit: e.target.value })} placeholder={tr("سم", "cm")} />
                      </label>
                    ) : null}
                    <Check label={tr("مطلوب", "Required")} checked={f.required === true} onChange={(v) => setField(i, { required: v })} />
                    {canFilter(f.kind) ? <Check label={tr("فلتر بالمتجر", "Store filter")} checked={f.filterable === true} onChange={(v) => setField(i, { filterable: v })} /> : null}
                    <Check label={tr("يبيّن بصفحة القطعة", "Shows on the product page")} checked={f.showOnPage !== false} onChange={(v) => setField(i, { showOnPage: v })} />
                    <input className={`${field} h-8 min-w-0 flex-1`} value={f.help ?? ""} onChange={(e) => setField(i, { help: e.target.value })} placeholder={tr("تلميح للي بيعبّي (اختياري)", "A hint for whoever fills it (optional)")} />
                  </div>
                  {tried && problems[f.key] ? <p className="mt-1 text-xs text-red-300">{problems[f.key]}</p> : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-white/45">{tr("ما في حقول. «+ حقل» بيضيف واحد.", "No fields. Press “+ Field”.")}</p>
          )}
        </div>
        <TranslationsPanel
          langs={others}
          main={main}
          rows={typeRows(d, fields)}
          value={d.translations}
          onChange={(next) => setD((x) => ({ ...x, translations: next }))}
          context={tr(`نوع منتج بالمتجر «${d.name}»: اسمه، أسماء الاختيارات والحقول وخياراتها (كلمات قصيرة)`, "A store product type “{0}”: its name, the choice names, the fields and their options (short words)", [d.name])}
        />
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
        <Check label={tr("يبيّن", "Shows")} checked={on} onChange={onToggle} />
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
      toast.success(out.moved ? tr(`انحذف النوع وانتقل ${out.moved} منتج`, "Type deleted and {0} products moved", [out.moved]) : tr("انحذف النوع", "Type deleted"));
      qc.invalidateQueries({ queryKey: ["product-types"] });
      onClose();
    },
    onError: (e) => toast.error(tr("ما انحذف", "Not deleted"), { description: getApiErrorMessage(e) }),
  });
  const blocked = type.products > 0 && !moveTo;
  return (
    <Modal
      open
      title={tr(`حذف «${type.name}»`, "Delete “{0}”", [type.name])}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="danger" onClick={() => del.mutate()} isLoading={del.isPending} disabled={blocked}>
            {tr("حذف", "Delete")}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {tr("إلغاء", "Cancel")}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        {type.products ? (
          others.length ? (
            <>
              <p>{tr(`في ${type.products} منتج من هالنوع. لوين ينتقلوا؟ قيم حقولهم بتضل محفوظة، بس بتبيّن بس إذا النوع الجديد إله نفس الحقول.`, "There are {0} products of this type. Where should they move? Their field values stay saved, but only show if the new type has the same fields.", [type.products])}</p>
              <select className={field} value={moveTo} onChange={(e) => setMoveTo(e.target.value)} aria-label={tr("النوع الجديد", "New type")}>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <p>{tr("ما في نوع ثاني تنتقل إله المنتجات. لازم ينعمل نوع جديد أول.", "There's no other type to move the products to. Make a new type first.")}</p>
          )
        ) : (
          <p>{tr("ما في منتجات من هالنوع. بينحذف نهائياً.", "No products of this type. It's deleted for good.")}</p>
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
    <Modal open title={tr("قوالب الأنواع", "Type templates")} onClose={onClose} widthClassName="max-w-4xl">
      <div className="space-y-3 text-sm" data-testid="templates-gallery">
        <p className="text-xs text-white/55">{tr("القالب بيفتح جاهز بحقوله واختياراته، وكل إشي بيتعدّل قبل الحفظ.", "Pick a template and it opens ready with its fields and choices. Everything can be edited before saving.")}</p>
        <input className={field} value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("بحث: موبايل، عطر، Steam، كتب…", "Search: phone, perfume, Steam, books…")} aria-label={tr("بحث بالقوالب", "Search templates")} />
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={tr("القسم", "Category")}>
          {[{ id: null as TemplateGroup | null, label: tr("الكل", "All") }, ...TEMPLATE_GROUPS].map((g) => (
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
                    {FULFILLMENT[t.type.fulfillment].icon} {FULFILLMENT[t.type.fulfillment].label} · {t.type.fields.length} {tr("حقول", "fields")}
                    {t.type.showColor || t.type.showSize ? ` · ${[t.type.showColor ? t.type.colorLabel : "", t.type.showSize ? t.type.sizeLabel : ""].filter(Boolean).join(" × ")}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-xs text-white/50">{tr("ما في قالب هيك. البداية بنوع فاضي من «+ نوع جديد».", "No template like that. Start with an empty type from “+ New type”.")}</p>
        )}
      </div>
    </Modal>
  );
}
