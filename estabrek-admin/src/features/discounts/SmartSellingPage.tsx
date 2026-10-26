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
import { tr } from "@/lib/words";

type Tab = "suggestions" | "seasons" | "history";
const field = "h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";
const themeName = (id: string) => THEME_PRESETS.find((p) => p.id === id)?.name ?? id;
const onError = (e: unknown) => toast.error(tr("ما زبط", "That didn't work"), { description: getApiErrorMessage(e) });

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
    <div className="space-y-4 pb-16" data-testid="selling-page">
      <PageHeader
        title={tr("البيع الذكي", "Smart selling")}
        subtitle={tr("اقتراحات خصم من أرقام المخزون والمشاهدات، ومواسم بثيم وأسعار بتبلّش وبتخلص لحالها. ولا شي بيتغيّر بدون موافقة، وكل تغيير بينرجع.", "Discount ideas from stock and view numbers, and seasons with a theme and prices that start and end by themselves. Nothing changes without approval, and every change can be undone.")}
      />
      <div className="sm:max-w-lg">
        <Segmented
          value={tab}
          disabled={false}
          onChange={pick}
          options={[
            { value: "suggestions", label: tr("اقتراحات", "Suggestions") },
            { value: "seasons", label: tr("المواسم", "Seasons") },
            { value: "history", label: tr("سجل التغييرات", "Change history") },
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
      if (ok) toast.success(ok === 1 ? tr("انطبّق", "Applied") : tr(`انطبّق على ${ok} منتجات`, "Applied to {0} products", [ok]), { description: tr("بيرجع من «سجل التغييرات».", "Undo it from “Change history”.") });
      if (failed) toast.error(tr(`ما زبط على ${failed}`, "Didn't work for {0}", [failed]));
      if (!ok && !failed) toast.info(tr("ما في شي تغيّر", "Nothing changed"), { description: tr("المقاسات عليها خصم أصلاً.", "The sizes are already discounted.") });
      refresh();
    },
    onError,
  });
  const skip = useMutation({
    mutationFn: (s: Suggestion) => SellingAPI.skipSuggestion(s.rule, s.productId, 30),
    onSuccess: () => (toast.success(tr("ما رح ينقترح لشهر", "Won't be suggested for a month")), refresh()),
    onError,
  });

  if (!q.data) return <Card>{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</Card>;
  const d = q.data;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-white/70">{d.suggestions.length ? tr(`${d.suggestions.length} اقتراح`, "{0} suggestions", [d.suggestions.length]) : tr("ما في اقتراحات هلّق.", "No suggestions right now.")}</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowRules(!showRules)} aria-expanded={showRules}>
            {tr("القواعد", "Rules")}
          </Button>
          {canWrite && d.suggestions.length > 1 ? (
            <Button variant="secondary" size="sm" onClick={() => approve.mutate(d.suggestions)} isLoading={approve.isPending}>
              {tr("موافقة على الكل", "Approve all")}
            </Button>
          ) : null}
        </div>
      </div>
      {showRules ? <RulesCard data={d} canWrite={canWrite} onSaved={refresh} /> : null}
      {d.viewsDays < d.unseenDays ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          {tr("عدّ المشاهدات صرله", "View counting has run for")} {d.viewsDays} {tr("يوم بس: اقتراحات «ما حدا شافه» بتصير أدق لما يكمل", "days only: “Nobody saw it” ideas get more accurate once it reaches")} {d.unseenDays} {tr("يوم.", "days.")}
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
                  {tr("موافقة", "Approve")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => skip.mutate(s)} disabled={skip.isPending}>
                  {tr("مش هلّق", "Not now")}
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
  const save = useMutation({ mutationFn: () => SellingAPI.saveRules(draft), onSuccess: () => (toast.success(tr("انحفظت القواعد", "Rules saved")), onSaved()), onError });
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
              <NumberInput id={`rule-${k}-percent`} label={tr("الخصم", "Discount")} unit="%" value={draft[k].percent} def={data.defaults[k].percent} limits={L.percent} invalid={!inRange(draft[k].percent, L.percent)} disabled={!canWrite || !draft[k].on} onChange={(percent) => set(k, { percent })} />
              <NumberInput id={`rule-${k}-days`} label={tr("لمدة", "For")} unit={tr("يوم", "days")} value={draft[k].saleDays} def={data.defaults[k].saleDays} limits={L.saleDays} invalid={!inRange(draft[k].saleDays, L.saleDays)} disabled={!canWrite || !draft[k].on} onChange={(saleDays) => set(k, { saleDays })} />
            </div>
          </div>
        ))}
        <div>
          <Toggle label={RULE_TEXT.hotLowStock.label} help={RULE_TEXT.hotLowStock.what} checked={draft.hotLowStock.on} disabled={!canWrite} onChange={(on) => set("hotLowStock", { on })} />
          <div className={`mt-3 sm:max-w-xs ${draft.hotLowStock.on ? "" : "opacity-50"}`}>
            <NumberInput id="rule-hot-left" label={tr("لما يبقى", "When there are")} unit={tr("قطعة أو أقل", "pieces or fewer left")} value={draft.hotLowStock.maxLeft} def={data.defaults.hotLowStock.maxLeft} limits={L.maxLeft} invalid={!inRange(draft.hotLowStock.maxLeft, L.maxLeft)} disabled={!canWrite || !draft.hotLowStock.on} onChange={(maxLeft) => set("hotLowStock", { maxLeft })} />
          </div>
        </div>
        <p className="text-xs text-white/50">
          {tr("«ما حدا شافه» و«بيتفرجوا وما بيشتروا» بيستعملوا المدة من", "“Nobody saw it” and “Looked but didn't buy” use the time from")}{" "}
          <Link to="/admin/inventory/forecast" className="underline">
            {tr("توقّع المخزون", "Stock forecast")}
          </Link>{" "}
          ({data.unseenDays} {tr("يوم).", "days).")}
        </p>
        {canWrite ? (
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => save.mutate()} isLoading={save.isPending} disabled={!dirty || bad}>
              {tr("حفظ", "Save")}
            </Button>
            {dirty ? (
              <Button variant="ghost" onClick={() => setDraft(data.rules)}>
                {tr("تراجع", "Undo")}
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
    return (id: string) => m.get(id) ?? tr("تصنيف محذوف", "Deleted category");
  }, [cats.data]);
  const save = useMutation({
    mutationFn: (d: CampaignDraft) => {
      const body = { ...d, productIds: [] };
      return editing ? SellingAPI.updateCampaign(editing, body) : SellingAPI.createCampaign(body);
    },
    onSuccess: ({ campaign }) => {
      toast.success(campaign.status === "running" ? tr("بلّش الموسم", "The season started") : tr("انحفظ الموسم", "Season saved"), { description: campaign.status === "running" ? undefined : tr(`بيبلّش ${campaignWhen(campaign).split(` ${tr("←", "→")} `)[0]}`, "Starts {0}", [campaignWhen(campaign).split(` ${tr("←", "→")} `)[0]]) });
      setDraft(null);
      setEditing(null);
      refresh();
    },
    onError,
  });
  const end = useMutation({
    mutationFn: (c: Campaign) => SellingAPI.endCampaign(c.id),
    onSuccess: ({ campaign }) => (toast.success(tr("توقّف الموسم", "The season stopped"), { description: campaignLogText(campaign) ?? undefined }), setEnding(null), refresh()),
    onError,
  });

  if (!q.data) return <Card>{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</Card>;
  const list = q.data.campaigns;
  return (
    <div className="space-y-3">
      {canWrite && !draft ? (
        <Button variant="primary" onClick={() => (setEditing(null), setDraft(emptyDraft()))}>
          {tr("موسم جديد", "New season")}
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
          <p className="text-sm text-white/60">{tr("ما في مواسم لسا. مثلاً: «رمضان» بثيم ذهبي وخصم 15% على العبايات، من أول رمضان لآخره، وبعدها كل شي بيرجع لحاله.", "No seasons yet. e.g. “Ramadan” with a gold theme and 15% off abayas, from the start of Ramadan to its end, then everything goes back by itself.")}</p>
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
                      {tr("تعديل", "Edit")}
                    </Button>
                  ) : null}
                  <Button size="sm" variant="secondary" onClick={() => setEnding(c)}>
                    {c.status === "running" ? tr("توقيف هلّق", "Stop it now") : tr("إلغاء", "Cancel")}
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        );
      })}
      <ConfirmDialog
        open={!!ending}
        title={ending?.status === "running" ? tr(`توقيف «${ending?.name}» هلّق`, "Stop “{0}” now", [ending?.name]) : tr(`إلغاء «${ending?.name ?? ""}»`, "Cancel “{0}”", [ending?.name ?? ""])}
        message={ending?.status === "running" ? tr("الثيم والأسعار بيرجعوا متل ما كانوا قبل الموسم (اللي تغيّر باليد بالنص بيضل).", "The theme and prices go back to how they were before the season (what was changed by hand in between stays).") : tr("الموسم ما بلّش، فما في شي يرجع.", "The season hasn't started, so there's nothing to undo.")}
        confirmText={ending?.status === "running" ? tr("توقيف", "Stop") : tr("إلغاء الموسم", "Cancel season")}
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
          <span className="text-sm font-medium">{tr("الاسم", "Name")}</span>
          <input className={`${field} mt-1.5`} value={draft.name} maxLength={80} placeholder={tr("رمضان", "Ramadan")} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{tr("بيبلّش", "Starts")}</span>
          <input type="datetime-local" className={`${field} mt-1.5`} value={toLocalInput(draft.startsAt)} onChange={(e) => setDraft({ ...draft, startsAt: fromLocalInput(e.target.value) ?? draft.startsAt })} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{tr("بيخلص", "Ends")}</span>
          <input type="datetime-local" className={`${field} mt-1.5`} value={toLocalInput(draft.endsAt)} onChange={(e) => setDraft({ ...draft, endsAt: fromLocalInput(e.target.value) ?? draft.endsAt })} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{tr("الثيم وقت الموسم", "Theme during the season")}</span>
          <select className={`${field} mt-1.5`} value={draft.themePresetId ?? ""} disabled={!canTheme} onChange={(e) => setDraft({ ...draft, themePresetId: e.target.value || null })}>
            <option value="">{tr("بدون تغيير", "No change")}</option>
            {THEME_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {!canTheme ? <span className="mt-1 block text-xs text-white/50">{tr("تغيير الثيم بدّه صلاحية الإعدادات.", "Changing the theme needs the settings permission.")}</span> : <span className="mt-1 block text-xs text-white/50">{tr("بيرجع للثيم الحالي بالنهاية.", "It goes back to the current theme at the end.")}</span>}
        </label>
        <label className="block">
          <span className="text-sm font-medium">{tr("خصم وقت الموسم", "Discount during the season")}</span>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={70}
              className={field}
              value={draft.percentOff ?? ""}
              placeholder={tr("بدون خصم", "No discount")}
              onChange={(e) => setDraft({ ...draft, percentOff: e.target.value === "" ? null : Math.round(Number(e.target.value)) })}
            />
            <span className="text-sm text-white/60">%</span>
          </div>
          <span className="mt-1 block text-xs text-white/50">{tr("المقاسات اللي عليها خصم تاني بتضل متل ما هي. الأسعار بترجع لحالها بالنهاية.", "Sizes with another discount stay as they are. Prices go back by themselves at the end.")}</span>
        </label>
        {draft.percentOff ? (
          <div className="sm:col-span-2">
            <span className="text-sm font-medium">{tr("على شو", "On what")}</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button type="button" onClick={() => setDraft({ ...draft, categoryIds: [] })} className={`rounded-full border px-3 py-1 text-xs ${scopeAll ? "border-white/40 bg-white/10" : "border-white/10 text-white/60"}`}>
                {tr("كل المنتجات", "All products")}
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
                {tr(`${preview.data.products} منتج، ${preview.data.sizes} مقاس`, "{0} products, {1} sizes", [preview.data.products, preview.data.sizes]) +
                  (preview.data.onSaleAlready ? tr(`؛ ${preview.data.onSaleAlready} عليهم خصم تاني وبيضلّوا متل ما هم`, "; {0} already have another discount and stay as they are", [preview.data.onSaleAlready]) : "") +
                  "."}
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
          {editing ? tr("حفظ التعديل", "Save changes") : Date.parse(draft.startsAt) <= now ? tr("حفظ وبدء هلّق", "Save and start now") : tr("حفظ الموسم", "Save season")}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {tr("إلغاء", "Cancel")}
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
      toast.success(tr("انرجع", "Undone"), { description: r.changedSince ? tr(`${r.changedSince} مقاس تغيّر من بعدها، تركناه متل ما هو.`, "{0} sizes changed since then; left as they are.", [r.changedSince]) : undefined });
      void qc.invalidateQueries({ queryKey: ["selling"] });
    },
    onError,
  });
  if (!q.data) return <Card>{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</Card>;
  if (!q.data.actions.length)
    return (
      <Card>
        <p className="text-sm text-white/60">{tr("ما في تغييرات لسا.", "No changes yet.")}</p>
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
                {tr("ترجيع", "Undo")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
