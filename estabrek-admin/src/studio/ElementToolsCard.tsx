/**
 * The selected element's tools as a row of named buttons at the top of the inspector (elementTools.ts says
 * which), and the short guide the inspector shows when nothing is selected. The row is kept small so the
 * element's own content still comes first; what a tool does is its tooltip, and is in the row's text for the
 * inspector's search, so looking for "video editor", "crop" or "physics" finds the button that goes there.
 */
import type { ReactNode } from "react";
import { say } from "./say";
import { TOOL_GUIDE, type ElementTool } from "./elementTools";

/** Tools that change the page (the others only go somewhere). */
const changes = (t: ElementTool) => t.go.kind === "worldOn" || t.go.kind === "sceneFromVideo";

/** `children` come first in the row (the studio's own "open it on its own" button). */
export function ElementToolsCard({ tools, busy, onGo, children }: { tools: ElementTool[]; busy: boolean; onGo: (tool: ElementTool) => void; children?: ReactNode }) {
  if (!tools.length && !children) return null;
  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label={say("أدوات هالعنصر|This element's tools|הכלים של הרכיב")} data-testid="studio-tools">
      {children}
      {tools.map((t) => (
        <button
          key={t.id} type="button" title={t.hint} disabled={busy && changes(t)} onClick={() => onGo(t)}
          className={`rounded-full px-2 py-1 text-[11px] disabled:opacity-40 ${t.small ? "bg-white/[0.06] text-white/75 hover:bg-white/[0.1]" : "bg-accent-500/20 font-medium text-accent-100 hover:bg-accent-500/30"}`}
          data-testid="studio-tool" data-tool={t.id}
        >
          <span aria-hidden="true">{t.icon}</span> {t.label}<span className="sr-only"> · {t.hint}</span>
        </button>
      ))}
    </div>
  );
}

/** Where the bigger tools are (shown with nothing selected). */
export function ToolsGuide() {
  return (
    <div className="mt-3 space-y-1.5 rounded-xl border border-white/[0.08] p-2" data-testid="studio-tools-guide">
      <div className="text-[11px] font-semibold text-white/70">{say("وين بلاقي…؟|Where do I find…?|איפה נמצא…?")}</div>
      <ul className="space-y-1">
        {TOOL_GUIDE.map(([icon, what, where]) => (
          <li key={what} className="flex items-start gap-2 text-[11px] leading-4">
            <span aria-hidden="true">{icon}</span>
            <span className="min-w-0"><span className="block text-white/85">{say(what)}</span><span className="block text-white/45">{say(where)}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
