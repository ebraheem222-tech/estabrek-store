// البيع الذكي: sale rules that suggest (nothing changes without your yes, and every
// change can be undone), and seasons: a theme and prices from a start to an end,
// back by themselves at the end. Uses the stock forecast and the popularity counts.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { listCategories } from "../../api/catalog.api";
import { THEME_PRESETS } from "../../theme/presets";
import * as SellingAPI from "../../api/selling.api";
import type { Campaign, RuleName, RuleSettings, Suggestion, SuggestionsPage } from "../../api/selling.api";
import { NumberInput, Segmented, Toggle } from "../system/cacheParts";
import { relativeTime } from "../team/teamText";
import {
  ACTION_KIND_TEXT,
  ACTION_STATUS_TEXT,
  CAMPAIGN_STATUS_TEXT,
  RULE_TEXT,
  actionText,
  campaignLogText,
  campaignProblems,
  campaignWhat,
  campaignWhen,
  fromLocalInput,
  priceActionText,
  suggestionSentence,
  toLocalInput,
  type CampaignDraft,
} from "./sellingText";

type Tab = "suggestions" | "seasons" | "history";
const field = "h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";
const themeName = (id: string) => THEME_PRESETS.find((p) => p.id === id)?.name ?? id;
const onError = (e: unknown) => toast.error("ما زبط", { description: getApiErrorMessage(e) });

export default function SmartSellingPage() {
  const [tab, setTab] = useState<Tab>(() => (typeof window !== "undefined" && window.location.hash === "#seasons" ? "seasons" : window.location.hash === "#history" ? "history" : "suggestions"));
  const pick = (t: Tab) => {
    setTab(t);
    try {
      window.history.replaceState(null, "", t === "suggestions" ? window.location.pathname : `#${t}`);
    } catch {
      /* ignore */
    }
  };
  return (
    <div dir="rtl" className="space-y-4 pb-16" data-testid="selling-page">
      <PageHeader
        title="البيع الذكي"
        subtitle="اقتراحات خصم من أرقام المخزون والمشاهدات، ومواسم بثيم وأسعار بتبلّش وبتخلص لحالها. ولا شي بيتغيّر بدون موافقتك، وكل تغيير بينرجع."
      />
      <div className="sm:max-w-lg">
        <Segmented
          value={tab}
          disabled={false}
          onChange={pick}
          options={[
            { value: "suggestions", label: "اقتراحات" },
            { value: "seasons", label: "المواسم" },
            { value: "history", label: "سجل التغييرات" },
          ]}
        />
      </div>
      {tab === "suggestions" ? <SuggestionsTab /> : tab === "seasons" ? <SeasonsTab /> : <HistoryTab />}
    </div>
  );
}

/* ---------------- Suggestions ---------------- */

