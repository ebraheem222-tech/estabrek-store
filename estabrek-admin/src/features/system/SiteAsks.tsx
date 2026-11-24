// «مواقع عم تستنى»: sites the owner put up by hand on their own Cloudflare Pages, whose client pressed «جهّز متجري»
// (features/connect/ConnectPage.tsx; backend lib/siteAsk.ts). The client reads six letters to the owner; when they
// match the ones here, the owner says yes, and the press makes the database, the server and the shop in the
// owner's accounts and sets that same site to them (it follows in the copies list below). Or says no.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { getApiErrorMessage } from "../../api/http";
import { say } from "../../studio/say";
import * as API from "../../api/copies.api";
import type { CopyCheck, PressKind, SiteAsk } from "../../api/copies.api";
import { checkName, makeRefusedText, refusedText, tidyName, whyText } from "./copiesText";

const box = "rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] p-4 sm:p-5";
const field = "h-10 w-full min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm";

type Props = {
  /** The connection picked for each service (the page's own picks). */
  via: Partial<Record<PressKind, string>>;
  regions: string[];
  /** A site said yes to: its copy, opened in the list below. */
  onMade: (copyId: string) => void;
};

export function SiteAsks({ via, regions, onMade }: Props) {
  const q = useQuery({ queryKey: ["copies-asks"], queryFn: API.listAsks, refetchInterval: 10_000 });
  const asks = (q.data ?? []).filter((a) => a.state === "waiting");
  if (!asks.length) return null;
  return (
    <section className={`${box} space-y-3`} data-testid="copies-asks">
      <h2 className="font-semibold">{say("مواقع عم تستنى|Sites waiting|אתרים שמחכים")}</h2>
      <p className="text-xs text-white/70">
        {say(
          "مواقع عملتها إنت على Cloudflare Pages، وزبونها كبس «جهّز متجري». اسأل الزبون عن الحروف اللي على شاشته: إذا متل اللي هون، وافق، وبتنعمل قاعدة البيانات والسيرفر والمتجر بحساباتك، وبيرجع نفس الموقع ينبنى عليهم.|Sites you put up on Cloudflare Pages whose client pressed “Set up my store”. Ask the client for the letters on their screen: if they match the ones here, say yes, and the database, the server and the shop are made in your accounts, and that same site is built again with them.|אתרים שהעלית ב-Cloudflare Pages והלקוח שלהם לחץ «הכינו את החנות שלי». בקשו מהלקוח את האותיות שעל המסך שלו: אם הן כמו כאן, אשרו, ומסד הנתונים, השרת והחנות ייווצרו בחשבונות שלך, ואותו אתר ייבנה מחדש איתם.",
        )}
      </p>
      <ul className="divide-y divide-white/10">
        {asks.map((a) => (
          <Ask key={a.id} ask={a} via={via} regions={regions} onMade={onMade} />
        ))}
      </ul>
    </section>
  );
}

