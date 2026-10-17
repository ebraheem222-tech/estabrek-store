import { describe, expect, it } from "vitest";
import type { TrafficConfig, TrafficLimits } from "../../api/speed.api";
import {
  describeTrafficField,
  indexWhyText,
  isValidMatch,
  loopStatus,
  msText,
  poolAdvice,
  rowsText,
  ruleForRoute,
  speedChangedPaths,
  speedOutOfRange,
  speedPatch,
  threadsAdvice,
  upsertRule,
} from "./speedText";

const lane = (limit: number, weight: number) => ({ limit, queue: 100, waitMs: 8000, weight });
const base: TrafficConfig = {
  mode: "watch",
  globalLimit: 96,
  slowMs: 1000,
  lanes: { critical: lane(32, 8), admin: lane(16, 4), normal: lane(48, 4), heavy: lane(3, 1) },
  routes: [],
};
const limits: TrafficLimits = {
  limit: { min: 1, max: 500 },
  queue: { min: 0, max: 5000 },
  waitMs: { min: 100, max: 60000 },
  weight: { min: 1, max: 20 },
  globalLimit: { min: 4, max: 2000 },
  slowMs: { min: 100, max: 60000 },
};
const edit = (f: (c: TrafficConfig) => void) => {
  const c: TrafficConfig = JSON.parse(JSON.stringify(base));
  f(c);
  return c;
};

describe("speed monitor words", () => {
  it("sends only what changed and names it", () => {
    const draft = edit((c) => {
      c.mode = "on";
      c.lanes.heavy.limit = 2;
      c.routes = [{ match: "/v1/ai", lane: "heavy" }];
    });
    expect(speedPatch(draft, base)).toEqual({ mode: "on", lanes: { heavy: { limit: 2 } }, routes: [{ match: "/v1/ai", lane: "heavy" }] });
    expect(speedChangedPaths(draft, base)).toEqual(["traffic.mode", "traffic.routes", "traffic.lanes.heavy.limit"]);
    expect(describeTrafficField("traffic.lanes.heavy.limit")).toBe("شغل تقيل: الحد");
    expect(describeTrafficField("traffic.mode")).toBe("تشغيل المسارات");
    expect(describeTrafficField("cache.x")).toBeNull();
  });

  it("finds values out of range", () => {
    expect(speedOutOfRange(edit((c) => ((c.lanes.normal.weight = 0), (c.slowMs = 50))), limits)).toEqual(["traffic.slowMs", "traffic.lanes.normal.weight"]);
    expect(speedOutOfRange(base, limits)).toEqual([]);
  });

  it("moves a route with a rule; rules replace each other", () => {
    expect(ruleForRoute("GET /v1/catalog/products/:id", "heavy")).toEqual({ match: "GET /v1/catalog/products", lane: "heavy" });
    expect(ruleForRoute("POST /v1/storefront/search/image", "normal")).toEqual({ match: "POST /v1/storefront/search/image", lane: "normal" });
    const once = upsertRule([], { match: "/v1/ai", lane: "heavy" });
    expect(upsertRule(once, { match: "/v1/ai", lane: "normal" })).toEqual([{ match: "/v1/ai", lane: "normal" }]);
    expect(isValidMatch("GET /v1/x")).toBe(true);
    expect(isValidMatch("/v1/x")).toBe(true);
    expect(isValidMatch("v1/x")).toBe(false);
    expect(isValidMatch("FETCH /v1")).toBe(false);
  });

  it("health in words", () => {
    expect(loopStatus(12).variant).toBe("success");
    expect(loopStatus(120).variant).toBe("warning");
    expect(loopStatus(900).variant).toBe("danger");
    expect(msText(450)).toBe("450 ms");
    expect(msText(2300)).toBe("2.3 ث");
    expect(poolAdvice({ limit: 5, fromUrl: false })).toContain("connection_limit");
    expect(poolAdvice({ limit: 12, fromUrl: true })).toBeNull();
    expect(threadsAdvice({ size: 4, fromEnv: false })).toContain("UV_THREADPOOL_SIZE=8");
    expect(threadsAdvice({ size: 8, fromEnv: true })).toBeNull();
  });
});

describe("Index suggestions", () => {
  it("say why and how big the table is", () => {
    expect(indexWhyText({ why: "filter", table: "OutboxMessage", columns: ["status", "createdAt"] })).toContain("فهرس على status وcreatedAt بيحلّها");
    expect(indexWhyText({ why: "order", table: "Order", columns: ["createdAt"] })).toContain("بيرتّب الجدول كله");
    expect(rowsText(null)).toBe("حجم الجدول مش معروف");
    expect(rowsText(850)).toBe("850 سطر");
    expect(rowsText(48_200)).toBe("حوالي 48 ألف سطر");
    expect(rowsText(2_340_000)).toBe("حوالي 2.3 مليون سطر");
  });
});
