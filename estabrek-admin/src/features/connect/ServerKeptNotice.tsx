// While a copy's admin speaks to a server kept in this browser only (linked on /connect, its host not built
// with it yet), a small reminder to put it in the host, so other browsers and devices open the store too.
import { useState } from "react";
import { server, type ServerFrom } from "../../config/env";
import { say } from "../../studio/say";

const HIDDEN_KEY = "admin.server.notice";

export default function ServerKeptNotice({ from = server.from, path = window.location.pathname }: { from?: ServerFrom; path?: string }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem(HIDDEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (from !== "browser" || hidden || path.startsWith("/connect")) return null;
  return (
    <div className="fixed bottom-4 start-4 z-[60] flex max-w-sm items-center gap-3 rounded-xl border border-amber-400/30 bg-surface-900/95 px-3 py-2 text-xs text-amber-100 shadow-elevated backdrop-blur" role="status" data-testid="server-kept-notice">
      <span>{say("السيرفر محفوظ بهالمتصفح بس.|The server is kept in this browser only.|השרת שמור רק בדפדפן הזה.")}</span>
      <a href="/connect" className="shrink-0 font-semibold underline">
        {say("ثبّته|Make it stay|קבעו אותו")}
      </a>
      <button
        type="button"
        aria-label={say("سكّر|Close|סגירה")}
        className="shrink-0 text-amber-100/60 hover:text-amber-100"
        onClick={() => {
          try {
            sessionStorage.setItem(HIDDEN_KEY, "1");
          } catch {
            /* this view only */
          }
          setHidden(true);
        }}
      >
        ×
      </button>
    </div>
  );
}
