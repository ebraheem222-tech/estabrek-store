// الجدول الزمني: changes set for a date and time (the theme, motion settings,
// maintenance, the announcement bar, a page section, emptying the cache), with a
// preview before saving and, if you want, back by themselves at another time.
// Seasons (prices and theme) from البيع الذكي show here too.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import { env } from "../../config/env";
import { THEME_PRESETS } from "../../theme/presets";
import * as ScheduleAPI from "../../api/schedule.api";
import type { PreviewLine, ScheduleInput, ScheduleKind, ScheduleOptions, ScheduledChange } from "../../api/schedule.api";
import type { StorefrontMotion } from "../../api/cache.api";
import { MOTION_TEXT, NAMESPACE_TEXT, motionPreviewUrl } from "./cacheText";
import { FIELD_INPUT, valueText } from "../discounts/abText";
import { CAMPAIGN_STATUS_TEXT, campaignWhen, fromLocalInput, toLocalInput } from "../discounts/sellingText";
import { KIND_TEXT, STATUS_TEXT, payloadSummary, previewLineText, timelineGroups, whenText, type Names, type TimelineItem } from "./scheduleText";

const field = "h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";
const KEY = ["schedule"];
const onError = (e: unknown) => toast.error("ما زبط", { description: getApiErrorMessage(e) });
const RIGHT: Record<ScheduleKind, string> = { theme: "settings:write", maintenance: "settings:write", announcement: "settings:write", motion: "system:write", cachePurge: "system:write", section: "pages:write" };
const KINDS = Object.keys(KIND_TEXT) as ScheduleKind[];
const MOTION_FIELDS = Object.keys(FIELD_INPUT);

type Draft = {
  kind: ScheduleKind;
  title: string;
  runAt: string;
  undoOn: boolean;
  undoAt: string;
  presetId: string | null;
  motion: Array<{ field: string; value: unknown }>;
  on: boolean;
  message: string;
  text: string;
  link: string;
  sectionId: string;
  visible: boolean;
  namespace: string | null;
};

function payloadOf(d: Draft): Record<string, unknown> {
  if (d.kind === "theme") return { presetId: d.presetId };
  if (d.kind === "motion") return { changes: Object.fromEntries(d.motion.map((m) => [m.field, m.value])) };
  if (d.kind === "maintenance") return { on: d.on, ...(d.message.trim() ? { message: d.message.trim() } : {}) };
  if (d.kind === "announcement") return { on: d.on, ...(d.text.trim() ? { text: d.text.trim() } : {}), ...(d.link.trim() ? { link: d.link.trim() } : {}) };
  if (d.kind === "section") return { sectionId: d.sectionId, visible: d.visible };
  return { namespace: d.namespace };
}

