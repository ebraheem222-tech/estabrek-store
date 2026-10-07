"use client";

import React, { createContext, useContext } from "react";
import { REQUESTS_DEFAULTS, type RequestsSettings } from "@/lib/requestsSettings";

/** Store features switched on and off in the admin (read from the public settings in the root layout). */
export type SiteFeatures = {
  /** "Tell me when it's back" on sold-out sizes (admin → بانتظار التوفّر). */
  stockAlerts: boolean;
  /** «اطلبي قطعتكِ» (admin → الطلبات الخاصة). */
  requests: RequestsSettings;
  /** header.delivery (zones and cities), for Razan's guided ordering. */
  delivery: unknown;
  /** «سؤال وجواب» is on (admin → سؤال وجواب): Razan may offer the questions. */
  quiz: boolean;
  /** AI for shoppers (admin → الذكاء الاصطناعي; only switchable once the key is set). */
  ai: { smartSearch: boolean; shopTheLook: boolean; sizeAdvice: boolean; reviewSummary: boolean };
};

const DEFAULTS: SiteFeatures = {
  stockAlerts: false,
  requests: REQUESTS_DEFAULTS,
  delivery: null,
  quiz: false,
  ai: { smartSearch: false, shopTheLook: false, sizeAdvice: false, reviewSummary: false },
};
const Ctx = createContext<SiteFeatures>(DEFAULTS);

export function SiteFeaturesProvider({ value, children }: { value?: Partial<SiteFeatures>; children: React.ReactNode }) {
  return <Ctx.Provider value={{ ...DEFAULTS, ...(value ?? {}) }}>{children}</Ctx.Provider>;
}

export function useSiteFeatures() {
  return useContext(Ctx);
}