function Ask({ ask, via, regions, onMade }: { ask: SiteAsk } & Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(ask.project);
  const [server, setServer] = useState(ask.project);
  const [site, setSite] = useState(ask.project);
  const [region, setRegion] = useState(regions[0] ?? "aws-eu-central-1");
  const [agree, setAgree] = useState(false);
  const [refused, setRefused] = useState<{ text: string; checks?: CopyCheck[] } | null>(null);
  const make = useMutation({
    mutationFn: () => API.makeAsk(ask.id, { label: label.trim(), server: tidyName(server), site: tidyName(site), region, via }),
    onMutate: () => setRefused(null),
    onSuccess: (copy) => {
      void qc.invalidateQueries({ queryKey: ["copies-asks"] });
      void qc.invalidateQueries({ queryKey: ["copies-made"] });
      onMade(copy.id);
    },
    onError: (e) => {
      const data = (e as { response?: { data?: { error?: string; message?: string; details?: { at?: string; checks?: CopyCheck[] } } } })?.response?.data;
      setRefused({ text: makeRefusedText(data) ?? refusedText(data) ?? getApiErrorMessage(e), checks: data?.details?.checks?.filter((c) => !c.ok) });
    },
  });
  const refuse = useMutation({
    mutationFn: () => API.refuseAsk(ask.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["copies-asks"] }),
  });
  const serverName = tidyName(server);
  const siteName = tidyName(site);
  const can = !!label.trim() && serverName.length >= 3 && siteName.length >= 3 && agree;

  return (
    <li className="space-y-3 py-3" data-testid={`copies-ask-${ask.project}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <bdi dir="ltr" className="block truncate font-medium">
            {ask.admin.replace(/^https:\/\//, "")}
          </bdi>
          <span className="text-xs text-white/60">{new Date(ask.asked).toLocaleString()}</span>
        </div>
        <div className="text-center">
          <div className="text-[11px] text-white/60">{say("الحروف|The letters|האותיות")}</div>
          <bdi dir="ltr" className="font-mono text-xl font-bold tracking-widest text-amber-200" data-testid={`copies-ask-${ask.project}-pair`}>
            {ask.pair}
          </bdi>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="primary" size="sm" onClick={() => setOpen(!open)} aria-expanded={open} data-testid={`copies-ask-${ask.project}-yes`}>
            {say("وافق|Say yes|אשרו")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => refuse.mutate()} isLoading={refuse.isPending} data-testid={`copies-ask-${ask.project}-no`}>
            {say("ارفض|Say no|דחו")}
          </Button>
        </div>
      </div>

      {open ? (
        <form
          className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (can) make.mutate();
          }}
          data-testid={`copies-ask-${ask.project}-form`}
        >
          <label className="block space-y-1">
            <span className="text-xs text-white/70">{say("اسم النسخة|The copy's name|שם העותק")}</span>
            <input className={field} dir="auto" value={label} onChange={(e) => setLabel(e.target.value)} data-testid={`copies-ask-${ask.project}-label`} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs text-white/70">{say("اسم السيرفر|The server's name|שם השרת")}</span>
              <input className={field} dir="ltr" value={server} onChange={(e) => setServer(e.target.value)} data-testid={`copies-ask-${ask.project}-server`} />
              <bdi dir="ltr" className="block text-xs text-white/60">{serverName || "…"}.up.railway.app</bdi>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-white/70">{say("اسم المتجر|The shop's name|שם החנות")}</span>
              <input className={field} dir="ltr" value={site} onChange={(e) => setSite(e.target.value)} data-testid={`copies-ask-${ask.project}-site`} />
              <bdi dir="ltr" className="block text-xs text-white/60">{siteName || "…"}.vercel.app</bdi>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs text-white/70">{say("منطقة قاعدة البيانات|The database's region|האזור של מסד הנתונים")}</span>
            <select className={field} dir="ltr" value={region} onChange={(e) => setRegion(e.target.value)}>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-white/60">
            {say("الإدارة: نفس الموقع اللي طلب،|The admin: the same site that asked,|הניהול: אותו אתר שביקש,")} <bdi dir="ltr">{ask.admin}</bdi>
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} data-testid={`copies-ask-${ask.project}-agree`} />
            <span>{say("الحروف متل اللي عند الزبون، وبعرف إنو هالمتجر بيزيد مصروف شهري على حساباتي.|The letters match the client's, and I know this store adds a monthly cost to my accounts.|האותיות תואמות לאלה של הלקוח, ואני יודע שהחנות הזו מוסיפה עלות חודשית לחשבונות שלי.")}</span>
          </label>
          {refused ? (
            <div className="space-y-1 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200" role="alert" data-testid={`copies-ask-${ask.project}-refused`}>
              <p>{refused.text}</p>
              {refused.checks?.map((c) => (
                <p key={c.id} className="text-xs">
                  ✗ {checkName(c.id)}: {whyText(c.why)}
                </p>
              ))}
            </div>
          ) : null}
          <Button type="submit" variant="primary" className="w-full" disabled={!can} isLoading={make.isPending} data-testid={`copies-ask-${ask.project}-make`}>
            {say("اعمل الموقع|Make the store|צרו את החנות")}
          </Button>
        </form>
      ) : null}
    </li>
  );
}
