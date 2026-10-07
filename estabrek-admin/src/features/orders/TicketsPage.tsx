// التذاكر والدخول: the door. Type the ticket code (or scan its QR — the phone's
// own camera opens this page with the code), see whose it is and check it in
// once. Below: bookings with sold / at the door counts, and their tickets.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { cn } from "../../components/ui/cn";
import { getApiErrorMessage } from "../../api/http";
import * as T from "../../api/fulfillment.api";
import type { Ticket } from "../../api/fulfillment.api";
import { useAuth } from "../../hooks/useAuth";
import { dateTime } from "../../lib/orders";
import { toast } from "../../lib/toast";

const box = "glass rounded-2xl p-4 sm:p-5";

const STATUS: Record<T.TicketStatus, { label: string; cls: string }> = {
  VALID: { label: "صالحة", cls: "bg-emerald-500/15 text-emerald-200" },
  USED: { label: "دخلت", cls: "bg-sky-500/15 text-sky-200" },
  CANCELLED: { label: "ملغية", cls: "bg-red-500/15 text-red-200" },
};

/** What a scanned QR holds: a link with ?code=, or the code itself. */
function codeFrom(text: string) {
  const raw = text.trim();
  try {
    const u = new URL(raw);
    const c = u.searchParams.get("code");
    if (c) return c;
  } catch {
    /* not a link */
  }
  return raw;
}

const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

const noteFor = (t: Ticket) => (t.status === "USED" ? ("ALREADY_USED" as const) : t.status === "CANCELLED" || t.orderClosed ? ("TICKET_CANCELLED" as const) : undefined);

type Look = { ticket: Ticket; note?: "ALREADY_USED" | "TICKET_CANCELLED" | "JUST_IN" } | { error: string } | null;

