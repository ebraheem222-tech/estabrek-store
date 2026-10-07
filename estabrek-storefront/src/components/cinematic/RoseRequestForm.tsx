"use client";
/**
 * «اطلبي قطعتكِ»: a size or colour the shop doesn't have, or a new piece —
 * with up to a few photos. The team looks for it and tells her when it's in.
 * Shown only while the owner has it on (admin → الطلبات الخاصة).
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiBaseClient } from "@/lib/apiClient";
import { razanCount } from "@/lib/razanRuntime";
import { shrinkPhoto, takeHandedPhoto } from "@/lib/requestHandover";
import { useOptionalAccount } from "@/store/account";
import { useSiteFeatures } from "@/store/siteFeatures";
import { useLanguage } from "./Language";

type Kind = "SIZE" | "COLOR" | "NEW_PIECE";
type Props = {
  /** The piece she was looking at (product page). */
  product?: { id: string; title: string } | null;
  variantId?: string | null;
  /** Where it was opened from (shows in the admin). */
  source: "PRODUCT" | "SEARCH" | "IMAGE_SEARCH" | "PAGE";
  initialKind?: Kind;
  initialDetails?: string;
  /** Take the photo the image search handed over. */
  withHandedPhoto?: boolean;
  onClose?: () => void;
};

const KIND_TEXT: Record<Kind, { ar: string; en: string }> = {
  SIZE: { ar: "مقاس مش موجود", en: "A missing size" },
  COLOR: { ar: "لون مش موجود", en: "A missing colour" },
  NEW_PIECE: { ar: "قطعة جديدة", en: "A new piece" },
};

