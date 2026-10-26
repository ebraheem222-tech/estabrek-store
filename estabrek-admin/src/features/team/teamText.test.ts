import { describe, expect, it } from "vitest";
import {
  describeActivity,
  describeDevice,
  describeFields,
  memberLinkUrl,
  relativeTime,
  togglePermission,
  whatsappUrl,
} from "./teamText";
import { permissionsOf } from "../../lib/authz";
import { firstAllowedPath } from "../../layouts/adminNav";

const groups = [
  { key: "orders", label: "الطلبات", permissions: [{ key: "orders:read", label: "" }, { key: "orders:write", label: "" }] },
  { key: "pages", label: "الصفحات", permissions: [{ key: "pages:read", label: "" }, { key: "pages:write", label: "" }, { key: "pages:publish", label: "" }] },
];

describe("team text", () => {
  it("says what happened in plain Arabic", () => {
    expect(describeActivity({ area: "orders", verb: "action", path: "/orders/:id/status", method: "POST" })).toBe("غيّر حالة طلب");
    expect(describeActivity({ area: "catalog", verb: "update", path: "/catalog/products/:id", method: "PATCH" })).toBe("عدّل في المنتجات");
    expect(describeActivity({ area: "uploads", verb: "delete", path: "/uploads/:id", method: "DELETE" })).toBe("حذف ملف من الوسائط");
    expect(describeActivity({ area: "x-new", verb: "create", path: "/x-new", method: "POST" })).toBe("أضاف في x-new");
  });

  it("lists field names briefly", () => {
    expect(describeFields(["a", "b"])).toBe("a، b");
    expect(describeFields(["a", "b", "c", "d", "e", "f"])).toBe("a، b، c، d و2 غيرها");
    expect(describeFields([])).toBe("");
  });

  it("recognises common devices", () => {
    expect(describeDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36")).toBe("Chrome · Windows");
    expect(describeDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1")).toBe("Safari · iPhone");
    expect(describeDevice("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36 EdgA/1 Edg/130")).toBe("Edge · Android");
    expect(describeDevice(null)).toBe("جهاز غير معروف");
  });

  it("builds invite and reset links", () => {
    expect(memberLinkUrl("https://admin.test/", "abc.def", "invite")).toBe("https://admin.test/login/reset?token=abc.def&invite=1");
    expect(memberLinkUrl("https://admin.test", "abc.def", "reset")).toBe("https://admin.test/login/reset?token=abc.def");
    expect(whatsappUrl("hi there", "+972 54-123")).toBe("https://wa.me/97254123?text=hi%20there");
  });

  it("ticking write also ticks read; unticking read clears the area", () => {
    let s = togglePermission(new Set(), "pages:publish", true, groups);
    expect([...s].sort()).toEqual(["pages:publish", "pages:read"]);
    s = togglePermission(s, "pages:write", true, groups);
    s = togglePermission(s, "pages:read", false, groups);
    expect([...s]).toEqual([]);
  });

  it("relative times", () => {
    const now = Date.parse("2026-10-07T12:00:00Z");
    expect(relativeTime(null)).toBe("لم يدخل بعد");
    expect(relativeTime("2026-10-07T11:50:00Z", now)).toBe("قبل 10 دقيقة");
    expect(relativeTime("2026-10-06T11:00:00Z", now)).toBe("أمس");
  });
});

describe("permissions from the server", () => {
  it("owner has everything; a member has exactly what the server sent", () => {
    expect(permissionsOf({ role: "SUPERADMIN" })).toContain("staff:write");
    const m = permissionsOf({ role: "STAFF", owner: false, permissions: ["orders:read", "unknown:thing", "account:read"] });
    expect(m.sort()).toEqual(["account:read", "orders:read"]);
    expect(permissionsOf({ role: "STAFF" })).toEqual(expect.arrayContaining(["account:read"]));
    expect(permissionsOf({ role: "STAFF" })).not.toContain("orders:read");
  });

  it("a member without the dashboard lands on the first page they may open", () => {
    const has = (p: string) => ["orders:read", "account:read"].includes(p);
    expect(firstAllowedPath(has as any)).toBe("/admin/orders");
    expect(firstAllowedPath((() => false) as any)).toBe("/admin/account/profile");
  });
});
