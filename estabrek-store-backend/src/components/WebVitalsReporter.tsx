"use client";

import { useEffect } from "react";
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from "web-vitals";

type RumPayload = {
  name: string;
  value: number;
  rating: string;
  delta: number;
  id: string;
  navigationType?: string;
  url: string;
  ua: string;
  screen: { w: number; h: number; dpr: number };
  connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
  ts: number;
};

function sendToRum(metric: Metric) {
  try {
    const nav = metric.navigationType;
    const connection = (navigator as any).connection;
    const payload: RumPayload = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: nav,
      url: window.location.href,
      ua: navigator.userAgent,
      screen: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 },
      connection: connection
        ? {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData,
          }
        : undefined,
      ts: Date.now(),
    };

    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/rum", blob);
    } else {
      fetch("/api/rum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    // ignore
  }
}

export function WebVitalsReporter() {
  useEffect(() => {
    onCLS(sendToRum);
    onINP(sendToRum);
    onLCP(sendToRum);
    onFCP(sendToRum);
    onTTFB(sendToRum);
  }, []);

  return null;
}