export function RoseRequestForm({ product, variantId, source, initialKind, initialDetails = "", withHandedPhoto, onClose }: Props) {
  const ar = useLanguage().language === "ar";
  const { requests: cfg } = useSiteFeatures();
  const account = useOptionalAccount();
  const kinds = (["SIZE", "COLOR", "NEW_PIECE"] as Kind[]).filter((k) => (k === "SIZE" ? cfg.kinds.size : k === "COLOR" ? cfg.kinds.color : cfg.kinds.newPiece));
  const [kind, setKind] = useState<Kind>(() => (initialKind && kinds.includes(initialKind) ? initialKind : kinds[0] ?? "NEW_PIECE"));
  const [form, setForm] = useState({ wantedSize: "", wantedColor: "", details: initialDetails, name: "", phone: "", email: "" });
  const [photos, setPhotos] = useState<Array<{ file: File; url: string }>>([]);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  // Her details from her account.
  useEffect(() => {
    const u = account?.status === "signedIn" ? account.user : null;
    if (u) setForm((f) => ({ ...f, name: f.name || u.name || "", phone: f.phone || u.phone || "", email: f.email || u.email || "" }));
  }, [account?.status, account?.user]);

  // A photo from the image search.
  useEffect(() => {
    if (!withHandedPhoto || cfg.maxPhotos < 1) return;
    const f = takeHandedPhoto();
    if (f) setPhotos([{ file: f, url: URL.createObjectURL(f) }]);
  }, [withHandedPhoto, cfg.maxPhotos]);

  // Free the previews when she leaves (a removed photo frees its own).
  const shown = useRef(photos);
  shown.current = photos;
  useEffect(() => () => shown.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  if (!cfg.enabled || kinds.length === 0) return null;

  const addPhotos = async (list: FileList | null) => {
    if (!list) return;
    setError(null);
    const room = cfg.maxPhotos - photos.length;
    const picked = Array.from(list).filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, room));
    if (list.length > room) setError(ar ? `بتقدري ترفعي ${cfg.maxPhotos} صور بس.` : `Up to ${cfg.maxPhotos} photos.`);
    const ready = await Promise.all(picked.map((f) => shrinkPhoto(f)));
    const big = ready.filter((f) => f.size > 8 * 1024 * 1024);
    if (big.length) setError(ar ? "صورة كبيرة كتير (أكثر من 8MB)." : "A photo is too big (over 8 MB).");
    setPhotos((p) => [...p, ...ready.filter((f) => f.size <= 8 * 1024 * 1024).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    if (picker.current) picker.current.value = "";
  };
  const removePhoto = (i: number) => setPhotos((p) => {
    URL.revokeObjectURL(p[i].url);
    return p.filter((_, j) => j !== i);
  });

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const nameOk = form.name.trim().length >= 2;
  const phoneOk = form.phone.replace(/\D/g, "").length >= 7;
  const emailOk = !form.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const wantOk = kind === "SIZE" ? form.wantedSize.trim().length > 0 : kind === "COLOR" ? form.wantedColor.trim().length > 0 : form.details.trim().length >= 3 || photos.length > 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!wantOk) return setError(kind === "SIZE" ? (ar ? "شو المقاس اللي بدك؟" : "Which size?") : kind === "COLOR" ? (ar ? "شو اللون اللي بدك؟" : "Which colour?") : ar ? "احكيلنا عن القطعة أو ارفعي صورة." : "Tell us about the piece or add a photo.");
    if (!nameOk || !phoneOk) return setError(ar ? "اكتبي اسمكِ ورقمكِ لنخبّركِ." : "Add your name and phone so we can tell you.");
    if (!emailOk) return setError(ar ? "الإيميل مش مكتوب صح." : "That email doesn't look right.");
    setState("sending");
    setError(null);
    const body = new FormData();
    body.set("kind", kind);
    body.set("name", form.name.trim());
    body.set("phone", form.phone.trim());
    if (form.email.trim()) body.set("email", form.email.trim());
    if (product?.id) body.set("productId", product.id);
    if (variantId) body.set("variantId", variantId);
    if (kind === "SIZE" && form.wantedSize.trim()) body.set("wantedSize", form.wantedSize.trim());
    if (kind !== "SIZE" && form.wantedColor.trim()) body.set("wantedColor", form.wantedColor.trim());
    if (form.details.trim()) body.set("details", form.details.trim());
    body.set("source", source);
    photos.forEach((p) => body.append("photos", p.file, p.file.name));
    try {
      const res = await fetch(`${apiBaseClient()}/requests`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = data?.error;
        throw new Error(
          code === "TOO_MANY_REQUESTS" ? (ar ? "وصلتنا طلبات كتير منكِ اليوم. جربي بكرا أو راسلينا." : "We've had several requests from you today. Try tomorrow or message us.")
          : code === "PHOTO_TOO_BIG" ? (ar ? "صورة كبيرة كتير (أكثر من 8MB)." : "A photo is too big (over 8 MB).")
          : code === "BAD_PHOTO" ? (ar ? "ما قدرنا نقرأ وحدة من الصور. جربي صورة تانية." : "We couldn't read one of the photos. Try another.")
          : code === "BAD_PHONE" ? (ar ? "رقم الهاتف مش صحيح." : "That phone number isn't right.")
          : code === "KIND_OFF" || code === "FEATURE_OFF" ? (ar ? "هالخدمة مش متاحة هلأ." : "This isn't available right now.")
          : code === "STORAGE_NOT_READY" ? (ar ? "ما زبط نرفع الصور هلأ. ابعتي بدون صور أو جربي بعدين." : "Photos can't be uploaded right now. Send without photos or try later.")
          : ar ? `ما زبط نبعت الطلب (${res.status}).` : `Could not send (${res.status}).`,
        );
      }
      razanCount("request:sent");
      setState("done");
    } catch (e: any) {
      setState("idle");
      setError(e?.message || (ar ? "صار خطأ" : "Something went wrong"));
    }
  };

  if (state === "done") {
    return (
      <div className="rose-request rose-request-done" data-testid="request-done" role="status">
        <span aria-hidden="true">🌸</span>
        <strong>{ar ? "وصلنا طلبكِ!" : "We have your request!"}</strong>
        <p>{ar ? "رح ندوّر عليها بأقصى جهدنا، ونخبّركِ على رقمكِ أول ما تصير عنا." : "We'll do our best to find it and let you know as soon as it's here."}</p>
        {onClose ? <button type="button" className="atelier-button" onClick={onClose}>{ar ? "تمام" : "OK"}</button> : null}
      </div>
    );
  }

  return (
    <form className="rose-request" onSubmit={submit} data-testid="request-form" noValidate>
      {product ? <p className="rose-request-for">{ar ? "عن:" : "About:"} <b>{product.title}</b></p> : null}
      {kinds.length > 1 ? (
        <div className="rose-request-kinds" role="radiogroup" aria-label={ar ? "شو بدك؟" : "What are you after?"}>
          {kinds.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => { setKind(k); setError(null); }}>{KIND_TEXT[k][ar ? "ar" : "en"]}</button>
          ))}
        </div>
      ) : null}

      {kind === "SIZE" ? (
        <label className="rose-request-field"><span>{ar ? "المقاس اللي بدك" : "Size you need"}</span><input value={form.wantedSize} onChange={set("wantedSize")} maxLength={40} placeholder={ar ? "مثلاً: XL أو 54" : "e.g. XL or 54"} /></label>
      ) : (
        <label className="rose-request-field"><span>{kind === "COLOR" ? (ar ? "اللون اللي بدك" : "Colour you want") : ar ? "اللون (اختياري)" : "Colour (optional)"}</span><input value={form.wantedColor} onChange={set("wantedColor")} maxLength={60} placeholder={ar ? "مثلاً: زيتي" : "e.g. olive"} /></label>
      )}
      <label className="rose-request-field">
        <span>{kind === "NEW_PIECE" ? (ar ? "احكيلنا عن القطعة" : "Tell us about the piece") : ar ? "تفاصيل (اختياري)" : "Details (optional)"}</span>
        <textarea value={form.details} onChange={set("details")} maxLength={1000} rows={3} placeholder={kind === "NEW_PIECE" ? (ar ? "مثلاً: حجاب شيفون طويل، أو عباية زي اللي بالصورة" : "e.g. a long chiffon hijab, or an abaya like the photo") : ""} />
      </label>

      {cfg.maxPhotos > 0 ? (
        <div className="rose-request-photos">
          <span>{ar ? `صور (لحد ${cfg.maxPhotos}) — اختياري` : `Photos (up to ${cfg.maxPhotos}) — optional`}</span>
          <div>
            {photos.map((p, i) => (
              <figure key={p.url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={ar ? `صورة ${i + 1}` : `Photo ${i + 1}`} />
                <button type="button" onClick={() => removePhoto(i)} aria-label={ar ? "شيلي الصورة" : "Remove photo"}>✕</button>
              </figure>
            ))}
            {photos.length < cfg.maxPhotos ? (
              <button type="button" className="rose-request-add" onClick={() => picker.current?.click()} aria-label={ar ? "ارفعي صورة" : "Add a photo"}>＋<small>{ar ? "صورة" : "Photo"}</small></button>
            ) : null}
          </div>
          <input ref={picker} type="file" accept="image/*" multiple hidden onChange={(e) => void addPhotos(e.target.files)} data-testid="request-photos" />
          <small>{ar ? `الصور بنشوفها نحن بس، وبتنمسح لحالها بعد ${cfg.photoDays} يوم.` : `Only our team sees the photos; they're deleted after ${cfg.photoDays} days.`}</small>
        </div>
      ) : null}

      <div className="rose-request-two">
        <label className="rose-request-field"><span>{ar ? "الاسم" : "Name"}</span><input value={form.name} onChange={set("name")} autoComplete="name" maxLength={120} /></label>
        <label className="rose-request-field"><span>{ar ? "رقم الهاتف" : "Phone"}</span><input value={form.phone} onChange={set("phone")} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" maxLength={40} /></label>
      </div>
      <label className="rose-request-field"><span>{ar ? "الإيميل (اختياري)" : "Email (optional)"}</span><input value={form.email} onChange={set("email")} type="email" autoComplete="email" dir="ltr" maxLength={160} /></label>

      {error ? <p className="rose-request-err" role="alert">{error}</p> : null}
      <div className="rose-request-actions">
        <button type="submit" className="atelier-button button-dark" disabled={state === "sending"}>{state === "sending" ? (ar ? "عم نبعت…" : "Sending…") : ar ? "ابعتي الطلب" : "Send request"}</button>
        {onClose ? <button type="button" className="rose-request-cancel" onClick={onClose}>{ar ? "إلغاء" : "Cancel"}</button> : null}
      </div>
    </form>
  );
}
