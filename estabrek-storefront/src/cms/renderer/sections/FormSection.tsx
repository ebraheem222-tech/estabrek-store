"use client";

import { useMemo, useState, type FormEvent } from "react";

type Ui = { sectionClass?: string; containerClass?: string };

export type FormFieldType = "text" | "email" | "tel" | "textarea";

export type FormField = {
  label: string;
  name: string;
  type?: FormFieldType;
  placeholder?: string;
  required?: boolean;
};

export type FormAction = {
  mode: "WHATSAPP" | "EMAIL";
  whatsappNumber?: string;
  email?: string;
};

export type FormData = {
  title?: string;
  description?: string;
  submitLabel?: string;
  action?: FormAction;
  fields?: FormField[];
  ui?: Ui;
};

function normalizeWhatsAppNumber(raw?: string) {
  if (!raw) return "";
  const s = String(raw).trim();
  // allow: +9725..., 9725..., 05...
  if (s.startsWith("+")) return s.replace(/\s+/g, "");
  return s.replace(/\D+/g, "");
}

function buildMessage(title: string, values: Record<string, string>, fields: FormField[]) {
  const lines: string[] = [];
  if (title.trim()) lines.push(title.trim());
  for (const f of fields) {
    const v = (values[f.name] ?? "").trim();
    if (!v) continue;
    lines.push(`${f.label}: ${v}`);
  }
  return lines.join("\n");
}

export function FormSection({ data }: { data: FormData }) {
  const fields = useMemo(() => (Array.isArray(data?.fields) ? data.fields : []), [data]);
  const action: FormAction = data?.action ?? { mode: "WHATSAPP" };

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) init[f.name] = "";
    return init;
  });
  const [submitted, setSubmitted] = useState(false);

  const onChange = (name: string, v: string) => setValues((s) => ({ ...s, [name]: v }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();

    // basic required validation
    for (const f of fields) {
      if (f.required && !(values[f.name] ?? "").trim()) {
        alert(`مطلوب: ${f.label}`);
        return;
      }
    }

    const title = data?.title ?? "";
    const msg = buildMessage(title, values, fields);
    const encoded = encodeURIComponent(msg);

    if (action.mode === "EMAIL") {
      const email = (action.email ?? "").trim();
      if (!email) {
        alert("حط Email داخل إعدادات الفورم (CMS) أولاً");
        return;
      }
      window.open(`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(title || "Message")}&body=${encoded}`, "_blank");
    } else {
      const phone = normalizeWhatsAppNumber(action.whatsappNumber);
      if (!phone) {
        alert("حط رقم WhatsApp داخل إعدادات الفورم (CMS) أولاً");
        return;
      }
      window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
    }

    setSubmitted(true);
  };

  return (
    <section className={data?.ui?.sectionClass ?? ""}>
      <div className={(data?.ui?.containerClass ?? "").trim() || "mx-auto w-full max-w-6xl px-4"}>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          {data?.title ? <h3 className="text-lg font-semibold">{data.title}</h3> : null}
          {data?.description ? <div className="mt-2 text-sm opacity-80">{data.description}</div> : null}

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            {fields.map((f) => {
              const t = f.type ?? "text";
              const common = {
                name: f.name,
                value: values[f.name] ?? "",
                placeholder: f.placeholder ?? "",
                required: !!f.required,
                onChange: (e: any) => onChange(f.name, e.target.value),
                className:
                  "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/25",
              };

              return (
                <div key={f.name} className="space-y-2">
                  <label className="text-sm font-medium opacity-90">
                    {f.label}
                    {f.required ? <span className="opacity-70"> *</span> : null}
                  </label>
                  {t === "textarea" ? (
                    <textarea {...common} rows={4} />
                  ) : (
                    <input {...common} type={t} />
                  )}
                </div>
              );
            })}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              {(typeof data?.submitLabel === "string" ? data.submitLabel.trim() : "") || "إرسال"}
            </button>

            {submitted ? <div className="text-xs opacity-70">تم فتح قناة الإرسال. إذا بدك، ارجع وعدّل البيانات.</div> : null}
          </form>
        </div>
      </div>
    </section>
  );
}
