// The admin's language: Arabic, English or Hebrew, each team member their own. Signed in,
// the choice is saved on the account (it follows them to every device); on the sign-in
// page it stays on this browser. Choosing reloads the page in the new language.
import React, { useEffect, useRef, useState } from "react";
import { updateAdminProfile } from "../../api/account.api";
import { useAuthStore } from "../../store/auth.store";
import { ADMIN_LANGS, adminLang, setAdminLang, type Lang } from "../../lib/lang";
import { LANG_LABEL } from "../../lib/storeIdentity";
import { tr } from "../../lib/words";
import { cn } from "../../components/ui/cn";

const SHORT: Record<Lang, string> = { ar: "ع", en: "EN", he: "עב" };

export function LanguageSwitch({ className }: { className?: string }) {
  const signedIn = useAuthStore((s) => Boolean(s.admin));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const lang = adminLang();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const choose = async (l: Lang) => {
    setOpen(false);
    if (l === lang) return;
    setBusy(true);
    try {
      if (signedIn) await updateAdminProfile({ locale: l });
    } catch {
      /* not saved on the account: it still changes on this browser */
    }
    setAdminLang(l);
  };

  return (
    <div ref={box} className={cn("relative", className)} data-testid="admin-language">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={tr("لغة لوحة الإدارة", "Admin language")}
        className="grid h-9 min-w-9 place-items-center rounded-xl border border-white/10 px-2 text-xs font-semibold text-white/70 hover:bg-white/[0.06] disabled:opacity-60"
      >
        <span lang={lang}>{SHORT[lang]}</span>
      </button>
      {open ? (
        <div role="menu" className="absolute end-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-white/10 bg-surface-900/95 p-1 shadow-xl backdrop-blur-xl">
          {ADMIN_LANGS.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitemradio"
              aria-checked={l === lang}
              onClick={() => void choose(l)}
              lang={l}
              dir={l === "en" ? "ltr" : "rtl"}
              className={cn("flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-sm", l === lang ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/[0.06]")}
            >
              {LANG_LABEL[l]}
              {l === lang ? <span aria-hidden="true">✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
