// Admin → الإعدادات → النشرة البريدية → Mailchimp: every new newsletter subscriber added to one Mailchimp audience
// (through the store's queue: tried again later when Mailchimp is away). The API key is typed once, checked with
// Mailchimp, kept sealed on the server and never shown again; the audience is picked from the key's own; the
// subscribers from before are sent with one press. Saved by its own buttons.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { Spinner } from "../../components/ui/Spinner";
import * as MailchimpAPI from "../../api/mailchimp.api";
import type { MailchimpList } from "../../api/mailchimp.api";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { say } from "../../studio/say";

const field = "h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";
const KEY_SHAPE = /^[0-9a-f]{16,64}-[a-z]{2,4}\d{1,3}$/i;

export function MailchimpCard() {
  const qc = useQueryClient();
  const state = useQuery({ queryKey: ["mailchimp"], queryFn: MailchimpAPI.getMailchimp });
  const [key, setKey] = useState("");
  const [lists, setLists] = useState<MailchimpList[] | null>(null);
  const [listId, setListId] = useState("");
  const [doubleOptIn, setDoubleOptIn] = useState(false);
  const s = state.data;
  useEffect(() => {
    if (!s) return;
    setListId(s.listId ?? "");
    setDoubleOptIn(s.doubleOptIn);
  }, [s]);
  const done = (next: MailchimpAPI.MailchimpState) => { qc.setQueryData(["mailchimp"], next); setKey(""); };
  const fetchLists = useMutation({
    mutationFn: () => MailchimpAPI.mailchimpLists(key.trim() || undefined),
    onSuccess: (out) => {
      setLists(out.lists);
      if (!out.lists.length) toast.error(say("ما في جمهور (Audience) بهالحساب. اعملي واحد بـ Mailchimp أول.|There's no audience in this account. Make one in Mailchimp first.|אין קהל בחשבון הזה. צרו אחד ב־Mailchimp קודם."));
      else if (!listId && out.lists.length === 1) setListId(out.lists[0].id);
    },
    onError: (e) => toast.error(say("Mailchimp ما قبل المفتاح|Mailchimp didn't accept the key|Mailchimp לא קיבל את המפתח"), { description: getApiErrorMessage(e) }),
  });
  const save = useMutation({
    mutationFn: (enabled: boolean) => MailchimpAPI.saveMailchimp({ enabled, ...(key.trim() ? { apiKey: key.trim() } : {}), listId: listId || null, doubleOptIn }),
    onSuccess: (next) => { done(next); toast.success(next.enabled ? say("Mailchimp موصول ✓|Mailchimp is connected ✓|Mailchimp מחובר ✓") : say("انحفظ|Saved|נשמר")); },
    onError: (e) => toast.error(say("ما انحفظ|Not saved|לא נשמר"), { description: getApiErrorMessage(e) }),
  });
  const forget = useMutation({
    mutationFn: () => MailchimpAPI.saveMailchimp({ enabled: false, apiKey: null }),
    onSuccess: (next) => { done(next); setLists(null); toast.success(say("انشال المفتاح|The key was removed|המפתח הוסר")); },
    onError: (e) => toast.error(say("ما زبط|That didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) }),
  });
  const sync = useMutation({
    mutationFn: MailchimpAPI.syncMailchimp,
    onSuccess: (out) => { qc.setQueryData(["mailchimp"], out); toast.success(say(`انبعتوا ${out.queued} مشتركين لـ Mailchimp (بالدور)|${out.queued} subscribers sent to Mailchimp (in the queue)|${out.queued} מנויים נשלחו ל־Mailchimp (בתור)`)); },
    onError: (e) => toast.error(say("ما زبط|That didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) }),
  });
  const busy = fetchLists.isPending || save.isPending || forget.isPending || sync.isPending;
  const keyTyped = key.trim().length > 0;
  const keyBad = keyTyped && !KEY_SHAPE.test(key.trim());
  return (
    <Card>
      <CardHeader title="Mailchimp" subtitle={say("كل مشترك جديد بالنشرة بينضاف لحالُه لجمهورك بـ Mailchimp.|Every new newsletter subscriber is added to your Mailchimp audience by itself.|כל מנוי חדש לניוזלטר נוסף לבד לקהל שלכם ב־Mailchimp.")} />
      <CardContent>
        {state.isLoading ? <div className="flex items-center gap-2 text-sm"><Spinner /> …</div> : state.isError || !s ? (
          <p className="text-sm text-red-200">{getApiErrorMessage(state.error)}</p>
        ) : (
          <div className="space-y-4" data-testid="mailchimp-card">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2.5 py-1 ${s.enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.06] text-white/60"}`} data-testid="mailchimp-status">
                {s.enabled ? say("موصول|Connected|מחובר") : say("مش موصول|Not connected|לא מחובר")}
              </span>
              <span className="text-white/55">{say(`${s.inAudience} من ${s.subscribers} مشترك بالجمهور|${s.inAudience} of ${s.subscribers} subscribers in the audience|${s.inAudience} מתוך ${s.subscribers} מנויים בקהל`)}</span>
            </div>
            {s.keyUnreadable ? <p className="text-xs text-amber-300">{say("المفتاح المحفوظ ما عاد ينقرا على هالسيرفر. اكتبيه كمان مرة.|The saved key can't be read on this server any more. Type it again.|המפתח השמור כבר לא נקרא בשרת הזה. הקלידו אותו שוב.")}</p> : null}
            {s.error ? <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-2 text-xs text-amber-200" dir="auto">{say("آخر مشكلة|Last problem|הבעיה האחרונה")}: {s.error}</p> : null}

            <label className="block text-xs text-white/60">
              {s.keySet ? say(`مفتاح API (محفوظ${s.keyCentre ? ` · ${s.keyCentre}` : ""}؛ اكتبي واحد جديد بس لتغيّريه)|API key (saved${s.keyCentre ? ` · ${s.keyCentre}` : ""}; type a new one only to change it)|מפתח API (שמור${s.keyCentre ? ` · ${s.keyCentre}` : ""}; הקלידו חדש רק כדי להחליף)`) : say("مفتاح API من Mailchimp (Account → Extras → API keys)|Your Mailchimp API key (Account → Extras → API keys)|מפתח API מ־Mailchimp (Account → Extras → API keys)")}
              <input className={`${field} mt-1`} dir="ltr" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={s.keySet ? "••••••••••••••••-us21" : "0123…abcd-us21"} data-testid="mailchimp-key" />
            </label>
            {keyBad ? <p className="text-xs text-red-300">{say("هاد مش شكل مفتاح Mailchimp (بيخلص بـ -us21 أو شي متله).|That isn't the shape of a Mailchimp key (it ends in -us21 or the like).|זו לא צורה של מפתח Mailchimp (הוא מסתיים ב־‎-us21 או דומה).")}</p> : null}

            <div className="flex flex-wrap items-end gap-2">
              <label className="block min-w-0 flex-1 text-xs text-white/60">
                {say("الجمهور (Audience)|Audience|קהל (Audience)")}
                {lists ? (
                  <select className={`${field} mt-1`} value={listId} onChange={(e) => setListId(e.target.value)} data-testid="mailchimp-list">
                    <option value="">—</option>
                    {lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.members})</option>)}
                  </select>
                ) : (
                  <input className={`${field} mt-1`} dir="ltr" value={listId} readOnly placeholder={say("اضغطي «جيبي الجماهير»|Press “Get the audiences”|לחצו „הבאת הקהלים”")} />
                )}
              </label>
              <Button onClick={() => fetchLists.mutate()} disabled={busy || keyBad || (!keyTyped && !s.keySet)} data-testid="mailchimp-fetch">{fetchLists.isPending ? <Spinner /> : null} {say("جيبي الجماهير|Get the audiences|הבאת הקהלים")}</Button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">{say("Mailchimp يبعتلهم إيميل تأكيد أول|Mailchimp emails them to confirm first|Mailchimp שולח להם מייל אישור קודם")}</span>
              <ToggleSwitch checked={doubleOptIn} label={say("تأكيد بالإيميل|Email confirmation|אישור במייל")} onChange={setDoubleOptIn} />
            </div>

            <div className="flex flex-wrap justify-between gap-2">
              <span className="flex gap-2">
                {s.keySet ? <Button variant="danger" size="sm" onClick={() => forget.mutate()} disabled={busy}>{say("شيلي المفتاح|Remove the key|הסרת המפתח")}</Button> : null}
                {s.enabled ? <Button size="sm" onClick={() => sync.mutate()} disabled={busy || s.inAudience >= s.subscribers} data-testid="mailchimp-sync">{say("ابعتي المشتركين القدام|Send the earlier subscribers|שליחת המנויים הקודמים")}</Button> : null}
              </span>
              <span className="flex gap-2">
                {s.enabled ? <Button onClick={() => save.mutate(false)} disabled={busy}>{say("وقّفي|Switch off|כיבוי")}</Button> : null}
                <Button variant="primary" onClick={() => save.mutate(true)} disabled={busy || keyBad || !listId || (!keyTyped && !s.keySet)} data-testid="mailchimp-save">{save.isPending ? <Spinner /> : null} {s.enabled ? say("احفظي|Save|שמירה") : say("وصّلي Mailchimp|Connect Mailchimp|חיבור Mailchimp")}</Button>
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
