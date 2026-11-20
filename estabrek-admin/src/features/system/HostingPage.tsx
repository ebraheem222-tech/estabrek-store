// Admin → الاستضافة: the four places a store lives, in one page: its server (Railway), its database (Neon), its
// shop (Vercel) and its pictures (Cloudinary). What the server knows of itself is shown (backend
// lib/hostingView.ts); each service's own account is connected here with a token and read with it (the ready
// connections of lib/fnKindsInfra.ts: «شو في هناك؟»), each with its how-to in pictures.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import { useAuth } from "../../hooks/useAuth";
import { say } from "../../studio/say";
import { env } from "../../config/env";
import { getHosting, type Hosting } from "../../api/hosting.api";
import * as ConnAPI from "../../api/connections.api";
import type { Connections, ReadyLook } from "../../api/connections.api";
import { LookView, lookFailText, whenText } from "../connections/LookView";
import { refusalText } from "../connections/ConnectionsPage";
import { MediaStep, ShopStep } from "../setup/SetupExtras";
import { TokenGuide } from "../setup/TokenGuide";
import { NeonGuide, RailwayGuide } from "./hostingGuides";

type Kind = "railway" | "neon" | "vercel";
const box = "rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-4";
const field = "w-full min-w-[12rem] flex-1 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-accent-400";

/** The database's maker, in the page's language (asked at each draw: the language can change). */
const providerName = (p: Hosting["database"]["provider"]) =>
  p === "neon" ? "Neon" : p === "railway" ? "Railway" : p === "local" ? say("على نفس الجهاز|On this machine|על אותו מחשב") : p === "other" ? say("مكان تاني|Somewhere else|מקום אחר") : say("مش معروف|Not known|לא ידוע");

function Fact({ name, children, t }: { name: string; children: React.ReactNode; t: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.06] py-1.5 text-sm last:border-0" data-testid={t}>
      <span className="text-white/60">{name}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}
const Ltr = ({ children }: { children: React.ReactNode }) => (
  <bdi dir="ltr" className="font-mono text-xs">
    {children}
  </bdi>
);

