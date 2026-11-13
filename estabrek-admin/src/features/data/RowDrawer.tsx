/**
 * One row, whole: its address, its status and every field (words in the three languages at once).
 * A new row gets its address from its words when none is written.
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "../../lib/toast";
import { say } from "../../studio/say";
import { Modal } from "../../components/ui/Modal";
import { MediaLibraryModal } from "../../components/media/MediaLibraryModal";
import type { Collection, ItemStatus } from "../../api/collections.api";
import * as DataAPI from "../../api/data.api";
import type { GridRow, Issue, Lang } from "../../api/data.api";
import { ValueInput, input } from "./GridCells";
import { LANGS, LANG_NAME, WORDS, issueSay } from "./dataText";

const btn = "rounded-lg bg-white/[0.07] px-3 py-1.5 text-xs hover:bg-white/[0.12] disabled:opacity-40";
const primary = "rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white hover:brightness-110 disabled:opacity-40";
const name = (v: Partial<Record<Lang, string>> | undefined, lang: Lang) => v?.[lang] || v?.ar || v?.en || v?.he || "";

/** The form's values: each field as a string (words: one per language under "id.lang"). */
function startValues(table: Collection, row: GridRow | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of table.fields) {
    const v = row?.data?.[f.id];
    if (WORDS.includes(f.type)) for (const l of LANGS) out[`${f.id}.${l}`] = v && typeof v === "object" ? ((v as Record<string, string>)[l] ?? "") : "";
    else out[f.id] = v === undefined || v === null ? "" : String(v);
  }
  return out;
}