export default function TicketsPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("orders:write");
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  // Opened from a scanned QR (/admin/tickets?code=XXXX-XXXX): the code is ready.
  const [fromUrl] = useState(() => params.get("code"));
  const [code, setCode] = useState(() => (fromUrl ? clean(fromUrl) : ""));
  const [look, setLook] = useState<Look>(null);
  const [scanning, setScanning] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const events = useQuery({ queryKey: ["tickets", "events"], queryFn: T.listBookingEvents });
  const list = useQuery({
    queryKey: ["tickets", "list", eventId, search],
    queryFn: () => T.listTickets({ productId: eventId ?? undefined, q: search.trim() || undefined }),
    enabled: Boolean(eventId || search.trim()),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["tickets"] });

  const find = useCallback(async (raw: string) => {
    const c = clean(codeFrom(raw));
    if (c.length !== 8) {
      setLook({ error: "كود التذكرة 8 حروف/أرقام (مثل ABCD-2345)." });
      return;
    }
    try {
      const t = await T.findTicket(c);
      setLook({ ticket: t, note: noteFor(t) });
    } catch (e) {
      setLook({ error: getApiErrorMessage(e) });
    }
  }, []);

  useEffect(() => {
    if (!fromUrl) return;
    setParams((p) => { p.delete("code"); return p; }, { replace: true });
  }, [fromUrl, setParams]);
  const urlLook = useQuery({
    queryKey: ["tickets", "code", fromUrl],
    queryFn: () => T.findTicket(clean(fromUrl ?? "")),
    enabled: Boolean(fromUrl && clean(fromUrl).length === 8),
    retry: false,
  });
  const shown: Look =
    look ?? (urlLook.data ? { ticket: urlLook.data, note: noteFor(urlLook.data) } : urlLook.error ? { error: getApiErrorMessage(urlLook.error) } : null);

  const checkIn = useMutation({
    mutationFn: (id: string) => T.checkInTicket(id),
    onSuccess: (t) => {
      setLook({ ticket: t, note: "JUST_IN" });
      setCode("");
      toast.success(`أهلاً ${t.holderName ?? ""} — دخلت ✓`);
      void refresh();
      input.current?.focus();
    },
    onError: (e) => {
      const data = isAxiosError(e) ? (e.response?.data as { error?: string; details?: { ticket?: Ticket } }) : undefined;
      if (data?.details?.ticket && (data.error === "ALREADY_USED" || data.error === "TICKET_CANCELLED")) setLook({ ticket: data.details.ticket, note: data.error });
      else toast.error("ما انسجّل الدخول", { description: getApiErrorMessage(e) });
      void refresh();
    },
  });
  const undo = useMutation({
    mutationFn: (id: string) => T.undoCheckIn(id),
    onSuccess: (t) => { setLook({ ticket: t }); toast.success("انلغى تسجيل الدخول"); void refresh(); },
    onError: (e) => toast.error("ما انلغى", { description: getApiErrorMessage(e) }),
  });

  const canScan = typeof window !== "undefined" && "BarcodeDetector" in window && Boolean(navigator.mediaDevices?.getUserMedia);

  return (
    <div dir="rtl" className="space-y-4" data-testid="tickets-page">
      <div className={box}>
        <h1 className="text-lg font-semibold text-white">التذاكر والدخول</h1>
        <p className="mt-1 text-sm text-white/60">
          اكتبي كود التذكرة أو امسحي الـ QR. من الآيفون: افتحي الكاميرا العادية ووجّهيها على الـ QR، بتفتح هالصفحة والكود جاهز.
        </p>

        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => { e.preventDefault(); void find(code); }}
        >
          <input
            ref={input}
            dir="ltr"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD-2345"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="h-14 min-w-0 flex-1 rounded-2xl border border-white/[0.12] bg-surface-925 px-4 text-center font-mono text-2xl tracking-[0.2em] text-white placeholder:text-white/20"
            aria-label="كود التذكرة"
            data-testid="ticket-code"
          />
          <button type="submit" className="h-14 rounded-2xl bg-accent-500 px-6 text-base font-semibold text-white hover:bg-accent-400">تشييك</button>
          {canScan ? (
            <button type="button" onClick={() => setScanning(true)} className="h-14 rounded-2xl border border-white/[0.12] px-4 text-base text-white/85 hover:bg-white/[0.06]">📷 مسح</button>
          ) : null}
        </form>

        {scanning ? <Scanner onCode={(c) => { setScanning(false); setCode(clean(codeFrom(c))); void find(c); }} onClose={() => setScanning(false)} /> : null}

        {shown ? <LookResult look={shown} canWrite={canWrite} busy={checkIn.isPending || undo.isPending} onCheckIn={(id) => checkIn.mutate(id)} onUndo={(id) => undo.mutate(id)} /> : null}
      </div>

      <div className={box}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-white">الحجوزات</h2>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث: اسم، هاتف، كود" className="h-10 w-full rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-sm text-white placeholder:text-white/35 sm:w-64" aria-label="بحث بالتذاكر" />
        </div>
        {events.isLoading ? (
          <p className="text-sm text-white/50">جارٍ التحميل…</p>
        ) : !events.data?.length ? (
          <p className="text-sm text-white/55">
            ما في حجوزات بعد. اعملي نوع منتج «حجز بتذكرة» من <Link to="/admin/catalog/types" className="text-accent-300">أنواع المنتجات</Link> وضيفي منتج منه.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {events.data.map((e) => {
              const sold = e.valid + e.used;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setEventId(eventId === e.id ? null : e.id)}
                    aria-pressed={eventId === e.id}
                    className={cn("w-full rounded-xl border p-3 text-start transition", eventId === e.id ? "border-accent-400/60 bg-accent-500/10" : "border-white/[0.08] hover:border-white/20")}
                  >
                    <div className="truncate font-medium text-white">{e.title}</div>
                    <div className="mt-0.5 truncate text-xs text-white/50">{e.when ?? "بدون موعد"}{e.eventLocation ? ` · ${e.eventLocation}` : ""}</div>
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <span className="text-white/75">{sold} تذكرة</span>
                      <span className="text-sky-200">{e.used} دخلت</span>
                      {e.cancelled ? <span className="text-red-300/80">{e.cancelled} ملغية</span> : null}
                    </div>
                    {sold ? (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-sky-400/70" style={{ width: `${Math.round((e.used / sold) * 100)}%` }} />
                      </div>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {eventId || search.trim() ? (
          <div className="mt-4">
            {list.isLoading ? (
              <p className="text-sm text-white/50">جارٍ التحميل…</p>
            ) : !list.data?.tickets.length ? (
              <p className="text-sm text-white/50">ما في تذاكر.</p>
            ) : (
              <ul className="divide-y divide-white/[0.06]" data-testid="tickets-list">
                {list.data.tickets.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                    <span dir="ltr" className="font-mono text-white">{t.code}</span>
                    <span className="min-w-0 flex-1 truncate text-white/80">
                      {t.holderName}
                      <span className="text-white/40"> · <span dir="ltr">{t.phone}</span>{t.label ? ` · ${t.label}` : ""}</span>
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px]", STATUS[t.status].cls)}>{STATUS[t.status].label}{t.checkedInAt ? ` ${dateTime(t.checkedInAt)}` : ""}</span>
                    {canWrite && t.status === "VALID" && !t.orderClosed ? (
                      <button type="button" disabled={checkIn.isPending} onClick={() => checkIn.mutate(t.id)} className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/30">دخول</button>
                    ) : null}
                    <Link to={`/admin/orders/${t.orderId}`} className="text-xs text-white/45 hover:text-white">الطلب</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LookResult({ look, canWrite, busy, onCheckIn, onUndo }: { look: NonNullable<Look>; canWrite: boolean; busy: boolean; onCheckIn: (id: string) => void; onUndo: (id: string) => void }) {
  if ("error" in look) {
    return <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-base text-red-100" role="alert" data-testid="ticket-result">✗ {look.error}</div>;
  }
  const t = look.ticket;
  const tone =
    look.note === "JUST_IN" ? "border-emerald-500/40 bg-emerald-500/15" : look.note === "ALREADY_USED" ? "border-amber-500/40 bg-amber-500/10" : look.note === "TICKET_CANCELLED" ? "border-red-500/40 bg-red-500/10" : "border-white/[0.12] bg-white/[0.04]";
  return (
    <div className={cn("mt-4 rounded-2xl border p-4", tone)} role="status" data-testid="ticket-result">
      {look.note === "JUST_IN" ? <p className="mb-2 text-center text-xl font-bold text-emerald-200">✓ دخلت</p> : null}
      {look.note === "ALREADY_USED" ? <p className="mb-2 text-center text-lg font-bold text-amber-200">⚠ هالتذكرة دخلت قبل {t.checkedInAt ? `(${dateTime(t.checkedInAt)})` : ""}</p> : null}
      {look.note === "TICKET_CANCELLED" ? <p className="mb-2 text-center text-lg font-bold text-red-200">✗ هالتذكرة ملغية — الطلب انلغى</p> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-white">{t.holderName}</div>
          <div className="text-sm text-white/70">{[t.product.title, t.label].filter(Boolean).join(" · ")}</div>
          <div className="text-xs text-white/50">{[t.product.when, t.product.location].filter(Boolean).join(" · ")}</div>
          <div className="mt-1 text-xs text-white/45"><span dir="ltr" className="font-mono">{t.code}</span> · <span dir="ltr">{t.phone}</span> · <Link to={`/admin/orders/${t.orderId}`} className="text-accent-300">الطلب</Link></div>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs", STATUS[t.status].cls)}>{STATUS[t.status].label}</span>
      </div>
      {canWrite && t.status === "VALID" && !t.orderClosed ? (
        <button type="button" disabled={busy} onClick={() => onCheckIn(t.id)} className="mt-4 h-14 w-full rounded-2xl bg-emerald-500 text-lg font-bold text-white hover:bg-emerald-400 disabled:opacity-60" data-testid="check-in">
          سجّلي الدخول ✓
        </button>
      ) : null}
      {canWrite && t.status === "USED" ? (
        <button type="button" disabled={busy} onClick={() => onUndo(t.id)} className="mt-3 text-xs text-white/50 hover:text-white">
          تراجع عن تسجيل الدخول
        </button>
      ) : null}
    </div>
  );
}

type Detector = { detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };

/** Camera QR scanner (Chrome / Android). iPhone: the phone camera opens this page instead. */
function Scanner({ onCode, onClose }: { onCode: (text: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(onCode);
  useEffect(() => {
    done.current = onCode;
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let alive = true;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (!alive || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const Ctor = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
        const detector = new Ctor({ formats: ["qr_code"] });
        const tick = async () => {
          if (!alive || !video.current) return;
          try {
            const found = await detector.detect(video.current);
            if (found[0]?.rawValue) {
              done.current(found[0].rawValue);
              return;
            }
          } catch {
            /* frame not ready */
          }
          timer = window.setTimeout(tick, 250);
        };
        void tick();
      } catch {
        if (alive) setError("ما قدرنا نفتح الكاميرا. اسمحي للمتصفح يستعملها، أو اكتبي الكود.");
      }
    })();
    return () => {
      alive = false;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.12] bg-black">
      {error ? <p className="p-4 text-sm text-red-200">{error}</p> : <video ref={video} className="mx-auto aspect-square w-full max-w-sm object-cover" muted playsInline />}
      <button type="button" onClick={onClose} className="h-11 w-full bg-white/[0.06] text-sm text-white/80">إغلاق الكاميرا</button>
    </div>
  );
}
