// الميزات: every store switch in one place. Each card says what the feature
// does, whether it's on, and what it still needs before it can work.
import React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import * as FeaturesAPI from "../../api/features.api";
import type { Feature, FeatureGroup } from "../../api/features.api";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";

/** Other admin pages that show the same switches. */
const RELATED_QUERIES = [["features"], ["settings"], ["customers"], ["stock-alerts"]];

export default function FeaturesPage() {
  const q = useQuery({ queryKey: ["features"], queryFn: FeaturesAPI.listFeatures });
  const on = (q.data ?? []).flatMap((g) => g.features).filter((f) => f.enabled).length;
  const total = (q.data ?? []).flatMap((g) => g.features).length;

  return (
    <div dir="rtl" className="space-y-4" data-testid="features-page">
      <div className={box}>
        <h1 className="text-lg font-semibold">الميزات</h1>
        <p className="mt-1 text-sm text-white/60">
          كل ميزات المتجر بمكان واحد. بتشغّل أو بتطفي بكبسة، والتغيير بيبيّن بالموقع خلال ثواني. إطفاء ميزة ما بيمسح إشي، ولما ترجّع تشغّلها بيرجع كل إشي زي ما كان.
        </p>
        {q.data ? <p className="mt-2 text-xs text-white/50">{`${on} من ${total} شغّالة`}</p> : null}
      </div>

      {q.isLoading ? (
        <div className={`${box} flex items-center gap-2 text-sm`}>
          <Spinner /> جاري التحميل…
        </div>
      ) : q.isError ? (
        <div className={`${box} text-sm text-red-200`}>{getApiErrorMessage(q.error)}</div>
      ) : (
        (q.data ?? []).map((g) => <Group key={g.key} group={g} />)
      )}
    </div>
  );
}

function Group({ group }: { group: FeatureGroup }) {
  return (
    <section className={box} data-testid={`features-${group.key}`}>
      <h2 className="font-semibold">{group.title}</h2>
      <ul className="mt-2 divide-y divide-white/10">
        {group.features.map((f) => (
          <FeatureRow key={f.key} feature={f} />
        ))}
      </ul>
    </section>
  );
}

function FeatureRow({ feature: f }: { feature: Feature }) {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canChange = hasPermission("settings:write");
  const blocked = !f.enabled && f.needs.some((n) => n.required && !n.ok);
  const change = useMutation({
    mutationFn: (enabled: boolean) => FeaturesAPI.setFeature(f.key, enabled),
    onSuccess: (out) => {
      toast.success(out.enabled ? `اشتغلت: ${f.title}` : `انطفت: ${f.title}`);
      for (const key of RELATED_QUERIES) qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  const warnings = f.needs.filter((n) => !n.ok);

  return (
    <li className="flex items-start justify-between gap-4 py-4" data-testid={`feature-${f.key}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{f.title}</span>
          {f.enabled ? (
            <Badge size="sm" variant="success" dot>
              شغّالة
            </Badge>
          ) : (
            <Badge size="sm" dot>
              مطفية
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-white/60">{f.description}</p>
        {warnings.length ? (
          <ul className="mt-2 space-y-1 text-xs">
            {warnings.map((n) => (
              <li key={n.label} className={n.required ? "text-red-200" : "text-amber-200"}>
                {n.required ? "لازم قبل التشغيل: " : f.enabled ? "ناقص: " : "قبل ما تشغّلها: "}
                {n.label}
              </li>
            ))}
          </ul>
        ) : null}
        {f.link ? (
          <Link to={f.link} className="mt-2 inline-block text-xs underline text-white/70">
            التفاصيل والإعدادات
          </Link>
        ) : null}
      </div>
      <Switch
        checked={f.enabled}
        label={f.title}
        disabled={!canChange || blocked || change.isPending}
        busy={change.isPending}
        onChange={(v) => change.mutate(v)}
      />
    </li>
  );
}

function Switch({ checked, label, disabled, busy, onChange }: { checked: boolean; label: string; disabled?: boolean; busy?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={busy || undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40",
        checked ? "border-[var(--btn-solid-border)] bg-[var(--btn-solid-bg)]" : "border-white/20 bg-white/10",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 rounded-full transition-transform",
          checked ? "-translate-x-6" : "-translate-x-1",
        ].join(" ")}
        style={{ background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }}
      />
    </button>
  );
}
