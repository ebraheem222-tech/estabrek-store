"use client";
import { useEffect, useState, type ReactNode } from "react";
import { whatsappLink } from "@/lib/whatsapp";

export type MaintenanceInfo = { on: boolean; message: string | null; previewHash: string | null } | null | undefined;

const PREVIEW_KEY = "estabrek_preview_hash";

async function sha256Hex(text: string) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function readStored() {
  try {
    return localStorage.getItem(PREVIEW_KEY);
  } catch {
    return null;
  }
}

/**
 * Maintenance mode (admin → حماية الضغط والصيانة): visitors get a "back soon"
 * screen over everything; the owner opens the site with ?preview=<key> (only
 * the key's hash is public) and sees a small banner instead.
 */
export function MaintenanceGate({
  maintenance,
  siteName,
  logoUrl,
  whatsappNumber,
  contactEmail,
  countryCode,
  children,
}: {
  maintenance: MaintenanceInfo;
  siteName: string;
  logoUrl?: string | null;
  whatsappNumber?: string | null;
  contactEmail?: string | null;
  countryCode?: string | null;
  children: ReactNode;
}) {
  const on = maintenance?.on === true;
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!on || !maintenance?.previewHash) return;
    let alive = true;
    (async () => {
      const url = new URL(window.location.href);
      const key = url.searchParams.get("preview");
      if (key) {
        const hash = await sha256Hex(key).catch(() => "");
        if (!alive) return;
        // The key leaves the address bar (and the history) once it's checked.
        url.searchParams.delete("preview");
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
        if (hash === maintenance.previewHash) {
          try {
            localStorage.setItem(PREVIEW_KEY, hash);
          } catch {
            /* private window: preview for this visit only */
          }
          if (alive) setPreview(true);
          return;
        }
      }
      if (readStored() === maintenance.previewHash && alive) setPreview(true);
    })();
    return () => {
      alive = false;
    };
  }, [on, maintenance?.previewHash]);

  if (!on) return <>{children}</>;

  if (preview) {
    return (
      <>
        <div className="rose-maint-banner" role="status" data-testid="maintenance-preview">
          <span>وضع الصيانة شغّال. إنتَ بتشوف معاينة، والزوار بيشوفوا شاشة «راجعين قريباً». الطلبات موقّفة.</span>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem(PREVIEW_KEY);
              } catch {
                /* ignore */
              }
              setPreview(false);
            }}
          >
            إنهاء المعاينة
          </button>
        </div>
        {children}
      </>
    );
  }

  const wa = whatsappLink(whatsappNumber, undefined, countryCode);
  return (
    <>
      <div className="rose-maint" role="main" data-testid="maintenance-screen">
        <div className="rose-maint-card">
          {logoUrl ? <img src={logoUrl} alt={siteName} className="rose-maint-logo" /> : <div className="rose-maint-name">{siteName}</div>}
          <span className="atelier-eyebrow">صيانة قصيرة</span>
          <h1>راجعين قريباً</h1>
          <p>{maintenance?.message?.trim() || "منحدّث المتجر هلّق لنرجعلكِ بتجربة أحلى. ارجعي بعد شوي."}</p>
          <div className="rose-maint-actions">
            {wa ? (
              <a className="atelier-button button-dark" href={wa} target="_blank" rel="noopener noreferrer">
                راسلينا على واتساب
              </a>
            ) : null}
            {contactEmail ? (
              <a className="atelier-button" href={`mailto:${contactEmail}`}>
                {contactEmail}
              </a>
            ) : null}
          </div>
        </div>
      </div>
      <div hidden aria-hidden="true">
        {children}
      </div>
    </>
  );
}
