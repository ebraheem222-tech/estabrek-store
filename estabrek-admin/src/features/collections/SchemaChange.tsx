/**
 * A change of a table's fields, shown before it's made, and the table's earlier versions (B2):
 * what each changed field does to the rows that are there (the server counts it), a few of the
 * values that don't fit with why, and "go back to this version".
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../../lib/toast";
import { getApiErrorMessage } from "../../api/http";
import { say } from "../../studio/say";
import { Modal } from "../../components/ui/Modal";
import { listVersions, previewVersion, restoreVersion, type Collection, type Impact, type Local } from "../../api/collections.api";
import { issueWords } from "../data/dataText";
import { impactText, versionLine } from "./schemaText";

type Lang = "ar" | "en" | "he";
const btn = "rounded-lg bg-white/[0.07] px-3 py-1.5 text-xs hover:bg-white/[0.12] disabled:opacity-40";
const primary = "rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white hover:brightness-110 disabled:opacity-40";

/** What the change does, field by field; "apply" only after it's been read. */
export function ChangeDialog({ title, changes, nameOf, busy, onAccept, onCancel }: { title: string; changes: Impact[]; nameOf: (id: string) => string; busy: boolean; onAccept: () => void; onCancel: () => void }) {
  return (
    <Modal
      open
      onClose={busy ? () => undefined : onCancel}
      disableBackdropClose
      title={title}
      widthClassName="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className={primary} disabled={busy} onClick={onAccept} data-testid="schema-accept">
            {say("طبّق التغيير|Apply the change|החל את השינוי")}
          </button>
        </div>
      }
    >
      <div className="max-h-[60vh] space-y-3 overflow-y-auto pe-1 text-sm" data-testid="schema-changes">
        {changes.length ? (
          <p className="text-xs text-white/55">{say("ما في شي بينحذف: القيم اللي ما بتناسب بتتخبّى وبترجع إذا رجّعت الحقل متل ما كان.|Nothing is deleted: values that don't fit are put aside, and come back if the field is put back as it was.|דבר לא נמחק: ערכים שאינם מתאימים מוסתרים וחוזרים אם השדה מוחזר.")}</p>
        ) : (
          <p className="text-white/70" data-testid="schema-no-rows">{say("ما في سطور بتتأثر بهالتغيير.|No row is touched by this change.|אף שורה לא מושפעת מהשינוי.")}</p>
        )}
        {changes.map((c) => (
          <section key={c.field} className={`rounded-xl border p-3 ${c.lost || c.hidden ? "border-amber-400/40 bg-amber-500/[0.06]" : "border-white/10 bg-white/[0.03]"}`} data-testid={`schema-change-${c.field}`}>
            <p>{say(impactText(c, nameOf(c.field)))}</p>
            {c.samples.length ? (
              <ul className="mt-2 space-y-0.5 text-xs text-white/60">
                {c.samples.map((s) => (
                  <li key={s.slug}>
                    <span className="font-mono text-white/45" dir="ltr">{s.slug}</span>
                    {": "}
                    <bdi dir="ltr">{s.value}</bdi>
                    {s.why ? <span className="text-white/45">{` (${say(issueWords(s.why))})`}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </Modal>
  );
}

const words = (v: Local | undefined, lang: Lang) => v?.[lang] || v?.ar || v?.en || v?.he || "";

/** The table's fields before each of its changes, newest first, with a way back. */
export function VersionsPanel({ table, lang, canWrite, onRestored }: { table: Collection; lang: Lang; canWrite: boolean; onRestored: (saved: Collection) => void }) {
  const qc = useQueryClient();
  const key = ["collections", table.id, "versions"];
  const versions = useQuery({ queryKey: key, queryFn: () => listVersions(table.id) });
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState<{ version: string; changes: Impact[] } | null>(null);
  const [busy, setBusy] = useState(false);
  // A field that comes back with the version has its name there, not in the table as it is now.
  const nameOf = (id: string) => words((table.fields.find((f) => f.id === id) ?? versions.data?.find((v) => v.id === asking?.version)?.fields.find((f) => f.id === id))?.name, lang) || id;

  const look = async (version: string) => {
    setBusy(true);
    try {
      setAsking({ version, changes: (await previewVersion(table.id, version)).changes });
    } catch (e) {
      toast.error(say("ما انفتحت النسخة|The version didn't open|הגרסה לא נפתחה"), { description: getApiErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  };
  const restore = async () => {
    if (!asking) return;
    setBusy(true);
    try {
      const saved = await restoreVersion(table.id, asking.version, true);
      setAsking(null);
      void qc.invalidateQueries({ queryKey: key });
      toast.success(say("رجعت الحقول متل ما كانت|The fields are back as they were|השדות חזרו כפי שהיו"));
      onRestored(saved);
    } catch (e) {
      toast.error(say("ما رجعت|It didn't go back|לא שוחזר"), { description: getApiErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  };
  const list = versions.data ?? [];
  if (!list.length) return null;
  return (
    <section className="rounded-lg border border-white/[0.06] p-3" data-testid="table-versions">
      <button type="button" className="flex w-full items-center justify-between text-xs text-white/70" aria-expanded={open} onClick={() => setOpen(!open)} data-testid="versions-toggle">
        <span>{say(`النسخ السابقة للحقول (${list.length})|Earlier versions of the fields (${list.length})|גרסאות קודמות של השדות (${list.length})`)}</span>
        <span>{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <ul className="mt-2 divide-y divide-white/[0.06]">
          {list.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs" data-testid="version-row">
              <span className="min-w-0">
                <span className="block text-white/80">{new Date(v.createdAt).toLocaleString(lang === "ar" ? "ar" : lang === "he" ? "he-IL" : "en-GB", { dateStyle: "medium", timeStyle: "short", numberingSystem: "latn" })}{v.who ? ` · ${v.who}` : ""}</span>
                <span className="block truncate text-white/45">{versionLine(v.changes, lang)}</span>
              </span>
              <button type="button" className={btn} disabled={!canWrite || busy} onClick={() => void look(v.id)} data-testid={`version-restore-${v.id}`}>
                ↩ {say("ارجع للحقول قبل هالتغيير|Back to the fields before this change|חזרה לשדות שלפני השינוי")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {asking ? <ChangeDialog title={say("رجوع لنسخة سابقة|Going back to an earlier version|חזרה לגרסה קודמת")} changes={asking.changes} nameOf={nameOf} busy={busy} onAccept={() => void restore()} onCancel={() => setAsking(null)} /> : null}
    </section>
  );
}
