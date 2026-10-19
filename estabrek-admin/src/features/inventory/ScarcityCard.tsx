// «باقي قطعتان» on the storefront: whether shoppers see how many pieces are left,
// from how many, and where (header.scarcity). The low-stock list below is the
// owner's own alert and doesn't change with it.
import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { getSettings, updateSettings } from "../../api/settings.api";
import { getApiErrorMessage } from "../../api/http";
import { useSettings } from "../../hooks/useSettings";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "../../lib/toast";
import {
  normalizeScarcity,
  sameScarcity,
  SCARCITY_DEFAULTS,
  SCARCITY_MAX,
  scarcityExamples,
  scarcityShows,
  scarcitySummary,
  type ScarcitySettings,
} from "../../lib/scarcity";

export function ScarcityCard() {
  const qc = useQueryClient();
  const settings = useSettings();
  const { hasPermission } = useAuth();
  const canChange = hasPermission("settings:write");
  const saved = settings.data ? normalizeScarcity(settings.data.header?.scarcity) : null;
  const [draft, setDraft] = useState<ScarcitySettings>(SCARCITY_DEFAULTS);
  const savedKey = saved ? JSON.stringify(saved) : "";
  useEffect(() => {
    if (saved) setDraft(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const save = useMutation({
    mutationFn: async (next: ScarcitySettings) => {
      // Read the latest header first so nothing else in it is lost.
      const current = await getSettings();
      return updateSettings({ header: { ...(current.header ?? {}), scarcity: next } });
    },
    onSuccess: async (_out, next) => {
      toast.success(scarcityShows(next) ? "انحفظ. المتجر بيبين العدد حسب اختيارك" : "انحفظ. المتجر ما بيبين كم قطعة باقية");
      await qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast.error("ما انحفظ", { description: getApiErrorMessage(e) }),
  });

  if (!saved) return null;
  const set = (patch: Partial<ScarcitySettings>) => setDraft((d) => ({ ...d, ...patch }));
  const dirty = !sameScarcity(draft, saved);
  const on = scarcityShows(saved);
  const bump = (by: number) => set({ showAt: Math.min(SCARCITY_MAX, Math.max(1, draft.showAt + by)) });

  return (
    <div data-testid="scarcity-card">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">«آخر قطعة» و«باقي قطعتان» بالمتجر</h2>
              {on ? (
                <Badge size="sm" variant="success" dot>
                  ظاهرة
                </Badge>
              ) : (
                <Badge size="sm" dot>
                  مخفية
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-white/60">
              الكلمة اللي بتطلع فوق صورة القطعة وجنب سعرها لما يضل منها قطع قليلة. هاد بس للزبونات، والتنبيهات اللي تحت إلك وما بتتغيّر.
            </p>
          </div>
          <ToggleSwitch
            checked={draft.enabled}
            label="عرض كم قطعة باقية للزبونات"
            disabled={!canChange}
            onChange={(v) => set({ enabled: v })}
          />
        </div>

        {draft.enabled ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-start sm:gap-6">
              <label htmlFor="scarcity-show-at" className="text-sm">
                يبين لما يضل كم قطعة أو أقل؟
              </label>
              <div className="flex items-center gap-1" dir="ltr">
                <Button size="sm" variant="ghost" aria-label="أقل" disabled={!canChange || draft.showAt <= 1} onClick={() => bump(-1)}>
                  −
                </Button>
                <input
                  id="scarcity-show-at"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={SCARCITY_MAX}
                  value={draft.showAt}
                  disabled={!canChange}
                  onChange={(e) => set({ showAt: normalizeScarcity({ showAt: e.target.value }).showAt })}
                  className="h-9 w-16 rounded-xl border border-white/15 bg-white/5 text-center text-sm outline-none focus:border-white/30"
                />
                <Button size="sm" variant="ghost" aria-label="أكثر" disabled={!canChange || draft.showAt >= SCARCITY_MAX} onClick={() => bump(1)}>
                  +
                </Button>
              </div>
            </div>

            <fieldset className="space-y-2" disabled={!canChange}>
              <legend className="mb-1 text-sm">وين يبين؟</legend>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={draft.onPhoto} onChange={(e) => set({ onPhoto: e.target.checked })} />
                <span>
                  على صورة القطعة
                  <span className="block text-xs text-white/50">بصفحة القطعة وبطاقات المنتجات بالصفحة الرئيسية والمتجر</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={draft.nearPrice} onChange={(e) => set({ nearPrice: e.target.checked })} />
                <span>
                  جنب السعر
                  <span className="block text-xs text-white/50">لما الزبونة تختار المقاس، ومع رزان وهي بتساعدها تطلب</span>
                </span>
              </label>
            </fieldset>

            {scarcityShows(draft) ? (
              <div>
                <div className="mb-1 text-xs text-white/50">هيك بتشوفها الزبونة:</div>
                <div className="flex flex-wrap gap-2" data-testid="scarcity-examples">
                  {scarcityExamples(draft.showAt).map((x) => (
                    <span key={x.left} className="rounded-full bg-rose-500/80 px-3 py-1 text-xs font-semibold text-white">
                      {x.text}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <p className={`mt-4 text-sm ${draft.enabled && !draft.onPhoto && !draft.nearPrice ? "text-amber-200" : "text-white/70"}`} data-testid="scarcity-summary">
          {scarcitySummary(draft)}
        </p>

        {canChange ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={!dirty} isLoading={save.isPending} onClick={() => save.mutate(draft)}>
              حفظ
            </Button>
            {dirty ? (
              <Button variant="ghost" onClick={() => setDraft(saved)}>
                تراجع
              </Button>
            ) : !sameScarcity(saved, SCARCITY_DEFAULTS) ? (
              <Button variant="ghost" onClick={() => setDraft(SCARCITY_DEFAULTS)}>
                مثل الأول (3 قطع)
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-xs text-white/50">التغيير بدّه صلاحية «تعديل الإعدادات».</p>
        )}
      </Card>
    </div>
  );
}
