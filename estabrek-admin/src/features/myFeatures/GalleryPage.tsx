// ميزاتي → المعرض: ready functions, APIs and whole features (stage 4). Each is a template file the
// store installs as a draft: the owner picks one, sees what it would make here, and installs it; it is
// theirs to change from then on. Filtered by kind, category and words.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import { adminLang } from "../../lib/lang";
import { useAuth } from "../../hooks/useAuth";
import { say } from "../../studio/say";
import * as FeaturesAPI from "../../api/myFeatures.api";
import type { GalleryItem, GalleryKind } from "../../api/myFeatures.api";
import { InstallFlow } from "./FeatureTemplates";
import { KIND_NAME, filtered, holdsLine, needsLine, startsLine, totalsLine, words } from "./galleryText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-10 min-w-0 rounded-xl border border-white/10 bg-surface-925 px-3 text-sm text-white";
const KIND_BADGE = { function: "default", api: "warning", feature: "success" } as const;

export default function GalleryPage() {
  const lang = adminLang();
  const { hasPermission } = useAuth();
  const canInstall = hasPermission("features:write") && hasPermission("functions:write") && hasPermission("pages:write");
  const q = useQuery({ queryKey: ["feature-gallery"], queryFn: FeaturesAPI.listGallery, staleTime: 5 * 60_000 });
  const [kind, setKind] = useState<GalleryKind | "all">("all");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<GalleryItem | null>(null);
  const items = useMemo(() => q.data?.items ?? [], [q.data]);
  const shown = useMemo(() => filtered(items, { kind, category, search }), [items, kind, category, search]);
  // The categories that have something of the chosen kind.
  const categories = useMemo(() => Object.keys(q.data?.categories ?? {}).filter((c) => items.some((x) => x.category === c && (kind === "all" || x.kind === kind))), [q.data, items, kind]);

  if (q.isLoading) return <Spinner />;
  if (q.isError || !q.data) return <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div>;

  return (
    <div className="space-y-4 pb-24" data-testid="gallery-page">
      <section className={box}>
        <Link to="/admin/my-features" className="text-xs text-white/60 underline">
          {say("← ميزاتي|← My features|← התכונות שלי")}
        </Link>
        <h1 className="mt-2 text-lg font-semibold">{say("المعرض|The gallery|הגלריה")}</h1>
        <p className="mt-1 text-sm text-white/60">
          {say(
            "functions و APIs وميزات كاملة جاهزين. بتختار وحدة، بتشوف شو رح ينعمل بمتجرك، وبتثبّتها كمسودة: موقّفة ومش منشورة لحد ما تراجعها. وبعدها كلها إلك تعدّلها متل ما بدك.|Ready functions, APIs and whole features. Pick one, see what it would make in your store, and install it as a draft: off and unpublished until you've looked at it. Then it's all yours to change.|פונקציות, APIs ותכונות שלמות מוכנות. בוחרים אחת, רואים מה היא תיצור בחנות, ומתקינים כטיוטה: כבויה ולא מפורסמת עד שבודקים. ואז הכול שלכם לשנות.",
          )}
        </p>
        <p className="mt-2 text-sm font-medium" data-testid="gallery-totals">
          {totalsLine(items, lang)}
        </p>
      </section>

      {picked ? (
        <section className={`${box} border-accent-400/40`} data-testid="gallery-selected">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">{words(picked.name, lang)}</h2>
            <Button size="sm" variant="ghost" onClick={() => setPicked(null)} data-testid="gallery-close">
              {say("سكّر|Close|סגירה")}
            </Button>
          </div>
          <Picked item={picked} />
        </section>
      ) : null}

      <section className={box}>
        <div className="flex flex-wrap items-center gap-2" role="tablist">
          {(["all", "function", "api", "feature"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              className={`h-9 rounded-full px-4 text-sm ${kind === k ? "bg-white/15 text-white" : "text-white/60 hover:text-white"}`}
              onClick={() => {
                setKind(k);
                setCategory("");
              }}
              data-testid={`gallery-kind-${k}`}
            >
              {k === "all" ? say("الكل|All|הכול") : say(KIND_NAME[k])}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input className={`${field} flex-1`} value={search} placeholder={say("دوّر: طلب، واتساب، حجز، نقاط، تذاكر…|Search: order, WhatsApp, booking, points, tickets…|חיפוש: הזמנה, וואטסאפ, תור, נקודות, פניות…")} onChange={(e) => setSearch(e.target.value)} data-testid="gallery-search" />
          <select className={`${field} max-w-[16rem]`} value={category} onChange={(e) => setCategory(e.target.value)} data-testid="gallery-category">
            <option value="">{say("كل المواضيع|Every topic|כל הנושאים")}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {words(q.data.categories[c], lang)}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-3 text-xs text-white/60" data-testid="gallery-count">
          {say("{n} نتيجة|{n} results|{n} תוצאות").replace("{n}", String(shown.length))}
        </p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="gallery-list">
          {shown.map((x) => (
            <li key={x.key} className="flex flex-col gap-2 rounded-xl border border-white/10 p-4" data-testid={`gallery-item-${x.key}`} data-kind={x.kind}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={KIND_BADGE[x.kind]} size="sm">
                  {say(KIND_NAME[x.kind])}
                </Badge>
                <span className="text-xs text-white/50">{words(q.data.categories[x.category], lang)}</span>
              </div>
              <div className="font-medium">{words(x.name, lang)}</div>
              <p className="text-sm text-white/70">{words(x.note, lang)}</p>
              <div className="mt-auto space-y-1 text-xs text-white/50">
                <div>{holdsLine(x.counts, lang)}</div>
                <div>{startsLine(x, lang)}</div>
                {x.routes.length ? (
                  <bdi dir="ltr" className="block truncate font-mono">
                    {x.routes.slice(0, 3).map((r) => `/v1/api/${r.split(" ")[1]} (${r.split(" ")[0]})`).join(" · ")}
                    {x.routes.length > 3 ? ` +${x.routes.length - 3}` : ""}
                  </bdi>
                ) : null}
                {needsLine(x.needs, lang) ? <div className="text-amber-200/80">{needsLine(x.needs, lang)}</div> : null}
              </div>
              {canInstall ? (
                <div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setPicked(x);
                      if (typeof window !== "undefined" && typeof window.scrollTo === "function") window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    data-testid={`gallery-pick-${x.key}`}
                  >
                    {say("شوف وثبّت|See and install|צפייה והתקנה")}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        {!shown.length ? (
          <p className="text-sm text-white/60" data-testid="gallery-empty">
            {say("ما في شي بهالبحث. جرّب كلمة تانية.|Nothing for this search. Try another word.|אין תוצאות. נסו מילה אחרת.")}
          </p>
        ) : null}
      </section>
    </div>
  );
}

/** The picked example's file, shown then installed. */
function Picked({ item }: { item: GalleryItem }) {
  const file = useQuery({ queryKey: ["feature-gallery", item.key], queryFn: () => FeaturesAPI.galleryFile(item.key), staleTime: 5 * 60_000 });
  if (file.isLoading) return <Spinner />;
  if (file.isError || !file.data) return <div className="text-sm text-red-200">{getApiErrorMessage(file.error)}</div>;
  return <InstallFlow key={item.key} id={`gallery:${item.key}`} template={file.data.template} />;
}