export function RowDrawer({ table, row, lang, canWrite, onClose, onSaved }: { table: Collection; row: GridRow | null; lang: Lang; canWrite: boolean; onClose: () => void; onSaved: () => void }) {
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [status, setStatus] = useState<ItemStatus>(row?.status ?? "DRAFT");
  const [values, setValues] = useState(() => startValues(table, row));
  const [issues, setIssues] = useState<Issue[]>([]);
  const [picking, setPicking] = useState<string | null>(null);
  const set = (key: string, v: string) => setValues((was) => ({ ...was, [key]: v }));
  const text = (i: Issue) => {
    const words = issueSay(i, lang);
    return "own" in words ? words.own : say(words.general);
  };
  const problem = (key: string) => {
    const found = issues.find((i) => i.field === key || i.field === key.split(".")[0]);
    return found ? text(found) : undefined;
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!row) return DataAPI.addRow(table.id, { slug: slug.trim() || undefined, status, values, lang });
      // Every field is sent as the form holds it: words whole (their three languages), the rest as written.
      const out: Record<string, unknown> = {};
      for (const f of table.fields) {
        if (WORDS.includes(f.type)) {
          const words: Record<string, string> = {};
          for (const l of LANGS) if (values[`${f.id}.${l}`]?.trim()) words[l] = values[`${f.id}.${l}`];
          out[f.id] = Object.keys(words).length ? words : null;
        } else if (f.type === "boolean") out[f.id] = values[f.id] === "" ? null : values[f.id] === "true";
        else out[f.id] = values[f.id].trim() === "" ? null : values[f.id].trim();
      }
      return DataAPI.patchRow(table.id, row.id, { ...(slug.trim() !== row.slug ? { slug: slug.trim() } : {}), ...(status !== row.status ? { status } : {}), values: out, lang });
    },
    onSuccess: () => {
      toast.success(row ? say("انحفظ السطر|The row was saved|השורה נשמרה") : say("انضاف السطر|The row was added|השורה נוספה"));
      onSaved();
    },
    onError: (e) => {
      const data = (e as { response?: { data?: { error?: string; details?: { issues?: Issue[] } } } })?.response?.data;
      const found = data?.details?.issues ?? (data?.error === "SLUG_TAKEN" ? [{ field: "slug", message: "This address is already used" }] : []);
      setIssues(found);
      toast.error(say("في قيم مش مزبوطة|Some values are wrong|יש ערכים שגויים"), { description: found.map((i) => `${i.field}: ${text(i)}`).join(" · ") || undefined });
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={row ? say("السطر|The row|השורה") : say("سطر جديد|A new row|שורה חדשה")}
      widthClassName="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className={primary} disabled={!canWrite || save.isPending} onClick={() => save.mutate()} data-testid="row-save">
            {say("احفظ|Save|שמור")}
          </button>
        </div>
      }
    >
      <div className="max-h-[65vh] space-y-3 overflow-y-auto pe-1" data-testid="row-form">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-xs text-white/60">
            {say("العنوان بالرابط|Address|כתובת")}
            <input className={`${input} mt-1`} dir="ltr" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={row ? undefined : say("بينعمل لحاله من الكلام|made from the words|נוצר מהטקסט")} data-testid="row-slug" />
            {problem("slug") ? <span className="mt-1 block text-red-300">{problem("slug")}</span> : null}
          </label>
          <label className="block text-xs text-white/60">
            {say("الحالة|Status|מצב")}
            <span className="mt-1 block">
              <ValueInput kind="$status" lang={lang} value={status} onChange={(v) => setStatus(v as ItemStatus)} testId="row-status" />
            </span>
          </label>
        </div>
        {table.fields.map((f) => {
          const label = (
            <span className="flex items-center gap-1">
              {name(f.name, lang) || f.id}
              {f.required ? <span className="text-red-300">*</span> : null}
            </span>
          );
          if (WORDS.includes(f.type)) {
            return (
              <fieldset key={f.id} className="text-xs text-white/60" data-testid={`row-field-${f.id}`}>
                <legend>{label}</legend>
                <div className={`mt-1 grid gap-2 ${f.type === "text" ? "sm:grid-cols-3" : ""}`}>
                  {LANGS.map((l) => (
                    <label key={l} className="block">
                      <span className="text-white/35">{LANG_NAME[l]}</span>
                      <span dir={l === "en" ? "ltr" : "rtl"} className="block">
                        <ValueInput kind={f.type} lang={lang} value={values[`${f.id}.${l}`] ?? ""} onChange={(v) => set(`${f.id}.${l}`, v)} big testId={`row-${f.id}-${l}`} />
                      </span>
                    </label>
                  ))}
                </div>
                {name(f.help, lang) ? <span className="mt-1 block text-white/40">{name(f.help, lang)}</span> : null}
                {problem(f.id) ? <span className="mt-1 block text-red-300">{problem(f.id)}</span> : null}
              </fieldset>
            );
          }
          return (
            <label key={f.id} className="block text-xs text-white/60" data-testid={`row-field-${f.id}`}>
              {label}
              <span className="mt-1 flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <ValueInput kind={f.type} field={f} lang={lang} value={values[f.id] ?? ""} onChange={(v) => set(f.id, v)} testId={`row-${f.id}`} />
                </span>
                {f.type === "image" ? (
                  <>
                    {values[f.id] ? <img src={values[f.id]} alt="" className="h-8 w-8 rounded object-cover" /> : null}
                    <button type="button" className={btn} onClick={() => setPicking(f.id)}>
                      {say("اختار صورة|Pick a picture|בחר תמונה")}
                    </button>
                  </>
                ) : null}
              </span>
              {name(f.help, lang) ? <span className="mt-1 block text-white/40">{name(f.help, lang)}</span> : null}
              {problem(f.id) ? <span className="mt-1 block text-red-300">{problem(f.id)}</span> : null}
            </label>
          );
        })}
      </div>
      <MediaLibraryModal
        open={picking !== null}
        title={say("صورة|A picture|תמונה")}
        onClose={() => setPicking(null)}
        onSelect={(url) => {
          if (picking) set(picking, url);
          setPicking(null);
        }}
      />
    </Modal>
  );
}
