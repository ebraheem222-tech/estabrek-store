// The top bar's bell: what the automations said ("notify"), newest first.
// Looks every minute; opening a notification marks it read.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as AutoAPI from "../../api/automations.api";
import { relativeTime } from "../team/teamText";

const KEY = ["notifications"];

export function NotificationsBell() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: KEY, queryFn: AutoAPI.getNotifications, refetchInterval: 60_000 });
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const read = useMutation({ mutationFn: (ids?: string[]) => AutoAPI.markNotificationsRead(ids), onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }) });
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const unread = q.data?.unread ?? 0;
  const list = q.data?.notifications ?? [];
  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-white/70 hover:bg-white/[0.06]"
        aria-label={unread ? `${unread} إشعارات جديدة` : "الإشعارات"}
        aria-expanded={open}
        data-testid="bell"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread ? <span className="absolute -left-1 -top-1 min-w-[1.1rem] rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold leading-[1.1rem] text-white">{unread > 99 ? "99+" : unread}</span> : null}
      </button>
      {open ? (
        <div className="absolute left-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface,#fff)] shadow-xl" dir="rtl" data-testid="bell-list">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <span className="text-sm font-semibold">الإشعارات</span>
            {unread ? (
              <button type="button" className="text-xs text-white/60 underline" onClick={() => read.mutate(undefined)}>
                اقرأ الكل
              </button>
            ) : null}
          </div>
          {list.length ? (
            <ul className="max-h-96 divide-y divide-white/10 overflow-y-auto">
              {list.map((n) => {
                const body = (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${n.readAt ? "text-white/70" : "font-medium"}`}>{n.title}</span>
                      {!n.readAt ? <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-label="جديد" /> : null}
                    </div>
                    {n.body ? <p className="mt-0.5 line-clamp-2 text-xs text-white/60">{n.body}</p> : null}
                    <p className="mt-0.5 text-[11px] text-white/40">{relativeTime(n.createdAt)}</p>
                  </>
                );
                const mark = () => {
                  if (!n.readAt) read.mutate([n.id]);
                  setOpen(false);
                };
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link to={n.link} onClick={mark} className="block px-4 py-2.5 hover:bg-white/[0.04]">
                        {body}
                      </Link>
                    ) : (
                      <button type="button" onClick={mark} className="block w-full px-4 py-2.5 text-right hover:bg-white/[0.04]">
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-white/50">ما في إشعارات. بتقدر تعمل تنبيهات من «التلقائيات».</p>
          )}
          <Link to="/admin/system/automations" onClick={() => setOpen(false)} className="block border-t border-white/10 px-4 py-2.5 text-center text-xs text-white/60 hover:bg-white/[0.04]">
            التلقائيات
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default NotificationsBell;
