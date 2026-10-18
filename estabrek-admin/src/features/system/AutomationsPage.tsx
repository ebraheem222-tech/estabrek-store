// التلقائيات: "when X, do Y". A new order → a WhatsApp to me, stock below 3 → an
// email, a video ready → a notification, a product going viral → pinned in the
// cache, a background job failing → tell me. Messages go through the outbox.
import { useState } from "react";
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
import * as AutoAPI from "../../api/automations.api";
import type { Action, AutomationRule, AutomationsPage as Data, RuleInput, Trigger } from "../../api/automations.api";
import { relativeTime } from "../team/teamText";
import { ACTION_TEXT, TRIGGER_TEXT, WORD_TEXT, channelWarning, cooldownText, newRule, ruleSentence, runDetailText } from "./automationText";

const field = "h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";
const KEY = ["automations"];
const onError = (e: unknown) => toast.error("ما زبط", { description: getApiErrorMessage(e) });
const TRIGGERS = Object.keys(TRIGGER_TEXT) as Trigger[];
/** What can be saved (the server refuses anything else, like its counters). */
const inputOf = (r: AutomationRule): RuleInput => ({ name: r.name, trigger: r.trigger, conditions: r.conditions, action: r.action, config: r.config, enabled: r.enabled, cooldownMinutes: r.cooldownMinutes });
const COOLDOWNS = [0, 30, 60, 6 * 60, 24 * 60, 7 * 24 * 60];