/** The service's own account: read with a token kept by the server (a ready connection), or connected here. */
function Account({ kind, label, conns, canRead, canWrite, guide }: { kind: Kind; label: string; conns: Connections | undefined; canRead: boolean; canWrite: boolean; guide: React.ReactNode }) {
  const qc = useQueryClient();
  const [key, setKey] = useState("");
  const [failed, setFailed] = useState<string | null>(null);
  const [looks, setLooks] = useState<Record<string, ReadyLook>>({});
  const add = useMutation({
    mutationFn: () => ConnAPI.addReady({ kind, name: label, key: key.trim() }),
    onMutate: () => setFailed(null),
    onSuccess: (data) => {
      qc.setQueryData(["connections"], data);
      setKey("");
    },
    onError: (e) => setFailed(refusalText(e)),
  });
  const look = useMutation({
    mutationFn: (id: string) => ConnAPI.lookReady(id).then((l) => [id, l] as const),
    onMutate: () => setFailed(null),
    onSuccess: ([id, l]) => setLooks((all) => ({ ...all, [id]: l })),
    onError: (e) => setFailed(refusalText(e)),
  });
  if (!canRead) return <p className="text-xs text-white/50">{say("حسابك بـ " + label + " بيتوصّل من صفحة الاتصالات (بدها صلاحية الاتصالات).|Your " + label + " account is connected from the connections page (it needs the connections permission).|את חשבון ה-" + label + " מחברים מעמוד החיבורים (נדרשת הרשאת חיבורים).")}</p>;
  // A server from before these kinds says nothing of them.
  if (!conns?.kinds?.some((k) => k.kind === kind)) return null;
  const mine = (conns.ready ?? []).filter((r) => r.kind === kind);
  return (
    <div className="space-y-3 rounded-xl border border-white/[0.06] p-3" data-testid={`hosting-${kind}-account`}>
      <div className="text-sm font-medium">{say(`حسابك بـ ${label}|Your ${label} account|החשבון שלך ב-${label}`)}</div>
      {mine.length ? (
        <ul className="space-y-3">
          {mine.map((c) => {
            const seen = looks[c.id];
            return (
              <li key={c.id} className="space-y-2" data-testid={`hosting-${kind}-connected`}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    {say("موصول:|Connected:|מחובר:")} <bdi>{c.name}</bdi>
                    {c.lastUsedAt ? <span className="ms-2 text-xs text-white/50">{say(`آخر مرة: ${whenText(c.lastUsedAt)}|Last used: ${whenText(c.lastUsedAt)}|שימוש אחרון: ${whenText(c.lastUsedAt)}`)}</span> : null}
                  </span>
                  <Button size="sm" variant="secondary" isLoading={look.isPending && look.variables === c.id} disabled={!canWrite} onClick={() => look.mutate(c.id)} data-testid={`hosting-${kind}-look`}>
                    {say("شو في هناك؟|What's there?|מה יש שם?")}
                  </Button>
                </div>
                {seen ? seen.ok ? <LookView look={seen} t={`hosting-${kind}-seen`} /> : <p className="rounded-xl bg-red-500/10 p-3 text-xs text-red-200" data-testid={`hosting-${kind}-seen-failed`}>{lookFailText(seen)}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : canWrite ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (key.trim() && !add.isPending) add.mutate();
          }}
          data-testid={`hosting-${kind}-form`}
        >
          <input className={field} dir="ltr" type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" placeholder={kind === "neon" ? "Neon API key" : `${label} token`} aria-label={kind === "neon" ? "Neon API key" : `${label} token`} data-testid={`hosting-${kind}-key`} />
          <Button size="sm" variant="secondary" type="submit" disabled={!key.trim()} isLoading={add.isPending} data-testid={`hosting-${kind}-connect`}>
            {say("وصّل|Connect|חיבור")}
          </Button>
        </form>
      ) : (
        <p className="text-xs text-white/50">{say("مش موصول لسا.|Not connected yet.|עדיין לא מחובר.")}</p>
      )}
      {failed ? (
        <p className="rounded-xl bg-red-500/10 p-3 text-xs text-red-200" role="alert" data-testid={`hosting-${kind}-failed`}>
          {failed}
        </p>
      ) : null}
      {!mine.length ? guide : null}
      <p className="text-[11px] text-white/50">
        {say("التوكن بينحفظ مقفول بالسيرفر وما بيرجع ينعرض؛ بنقرأ فيه بس.|The token is kept sealed on the server and never shown again; it is only read with.|הטוקן נשמר נעול בשרת ולא מוצג שוב; רק קוראים איתו.")}{" "}
        <Link to="/admin/connections" className="underline">
          {say("كل الاتصالات|All connections|כל החיבורים")}
        </Link>
      </p>
    </div>
  );
}

function Card({ id, title, service, children }: { id: string; title: string; service: string; children: React.ReactNode }) {
  return (
    <section className={box} data-testid={`hosting-${id}`} aria-labelledby={`hosting-${id}-title`}>
      <h2 id={`hosting-${id}-title`} className="flex flex-wrap items-baseline gap-2 text-lg font-semibold">
        {say(title)} <span className="text-sm font-normal text-white/50">{service}</span>
      </h2>
      {children}
    </section>
  );
}

export default function HostingPage() {
  const auth = useAuth();
  const canRead = auth.hasPermission("connections:read");
  const canWrite = auth.hasPermission("connections:write");
  const h = useQuery({ queryKey: ["hosting"], queryFn: getHosting, refetchInterval: 60_000 });
  const conns = useQuery({ queryKey: ["connections"], queryFn: ConnAPI.getConnections, enabled: canRead });
  const s = h.data?.server;
  const db = h.data?.database;
  const apiOrigin = (() => {
    try {
      return new URL(env.VITE_API_BASE_URL).origin;
    } catch {
      return env.VITE_API_BASE_URL;
    }
  })();
  return (
    <div className="mx-auto max-w-3xl space-y-5" data-testid="hosting-page">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{say("الاستضافة|Hosting|אחסון")}</h1>
        <p className="text-sm leading-7 text-white/60">
          {say(
            "وين عايش متجرك: السيرفر، قاعدة البيانات، المتجر والصور. كل وحدة إلها حسابها، وبتوصّله من هون بتوكن بنقرأ فيه بس.|Where your store lives: its server, database, shop and pictures. Each has its own account, connected here with a token that is only read with.|איפה החנות שלך חיה: השרת, מסד הנתונים, החנות והתמונות. לכל אחד חשבון משלו, שמחברים כאן עם טוקן שרק קוראים איתו.",
          )}
        </p>
      </header>
      {h.isError ? <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{getApiErrorMessage(h.error)}</p> : null}

      <Card id="server" title="السيرفر|The server|השרת" service="Railway">
        {h.isLoading ? (
          <Spinner />
        ) : s ? (
          <div>
            <Fact name={say("وين شغال|Runs on|רץ על")} t="hosting-server-host">
              {s.host === "railway" ? "Railway" : say("مكان تاني|Somewhere else|מקום אחר")}
            </Fact>
            {s.project ? <Fact name={say("المشروع|Project|פרויקט")} t="hosting-server-project"><bdi>{s.project}</bdi>{s.environment ? <span className="ms-1 text-white/50">· <bdi>{s.environment}</bdi></span> : null}{s.service ? <span className="ms-1 text-white/50">· <bdi>{s.service}</bdi></span> : null}</Fact> : null}
            <Fact name={say("عنوانه|Its address|הכתובת שלו")} t="hosting-server-address">
              <a href={s.address ?? apiOrigin} target="_blank" rel="noreferrer noopener" className="underline">
                <Ltr>{(s.address ?? apiOrigin).replace(/^https?:\/\//, "")}</Ltr>
              </a>
            </Fact>
            <Fact name={say("النسخة الشغالة|Running version|הגרסה שרצה")} t="hosting-server-version">
              {s.commit ? <Ltr>{s.commit}</Ltr> : say("مش معروفة|Not known|לא ידועה")}
              <span className="ms-2 text-xs text-white/50">{say(`من ${whenText(s.startedAt)}|since ${whenText(s.startedAt)}|מאז ${whenText(s.startedAt)}`)}</span>
            </Fact>
            <Link to="/admin/system/server" className="mt-2 inline-block text-xs underline text-white/60">
              {say("حالة السيرفر والنشر ←|Server and deploy state →|מצב השרת והפריסה ←")}
            </Link>
          </div>
        ) : null}
        <Account kind="railway" label="Railway" conns={conns.data} canRead={canRead} canWrite={canWrite} guide={<RailwayGuide />} />
      </Card>

      <Card id="database" title="قاعدة البيانات|The database|מסד הנתונים" service="Neon">
        {h.isLoading ? (
          <Spinner />
        ) : db ? (
          <div>
            <Fact name={say("وينها|Where it is|איפה הוא")} t="hosting-db-provider">
              {providerName(db.provider)}
              {db.region ? <span className="ms-1 text-white/50">· <Ltr>{db.region}</Ltr></span> : null}
            </Fact>
            <Fact name={say("حالتها|Its state|המצב שלו")} t="hosting-db-state">
              {db.ok ? <span className="text-emerald-300">{say(`شغالة (${db.ms} ms)|Answering (${db.ms} ms)|עונה (${db.ms} ms)`)}</span> : <span className="text-red-300">{say("ما بترد|Not answering|לא עונה")}</span>}
            </Fact>
            {db.provider === "neon" ? (
              <Fact name={say("الاتصال|Connection|חיבור")} t="hosting-db-pooled">
                {db.pooled ? say("عبر الـ pooler (أسرع لكتير زوار)|Through the pooler (better for many visitors)|דרך ה-pooler (טוב לכמות מבקרים גדולה)") : say("مباشر|Direct|ישיר")}
              </Fact>
            ) : null}
          </div>
        ) : null}
        <Account kind="neon" label="Neon" conns={conns.data} canRead={canRead} canWrite={canWrite} guide={<NeonGuide />} />
      </Card>

      <Card id="shop" title="المتجر|The shop|החנות" service="Vercel">
        <ShopStep inCard />
        <Account kind="vercel" label="Vercel" conns={conns.data} canRead={canRead} canWrite={canWrite} guide={<TokenGuide />} />
      </Card>

      <Card id="pictures" title="الصور|The pictures|התמונות" service="Cloudinary">
        <MediaStep manage />
      </Card>
    </div>
  );
}