export default function SchedulePage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const q = useQuery({ queryKey: KEY, queryFn: ScheduleAPI.getSchedule, refetchInterval: 30_000 });
  const opts = useQuery({ queryKey: [...KEY, "options"], queryFn: ScheduleAPI.getScheduleOptions });
  const [draft, setDraft] = useState<Draft | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: KEY });
  const act = useMutation({
    mutationFn: (v: { id: string; what: "cancel" | "run" | "undo" }) =>
      v.what === "cancel" ? ScheduleAPI.cancelSchedule(v.id) : v.what === "run" ? ScheduleAPI.runScheduleNow(v.id) : ScheduleAPI.undoSchedule(v.id),
    onSuccess: ({ change }, v) => {
      if (change.status === "failed") toast.error("ما زبط", { description: change.note ?? undefined });
      else toast.success(v.what === "cancel" ? "انلغى" : v.what === "run" ? "صار هلّق" : "رجع", { description: change.note ?? undefined });
      refresh();
    },
    onError,
  });

  const sectionLabel = (id: string) => {
    const s = opts.data?.sections.find((x) => x.id === id);
    return s ? `${s.page.name} · ${s.title ?? s.type}` : "قسم محذوف";
  };
  const names: Names = { theme: (id) => (id ? THEME_PRESETS.find((p) => p.id === id)?.name ?? id : "الثيم الافتراضي"), section: sectionLabel };

  if (!q.data) {
    return (
      <div dir="rtl">
        <PageHeader title="الجدول الزمني" />
        <Card>{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</Card>
      </div>
    );
  }
  const g = timelineGroups(q.data.changes, q.data.campaigns);
  const canAny = KINDS.some((k) => hasPermission(RIGHT[k] as never));
  const newDraft = () => {
    const start = new Date(Date.now() + 3600_000);
    start.setMinutes(0, 0, 0);
    const back = new Date(start.getTime() + 24 * 3600_000);
    setDraft({
      kind: "theme",
      title: "",
      runAt: start.toISOString(),
      undoOn: true,
      undoAt: back.toISOString(),
      presetId: opts.data?.now.theme ?? null,
      motion: [{ field: "maxFps", value: 60 }],
      on: true,
      message: "",
      text: "",
      link: "",
      sectionId: opts.data?.sections[0]?.id ?? "",
      visible: false,
      namespace: null,
    });
  };

  return (
    <div dir="rtl" className="space-y-4 pb-16" data-testid="schedule-page">
      <PageHeader
        title="الجدول الزمني"
        subtitle="أي تغيير على وقت: الثيم، الحركة، الصيانة، شريط الإعلان، قسم بصفحة، تفريغ الكاش. شوف شو رح يتغيّر قبل ما تحفظ، وخلّيه يرجع لحاله إذا بدك. ما بيرجّع شي إنت غيّرته بإيدك بالنص."
        right={
          canAny && !draft ? (
            <Button variant="primary" onClick={newDraft}>
              تغيير على وقت
            </Button>
          ) : undefined
        }
      />
      {draft && opts.data ? <ChangeForm draft={draft} setDraft={setDraft} options={opts.data} names={names} canKind={(k) => hasPermission(RIGHT[k] as never)} onDone={() => (setDraft(null), refresh())} /> : null}

      <Group title="هلّق" empty={null} items={g.now} names={names} busy={act.isPending} onAct={(id, what) => act.mutate({ id, what })} canKind={(k) => hasPermission(RIGHT[k] as never)} />
      <Group title="الجاي" empty="ما في شي مجدول." items={g.next} names={names} busy={act.isPending} onAct={(id, what) => act.mutate({ id, what })} canKind={(k) => hasPermission(RIGHT[k] as never)} />
      <Group title="صار (آخر شهرين)" empty={null} items={g.past} names={names} busy={act.isPending} onAct={(id, what) => act.mutate({ id, what })} canKind={(k) => hasPermission(RIGHT[k] as never)} />
      <p className="text-xs text-white/50">
        للأسعار:{" "}
        <Link to="/admin/discounts/smart#seasons" className="underline">
          موسم بالبيع الذكي
        </Link>{" "}
        (خصم وثيم من وقت لوقت، وبيرجعوا لحالهم).
      </p>
    </div>
  );
}

function Group({
  title,
  empty,
  items,
  names,
  busy,
  onAct,
  canKind,
}: {
  title: string;
  empty: string | null;
  items: TimelineItem[];
  names: Names;
  busy: boolean;
  onAct: (id: string, what: "cancel" | "run" | "undo") => void;
  canKind: (k: ScheduleKind) => boolean;
}) {
  if (!items.length && !empty) return null;
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-semibold text-white/70">{title}</h2>
      {!items.length ? (
        <Card>
          <p className="text-sm text-white/60">{empty}</p>
        </Card>
      ) : (
        items.map((i) => (i.type === "change" ? <ChangeRow key={i.change.id} c={i.change} names={names} busy={busy} onAct={onAct} can={canKind(i.change.kind)} /> : <SeasonRow key={i.campaign.id} c={i.campaign} />))
      )}
    </section>
  );
}