function SuggestionsTab() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("discounts:write");
  const q = useQuery({ queryKey: ["selling", "suggestions"], queryFn: SellingAPI.getSuggestions });
  const [showRules, setShowRules] = useState(false);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["selling"] });
    void qc.invalidateQueries({ queryKey: ["insights"] });
  };
  const approve = useMutation({
    mutationFn: (items: Suggestion[]) => SellingAPI.approveSuggestions(items.map((s) => ({ rule: s.rule, productId: s.productId }))),
    onSuccess: ({ results }) => {
      const ok = results.filter((r) => r.ok && r.changed).length;
      const failed = results.filter((r) => !r.ok).length;
      if (ok) toast.success(ok === 1 ? "انطبّق" : `انطبّق على ${ok} منتجات`, { description: "بترجّعه من «سجل التغييرات»." });
      if (failed) toast.error(`ما زبط على ${failed}`);
      if (!ok && !failed) toast.info("ما في شي تغيّر", { description: "المقاسات عليها خصم أصلاً." });
      refresh();
    },
    onError,
  });
  const skip = useMutation({
    mutationFn: (s: Suggestion) => SellingAPI.skipSuggestion(s.rule, s.productId, 30),
    onSuccess: () => (toast.success("ما رح ينقترح لشهر"), refresh()),
    onError,
  });

  if (!q.data) return <Card>{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</Card>;
  const d = q.data;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-white/70">{d.suggestions.length ? `${d.suggestions.length} اقتراح` : "ما في اقتراحات هلّق."}</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowRules(!showRules)} aria-expanded={showRules}>
            القواعد
          </Button>
          {canWrite && d.suggestions.length > 1 ? (
            <Button variant="secondary" size="sm" onClick={() => approve.mutate(d.suggestions)} isLoading={approve.isPending}>
              وافق على الكل
            </Button>
          ) : null}
        </div>
      </div>
      {showRules ? <RulesCard data={d} canWrite={canWrite} onSaved={refresh} /> : null}
      {d.viewsDays < d.unseenDays ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          عدّ المشاهدات صرله {d.viewsDays} يوم بس: اقتراحات «ما حدا شافه» بتصير أدق لما يكمل {d.unseenDays} يوم.
        </p>
      ) : null}
      {d.suggestions.map((s) => (
        <Card key={`${s.rule}|${s.productId}`} padding="sm">
          <div className="flex items-start gap-3" data-testid={`suggestion-${s.rule}-${s.productId}`}>
            {s.thumbUrl ? <img src={s.thumbUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" loading="lazy" /> : <div className="h-12 w-12 shrink-0 rounded-xl bg-white/5" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/admin/catalog/products/${s.productId}`} className="truncate font-medium hover:underline">
                  {s.title}
                </Link>
                <Badge size="sm" variant={s.rule === "hotLowStock" ? "warning" : "info"}>
                  {RULE_TEXT[s.rule].label}
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-white/70">{suggestionSentence(s)}</p>
              <p className="mt-1 text-sm font-medium">{actionText(s.action, s.why)}</p>
            </div>
            {canWrite ? (
              <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                <Button size="sm" variant="primary" onClick={() => approve.mutate([s])} disabled={approve.isPending}>
                  موافق
                </Button>
                <Button size="sm" variant="ghost" onClick={() => skip.mutate(s)} disabled={skip.isPending}>
                  مش هلّق
                </Button>
              </div>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}

function RulesCard({ data, canWrite, onSaved }: { data: SuggestionsPage; canWrite: boolean; onSaved: () => void }) {
  const [draft, setDraft] = useState<RuleSettings>(data.rules);
  const save = useMutation({ mutationFn: () => SellingAPI.saveRules(draft), onSuccess: () => (toast.success("انحفظت القواعد"), onSaved()), onError });
  const set = <K extends RuleName>(k: K, patch: Partial<RuleSettings[K]>) => setDraft({ ...draft, [k]: { ...draft[k], ...patch } });
  const L = data.limits;
  const inRange = (v: number, l: { min: number; max: number }) => Number.isInteger(v) && v >= l.min && v <= l.max;
  const bad = !inRange(draft.unseen.percent, L.percent) || !inRange(draft.unseen.saleDays, L.saleDays) || !inRange(draft.lookedNotBought.percent, L.percent) || !inRange(draft.lookedNotBought.saleDays, L.saleDays) || !inRange(draft.hotLowStock.maxLeft, L.maxLeft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(data.rules);
  return (
    <Card>
      <div className="space-y-5">
        {(["unseen", "lookedNotBought"] as const).map((k) => (
          <div key={k}>
            <Toggle label={RULE_TEXT[k].label} help={RULE_TEXT[k].what} checked={draft[k].on} disabled={!canWrite} onChange={(on) => set(k, { on })} />
            <div className={`mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 ${draft[k].on ? "" : "opacity-50"}`}>
              <NumberInput id={`rule-${k}-percent`} label="الخصم" unit="%" value={draft[k].percent} def={data.defaults[k].percent} limits={L.percent} invalid={!inRange(draft[k].percent, L.percent)} disabled={!canWrite || !draft[k].on} onChange={(percent) => set(k, { percent })} />
              <NumberInput id={`rule-${k}-days`} label="لمدة" unit="يوم" value={draft[k].saleDays} def={data.defaults[k].saleDays} limits={L.saleDays} invalid={!inRange(draft[k].saleDays, L.saleDays)} disabled={!canWrite || !draft[k].on} onChange={(saleDays) => set(k, { saleDays })} />
            </div>
          </div>
        ))}
        <div>
          <Toggle label={RULE_TEXT.hotLowStock.label} help={RULE_TEXT.hotLowStock.what} checked={draft.hotLowStock.on} disabled={!canWrite} onChange={(on) => set("hotLowStock", { on })} />
          <div className={`mt-3 sm:max-w-xs ${draft.hotLowStock.on ? "" : "opacity-50"}`}>
            <NumberInput id="rule-hot-left" label="لما يبقى" unit="قطعة أو أقل" value={draft.hotLowStock.maxLeft} def={data.defaults.hotLowStock.maxLeft} limits={L.maxLeft} invalid={!inRange(draft.hotLowStock.maxLeft, L.maxLeft)} disabled={!canWrite || !draft.hotLowStock.on} onChange={(maxLeft) => set("hotLowStock", { maxLeft })} />
          </div>
        </div>
        <p className="text-xs text-white/50">
          «ما حدا شافه» و«بيتفرجوا وما بيشتروا» بيستعملوا المدة من{" "}
          <Link to="/admin/inventory/forecast" className="underline">
            توقّع المخزون
          </Link>{" "}
          ({data.unseenDays} يوم).
        </p>
        {canWrite ? (
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => save.mutate()} isLoading={save.isPending} disabled={!dirty || bad}>
              حفظ
            </Button>
            {dirty ? (
              <Button variant="ghost" onClick={() => setDraft(data.rules)}>
                تراجع
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

/* ---------------- Seasons ---------------- */

const emptyDraft = (): CampaignDraft => {
  const start = new Date(Date.now() + 86400_000);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 30 * 86400_000 - 60_000);
  return { name: "", startsAt: start.toISOString(), endsAt: end.toISOString(), themePresetId: null, percentOff: null, categoryIds: [] };
};

function SeasonsTab() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("discounts:write");
  const canTheme = hasPermission("settings:write");
  const q = useQuery({ queryKey: ["selling", "campaigns"], queryFn: SellingAPI.getCampaigns, refetchInterval: 30_000 });
  const cats = useQuery({ queryKey: ["catalog", "categories"], queryFn: listCategories });
  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [ending, setEnding] = useState<Campaign | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: ["selling"] });
  const catName = useMemo(() => {
    const m = new Map((cats.data ?? []).map((c) => [c.id, c.name]));
    return (id: string) => m.get(id) ?? "تصنيف محذوف";
  }, [cats.data]);
  const save = useMutation({
    mutationFn: (d: CampaignDraft) => {
      const body = { ...d, productIds: [] };
      return editing ? SellingAPI.updateCampaign(editing, body) : SellingAPI.createCampaign(body);
    },
    onSuccess: ({ campaign }) => {
      toast.success(campaign.status === "running" ? "بلّش الموسم" : "انحفظ الموسم", { description: campaign.status === "running" ? undefined : `بيبلّش ${campaignWhen(campaign).split(" ← ")[0]}` });
      setDraft(null);
      setEditing(null);
      refresh();
    },
    onError,
  });
  const end = useMutation({
    mutationFn: (c: Campaign) => SellingAPI.endCampaign(c.id),
    onSuccess: ({ campaign }) => (toast.success("توقّف الموسم", { description: campaignLogText(campaign) ?? undefined }), setEnding(null), refresh()),
    onError,
  });

  if (!q.data) return <Card>{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</Card>;
  const list = q.data.campaigns;
  return (
    <div className="space-y-3">
      {canWrite && !draft ? (
        <Button variant="primary" onClick={() => (setEditing(null), setDraft(emptyDraft()))}>
          موسم جديد
        </Button>
      ) : null}
      {draft ? (
        <SeasonForm
          draft={draft}
          setDraft={setDraft}
          editing={!!editing}
          canTheme={canTheme}
          categories={cats.data ?? []}
          maxDays={q.data.maxDays}
          saving={save.isPending}
          onSave={() => save.mutate(draft)}
          onCancel={() => (setDraft(null), setEditing(null))}
        />
      ) : null}
      {!list.length && !draft ? (
        <Card>
          <p className="text-sm text-white/60">ما في مواسم لسا. مثلاً: «رمضان» بثيم ذهبي وخصم 15% على العبايات، من أول رمضان لآخره، وبعدها كل شي بيرجع لحاله.</p>
        </Card>
      ) : null}
      {list.map((c) => {
        const st = CAMPAIGN_STATUS_TEXT[c.status];
        const log = campaignLogText(c);
        return (
          <Card key={c.id} padding="sm">
            <div className="flex flex-wrap items-start justify-between gap-2" data-testid={`season-${c.id}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <Badge size="sm" variant={st.variant} dot={c.status === "running"}>
                    {st.label}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-white/60">{campaignWhen(c)}</p>
                <p className="mt-1 text-sm">{campaignWhat(c, themeName, catName)}</p>
                {log ? <p className="mt-1 text-xs text-white/50">{log}</p> : null}
              </div>
              {canWrite && (c.status === "scheduled" || c.status === "running") ? (
                <div className="flex gap-2">
                  {c.status === "scheduled" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(c.id);
                        setDraft({ name: c.name, startsAt: c.startsAt, endsAt: c.endsAt, themePresetId: c.themePresetId, percentOff: c.percentOff, categoryIds: c.categoryIds });
                      }}
                    >
                      تعديل
                    </Button>
                  ) : null}
                  <Button size="sm" variant="secondary" onClick={() => setEnding(c)}>
                    {c.status === "running" ? "وقّفه هلّق" : "إلغاء"}
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        );
      })}
      <ConfirmDialog
        open={!!ending}
        title={ending?.status === "running" ? `توقيف «${ending?.name}» هلّق` : `إلغاء «${ending?.name ?? ""}»`}
        message={ending?.status === "running" ? "الثيم والأسعار بيرجعوا متل ما كانوا قبل الموسم (اللي غيّرته بإيدك بالنص بيضل)." : "الموسم ما بلّش، فما في شي يرجع."}
        confirmText={ending?.status === "running" ? "وقّف" : "إلغاء الموسم"}
        variant="warning"
        isLoading={end.isPending}
        onConfirm={() => {
          if (ending) end.mutate(ending);
        }}
        onCancel={() => setEnding(null)}
      />
    </div>
  );
}

function SeasonForm({
  draft,
  setDraft,
  editing,
  canTheme,
  categories,
  maxDays,
  saving,
  onSave,
  onCancel,
}: {
  draft: CampaignDraft;
  setDraft: (d: CampaignDraft) => void;
  editing: boolean;
  canTheme: boolean;
  categories: Array<{ id: string; name: string; parentId?: string | null }>;
  maxDays: number;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  // The time the form opened (good enough for its checks and the button's words).
  const [now] = useState(() => Date.now());
  const problems = campaignProblems(draft, now, maxDays);
  const [touched, setTouched] = useState(false);
  const preview = useQuery({
    queryKey: ["selling", "preview", draft.percentOff, draft.categoryIds.join(",")],
    queryFn: () => SellingAPI.previewCampaign({ percentOff: draft.percentOff, categoryIds: draft.categoryIds, productIds: [] }),
    enabled: !!draft.percentOff,
  });
  const scopeAll = !draft.categoryIds.length;
  return (
    <Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="season-form">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">الاسم</span>
          <input className={`${field} mt-1.5`} value={draft.name} maxLength={80} placeholder="رمضان" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">بيبلّش</span>
          <input type="datetime-local" className={`${field} mt-1.5`} value={toLocalInput(draft.startsAt)} onChange={(e) => setDraft({ ...draft, startsAt: fromLocalInput(e.target.value) ?? draft.startsAt })} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">بيخلص</span>
          <input type="datetime-local" className={`${field} mt-1.5`} value={toLocalInput(draft.endsAt)} onChange={(e) => setDraft({ ...draft, endsAt: fromLocalInput(e.target.value) ?? draft.endsAt })} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">الثيم وقت الموسم</span>
          <select className={`${field} mt-1.5`} value={draft.themePresetId ?? ""} disabled={!canTheme} onChange={(e) => setDraft({ ...draft, themePresetId: e.target.value || null })}>
            <option value="">بدون تغيير</option>
            {THEME_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {!canTheme ? <span className="mt-1 block text-xs text-white/50">تغيير الثيم بدّه صلاحية الإعدادات.</span> : <span className="mt-1 block text-xs text-white/50">بيرجع للثيم الحالي بالنهاية.</span>}
        </label>
        <label className="block">
          <span className="text-sm font-medium">خصم وقت الموسم</span>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={70}
              className={field}
              value={draft.percentOff ?? ""}
              placeholder="بدون خصم"
              onChange={(e) => setDraft({ ...draft, percentOff: e.target.value === "" ? null : Math.round(Number(e.target.value)) })}
            />
            <span className="text-sm text-white/60">%</span>
          </div>
          <span className="mt-1 block text-xs text-white/50">المقاسات اللي عليها خصم تاني بتضل متل ما هي. الأسعار بترجع لحالها بالنهاية.</span>
        </label>
        {draft.percentOff ? (
          <div className="sm:col-span-2">
            <span className="text-sm font-medium">على شو</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button type="button" onClick={() => setDraft({ ...draft, categoryIds: [] })} className={`rounded-full border px-3 py-1 text-xs ${scopeAll ? "border-white/40 bg-white/10" : "border-white/10 text-white/60"}`}>
                كل المنتجات
              </button>
              {categories.map((c) => {
                const on = draft.categoryIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setDraft({ ...draft, categoryIds: on ? draft.categoryIds.filter((x) => x !== c.id) : [...draft.categoryIds, c.id] })}
                    className={`rounded-full border px-3 py-1 text-xs ${on ? "border-white/40 bg-white/10" : "border-white/10 text-white/60"}`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
            {preview.data ? (
              <p className="mt-2 text-xs text-white/60" data-testid="season-preview">
                {`${preview.data.products} منتج، ${preview.data.sizes} مقاس${preview.data.onSaleAlready ? `؛ ${preview.data.onSaleAlready} عليهم خصم تاني وبيضلّوا متل ما هم` : ""}.`}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      {touched && problems.length ? (
        <ul className="mt-3 space-y-0.5 text-xs text-red-300">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4 flex gap-2">
        <Button
          variant="primary"
          isLoading={saving}
          onClick={() => {
            setTouched(true);
            if (!problems.length) onSave();
          }}
        >
          {editing ? "حفظ التعديل" : Date.parse(draft.startsAt) <= now ? "احفظ وبلّش هلّق" : "احفظ الموسم"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </Card>
  );
}

/* ---------------- History ---------------- */

function HistoryTab() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("discounts:write");
  const q = useQuery({ queryKey: ["selling", "actions"], queryFn: SellingAPI.getPriceActions });
  const undo = useMutation({
    mutationFn: (id: string) => SellingAPI.undoPriceAction(id),
    onSuccess: (r) => {
      toast.success("انرجع", { description: r.changedSince ? `${r.changedSince} مقاس تغيّر من بعدها، تركناه متل ما هو.` : undefined });
      void qc.invalidateQueries({ queryKey: ["selling"] });
    },
    onError,
  });
  if (!q.data) return <Card>{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</Card>;
  if (!q.data.actions.length)
    return (
      <Card>
        <p className="text-sm text-white/60">ما في تغييرات لسا.</p>
      </Card>
    );
  return (
    <Card padding="none">
      <ul className="divide-y divide-white/10" data-testid="selling-history">
        {q.data.actions.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/admin/catalog/products/${a.productId}`} className="truncate font-medium hover:underline">
                  {a.title}
                </Link>
                <Badge size="sm">{a.rule ? RULE_TEXT[a.rule].label : ACTION_KIND_TEXT[a.kind]}</Badge>
                {a.status !== "applied" ? <Badge size="sm">{ACTION_STATUS_TEXT[a.status]}</Badge> : null}
              </div>
              <p className="text-xs text-white/60">{`${priceActionText(a)} · ${relativeTime(a.createdAt)}`}</p>
            </div>
            {canWrite && a.status === "applied" && !a.campaignId ? (
              <Button size="sm" variant="ghost" onClick={() => undo.mutate(a.id)} isLoading={undo.isPending && undo.variables === a.id}>
                رجّع
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
