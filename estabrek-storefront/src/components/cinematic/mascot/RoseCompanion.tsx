"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cldUrl } from "@/lib/cloudinary";
import { formatMoney } from "@/lib/catalog";
import { ROSE_OUTFIT_EVENT, ROSE_OUTFIT_LINES, type RoseExtras, type RoseOutfit } from "@/lib/roseEvents";
import { useStoreChat } from "@/lib/storeChat";
import { whatsappLink } from "@/lib/whatsapp";
import { useLanguage } from "../Language";
import { RoseMascot, useSceneRoseOnScreen, type MascotHandle } from "./RoseMascot";
import { useRazan } from "@/store/razan";
import { RAZAN_OPEN_EVENT, isPhone, onQuietPage, razanCount, razanMaySpeak } from "@/lib/razanRuntime";
import { noteVisit, piecesSeenThisVisit } from "@/lib/razanHistory";
import { useRecentlyViewed } from "@/store/recentlyViewed";
import { RazanHistory } from "./RazanHistory";
import { RazanHelpOrder } from "./RazanHelpOrder";
import { RazanStyleQuiz } from "./RazanStyleQuiz";
import { RazanQuestions } from "./RazanQuestions";
import { quizVisit, type QuizChance } from "@/lib/quizClient";
import { useSiteFeatures } from "@/store/siteFeatures";
import { RAZAN_HESITATION_EVENT, RAZAN_PRODUCT_EVENT, razanProduct } from "@/lib/razanProduct";
import { ROSE_EVENT } from "@/lib/roseEvents";
import type { CatalogProduct } from "@/lib/catalog";
import { pickText, seasonNow, seasonOutfit } from "@/lib/razanSettings";

/** Rose's little face for the chat messages. */
function RoseFace() {
  return (
    <svg viewBox="60 50 180 190" className="rose-chat-face" aria-hidden="true">
      <path d="M150 52 C206 52 236 92 236 146 C236 186 222 214 204 230 L96 230 C78 214 64 186 64 146 C64 92 94 52 150 52 Z" className="m-face-hijab" />
      <ellipse cx="150" cy="160" rx="56" ry="58" className="m-face-skin" />
      <path d="M150 60 C200 60 228 96 228 146 C228 190 206 226 150 232 C94 226 72 190 72 146 C72 96 100 60 150 60 Z M150 104 C184 104 204 128 204 160 C204 196 180 218 150 218 C120 218 96 196 96 160 C96 128 116 104 150 104 Z" fillRule="evenodd" className="m-face-hijab" />
      <ellipse cx="126" cy="164" rx="9.5" ry="12" fill="#3b1f2c" /><ellipse cx="174" cy="164" rx="9.5" ry="12" fill="#3b1f2c" />
      <circle cx="129" cy="160" r="3.4" fill="#fff" /><circle cx="177" cy="160" r="3.4" fill="#fff" />
      <path d="M140 192 Q150 201 160 192" fill="none" stroke="#5a2a3e" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="112" cy="186" rx="11" ry="7" fill="#f08aa0" opacity=".35" /><ellipse cx="188" cy="186" rx="11" ry="7" fill="#f08aa0" opacity=".35" />
    </svg>
  );
}

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.98L2 22l5.16-1.5A9.93 9.93 0 1 0 12.04 2Zm5.8 14.13c-.25.7-1.44 1.33-2 1.4-.51.08-1.15.11-1.86-.12-.43-.13-.98-.32-1.69-.62-2.97-1.28-4.92-4.29-5.07-4.49-.15-.2-1.21-1.61-1.21-3.07s.77-2.18 1.04-2.48c.27-.3.6-.37.8-.37h.57c.18 0 .43-.07.67.51.25.6.84 2.06.92 2.21.07.15.12.33.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.45.52-.15.15-.3.31-.13.6.17.3.77 1.27 1.65 2.05 1.13 1.01 2.09 1.32 2.38 1.47.3.15.47.12.65-.07.17-.2.74-.87.94-1.17.2-.3.4-.25.67-.15.27.1 1.73.82 2.03.97.3.15.5.22.57.35.08.12.08.72-.17 1.42Z" />
    </svg>
  );
}