export default function AutomationsPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("settings:write");
  const q = useQuery({ queryKey: KEY, queryFn: AutoAPI.getAutomations, refetchInterval: 60_000 });
  const [draft, setDraft] = useState<RuleInput | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<AutomationRule | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: KEY });
  const save = useMutation({
    mutationFn: (d: RuleInput) => (editing ? AutoAPI.updateRule(editing, d) : AutoAPI.createRule(d)),
    onSuccess: () => (toast.success("انحفظت"), setDraft(null), setEditing(null), refresh()),
    onError,
  });
  const toggle = useMutation({ mutationFn: (r: AutomationRule) => AutoAPI.updateRule(r.id, { ...inputOf(r), enabled: !r.enabled }), onSuccess: refresh, onError });
  const test = useMutation({
    mutationFn: (r: AutomationRule) => AutoAPI.testRule(r.id),
    onSuccess: (out) => (out.ok ? toast.success("انجرّبت", { description: runDetailText(out.detail) }) : toast.error("ما زبطت", { description: runDetailText(out.detail) }), refresh()),
    onError,
  });
  const remove = useMutation({ mutationFn: (r: AutomationRule) => AutoAPI.deleteRule(r.id), onSuccess: () => (setRemoving(null), refresh()), onError });

  if (!q.data) {
    return (
      <div dir="rtl">
        <PageHeader title="التلقائيات" />
        <Card>{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</Card>
      </div>
    );
  }
  const d = q.data;
  const ruleName = (id: string) => d.rules.find((r) => r.id === id)?.name ?? "قاعدة محذوفة";

  return (
    <div dir="rtl" className="space-y-4 pb-16" data-testid="automations-page">
      <PageHeader
        title="التلقائيات"
        subtitle="لما يصير شي، اعمل شي: طلب جديد ← واتساب إلك، مقاس قرب يخلص ← إيميل، فيديو جهز ← إشعار، منتج عم ينتشر ← تثبيت بالكاش."
        right={
          canWrite && !draft ? (
            <Button variant="primary" onClick={() => (setEditing(null), setDraft(newRule("order.created", d.triggers["order.created"].conditions)))}>
              قاعدة جديدة
            </Button>
          ) : undefined
        }
      />
      {draft ? <RuleForm draft={draft} setDraft={setDraft} data={d} editing={!!editing} canPin={hasPermission("system:write")} saving={save.isPending} onSave={() => save.mutate(draft)} onCancel={() => (setDraft(null), setEditing(null))} /> : null}

      {!d.rules.length && !draft ? (
        <Card>
          <p className="text-sm text-white/60">ما في قواعد لسا. ابدأ بـ «طلب جديد ← إشعار»: بيوصلك على الجرس فوق.</p>
        </Card>
      ) : null}

      {d.rules.map((r) => {
        const warn = channelWarning(r.action, d.channels);
        return (
          <Card key={r.id} padding="sm">
            <div className="flex flex-wrap items-start justify-between gap-2" data-testid={`rule-${r.id}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.name}</span>
                  <Badge size="sm" variant={r.enabled ? "success" : "default"}>
                    {r.enabled ? "شغّالة" : "موقّفة"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm">{ruleSentence(r, d.shop)}</p>
                <p className="mt-0.5 text-xs text-white/50">
                  {[cooldownText(r.cooldownMinutes), r.fired ? `اشتغلت ${r.fired.toLocaleString("en")} مرة، آخرها ${relativeTime(r.lastFiredAt)}` : "لسا ما اشتغلت"].join(" · ")}
                </p>
                {warn ? <p className="mt-1 text-xs text-amber-300">{warn}</p> : null}
              </div>
              {canWrite ? (
                <div className="flex flex-wrap gap-2">
                  {r.action !== "pinProduct" ? (
                    <Button size="sm" variant="ghost" onClick={() => test.mutate(r)} disabled={test.isPending}>
                      جرّب
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => toggle.mutate(r)} disabled={toggle.isPending}>
                    {r.enabled ? "وقّف" : "شغّل"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => (setEditing(r.id), setDraft(inputOf(r)))}>
                    تعديل
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRemoving(r)}>
                    حذف
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        );
      })}

      {d.runs.length ? (
        <Card padding="none">
          <h2 className="px-4 pt-3 text-sm font-semibold text-white/70">آخر مرات اشتغلت</h2>
          <ul className="mt-2 divide-y divide-white/10 text-xs" data-testid="automation-runs">
            {d.runs.slice(0, 20).map((run) => (
              <li key={run.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{ruleName(run.ruleId)}</span>
                  <span className={run.ok ? "text-white/60" : "text-red-300"}>{` · ${runDetailText(run.detail)}`}</span>
                </span>
                <span className="shrink-0 text-white/40">{relativeTime(run.at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <p className="text-xs text-white/50">
        الإيميلات والواتساب والـ SMS بيمرّوا من{" "}
        <Link to="/admin/outbox" className="underline">
          الرسايل
        </Link>
        ، وبتشوف هناك إذا وصلوا.
      </p>

      <ConfirmDialog
        open={!!removing}
        title={`حذف «${removing?.name ?? ""}»`}
        message="القاعدة وسجلها بينحذفوا."
        confirmText="احذف"
        variant="danger"
        isLoading={remove.isPending}
        onConfirm={() => {
          if (removing) remove.mutate(removing);
        }}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}

function RuleForm({ draft, setDraft, data, editing, canPin, saving, onSave, onCancel }: { draft: RuleInput; setDraft: (d: RuleInput) => void; data: Data; editing: boolean; canPin: boolean; saving: boolean; onSave: () => void; onCancel: () => void }) {
  const t = data.triggers[draft.trigger];
  const actions = (Object.keys(ACTION_TEXT) as Action[]).filter((a) => (a === "pinProduct" ? t.product && canPin : true));
  const warn = channelWarning(draft.action, data.channels);
  const placeholderTo = draft.action === "email" ? data.shop.email : draft.action === "whatsapp" ? data.shop.whatsapp : data.shop.phone;
  const setCond = (k: string, v: number) => setDraft({ ...draft, conditions: { ...draft.conditions, [k]: v } });
  return (
    <Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="rule-form">
        <label className="block">
          <span className="text-sm font-medium">لما</span>
          <select
            className={`${field} mt-1.5`}
            value={draft.trigger}
            onChange={(e) => {
              const trig = e.target.value as Trigger;
              const base = newRule(trig, data.triggers[trig].conditions);
              setDraft({ ...base, name: draft.name && draft.name !== TRIGGER_TEXT[draft.trigger].label ? draft.name : base.name });
            }}
          >
            {TRIGGERS.map((k) => (
              <option key={k} value={k}>
                {TRIGGER_TEXT[k].label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-white/50">{TRIGGER_TEXT[draft.trigger].when}</span>
        </label>
        <label className="block">
          <span className="text-sm font-medium">اعمل</span>
          <select className={`${field} mt-1.5`} value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value as Action, config: e.target.value === "pinProduct" ? { hours: 48 } : { text: draft.config.text } })}>
            {actions.map((a) => (
              <option key={a} value={a}>
                {ACTION_TEXT[a]}
              </option>
            ))}
          </select>
          {warn ? <span className="mt-1 block text-xs text-amber-300">{warn}</span> : null}
        </label>

        {draft.trigger === "order.created" ? (
          <label className="block">
            <span className="text-sm font-medium">بس الطلبات من (₪، اختياري)</span>
            <input type="number" min={0} className={`${field} mt-1.5`} value={draft.conditions.minTotal ?? ""} placeholder="كل الطلبات" onChange={(e) => setDraft({ ...draft, conditions: e.target.value === "" ? {} : { minTotal: Number(e.target.value) } })} />
          </label>
        ) : null}
        {draft.trigger === "stock.low" ? (
          <label className="block">
            <span className="text-sm font-medium">لما يصير الباقي</span>
            <input type="number" min={0} max={1000} className={`${field} mt-1.5`} value={draft.conditions.threshold ?? 3} onChange={(e) => setCond("threshold", Math.round(Number(e.target.value)))} />
            <span className="mt-1 block text-xs text-white/50">أو أقل. مرة لكل مقاس، وبترجع بعد ما يرجع يزيد.</span>
          </label>
        ) : null}
        {draft.trigger === "product.viral" ? (
          <>
            <label className="block">
              <span className="text-sm font-medium">لما تزيد الشعبية خلال ساعة</span>
              <input type="number" min={1.5} max={50} step={0.5} className={`${field} mt-1.5`} value={draft.conditions.factor ?? 3} onChange={(e) => setCond("factor", Number(e.target.value))} />
              <span className="mt-1 block text-xs text-white/50">مرات (3 = صارت ثلاث أضعاف).</span>
            </label>
            <label className="block">
              <span className="text-sm font-medium">وتكون الشعبية على الأقل</span>
              <input type="number" min={1} className={`${field} mt-1.5`} value={draft.conditions.minScore ?? 20} onChange={(e) => setCond("minScore", Number(e.target.value))} />
              <span className="mt-1 block text-xs text-white/50">مشاهدة 1، مفضلة 3، سلة 5.</span>
            </label>
          </>
        ) : null}

        {draft.action === "email" || draft.action === "whatsapp" || draft.action === "sms" ? (
          <label className="block">
            <span className="text-sm font-medium">{draft.action === "email" ? "لإيميل" : "لرقم"}</span>
            <input className={`${field} mt-1.5`} dir="ltr" value={draft.config.to ?? ""} placeholder={placeholderTo ?? (draft.action === "email" ? "owner@example.com" : "+970…")} onChange={(e) => setDraft({ ...draft, config: { ...draft.config, to: e.target.value } })} />
            <span className="mt-1 block text-xs text-white/50">فاضي = {placeholderTo ? "تبع المتجر من الإعدادات" : "ما في بالإعدادات، اكتبه هون"}.</span>
          </label>
        ) : null}
        {draft.action === "email" ? (
          <label className="block">
            <span className="text-sm font-medium">العنوان (اختياري)</span>
            <input className={`${field} mt-1.5`} maxLength={150} value={draft.config.subject ?? ""} placeholder={draft.name} onChange={(e) => setDraft({ ...draft, config: { ...draft.config, subject: e.target.value } })} />
          </label>
        ) : null}
        {draft.action === "pinProduct" ? (
          <label className="block">
            <span className="text-sm font-medium">لمدة (ساعات)</span>
            <input type="number" min={1} max={720} className={`${field} mt-1.5`} value={draft.config.hours ?? 48} onChange={(e) => setDraft({ ...draft, config: { hours: Math.round(Number(e.target.value)) } })} />
            <span className="mt-1 block text-xs text-white/50">بعدها بيرجع متل ما كان (إذا ما شلته إنت قبل).</span>
          </label>
        ) : (
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium">الرسالة</span>
            <textarea className={`${field} mt-1.5 h-20 py-2`} maxLength={1000} value={draft.config.text ?? ""} placeholder={t.text} onChange={(e) => setDraft({ ...draft, config: { ...draft.config, text: e.target.value } })} />
            <span className="mt-1.5 flex flex-wrap gap-1.5">
              {t.words.map((w) => (
                <button key={w} type="button" className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/70 hover:bg-white/[0.06]" onClick={() => setDraft({ ...draft, config: { ...draft.config, text: `${draft.config.text ?? t.text} {{${w}}}`.trim() } })}>
                  {`${WORD_TEXT[w] ?? w}`}
                </button>
              ))}
            </span>
          </label>
        )}

        <label className="block">
          <span className="text-sm font-medium">الاسم</span>
          <input className={`${field} mt-1.5`} maxLength={80} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">قديش</span>
          <select className={`${field} mt-1.5`} value={String(draft.cooldownMinutes)} onChange={(e) => setDraft({ ...draft, cooldownMinutes: Number(e.target.value) })}>
            {[...new Set([...COOLDOWNS, draft.cooldownMinutes])].sort((a, b) => a - b).map((m) => (
              <option key={m} value={m}>
                {cooldownText(m)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="primary" onClick={onSave} isLoading={saving} disabled={!draft.name.trim()}>
          {editing ? "حفظ التعديل" : "احفظ"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </Card>
  );
}
