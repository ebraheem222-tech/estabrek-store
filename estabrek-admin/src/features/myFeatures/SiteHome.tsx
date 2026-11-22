// ميزاتي → a whole site → «خلّيه الرئيسية» (sites wave 0.2; backend modules/admin/siteHome.ts): the site's
// first page shown at the store's own address, and the store's menus above and below made of its pages.
// Nothing is deleted or moved: the store's own home waits behind it and comes back with one button.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { useConfirm } from "../../components/useConfirm";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import { say } from "../../studio/say";
import * as FeaturesAPI from "../../api/myFeatures.api";
import type { Feature } from "../../api/myFeatures.api";
import { siteLinks } from "./siteLinks";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";

export function SiteHome({ feature: f }: { feature: Feature }) {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const [confirm, dialog] = useConfirm();
  const may = hasPermission("features:write") && hasPermission("pages:write") && hasPermission("settings:write");
  const home = f.pages.find((p) => p.id === f.siteHome?.homeId);
  const fresh = () => void qc.invalidateQueries({ queryKey: ["my-features"] });
  const onError = (e: unknown) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) });
  const make = useMutation({
    mutationFn: () => FeaturesAPI.makeSiteHome(f.id, siteLinks(f)),
    onSuccess: (r) => {
      qc.setQueryData(["my-features", f.id], r.feature);
      fresh();
      toast.success(say("صار الموقع الرئيسية|The site is the home now|האתר הוא דף הבית עכשיו"), r.left.length ? { description: say("مش بالقائمة لأنها مش منشورة: {pages}|Not in the menu, not published yet: {pages}|לא בתפריט, עוד לא פורסמו: {pages}").replace("{pages}", r.left.join("، ")) } : undefined);
    },
    onError,
  });
  const undo = useMutation({
    mutationFn: () => FeaturesAPI.undoSiteHome(),
    onSuccess: () => {
      fresh();
      toast.success(say("رجعت الرئيسية القديمة|Your own home is back|דף הבית הקודם חזר"));
    },
    onError,
  });
  if (!f.siteHome?.homeId || !home) return null;

  if (f.siteHome.on)
    return (
      <section className={`${box} border-emerald-400/30`} data-testid="site-home" data-on="true">
        <h2 className="font-medium">{say("هاد الموقع هو الرئيسية|This site is the home|האתר הזה הוא דף הבית")}</h2>
        <p className="mt-1 text-sm text-white/70">
          {say("صفحته الأولى بتطلع على عنوان متجرك (/)، وقائمة المتجر فوق وتحت صارت صفحاته. صفحتك الرئيسية القديمة بتستنّى وراه متل ما هي.|Its first page shows at your store's own address (/), and the store's menus above and below are its pages. Your old home waits behind it, as it was.|העמוד הראשון שלו מופיע בכתובת של החנות (/), והתפריטים למעלה ולמטה הם העמודים שלו. דף הבית הקודם מחכה מאחוריו כמו שהיה.")}
        </p>
        {may ? (
          <div className="mt-3">
            <Button
              size="sm"
              variant="secondary"
              isLoading={undo.isPending}
              onClick={async () => {
                if (await confirm({ title: say("رجّع الرئيسية القديمة|Bring your own home back|להחזיר את דף הבית הקודם"), message: say("صفحتك الرئيسية القديمة وقوائمك اللي كانت بترجعوا، والموقع بيضل على عنوانه {slug}.|Your old home and the menus you had come back; the site stays at its own address, {slug}.|דף הבית והתפריטים שהיו חוזרים, והאתר נשאר בכתובת שלו, {slug}.").replace("{slug}", home.slug), confirmText: say("رجّعها|Bring it back|להחזיר"), variant: "warning" })) undo.mutate();
              }}
              data-testid="site-home-undo"
            >
              {say("رجّع الرئيسية القديمة|Bring your own home back|להחזיר את דף הבית הקודם")}
            </Button>
          </div>
        ) : null}
        {dialog}
      </section>
    );

  const drafts = f.pages.filter((p) => p.key && p.status !== "PUBLISHED");
  const ready = f.enabled && home.status === "PUBLISHED";
  const steps = [
    { id: "on", done: f.enabled, text: say("الموقع شغّال (الكبسة فوق)|The site is on (the switch above)|האתר פועל (המתג למעלה)") },
    { id: "published", done: home.status === "PUBLISHED", text: say("صفحته الأولى منشورة ({slug})|Its first page is published ({slug})|העמוד הראשון שלו מפורסם ({slug})").replace("{slug}", home.slug) },
  ];
  return (
    <section className={box} data-testid="site-home" data-on="false">
      <h2 className="font-medium">{say("خلّيه الرئيسية|Make it the home|להפוך לדף הבית")}</h2>
      <p className="mt-1 text-sm text-white/70">
        {say("صفحة الموقع الأولى بتطلع على عنوان متجرك الرئيسي (/)، وقائمة المتجر فوق وتحت بتصير صفحات الموقع. صفحتك الرئيسية الحالية ما بتنمسح ولا بتتغيّر: بترجع بكبسة.|The site's first page shows at your store's own address (/), and the store's menus above and below become the site's pages. Your current home isn't deleted or changed: it comes back with one button.|העמוד הראשון של האתר יופיע בכתובת הראשית של החנות (/), והתפריטים למעלה ולמטה יהיו העמודים של האתר. דף הבית הנוכחי לא נמחק ולא משתנה: הוא חוזר בלחיצה.")}
      </p>
      {f.siteHome.other ? (
        <p className="mt-2 text-sm text-amber-200" data-testid="site-home-other">
          {say("هلّق «{name}» هو الرئيسية: بيرجع لعنوانه وهاد بياخد محلّه.|“{name}” is the home now: it goes back to its own address and this one takes its place.|«{name}» הוא דף הבית עכשיו: הוא יחזור לכתובת שלו והאתר הזה יחליף אותו.").replace("{name}", f.siteHome.other.name)}
        </p>
      ) : null}
      <ul className="mt-3 space-y-1 text-sm" data-testid="site-home-steps">
        {steps.map((s) => (
          <li key={s.id} className={s.done ? "text-emerald-300" : "text-white/60"} data-testid={`site-home-step-${s.id}`} data-done={s.done}>
            {s.done ? "✓ " : "○ "}
            {s.text}
          </li>
        ))}
      </ul>
      {drafts.length && home.status === "PUBLISHED" ? (
        <p className="mt-2 text-xs text-white/50" data-testid="site-home-drafts">
          {say("هدول مش رح يطلعوا بالقائمة لحد ما تنشرهم: {pages}|These won't be in the menu until you publish them: {pages}|אלה לא יופיעו בתפריט עד שתפרסמו אותם: {pages}").replace("{pages}", drafts.map((p) => p.slug).join(" · "))}
        </p>
      ) : null}
      {may ? (
        <div className="mt-3">
          <Button
            size="sm"
            disabled={!ready}
            isLoading={make.isPending}
            onClick={async () => {
              if (await confirm({ title: say("خلّيه الرئيسية|Make it the home|להפוך לדף הבית"), message: say("«{name}» بيطلع على عنوان متجرك (/)، وقوائم المتجر بتصير صفحاته. بترجع الرئيسية القديمة بكبسة.|“{name}” shows at your store's address (/), and the store's menus become its pages. Your old home comes back with one button.|«{name}» יופיע בכתובת של החנות (/), והתפריטים יהיו העמודים שלו. דף הבית הקודם חוזר בלחיצה.").replace("{name}", f.name), confirmText: say("خلّيه الرئيسية|Make it the home|להפוך לדף הבית"), variant: "info" })) make.mutate();
            }}
            data-testid="site-home-make"
          >
            {say("خلّيه الرئيسية|Make it the home|להפוך לדף הבית")}
          </Button>
        </div>
      ) : null}
      {dialog}
    </section>
  );
}