const QUICK: Record<"ar" | "en", string[]> = {
  ar: ["الشحن والتوصيل 🚚", "كيف أختار مقاسي؟", "الاستبدال والإرجاع", "ساعديني أختار فستان 👗"],
  en: ["Shipping & delivery 🚚", "Which size am I?", "Exchanges & returns", "Help me pick a dress 👗"],
};

/**
 * Rose follows the shopper around the shop: a small guide in the corner. She
 * changes outfit with the category, cheers when something goes in the bag or
 * the wishlist, and — when the shop chat is on — she *is* the chat: tap her
 * and she answers. When a page scene already has its own Rose on screen and
 * the chat is closed, she steps aside.
 */
export function RoseCompanion({ side = "left", chat = false, whatsapp = null }: { side?: "left" | "right" | "center"; chat?: boolean; whatsapp?: string | null }) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const sceneRose = useSceneRoseOnScreen();
  const rose = useRef<MascotHandle>(null);
  const razan = useRazan();
  // Her first outfit: the season's (when the owner lets the season dress her), else her default.
  const startOutfit = (razan.seasonal.outfit ? seasonOutfit(seasonNow(razan)) : null) ?? razan.outfits.default;
  const [look, setLook] = useState<{ outfit: RoseOutfit; extras: RoseExtras }>({ outfit: startOutfit, extras: {} });
  // Phones: the owner can keep her hidden there (admin → رزان).
  const [phoneHidden, setPhoneHidden] = useState(false);
  useEffect(() => {
    const check = () => setPhoneHidden(razan.phone === "hidden" && isPhone());
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [razan.phone]);
  const [open, setOpen] = useState(false);
  // Her panel: the chat (or ways to reach the shop) and, when the owner has it on, «شو كنتِ شايفة».
  const [tab, setTab] = useState<"chat" | "history" | "help" | "quiz" | "questions">("chat");
  const quizOn = razan.styleQuiz.enabled;
  // «سؤال وجواب»: a few visitors get a chance at a coupon; she chooses to play.
  const { quiz: questionsOn } = useSiteFeatures();
  const [chance, setChance] = useState<QuizChance | null>(null);
  const questionsTab = Boolean(chance?.chance) || tab === "questions";
  const historyOn = razan.history.enabled;
  // «رزان بتساعدك تطلبي»: on a piece's page, while the owner has it on.
  const helpCfg = razan.helpOrder;
  const [helpProduct, setHelpProduct] = useState<CatalogProduct | null>(null);
  useEffect(() => {
    const sync = () => setHelpProduct(razanProduct());
    sync();
    window.addEventListener(RAZAN_PRODUCT_EVENT, sync);
    return () => window.removeEventListener(RAZAN_PRODUCT_EVENT, sync);
  }, []);
  const helpOn = helpCfg.enabled && Boolean(helpProduct);
  const tabsOn = historyOn || helpOn || quizOn || questionsTab;
  // A gentle offer above her (e.g. "looking for something you saw?").
  const [offer, setOffer] = useState<null | { kind: "history" | "help" | "questions"; text: string }>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const pathname = usePathname();
  const { items: seen } = useRecentlyViewed();
  const seenCount = useRef(0);
  seenCount.current = seen.length;
  const [text, setText] = useState("");
  const listEnd = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const greeting = chat
    ? pickText(razan.texts.greetingChat, ar, ar ? "أهلاً! أنا رزان 🌸 اسأليني عن المقاسات، التوصيل، الاستبدال، أو خليني أساعدك تختاري." : "Hi! I'm Rose 🌸 ask me about sizes, delivery, exchanges — or let me help you choose.")
    : pickText(razan.texts.greetingOffline, ar, ar ? "أهلاً! أنا رزان 🌸 فريقنا بيرد عليكِ بسرعة على واتساب، أو تصفّحي المجموعة معي." : "Hi! I'm Rose 🌸 our team answers fast on WhatsApp — or browse the collection with me.");
  const wa = whatsappLink(whatsapp, ar ? "مرحباً، عندي سؤال عن المتجر 🌸" : "Hi! I have a question about the shop 🌸");
  const chatState = useStoreChat(greeting, ar);
  const away = sceneRose && !open;
  const offline = !chat;

  // A new category, a new outfit.
  useEffect(() => {
    const onOutfit = (e: Event) => {
      const next = (e as CustomEvent<{ outfit: RoseOutfit; extras: RoseExtras }>).detail;
      setLook((current) => {
        if (current.outfit === next.outfit && Boolean(current.extras.pearls) === Boolean(next.extras.pearls)) return current;
        window.setTimeout(() => rose.current?.say(ROSE_OUTFIT_LINES[next.outfit][ar ? "ar" : "en"], 2200, "outfit"), 650);
        return next;
      });
    };
    window.addEventListener(ROSE_OUTFIT_EVENT, onOutfit);
    return () => window.removeEventListener(ROSE_OUTFIT_EVENT, onOutfit);
  }, [ar]);

  // She seems lost (back to a piece after two others, a second search, or leaving): offer her history once a visit.
  useEffect(() => {
    if (!historyOn || !razan.history.offer) return;
    const offered = () => { try { return sessionStorage.getItem("razan_offer_history") === "1"; } catch { return true; } };
    const show = () => {
      if (offered() || open || seenCount.current < 2 || onQuietPage()) return;
      if (!razanMaySpeak("offer")) return;
      try { sessionStorage.setItem("razan_offer_history", "1"); } catch { /* ignore */ }
      setOffer({ kind: "history", text: ar ? "بتدوّري على إشي شفتيه قبل شوي؟" : "Looking for something you saw earlier?" });
      razanCount("offer:history");
      rose.current?.wave();
    };
    if (noteVisit(pathname)) window.setTimeout(show, 900);
    // Leaving (desktop): the pointer goes up out of the page.
    const onLeave = (e: MouseEvent) => { if (!e.relatedTarget && e.clientY <= 0 && piecesSeenThisVisit() >= 2) show(); };
    document.addEventListener("mouseout", onLeave);
    return () => document.removeEventListener("mouseout", onLeave);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, historyOn, razan.history.offer, ar]);

  // The offer goes away on its own after a while.
  useEffect(() => {
    if (!offer) return;
    const t = window.setTimeout(() => setOffer(null), 14000);
    return () => window.clearTimeout(t);
  }, [offer]);

  const openHistory = () => {
    setOffer(null);
    setTab("history");
    setOpen(true);
    razanCount("accept:history");
  };

  // Guided ordering: offered once a visit, after she stays a while without doing anything
  // or picks colours/sizes back and forth. «لا شكراً» keeps it away for the owner's days.
  useEffect(() => {
    if (!helpCfg.enabled || !helpProduct) return;
    const stock = (helpProduct.items ?? []).some((it) => (it.variants ?? []).some((v) => v.stock == null || v.stock > 0));
    if (!stock) return;
    const snoozed = () => {
      try {
        if (sessionStorage.getItem("razan_offer_help") === "1") return true;
        const until = Number(localStorage.getItem("razan_help_snooze") || 0);
        return until > Date.now();
      } catch { return true; }
    };
    let idle = 0;
    let soon = 0;
    let added = false;
    const show = () => {
      if (added || snoozed() || openRef.current || onQuietPage()) return;
      if (!razanMaySpeak("offer")) return;
      try { sessionStorage.setItem("razan_offer_help", "1"); } catch { /* ignore */ }
      setOffer({ kind: "help", text: ar ? "بتحبي أساعدكِ تطلبي هالقطعة؟ خطوة بخطوة 🌸" : "Want me to help you order this piece, step by step? 🌸" });
      razanCount("offer:help");
      rose.current?.wave();
    };
    const restart = () => {
      window.clearTimeout(idle);
      idle = window.setTimeout(show, helpCfg.idleSeconds * 1000);
    };
    const onHesitate = (e: Event) => {
      if (((e as CustomEvent<number>).detail ?? 0) >= 4) { window.clearTimeout(soon); soon = window.setTimeout(show, 2000); }
    };
    // Put in the bag: she knows how, no need to offer.
    const onReact = (e: Event) => { if ((e as CustomEvent).detail === "cart-add") { added = true; window.clearTimeout(idle); window.clearTimeout(soon); } };
    restart();
    const opts = { passive: true } as const;
    window.addEventListener("pointerdown", restart, opts);
    window.addEventListener("keydown", restart);
    window.addEventListener(RAZAN_HESITATION_EVENT, onHesitate);
    window.addEventListener(ROSE_EVENT, onReact);
    return () => {
      window.clearTimeout(idle);
      window.clearTimeout(soon);
      window.removeEventListener("pointerdown", restart);
      window.removeEventListener("keydown", restart);
      window.removeEventListener(RAZAN_HESITATION_EVENT, onHesitate);
      window.removeEventListener(ROSE_EVENT, onReact);
    };
  }, [helpCfg.enabled, helpCfg.idleSeconds, helpProduct, ar]);

  // Leaving the piece takes its offer away.
  useEffect(() => {
    if (!helpProduct) setOffer((o) => (o?.kind === "help" ? null : o));
    if (!helpProduct && tab === "help") setTab("chat");
  }, [helpProduct, tab]);

  const openHelp = (counted = true) => {
    setOffer(null);
    setTab("help");
    setOpen(true);
    if (counted) razanCount("accept:help");
  };
  // Is there a chance for this visitor? (asked once a visit) Then offer it once, gently.
  useEffect(() => {
    if (!razan.enabled || !questionsOn) return;
    let alive = true;
    let t = 0;
    void quizVisit().then((c) => {
      if (!alive || !c.chance) return;
      setChance(c);
      t = window.setTimeout(() => {
        try { if (sessionStorage.getItem("razan_offer_quiz") === "1") return; } catch { return; }
        if (openRef.current || onQuietPage() || !razanMaySpeak("offer")) return;
        try { sessionStorage.setItem("razan_offer_quiz", "1"); } catch { /* ignore */ }
        setOffer({ kind: "questions", text: ar ? `🎁 عندك فرصة تربحي كوبون خصم ${c.percent}%! بتجاوبي على ${c.questions} أسئلة دينية؟` : `🎁 A chance to win ${c.percent}% off! Answer ${c.questions} questions?` });
        rose.current?.wave();
      }, 6000);
    });
    return () => { alive = false; window.clearTimeout(t); };
  }, [razan.enabled, questionsOn, ar]);

  // Anywhere in the shop can open her panel on a tab (e.g. «رزان بتختارلك» on the shop page).
  useEffect(() => {
    const onOpen = (e: Event) => {
      const want = (e as CustomEvent<string>).detail;
      setOffer(null);
      setTab(want === "quiz" || want === "history" || want === "help" ? want : "chat");
      setOpen(true);
      rose.current?.wave();
    };
    window.addEventListener(RAZAN_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(RAZAN_OPEN_EVENT, onOpen);
  }, []);

  const declineOffer = () => {
    if (offer?.kind === "help") {
      try { localStorage.setItem("razan_help_snooze", String(Date.now() + helpCfg.snoozeDays * 86400_000)); } catch { /* ignore */ }
    }
    setOffer(null);
  };

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) listEnd.current?.scrollIntoView({ block: "end" });
  }, [open, chatState.messages, chatState.loading]);

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setText("");
    rose.current?.think(true);
    const reply = await chatState.send(q);
    rose.current?.think(false);
    if (reply) {
      rose.current?.talk(1800);
      if (reply.products?.length) rose.current?.cheer();
    }
  };

  // Tapping Rose always opens her panel: the AI chat when it is on, otherwise quick ways to reach the shop.
  const tap = () => {
    setOffer(null);
    if (!open) setTab("chat");
    setOpen((v) => !v);
    if (!open) { rose.current?.wave(); rose.current?.wink(); razanCount("open"); }
  };

  if (!razan.enabled || phoneHidden) return null;

  return (
    <div className="rose-companion" data-side={side} data-away={away ? "true" : undefined} data-chat={chat ? "true" : undefined} data-open={open ? "true" : undefined}>
      {open && (
        <div className="rose-chat" data-offline={offline ? "" : undefined} role="dialog" aria-label={ar ? "محادثة مع رزان" : "Chat with Rose"} dir={ar ? "rtl" : "ltr"}>
          <header className="rose-chat-head">
            <RoseFace />
            <div>
              <strong>{ar ? "رزان" : "Rose"}</strong>
              <span>{ar ? "دليلتكِ في استبرق" : "Your Estabrek guide"}</span>
            </div>
            {wa && (
              <a className="rose-chat-icon rose-chat-wa" href={wa} target="_blank" rel="noopener noreferrer" aria-label={ar ? "واتساب" : "WhatsApp"} title={ar ? "واتساب" : "WhatsApp"}>
                <WhatsAppGlyph />
              </a>
            )}
            {!offline && <button type="button" className="rose-chat-icon" onClick={chatState.clear} aria-label={ar ? "محادثة جديدة" : "New chat"} title={ar ? "محادثة جديدة" : "New chat"}>↺</button>}
            <button type="button" className="rose-chat-icon" onClick={() => setOpen(false)} aria-label={ar ? "إغلاق" : "Close"}>✕</button>
          </header>
          {tabsOn ? (
            <div className="razan-tabs" role="tablist" aria-label={ar ? "لوحة رزان" : "Rose's panel"}>
              <button type="button" role="tab" aria-selected={tab === "chat"} onClick={() => setTab("chat")}>{offline ? (ar ? "تواصلي" : "Contact") : ar ? "المحادثة" : "Chat"}</button>
              {helpOn ? <button type="button" role="tab" aria-selected={tab === "help"} onClick={() => openHelp()}>{ar ? "ساعديني أطلب" : "Help me order"}</button> : null}
              {quizOn ? <button type="button" role="tab" aria-selected={tab === "quiz"} onClick={() => setTab("quiz")}>{ar ? "بتختارلك" : "Pick for me"}</button> : null}
              {questionsTab ? <button type="button" role="tab" aria-selected={tab === "questions"} onClick={() => setTab("questions")}>{ar ? "🎁 سؤال وجواب" : "🎁 Quiz"}</button> : null}
              {historyOn ? <button type="button" role="tab" aria-selected={tab === "history"} onClick={() => { setTab("history"); razanCount("accept:history"); }}>{ar ? "شو كنتِ شايفة" : "Seen earlier"}</button> : null}
            </div>
          ) : null}
          {questionsTab && tab === "questions" ? (
            <div className="rose-chat-list">
              <RazanQuestions ar={ar} percent={chance?.percent ?? 10} hours={chance?.hours ?? 48} count={chance?.questions ?? 5} onClose={() => { setOpen(false); setTab("chat"); setChance(null); }} />
            </div>
          ) : quizOn && tab === "quiz" ? (
            <div className="rose-chat-list">
              <RazanStyleQuiz ar={ar} onPick={() => setOpen(false)} />
            </div>
          ) : helpOn && tab === "help" && helpProduct ? (
            <div className="rose-chat-list">
              <RazanHelpOrder key={helpProduct.id} product={helpProduct} ar={ar} onClose={() => { setOpen(false); setTab("chat"); }} />
            </div>
          ) : historyOn && tab === "history" ? (
            <div className="rose-chat-list">
              <RazanHistory ar={ar} onPick={() => setOpen(false)} />
            </div>
          ) : (
          <>
          <div className="rose-chat-list">
            {(offline ? [{ id: "hello", role: "assistant" as const, text: greeting, at: 0, products: [] }] : chatState.messages).map((m) => (
              <div key={m.id} className="rose-chat-row" data-role={m.role}>
                {m.role === "assistant" && <RoseFace />}
                <div className="rose-chat-msg">
                  <p>{m.text}</p>
                  {m.products?.length ? (
                    <div className="rose-chat-products">
                      {m.products.slice(0, 4).map((p) => (
                        <Link key={p.id} href={`/p/${encodeURIComponent(p.slug)}`} onClick={() => setOpen(false)}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {p.imageUrl ? <img src={cldUrl(p.imageUrl, { w: 240, h: 300, c: "fill", g: "auto" })} alt="" loading="lazy" /> : <span className="rose-chat-noimg" />}
                          <span>{p.title}</span>
                          {p.minPrice != null && <em>{formatMoney(p.minPrice, "ILS")}</em>}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {chatState.loading && (
              <div className="rose-chat-row" data-role="assistant">
                <RoseFace />
                <div className="rose-chat-msg rose-chat-typing" aria-label={ar ? "رزان عم تكتب" : "Rose is typing"}><i /><i /><i /></div>
              </div>
            )}
            <div ref={listEnd} />
          </div>
          {offline ? (
            <div className="rose-chat-quick rose-chat-links">
              {wa && <a className="rose-chat-cta" href={wa} target="_blank" rel="noopener noreferrer"><WhatsAppGlyph /> {ar ? "راسلينا على واتساب" : "Message us on WhatsApp"}</a>}
              <Link href="/shop" onClick={() => setOpen(false)}>{ar ? "تصفّحي المجموعة 🛍️" : "Browse the collection 🛍️"}</Link>
              <Link href="/contact" onClick={() => setOpen(false)}>{ar ? "صفحة التواصل" : "Contact page"}</Link>
            </div>
          ) : (
            <>
          {chatState.messages.length <= 2 && (
            <div className="rose-chat-quick">
              {QUICK[ar ? "ar" : "en"].map((q) => <button key={q} type="button" onClick={() => void ask(q)}>{q}</button>)}
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer">{ar ? "واتساب 💬" : "WhatsApp 💬"}</a>}
            </div>
          )}
          <form className="rose-chat-form" onSubmit={(e) => { e.preventDefault(); void ask(text); }}>
            <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder={ar ? "اكتبي سؤالك لرزان…" : "Ask Rose…"} aria-label={ar ? "رسالتك" : "Your message"} maxLength={500} />
            <button type="submit" disabled={!text.trim() || chatState.loading} aria-label={ar ? "إرسال" : "Send"}>➤</button>
          </form>
            </>
          )}
          </>
          )}
        </div>
      )}
      {offer && !open ? (
        <div className="razan-offer" role="status" data-testid="razan-offer">
          <p>{offer.text}</p>
          <div>
            {offer.kind === "questions" ? (
              <button type="button" onClick={() => { setOffer(null); setTab("questions"); setOpen(true); }}>{ar ? "بدي ألعب 🎁" : "Let's play 🎁"}</button>
            ) : offer.kind === "help" ? (
              <button type="button" onClick={() => openHelp()}>{ar ? "أيوه، ساعديني" : "Yes, help me"}</button>
            ) : (
              <button type="button" onClick={openHistory}>{ar ? "أيوه، ورجيني" : "Yes, show me"}</button>
            )}
            <button type="button" className="ghost" onClick={declineOffer}>{offer.kind === "questions" ? (ar ? "مش هلأ" : "Not now") : ar ? "لا شكراً" : "No thanks"}</button>
          </div>
        </div>
      ) : null}
      {away && (
        // Another Rose has the stage: the chat stays one tap away as Rose's little face.
        <button type="button" className="rose-companion-mini" onClick={() => setOpen(true)} aria-label={ar ? "احكي مع رزان" : "Chat with Rose"}>
          <RoseFace />
          <span aria-hidden="true">💬</span>
        </button>
      )}
      <div className="rose-companion-figure">
        <RoseMascot
          ref={rose}
          companion
          reactive
          walkIn
          muted={sceneRose && !open}
          ar={ar}
          outfit={look.outfit}
          extras={look.extras}
          mirrored={side === "right"}
          label={ar ? "رَزان، دليلتكِ في المتجر" : "Rose, your shop guide"}
        />
        <button
          type="button"
          className="rose-companion-hit"
          aria-label={open ? (ar ? "إغلاق المحادثة مع رزان" : "Close chat with Rose") : (ar ? "احكي مع رزان" : "Chat with Rose")}
          aria-expanded={open}
          onClick={tap}
        />
        {!open && <span className="rose-companion-badge" aria-hidden="true">💬</span>}
      </div>
      {wa && !open && (
        // WhatsApp stands beside Rose, never on top of her.
        <a className="rose-companion-wa" href={wa} target="_blank" rel="noopener noreferrer" aria-label={ar ? "تواصلي معنا على واتساب" : "Chat with us on WhatsApp"}>
          <WhatsAppGlyph />
        </a>
      )}
    </div>
  );
}
