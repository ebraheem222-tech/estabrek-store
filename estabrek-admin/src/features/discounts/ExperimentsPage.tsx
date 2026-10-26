// تجارب A/B: some visits see A, the others B (the home page's opening, or a motion
// setting); which brings more bag adds and orders. Chosen per visit in the shoppers'
// browsers, no cookies. A side is called a winner only at 95% confidence.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import * as AbAPI from "../../api/experiments.api";
import type { Experiment, ExperimentInput, ExperimentsPage as Data } from "../../api/experiments.api";
import { FIELD_INPUT, STATUS_TEXT, rateText, runningForText, splitText, startValues, valueText, verdictText, whatText } from "./abText";
import { tr } from "@/lib/words";

const field = "h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";
const KEY = ["experiments"];
const onError = (e: unknown) => toast.error(tr("ما زبط", "That didn't work"), { description: getApiErrorMessage(e) });
/** Revenue per visit with agorot: ₪3.24 vs ₪4.72 (whole shekels would hide the gap). */
const perVisit = (n: number) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

export default function ExperimentsPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("discounts:write");
  const q = useQuery({ queryKey: KEY, queryFn: AbAPI.getExperiments, refetchInterval: 60_000 });
  const [draft, setDraft] = useState<ExperimentInput | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ e: Experiment; what: "stop" | "delete" | "keepA" | "keepB" } | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: KEY });
  const save = useMutation({
    mutationFn: (d: ExperimentInput) => (editing ? AbAPI.updateExperiment(editing, d) : AbAPI.createExperiment(d)),
    onSuccess: () => (toast.success(tr("انحفظت التجربة", "Test saved"), { description: tr("البدء لما تكون جاهزة.", "Start it when ready.") }), setDraft(null), setEditing(null), refresh()),
    onError,
  });
  const act = useMutation({
    mutationFn: async (v: { e: Experiment; what: "start" | "stop" | "delete" | "keepA" | "keepB" }) => {
      if (v.what === "start") return AbAPI.startExperiment(v.e.id);
      if (v.what === "stop") return AbAPI.stopExperiment(v.e.id);
      if (v.what === "delete") return AbAPI.deleteExperiment(v.e.id);
      return AbAPI.keepWinner(v.e.id, v.what === "keepA" ? "A" : "B");
    },
    onSuccess: (_d, v) => {
      toast.success(v.what === "start" ? tr("بلّشت التجربة", "The test started") : v.what === "stop" ? tr("توقّفت التجربة", "The test stopped") : v.what === "delete" ? tr("انحذفت", "Deleted") : tr(`صار ${v.what === "keepA" ? "A" : "B"} للكل`, "{0} is now for everyone", [v.what === "keepA" ? "A" : "B"]));
      setConfirm(null);
      refresh();
    },
    onError,
  });

  if (!q.data) {
    return (
      <div>
        <PageHeader title={tr("تجارب A/B", "A/B tests")} />
        <Card>{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</Card>
      </div>
    );
  }
  const d = q.data;
  const newDraft = () => {
    setEditing(null);
    setDraft({ name: "", kind: "heroOpening", field: null, split: 50, ...startValues("heroOpening", null, d.currentMotion) });
  };

  return (
    <div className="space-y-4 pb-16" data-testid="ab-page">
      <PageHeader
        title={tr("تجارب A/B", "A/B tests")}
        subtitle={tr("بعض الزيارات بتشوف A والباقي B، وبنقيس مين بيجيب إضافات للسلة وطلبات أكثر. كل زيارة بتضل على جهتها لحتى تخلص، بلا كوكيز. ما منقول في رابح إلا لما نكون متأكدين 95%.", "Some visits see A and the rest B, and we measure which brings more adds to bag and orders. Each visit stays on its side until it ends, no cookies. We only call a winner when we're 95% sure.")}
        right={
          canWrite && !draft ? (
            <Button variant="primary" onClick={newDraft}>
              {tr("تجربة جديدة", "New test")}
            </Button>
          ) : undefined
        }
      />

      {draft ? <ExperimentForm draft={draft} setDraft={setDraft} data={d} editing={!!editing} saving={save.isPending} onSave={() => save.mutate(draft)} onCancel={() => (setDraft(null), setEditing(null))} /> : null}

      {!d.experiments.length && !draft ? (
        <Card>
          <p className="text-sm text-white/60">{tr("ما في تجارب لسا. مثلاً: «الفيلم ولا الصورة بأول الرئيسية؟» أو «90 ولا 120 إطار بالثانية؟».", "No tests yet. e.g. “The film or the photo at the top of the home page?” or “90 or 120 frames a second?”.")}</p>
        </Card>
      ) : null}

      {d.experiments.map((e) => (
        <ExperimentCard
          key={e.id}
          e={e}
          now={d.now}
          canWrite={canWrite}
          busy={act.isPending && act.variables?.e.id === e.id}
          onStart={() => act.mutate({ e, what: "start" })}
          onEdit={() => {
            setEditing(e.id);
            setDraft({ name: e.name, kind: e.kind, field: e.field, a: e.a, b: e.b, split: e.split });
          }}
          onConfirm={(what) => setConfirm({ e, what })}
        />
      ))}

      <ConfirmDialog
        open={!!confirm}
        title={
          !confirm
            ? ""
            : confirm.what === "stop"
              ? tr(`توقيف «${confirm.e.name}»`, "Stop “{0}”", [confirm.e.name])
              : confirm.what === "delete"
                ? tr(`حذف «${confirm.e.name}»`, "Delete “{0}”", [confirm.e.name])
                : tr(`إبقاء ${confirm.what === "keepA" ? "A" : "B"} للكل`, "Keep {0} for everyone", [confirm.what === "keepA" ? "A" : "B"])
        }
        message={
          !confirm
            ? ""
            : confirm.what === "stop"
              ? tr("كل الزيارات بترجع تشوف المتجر متل ما هو مضبوط. الأرقام بتضل.", "Every visit goes back to seeing the store as it's set. The numbers stay.")
              : confirm.what === "delete"
                ? tr("التجربة وأرقامها بينحذفوا.", "The test and its numbers are deleted.")
                : tr(
                    `«${whatText(confirm.e.kind, confirm.e.field)}» بيصير ${valueText(confirm.e.kind, confirm.e.field, confirm.what === "keepA" ? confirm.e.a : confirm.e.b)} لكل الزباين، والتجربة بتوقف.`,
                    "“{0}” becomes {1} for every customer, and the test stops.",
                    [whatText(confirm.e.kind, confirm.e.field), valueText(confirm.e.kind, confirm.e.field, confirm.what === "keepA" ? confirm.e.a : confirm.e.b)],
                  ) +
                  (confirm.e.kind === "heroOpening"
                    ? tr(" (بيتغيّر بالصفحة الرئيسية، وبينحفظ بسجلها.)", " (It changes on the home page and is saved in its history.)")
                    : tr(" (بيتغيّر بالسرعة والكاش ← الحركة والتحميل.)", " (It changes in Speed and cache → Motion and loading.)"))
        }
        confirmText={confirm?.what === "delete" ? tr("حذف", "Delete") : confirm?.what === "stop" ? tr("توقيف", "Stop") : tr("تطبيق", "Apply")}
        variant={confirm?.what === "delete" ? "danger" : "warning"}
        isLoading={act.isPending}
        onConfirm={() => {
          if (confirm) act.mutate(confirm);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function ExperimentCard({
  e,
  now,
  canWrite,
  busy,
  onStart,
  onEdit,
  onConfirm,
}: {
  e: Experiment;
  now: number;
  canWrite: boolean;
  busy: boolean;
  onStart: () => void;
  onEdit: () => void;
  onConfirm: (what: "stop" | "delete" | "keepA" | "keepB") => void;
}) {
  const st = STATUS_TEXT[e.status];
  const r = e.results;
  const since = runningForText(e, now);
  const won = (side: "A" | "B") => e.winner === side;
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2" data-testid={`ab-${e.id}`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{e.name}</h2>
            <Badge size="sm" variant={st.variant} dot={e.status === "running"}>
              {st.label}
            </Badge>
            {e.winner ? (
              <Badge size="sm" variant="accent">
                {tr(`صار ${e.winner} للكل`, "{0} is now for everyone", [e.winner])}
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-white/60">{[whatText(e.kind, e.field), splitText(e.split), since].filter(Boolean).join(" · ")}</p>
        </div>
        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            {e.status === "draft" ? (
              <>
                <Button size="sm" variant="primary" onClick={onStart} isLoading={busy}>
                  {tr("بدء", "Start")}
                </Button>
                <Button size="sm" variant="ghost" onClick={onEdit}>
                  {tr("تعديل", "Edit")}
                </Button>
              </>
            ) : null}
            {e.status === "running" ? (
              <Button size="sm" variant="secondary" onClick={() => onConfirm("stop")}>
                {tr("توقيف", "Stop")}
              </Button>
            ) : null}
            {e.status !== "draft" && !e.winner ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => onConfirm("keepA")}>
                  {tr("إبقاء A", "Keep A")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onConfirm("keepB")}>
                  {tr("إبقاء B", "Keep B")}
                </Button>
              </>
            ) : null}
            {e.status !== "running" ? (
              <Button size="sm" variant="ghost" onClick={() => onConfirm("delete")}>
                {tr("حذف", "Delete")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        <table className="w-full table-fixed text-sm" data-testid={`ab-results-${e.id}`}>
          <thead className="text-xs text-white/50">
            <tr className="text-start">
              <th className="py-1.5 font-normal" />
              <th className="font-normal">{`A: ${valueText(e.kind, e.field, e.a)}${won("A") ? " ✓" : ""}`}</th>
              <th className="font-normal">{`B: ${valueText(e.kind, e.field, e.b)}${won("B") ? " ✓" : ""}`}</th>
            </tr>
          </thead>
          {e.startedAt ? (
            <tbody className="divide-y divide-white/10 tabular-nums">
              <tr>
                <td className="py-1.5 text-white/60">{tr("زيارات", "Visits")}</td>
                <td>{r.a.visits.toLocaleString("en")}</td>
                <td>{r.b.visits.toLocaleString("en")}</td>
              </tr>
              <tr>
                <td className="py-1.5 text-white/60">{tr("أضافوا للسلة", "Added to bag")}</td>
                <td>{`${rateText(r.bags.rateA)} (${r.a.bags.toLocaleString("en")})`}</td>
                <td>{`${rateText(r.bags.rateB)} (${r.b.bags.toLocaleString("en")})`}</td>
              </tr>
              <tr>
                <td className="py-1.5 text-white/60">{tr("طلبوا", "Ordered")}</td>
                <td>{`${rateText(r.orders.rateA)} (${r.a.orders.toLocaleString("en")})`}</td>
                <td>{`${rateText(r.orders.rateB)} (${r.b.orders.toLocaleString("en")})`}</td>
              </tr>
              <tr>
                <td className="py-1.5 text-white/60">{tr("دخل لكل زيارة", "Revenue per visit")}</td>
                <td>{perVisit(r.revenuePerVisit.a)}</td>
                <td>{perVisit(r.revenuePerVisit.b)}</td>
              </tr>
            </tbody>
          ) : null}
        </table>
      </div>
      {e.startedAt ? (
        <ul className="mt-3 space-y-1 text-sm" data-testid={`ab-verdict-${e.id}`}>
          <li>
            <span className="text-white/60">{tr("السلة:", "Bag:")} </span>
            {verdictText(r.bags, "bags")}
          </li>
          <li>
            <span className="text-white/60">{tr("الطلبات:", "Orders:")} </span>
            {verdictText(r.orders, "orders")}
          </li>
        </ul>
      ) : (
        <p className="mt-3 text-xs text-white/50">{tr("لسا ما بلّشت.", "Not started yet.")}</p>
      )}
    </Card>
  );
}

function ValueInput({ kind, fieldName, value, onChange, label }: { kind: ExperimentInput["kind"]; fieldName: string | null; value: unknown; onChange: (v: unknown) => void; label: string }) {
  if (kind === "heroOpening") {
    return (
      <label className="block">
        <span className="text-sm font-medium">{label}</span>
        <select className={`${field} mt-1.5`} value={String(value)} onChange={(e) => onChange(e.target.value)}>
          <option value="film">{valueText("heroOpening", null, "film")}</option>
          <option value="photo">{valueText("heroOpening", null, "photo")}</option>
        </select>
      </label>
    );
  }
  const input = FIELD_INPUT[fieldName ?? ""];
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {input?.type === "bool" ? (
        <select className={`${field} mt-1.5`} value={value ? "1" : "0"} onChange={(e) => onChange(e.target.value === "1")}>
          <option value="1">{tr("شغّال", "On")}</option>
          <option value="0">{tr("مطفي", "Off")}</option>
        </select>
      ) : input?.type === "choice" ? (
        <select className={`${field} mt-1.5`} value={String(value)} onChange={(e) => onChange(typeof input.options[0] === "number" ? Number(e.target.value) : e.target.value)}>
          {input.options.map((o) => (
            <option key={o} value={String(o)}>
              {valueText("motion", fieldName, o)}
            </option>
          ))}
        </select>
      ) : (
        <input type="number" className={`${field} mt-1.5`} min={input?.type === "number" ? input.min : undefined} max={input?.type === "number" ? input.max : undefined} value={Number(value)} onChange={(e) => onChange(Math.round(Number(e.target.value)))} />
      )}
    </label>
  );
}

function ExperimentForm({ draft, setDraft, data, editing, saving, onSave, onCancel }: { draft: ExperimentInput; setDraft: (d: ExperimentInput) => void; data: Data; editing: boolean; saving: boolean; onSave: () => void; onCancel: () => void }) {
  const what = draft.kind === "heroOpening" ? "heroOpening" : `motion:${draft.field}`;
  const pick = (v: string) => {
    const [kind, f] = v.split(":") as ["heroOpening" | "motion", string | undefined];
    const fieldName = kind === "motion" ? f ?? null : null;
    setDraft({ ...draft, kind, field: fieldName, ...startValues(kind, fieldName, data.currentMotion) });
  };
  const same = JSON.stringify(draft.a) === JSON.stringify(draft.b);
  const ok = draft.name.trim().length > 0 && !same;
  return (
    <Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="ab-form">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">{tr("الاسم", "Name")}</span>
          <input className={`${field} mt-1.5`} value={draft.name} maxLength={80} placeholder={tr("الفيلم ولا الصورة؟", "The film or the photo?")} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">{tr("شو بدنا نجرّب", "What to test")}</span>
          <select className={`${field} mt-1.5`} value={what} onChange={(e) => pick(e.target.value)}>
            <option value="heroOpening">{whatText("heroOpening", null)}</option>
            {data.motionFields.map((f) => (
              <option key={f} value={`motion:${f}`}>
                {tr(`الحركة: ${whatText("motion", f)}`, "Motion: {0}", [whatText("motion", f)])}
              </option>
            ))}
          </select>
        </label>
        <ValueInput kind={draft.kind} fieldName={draft.field} value={draft.a} label="A" onChange={(a) => setDraft({ ...draft, a })} />
        <ValueInput kind={draft.kind} fieldName={draft.field} value={draft.b} label="B" onChange={(b) => setDraft({ ...draft, b })} />
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">{tr(`الزيارات اللي بتشوف B: ${draft.split}%`, "Visits that see B: {0}%", [draft.split])}</span>
          <input type="range" min={10} max={90} step={5} className="mt-2 w-full" value={draft.split} onChange={(e) => setDraft({ ...draft, split: Number(e.target.value) })} />
          <span className="mt-1 block text-xs text-white/50">{tr("50% بتوصل للجواب أسرع. أقل إذا B فيه مخاطرة.", "50% gets the answer fastest. Less if B is risky.")}</span>
        </label>
      </div>
      {same ? <p className="mt-3 text-xs text-red-300">{tr("A و B نفس الشي.", "A and B are the same.")}</p> : null}
      <div className="mt-4 flex gap-2">
        <Button variant="primary" onClick={onSave} isLoading={saving} disabled={!ok}>
          {editing ? tr("حفظ التعديل", "Save changes") : tr("حفظ", "Save")}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {tr("إلغاء", "Cancel")}
        </Button>
      </div>
    </Card>
  );
}
