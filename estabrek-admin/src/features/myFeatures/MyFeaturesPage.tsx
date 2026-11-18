// ميزاتي (M): features the owner builds without a developer. A feature is a name over tables,
// functions and pages made in the studio: found together, switched off together. This page is
// the list; one feature has its own page (FeaturePage.tsx).
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import { adminLang } from "../../lib/lang";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import { say } from "../../studio/say";
import * as FeaturesAPI from "../../api/myFeatures.api";
import { countsLine } from "./featuresText";
import { TemplateInstall } from "./FeatureTemplates";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-surface-925 px-3 text-sm text-white";

export default function MyFeaturesPage() {
  const qc = useQueryClient();
  const go = useNavigate();
  const lang = adminLang();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("features:write");
  // Installing a template makes tables, functions and pages: the member may make each.
  const canInstall = canWrite && hasPermission("functions:write") && hasPermission("pages:write");
  const [name, setName] = useState("");
  const q = useQuery({ queryKey: ["my-features"], queryFn: FeaturesAPI.listFeatures });
  const create = useMutation({
    mutationFn: () => FeaturesAPI.createFeature({ name: name.trim() }),
    onSuccess: (f) => {
      qc.setQueryData(["my-features", f.id], f);
      void qc.invalidateQueries({ queryKey: ["my-features"], exact: true });
      go(`/admin/my-features/${f.id}`);
    },
    onError: (e) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) }),
  });

  return (
    <div className="space-y-4 pb-24" data-testid="features-page">
      <section className={box}>
        <h1 className="text-lg font-semibold">{say("ميزاتي|My features|התכונות שלי")}</h1>
        <p className="mt-1 text-sm text-white/60">
          {say(
            "ميزة بتبنيها إنت بدون مطوّر، متل «طلب صداقة» أو «قائمة انتظار». بتسمّيها، وبتحط تحتها جداولها (وين بتنحفظ بياناتها)، منطقها (شو بيصير، بخطوات بدون كود)، وصفحاتها بالمتجر. بتلاقيهم مع بعض، وبتشغّل الميزة أو بتوقفها كلها بكبسة.|A feature you build yourself, with no developer: “friend requests”, “a waiting list”. You name it and put under it its tables (where its data is kept), its logic (what happens, in steps with no code) and its pages in the shop. You find them together, and switch the whole feature on or off with one press.|תכונה שבונים לבד, בלי מפתח: «בקשות חברות», «רשימת המתנה». נותנים לה שם ושמים תחתיה את הטבלאות שלה (איפה הנתונים נשמרים), הלוגיקה (מה קורה, בשלבים בלי קוד) והעמודים שלה בחנות. מוצאים הכול יחד, ומפעילים או מכבים את כל התכונה בלחיצה.",
          )}
        </p>
        {canWrite ? (
          <form
            className="mt-4 flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) create.mutate();
            }}
          >
            <input className={field} value={name} maxLength={80} placeholder={say("اسم الميزة الجديدة، مثلاً: طلبات الصداقة|The new feature's name, e.g. Friend requests|שם התכונה החדשה, למשל: בקשות חברות")} onChange={(e) => setName(e.target.value)} data-testid="feature-new-name" />
            <Button type="submit" size="sm" variant="primary" disabled={!name.trim()} isLoading={create.isPending} data-testid="feature-new">
              {say("＋ ميزة جديدة|＋ New feature|＋ תכונה חדשה")}
            </Button>
          </form>
        ) : null}
      </section>

      <section className={`${box} flex flex-wrap items-center justify-between gap-3`} data-testid="features-gallery">
        <div className="min-w-0">
          <h2 className="font-medium">{say("المعرض: أكتر من 300 جاهز|The gallery: over 300 ready to use|הגלריה: יותר מ-300 מוכנים")}</h2>
          <p className="mt-1 text-xs text-white/60">{say("functions، APIs، وميزات كاملة (مرتجعات، حجوزات، نقاط، تذاكر…). بتختار، بتشوف، وبتثبّت كمسودة.|Functions, APIs and whole features (returns, bookings, points, tickets…). Pick, look, install as a draft.|פונקציות, APIs ותכונות שלמות (החזרות, תורים, נקודות, פניות…). בוחרים, בודקים ומתקינים כטיוטה.")}</p>
        </div>
        <Link to="/admin/my-features/gallery" className="inline-flex h-9 items-center rounded-xl bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/15" data-testid="features-gallery-link">
          {say("افتح المعرض|Open the gallery|פתיחת הגלריה")}
        </Link>
      </section>

      <section className={`${box} flex flex-wrap items-center justify-between gap-3`} data-testid="features-sites">
        <div className="min-w-0">
          <h2 className="font-medium">{say("مواقع كاملة لمجالك|Whole sites for your field|אתרים שלמים לתחום שלכם")}</h2>
          <p className="mt-1 text-xs text-white/60">{say("مطعم، عيادة، صالون، نادي، قاعة أفراح… صفحات من مكتبة الأقسام، وقوائمها بتقرأ من جداول فيها سطور جاهزة.|A restaurant, a clinic, a salon, a gym, a wedding hall… pages from the section library, their lists reading tables with ready rows.|מסעדה, מרפאה, סלון, חדר כושר, אולם אירועים… עמודים מספריית הקטעים, והרשימות שלהם קוראות מטבלאות עם שורות מוכנות.")}</p>
        </div>
        <Link to="/admin/my-features/sites" className="inline-flex h-9 items-center rounded-xl bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/15" data-testid="features-sites-link">
          {say("شوف المواقع|See the sites|לאתרים")}
        </Link>
      </section>

      {canInstall ? <TemplateInstall /> : null}

      <section className={box}>
        {q.isLoading ? (
          <Spinner />
        ) : q.isError ? (
          <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div>
        ) : !q.data?.features.length ? (
          <p className="text-sm text-white/60" data-testid="features-empty">
            {say("ما في ميزات لسا. سمّي أول وحدة فوق.|No features yet. Name the first one above.|עדיין אין תכונות. תנו שם לראשונה למעלה.")}
          </p>
        ) : (
          <ul className="divide-y divide-white/10" data-testid="features-list">
            {q.data.features.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3" data-testid={`feature-${f.id}`} data-on={f.enabled}>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/admin/my-features/${f.id}`} className="font-medium hover:underline" data-testid={`feature-${f.id}-open`}>
                      {f.name}
                    </Link>
                    <Badge variant={f.enabled ? "success" : "default"} size="sm">
                      {f.enabled ? say("شغّالة|On|פועלת") : say("موقّفة|Off|כבויה")}
                    </Badge>
                  </div>
                  {f.note ? <div className="break-words text-sm text-white/70">{f.note}</div> : null}
                  <div className="text-xs text-white/60">{countsLine(f.counts, lang)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
