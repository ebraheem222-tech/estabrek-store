"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { analyticsReady, trackPageView } from "@/lib/analytics";

/**
 * Loads Google Analytics 4, the Meta Pixel and the TikTok Pixel when their IDs
 * are set in the admin (Settings → التسويق والتتبع), after the page is
 * interactive so they never slow the first paint. Sends a page view on every
 * page change. Only well-formed IDs are used (they are written into scripts).
 */
export type MarketingConfig = { ga4Id?: string; metaPixelId?: string; tiktokPixelId?: string };

const GA4 = /^G-[A-Z0-9]{6,12}$/;
const META = /^\d{10,20}$/;
const TIKTOK = /^[A-Z0-9]{15,25}$/;

export function cleanMarketing(v: unknown): Required<MarketingConfig> {
  const m = (v && typeof v === "object" ? v : {}) as MarketingConfig;
  const pick = (x: unknown, re: RegExp) => (typeof x === "string" && re.test(x.trim()) ? x.trim() : "");
  return { ga4Id: pick(m.ga4Id, GA4), metaPixelId: pick(m.metaPixelId, META), tiktokPixelId: pick(m.tiktokPixelId, TIKTOK) };
}

function PageViews() {
  const pathname = usePathname();
  const search = useSearchParams();
  const last = useRef("");
  useEffect(() => {
    const path = `${pathname}${search?.toString() ? `?${search}` : ""}`;
    if (path === last.current) return;
    last.current = path;
    trackPageView(path);
  }, [pathname, search]);
  return null;
}

export function MarketingPixels({ config }: { config: unknown }) {
  const { ga4Id, metaPixelId, tiktokPixelId } = cleanMarketing(config);
  const any = Boolean(ga4Id || metaPixelId || tiktokPixelId);
  if (!any) return null;

  const setup = [
    ga4Id
      ? `window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments);};gtag('js',new Date());gtag('config','${ga4Id}',{send_page_view:false});`
      : "",
    metaPixelId
      ? `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');`
      : "",
    tiktokPixelId
      ? `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${tiktokPixelId}');}(window,document,'ttq');`
      : "",
  ].join("");

  return (
    <>
      {ga4Id ? <Script id="estabrek-ga4-src" src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" /> : null}
      <Script id="estabrek-pixels" strategy="afterInteractive" onReady={analyticsReady}>
        {setup}
      </Script>
      <Suspense fallback={null}>
        <PageViews />
      </Suspense>
    </>
  );
}
