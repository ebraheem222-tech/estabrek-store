// الـ Functions: a function's versions. Every publish is kept as a version with a number, never
// changed after that; the newest is what runs. An older one can be looked at, published again
// (which makes a new version with the old steps) or taken into the draft to work on.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiErrorMessage } from "../../api/http";
import * as FnAPI from "../../api/functions.api";
import type { FnFull, FnLite, FnTable, FnVersion, Outside } from "../../api/functions.api";
import { adminLang } from "../../lib/lang";
import { say } from "../../studio/say";
import { ACT_NAME, part, stepLine } from "./fnText";
import { Line } from "./StepList";

const when = (iso: string, lang: string) => new Date(iso).toLocaleString(lang === "ar" ? "ar" : lang === "he" ? "he-IL" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

/** A version's steps, read as they were published: one line each, as a closed step shows itself. */
function VersionSteps({ fnId, n, ctx }: { fnId: string; n: number; ctx: { tables: FnTable[]; fns: FnLite[]; outside?: Outside } }) {
  const lang = adminLang();
  const q = useQuery({ queryKey: ["functions", fnId, "version", n], queryFn: () => FnAPI.getFnVersion(fnId, n), staleTime: Infinity });
  if (q.isLoading) return <p className="text-xs text-white/60">…</p>;
  if (q.isError || !q.data) return <p className="text-xs text-red-300">{getApiErrorMessage(q.error)}</p>;
  const def = q.data.def;
  const lists: Array<[string, typeof def.do]> = [
    ["", def.do],
    [say("وإلا|Else|אחרת"), def.else ?? []],
    [say("إذا فشلت خطوة|If a step fails|אם שלב נכשל"), def.fail ?? []],
  ];
  return (
    <div className="space-y-2 rounded-xl border border-white/10 p-3 text-sm" data-testid={`fn-version-${n}-steps`}>
      {def.inputs.length ? (
        <div className="text-xs text-white/70">
          {say("بتنعطى:|It is handed:|היא מקבלת:")} <bdi dir="ltr">{def.inputs.map((i) => i.name).join(", ")}</bdi>
        </div>
      ) : null}
      {lists.map(([title, steps]) =>
        steps.length ? (
          <div key={title}>
            {title ? <div className="text-xs text-white/70">{title}</div> : null}
            <ol className="space-y-0.5">
              {steps.map((s, k) => (
                <li key={k} className="flex flex-wrap gap-x-2">
                  <span className="text-white/60">{k + 1}.</span>
                  <span className="font-medium">{part(ACT_NAME[s.act] ?? s.act, lang)}</span>
                  <span className="min-w-0 text-white/80">
                    <Line text={stepLine(s, ctx, lang)} />
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null,
      )}
    </div>
  );
}

export function VersionsPanel({ fn, ctx, canWrite, busy, onRestore }: { fn: FnFull; ctx: { tables: FnTable[]; fns: FnLite[]; outside?: Outside }; canWrite: boolean; busy: boolean; onRestore: (version: FnVersion, to: "live" | "draft") => void }) {
  const lang = adminLang();
  const [open, setOpen] = useState<number | null>(null);
  const versions = fn.versions ?? [];
  if (!versions.length) {
    return (
      <p className="text-sm text-white/70" data-testid="fn-versions-empty">
        {say("لسا ما انتشرت. أول نشر بيصير النسخة 1.|Not published yet. The first publish becomes version 1.|עדיין לא פורסמה. הפרסום הראשון יהיה גרסה 1.")}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-white/10" data-testid="fn-versions">
      {versions.map((v) => {
        const live = v.n === fn.version;
        return (
          <li key={v.n} className="space-y-2 py-2.5" data-testid={`fn-version-${v.n}`} data-live={live}>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  <span>{say("النسخة {n}|Version {n}|גרסה {n}").replace("{n}", String(v.n))}</span>
                  {live ? <span className="rounded-md bg-emerald-400/15 px-1.5 py-0.5 text-xs text-emerald-300">{say("هي اللي بتشتغل|This one runs|זו שרצה")}</span> : null}
                  {v.back ? <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-xs">{say("رجوع للنسخة {n}|Back to version {n}|חזרה לגרסה {n}").replace("{n}", String(v.back))}</span> : null}
                </div>
                <div className="text-xs text-white/70">
                  {when(v.at, lang)}
                  {v.by ? (
                    <>
                      {" · "}
                      <bdi dir="ltr">{v.by}</bdi>
                    </>
                  ) : null}
                  {" · "}
                  {say("{n} خطوة|{n} steps|{n} שלבים").replace("{n}", String(v.steps))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <button type="button" className="underline" aria-expanded={open === v.n} onClick={() => setOpen(open === v.n ? null : v.n)} data-testid={`fn-version-${v.n}-look`}>
                  {open === v.n ? say("سكّر|Close|סגירה") : say("شوف خطواتها|See its steps|הצגת השלבים")}
                </button>
                {canWrite && !live ? (
                  <button type="button" className="underline disabled:opacity-60" disabled={busy} onClick={() => onRestore(v, "live")} data-testid={`fn-version-${v.n}-publish`}>
                    {say("انشرها من جديد|Publish it again|פרסום מחדש")}
                  </button>
                ) : null}
                {canWrite ? (
                  <button type="button" className="underline disabled:opacity-60" disabled={busy} onClick={() => onRestore(v, "draft")} data-testid={`fn-version-${v.n}-draft`}>
                    {say("حطها بالمسودة|Put it in the draft|העברה לטיוטה")}
                  </button>
                ) : null}
              </div>
            </div>
            {open === v.n ? <VersionSteps fnId={fn.id} n={v.n} ctx={ctx} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