function ChangeRow({ c, names, busy, onAct, can }: { c: ScheduledChange; names: Names; busy: boolean; onAct: (id: string, what: "cancel" | "run" | "undo") => void; can: boolean }) {
  const st = STATUS_TEXT[c.status];
  return (
    <Card padding="sm">
      <div className="flex flex-wrap items-start justify-between gap-2" data-testid={`change-${c.id}`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{c.title}</span>
            <Badge size="sm">{KIND_TEXT[c.kind].label}</Badge>
            <Badge size="sm" variant={st.variant} dot={c.status === "applied"}>
              {st.label}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-white/60">{whenText(c)}</p>
          <p className="mt-1 text-sm">{payloadSummary(c.kind, c.payload, names)}</p>
          {c.note ? <p className={`mt-1 text-xs ${c.status === "failed" ? "text-red-300" : "text-white/50"}`}>{c.note}</p> : null}
        </div>
        {can ? (
          <div className="flex gap-2">
            {c.status === "scheduled" ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => onAct(c.id, "run")} disabled={busy}>
                  هلّق
                </Button>
                <Button size="sm" variant="secondary" onClick={() => onAct(c.id, "cancel")} disabled={busy}>
                  إلغاء
                </Button>
              </>
            ) : null}
            {c.status === "applied" || (c.status === "done" && c.kind !== "cachePurge") ? (
              <Button size="sm" variant="secondary" onClick={() => onAct(c.id, "undo")} disabled={busy}>
                رجّعه هلّق
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function SeasonRow({ c }: { c: import("../../api/selling.api").Campaign }) {
  const st = CAMPAIGN_STATUS_TEXT[c.status];
  return (
    <Card padding="sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{c.name}</span>
            <Badge size="sm" variant="accent">
              موسم
            </Badge>
            <Badge size="sm" variant={st.variant}>
              {st.label}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-white/60">{campaignWhen(c)}</p>
        </div>
        <Link to="/admin/discounts/smart#seasons" className="text-xs text-white/60 underline">
          المواسم
        </Link>
      </div>
    </Card>
  );
}

function MotionValue({ fieldName, value, onChange }: { fieldName: string; value: unknown; onChange: (v: unknown) => void }) {
  const input = FIELD_INPUT[fieldName];
  if (input?.type === "bool")
    return (
      <select className={field} value={value ? "1" : "0"} onChange={(e) => onChange(e.target.value === "1")}>
        <option value="1">شغّال</option>
        <option value="0">مطفي</option>
      </select>
    );
  if (input?.type === "choice")
    return (
      <select className={field} value={String(value)} onChange={(e) => onChange(typeof input.options[0] === "number" ? Number(e.target.value) : e.target.value)}>
        {input.options.map((o) => (
          <option key={o} value={String(o)}>
            {valueText("motion", fieldName, o)}
          </option>
        ))}
      </select>
    );
  return <input type="number" className={field} value={Number(value)} min={input?.type === "number" ? input.min : undefined} max={input?.type === "number" ? input.max : undefined} onChange={(e) => onChange(Math.round(Number(e.target.value)))} />;
}

function ChangeForm({ draft, setDraft, options, names, canKind, onDone }: { draft: Draft; setDraft: (d: Draft) => void; options: ScheduleOptions; names: Names; canKind: (k: ScheduleKind) => boolean; onDone: () => void }) {
  const [lines, setLines] = useState<PreviewLine[] | null>(null);
  // The time the form opened (for the button's words).
  const [openedAt] = useState(() => Date.now());
  const set = (patch: Partial<Draft>) => {
    setLines(null);
    setDraft({ ...draft, ...patch });
  };
  const input = (): ScheduleInput => ({
    kind: draft.kind,
    title: draft.title.trim() || KIND_TEXT[draft.kind].title,
    payload: payloadOf(draft),
    runAt: draft.runAt,
    undoAt: draft.undoOn && draft.kind !== "cachePurge" ? draft.undoAt : null,
  });
  const preview = useMutation({ mutationFn: () => ScheduleAPI.previewSchedule(draft.kind, payloadOf(draft)), onSuccess: (r) => setLines(r.lines), onError });
  const save = useMutation({
    mutationFn: () => ScheduleAPI.createSchedule(input()),
    onSuccess: ({ change }) => {
      toast.success(change?.status === "scheduled" ? "انجدول" : "صار هلّق", { description: change ? whenText(change) : undefined });
      onDone();
    },
    onError,
  });
  const motionNow = { ...options.now.motion, ...Object.fromEntries(draft.motion.map((m) => [m.field, m.value])) } as StorefrontMotion;
  const shop = env.VITE_STOREFRONT_BASE_URL;
  return (
    <Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="schedule-form">
        <label className="block">
          <span className="text-sm font-medium">شو بدك تغيّر</span>
          <select className={`${field} mt-1.5`} value={draft.kind} onChange={(e) => set({ kind: e.target.value as ScheduleKind })}>
            {KINDS.filter(canKind).map((k) => (
              <option key={k} value={k}>
                {KIND_TEXT[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">اسم (اختياري)</span>
          <input className={`${field} mt-1.5`} value={draft.title} maxLength={80} placeholder={KIND_TEXT[draft.kind].title} onChange={(e) => set({ title: e.target.value })} />
        </label>

        {draft.kind === "theme" ? (
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium">الثيم</span>
            <select className={`${field} mt-1.5`} value={draft.presetId ?? ""} onChange={(e) => set({ presetId: e.target.value || null })}>
              <option value="">الثيم الافتراضي</option>
              {THEME_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {draft.kind === "motion" ? (
          <div className="space-y-2 sm:col-span-2">
            {draft.motion.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                <select
                  className={field}
                  value={m.field}
                  onChange={(e) => {
                    const f = e.target.value;
                    const next = [...draft.motion];
                    next[i] = { field: f, value: options.now.motion[f as keyof StorefrontMotion] };
                    set({ motion: next });
                  }}
                >
                  {MOTION_FIELDS.map((f) => (
                    <option key={f} value={f} disabled={f !== m.field && draft.motion.some((x) => x.field === f)}>
                      {MOTION_TEXT[f] ?? f}
                    </option>
                  ))}
                </select>
                <MotionValue
                  fieldName={m.field}
                  value={m.value}
                  onChange={(v) => {
                    const next = [...draft.motion];
                    next[i] = { ...m, value: v };
                    set({ motion: next });
                  }}
                />
                <Button size="sm" variant="ghost" disabled={draft.motion.length === 1} onClick={() => set({ motion: draft.motion.filter((_, j) => j !== i) })}>
                  شيل
                </Button>
              </div>
            ))}
            {draft.motion.length < MOTION_FIELDS.length ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const f = MOTION_FIELDS.find((x) => !draft.motion.some((m) => m.field === x))!;
                  set({ motion: [...draft.motion, { field: f, value: options.now.motion[f as keyof StorefrontMotion] }] });
                }}
              >
                إعداد كمان
              </Button>
            ) : null}
          </div>
        ) : null}

        {draft.kind === "maintenance" || draft.kind === "announcement" ? (
          <label className="block">
            <span className="text-sm font-medium">{draft.kind === "maintenance" ? "الصيانة" : "شريط الإعلان"}</span>
            <select className={`${field} mt-1.5`} value={draft.on ? "1" : "0"} onChange={(e) => set({ on: e.target.value === "1" })}>
              <option value="1">شغّل</option>
              <option value="0">طفّي</option>
            </select>
          </label>
        ) : null}
        {draft.kind === "maintenance" && draft.on ? (
          <label className="block">
            <span className="text-sm font-medium">الرسالة (اختياري)</span>
            <input className={`${field} mt-1.5`} value={draft.message} maxLength={300} placeholder={options.now.maintenance.message ?? "راجعين قريباً"} onChange={(e) => set({ message: e.target.value })} />
          </label>
        ) : null}
        {draft.kind === "announcement" && draft.on ? (
          <>
            <label className="block">
              <span className="text-sm font-medium">النص</span>
              <input className={`${field} mt-1.5`} value={draft.text} maxLength={200} placeholder={options.now.announcement.text ?? "شحن مجاني فوق ₪200"} onChange={(e) => set({ text: e.target.value })} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">الرابط (اختياري)</span>
              <input className={`${field} mt-1.5`} dir="ltr" value={draft.link} maxLength={300} placeholder={options.now.announcement.link ?? "/shop"} onChange={(e) => set({ link: e.target.value })} />
            </label>
          </>
        ) : null}

        {draft.kind === "section" ? (
          <>
            <label className="block">
              <span className="text-sm font-medium">القسم</span>
              <select className={`${field} mt-1.5`} value={draft.sectionId} onChange={(e) => set({ sectionId: e.target.value })}>
                {options.sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {`${s.page.name} · ${s.title ?? s.type}${s.isVisible ? "" : " (مخفي)"}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium">بيصير</span>
              <select className={`${field} mt-1.5`} value={draft.visible ? "1" : "0"} onChange={(e) => set({ visible: e.target.value === "1" })}>
                <option value="1">ظاهر</option>
                <option value="0">مخفي</option>
              </select>
            </label>
          </>
        ) : null}

        {draft.kind === "cachePurge" ? (
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium">شو يفضى</span>
            <select className={`${field} mt-1.5`} value={draft.namespace ?? ""} onChange={(e) => set({ namespace: e.target.value || null })}>
              <option value="">كل الكاش</option>
              {options.namespaces.map((n) => (
                <option key={n} value={n}>
                  {NAMESPACE_TEXT[n]?.label ?? n}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block">
          <span className="text-sm font-medium">إمتى</span>
          <div className="mt-1.5 flex gap-2">
            <input type="datetime-local" className={field} value={toLocalInput(draft.runAt)} onChange={(e) => set({ runAt: fromLocalInput(e.target.value) ?? draft.runAt })} />
            <Button size="sm" variant="ghost" onClick={() => set({ runAt: new Date().toISOString() })}>
              هلّق
            </Button>
          </div>
        </label>
        {draft.kind !== "cachePurge" ? (
          <div>
            <label className="inline-flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={draft.undoOn} onChange={(e) => set({ undoOn: e.target.checked })} />
              يرجع لحاله
            </label>
            <input type="datetime-local" className={`${field} mt-1.5`} disabled={!draft.undoOn} value={toLocalInput(draft.undoAt)} onChange={(e) => set({ undoAt: fromLocalInput(e.target.value) ?? draft.undoAt })} />
          </div>
        ) : null}
      </div>

      {lines ? (
        <ul className="mt-4 space-y-1 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm" data-testid="schedule-preview">
          {lines.map((l) => (
            <li key={l.key}>{previewLineText(l, names)}</li>
          ))}
          {draft.kind === "motion" && shop ? (
            <li>
              <a href={motionPreviewUrl(shop, motionNow)} target="_blank" rel="noreferrer" className="text-xs underline">
                جرّبه بالمتجر (بهالمتصفح بس)
              </a>
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => preview.mutate()} isLoading={preview.isPending}>
          شو رح يتغيّر
        </Button>
        <Button variant="primary" onClick={() => save.mutate()} isLoading={save.isPending}>
          {Date.parse(draft.runAt) <= openedAt + 60_000 ? "احفظ ونفّذ هلّق" : "احفظ بالجدول"}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          إلغاء
        </Button>
      </div>
    </Card>
  );
}
