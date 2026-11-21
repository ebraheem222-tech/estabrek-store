// Admin → الإعدادات → إدارة الدفع → شروط المتجر: a box the shopper ticks ("I agree to the store's terms") before any
// order (the bag, Razan's help, card payments), a link to the terms, and the box's own words in each language (empty =
// the shop's). The server refuses an order without the box while it's asked for, and keeps when it was ticked (it shows
// on the order's invoice). Saved by its own button: only these settings.
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { updateSettings } from "../../api/settings.api";
import { getApiErrorMessage } from "../../api/http";
import { useSettings } from "../../hooks/useSettings";
import { toast } from "../../lib/toast";
import { say } from "../../studio/say";

const field = "h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";
const LINK = /^(\/(?!\/)|https?:\/\/)[^\s<>"'`\\]*$/i;
type Words = Partial<Record<"ar" | "en" | "he", string>>;
const LANGS: Array<["ar" | "en" | "he", string]> = [["ar", "عربي"], ["en", "English"], ["he", "עברית"]];

export function CheckoutTermsCard() {
  const qc = useQueryClient();
  const settings = useSettings();
  const [required, setRequired] = useState(false);
  const [url, setUrl] = useState("/policies");
  const [text, setText] = useState<Words>({});
  const saved = settings.data;
  useEffect(() => {
    if (!saved) return;
    setRequired(saved.checkoutTermsRequired === true);
    setUrl(saved.checkoutTermsUrl ?? "/policies");
    setText(saved.checkoutTermsText ?? {});
  }, [saved]);
  const urlOk = !url.trim() || LINK.test(url.trim());
  const save = useMutation({
    mutationFn: () => {
      const words = Object.fromEntries(Object.entries(text).filter(([, v]) => v?.trim()).map(([k, v]) => [k, v!.trim()]));
      return updateSettings({ checkoutTermsRequired: required, checkoutTermsUrl: url.trim() || null, checkoutTermsText: Object.keys(words).length ? words : null });
    },
    onSuccess: () => { toast.success(say("انحفظت شروط الطلب|Checkout terms saved|תנאי ההזמנה נשמרו")); void qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e) => toast.error(say("ما انحفظت|Not saved|לא נשמר"), { description: getApiErrorMessage(e) }),
  });
  return (
    <Card>
      <CardHeader title={say("شروط المتجر عند الطلب|Store terms at checkout|תנאי החנות בהזמנה")} subtitle={say("مربع «قرأت ووافقت على شروط المتجر» قبل أي طلب، مع رابط للشروط.|An “I agree to the store's terms” box before any order, with a link to the terms.|תיבת „קראתי ואני מסכים/ה לתנאי החנות” לפני כל הזמנה, עם קישור לתנאים.")} />
      <CardContent>
        <div className="space-y-4" data-testid="checkout-terms-card">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">{say("لازم الزبون يوافق قبل ما يطلب|The shopper must agree before ordering|הלקוח חייב לאשר לפני ההזמנה")}</span>
            <ToggleSwitch checked={required} label={say("لازم يوافق|Must agree|חובה לאשר")} onChange={setRequired} />
          </div>
          <label className="block text-xs text-white/60">
            {say("رابط الشروط (صفحة بالمتجر أو رابط https)|Link to the terms (a page of the shop or an https link)|קישור לתנאים (עמוד בחנות או קישור https)")}
            <input className={`${field} mt-1`} dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/policies" data-testid="checkout-terms-url" />
          </label>
          {!urlOk ? <p className="text-xs text-red-300">{say("الرابط لازم يبلّش بـ / أو https://|The link must start with / or https://|הקישור חייב להתחיל ב־/ או https://")}</p> : null}
          <div className="space-y-2">
            <div className="text-xs text-white/60">{say("كلام المربع (اختياري، فاضي = «قرأت ووافقت على شروط المتجر»)|The box's words (optional; empty = “I have read and agree to the store's terms”)|מילות התיבה (רשות; ריק = „קראתי ואני מסכים/ה לתנאי החנות”)")}</div>
            {LANGS.map(([l, name]) => (
              <label key={l} className="flex items-center gap-2 text-xs text-white/60">
                <span className="w-16 shrink-0">{name}</span>
                <input className={field} dir={l === "en" ? "ltr" : "rtl"} maxLength={200} value={text[l] ?? ""} onChange={(e) => setText((t) => ({ ...t, [l]: e.target.value }))} />
              </label>
            ))}
          </div>
          <p className="text-[11px] leading-5 text-white/45">{say("الطلب بدون الموافقة بينرفض، ووقت الموافقة بينحفظ مع الطلب وبيبيّن على الفاتورة.|An order without it is refused, and when it was ticked is kept with the order and shows on its invoice.|הזמנה בלי האישור נדחית, ומועד האישור נשמר עם ההזמנה ומופיע בחשבונית.")}</p>
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => save.mutate()} disabled={!urlOk || save.isPending} data-testid="checkout-terms-save">{say("احفظي الشروط|Save the terms|שמירת התנאים")}</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
