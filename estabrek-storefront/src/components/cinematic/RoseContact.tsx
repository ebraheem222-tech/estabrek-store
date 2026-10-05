"use client";
import { useId, useState, type FormEvent } from "react";
import Image from "next/image";
import type { ContactData } from "@/cms/sectionTypes";
import { submitContactMessage } from "@/lib/contactForm";
import { useLanguage } from "./Language";
import { useRoseStore } from "./StorefrontChrome";
import { Icon } from "./Icons";
import { polishCopy } from "./roseCopy";
import { whatsappLink } from "@/lib/whatsapp";

export function RoseContact({ data, heading }: { data?: ContactData; heading?: string }) {
  const ar = useLanguage().language === "ar", store = useRoseStore();
  const id = useId();
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const fields: NonNullable<NonNullable<ContactData["form"]>["fields"]> = data ? data.form?.fields || [] : [
    { name: "name", label: ar ? "الاسم" : "Your name", required: true, type: "text" },
    { name: "email", label: ar ? "البريد الإلكتروني" : "Email", type: "email" },
    { name: "phone", label: ar ? "رقم الهاتف" : "Phone", type: "tel" },
    { name: "message", label: ar ? "الرسالة" : "Your message", type: "textarea", required: true },
  ];
  const channels = [
    ...(store.whatsappNumber || store.contactPhone ? [{ label: ar ? "واتساب" : "WhatsApp", value: ar ? "خلينا نحكي" : "Let's talk", href: whatsappLink(store.whatsappNumber || store.contactPhone) ?? "#" }] : []),
    ...(store.contactPhone ? [{ label: ar ? "الهاتف" : "Phone", value: store.contactPhone, href: `tel:${store.contactPhone.replace(/\s/g, "")}` }] : []),
    ...(store.contactEmail ? [{ label: ar ? "البريد" : "Email", value: store.contactEmail, href: `mailto:${store.contactEmail}` }] : []),
    ...(store.instagram ? [{ label: "Instagram", value: ar ? "تابعي حكايتنا" : "Follow our story", href: store.instagram }] : []),
  ];
  const authored = data?.items || [];
  const items = [...authored, ...channels.filter(c => !authored.some(a => a.href === c.href))];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    const form = event.currentTarget;
    const values = Object.fromEntries(Array.from(new FormData(form).entries()).map(([key, value]) => [key, String(value).trim()]));
    setError("");
    if (!data && !values.email && !values.phone) { setError(ar ? "أضيفي البريد أو رقم الهاتف حتى نتمكن من الردّ." : "Add an email or phone number so we can reply."); form.querySelector<HTMLInputElement>('[name="email"]')?.focus(); return; }
    setStatus("sending");
    try {
      await submitContactMessage({ name: values.name, email: values.email, phone: values.phone, subject: values.subject, message: values.message, fields: values, pageUrl: location.href, source: "rose_contact" });
      form.reset(); setStatus("sent");
    } catch (err) { setError(err instanceof Error ? err.message : (ar ? "تعذّر الإرسال. جرّبي مرة أخرى." : "Could not send. Try again.")); setStatus("idle"); }
  }
  return <section className="rose-contact" data-rose-palette={data?.rosePresentation?.palette || "blush"}>
    <div className="rose-contact-intro" data-reveal>
      <span className="atelier-eyebrow">{ar ? "تواصل" : "CONTACT"}</span>
      <h1>{data?.title ? polishCopy(data.title) : ar ? <>{heading ? polishCopy(heading).replace(/[.。]$/, "") : "تواصلي معنا"}.<br /><em>نحن هنا لأجلكِ.</em></> : <>Get in touch.<br /><em>We're here for you.</em></>}</h1>
      <p>{data?.subtitle || (ar ? "سؤال عن إطلالة، مقاس، أو طلب؟ يسعدنا نساعدكِ باختيار تفاصيلكِ." : "A question about your look, size or order? We'd love to help.")}</p>
      <div className="rose-contact-photo"><Image src="/editorial/scarves.webp" alt={ar ? "تفاصيل أقمشة بألوان هادئة" : "Soft fabric details"} fill sizes="(max-width:760px) 100vw, 40vw" /></div>
      {!!items.length && <div className="rose-contact-channels">{items.map((item, i) => <div key={`${item.label}-${i}`}><span>{item.label}</span>{item.href ? <a href={item.href} target={/^https?:\/\//i.test(item.href) ? "_blank" : undefined} rel={/^https?:\/\//i.test(item.href) ? "noopener noreferrer" : undefined}>{item.value}<Icon name="arrow" /></a> : <p>{item.value}</p>}</div>)}</div>}
      {data?.mapEmbedUrl && <iframe className="rose-contact-map" title={ar ? "موقع المتجر" : "Store location"} src={data.mapEmbedUrl} loading="lazy" />}
    </div>
    <div className="rose-contact-form-panel" data-reveal>
      <span className="rose-form-number">{ar ? "رسالة سريعة" : "A QUICK NOTE"}</span>
      <h2>{data?.form?.title || (ar ? "اكتبي لنا" : "A note to us")}</h2>
      {data?.form?.subtitle && <p>{data.form.subtitle}</p>}
      {status === "sent" ? <div className="rose-contact-success" role="status"><Icon name="spark" /><h3>{ar ? "وصلت رسالتكِ، شكراً لكِ." : "Your message is with us. Thank you."}</h3><button className="atelier-text-link" onClick={() => setStatus("idle")}>{ar ? "إرسال رسالة أخرى" : "Send another message"}<Icon name="arrow" /></button></div> : <form onSubmit={submit} aria-busy={status === "sending"}>
        <div className="rose-contact-fields">{fields.map((field, index) => <label className={field.type === "textarea" ? "rose-field-wide" : ""} key={`${field.name}-${index}`} htmlFor={`${id}-${index}`}><span>{field.label || field.name}{field.required && <b aria-hidden="true"> *</b>}</span>
          {field.type === "textarea" ? <textarea id={`${id}-${index}`} aria-label={field.label || field.name} name={field.name} required={field.required} placeholder={field.placeholder} rows={5} /> : <input id={`${id}-${index}`} aria-label={field.label || field.name} name={field.name} type={field.type || "text"} required={field.required} placeholder={field.placeholder} autoComplete={field.name === "name" ? "name" : field.type === "email" ? "email" : field.type === "tel" ? "tel" : undefined} />}
        </label>)}</div>
        {error && <p className="rose-form-error" role="alert">{error}</p>}
        <button type="submit" className="atelier-button button-dark" disabled={status === "sending"}>{status === "sending" ? (ar ? "جارٍ الإرسال…" : "Sending…") : data?.form?.submitLabel || (ar ? "أرسلي الرسالة" : "Send your message")}<Icon name="arrow" /></button>
      </form>}
    </div>
  </section>;
}
