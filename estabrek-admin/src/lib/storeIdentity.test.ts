import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { cleanIdentity, identityOf, identityProblem, markOf, storeHost, storeNameOf } from "./storeIdentity";
import { currencySign, money, setStoreCurrency, storeCurrency } from "./money";
import { buildMessage, moneyText } from "./orders";
import { askText } from "../features/requests/requestsText";

const order = { id: "cmabcdef123456", customerName: "سارة أحمد", phone: "0544204029", status: "NEW", createdAt: "", total: 240, items: [{ productTitle: "فستان", quantity: 1 }] };

describe("Store identity", () => {
  it("reads what was saved and keeps broken parts out", () => {
    const id = identityOf({ identity: { name: { ar: "متجر نور", en: "Noor" }, shortName: { ar: "نور" }, industry: "phones", audience: "men", legalName: 7 } });
    expect(id).toMatchObject({ name: { ar: "متجر نور", en: "Noor", he: "" }, shortName: { ar: "نور", en: "", he: "" }, industry: "phones", audience: "men", legalName: "" });
    expect(identityOf(null)).toMatchObject({ industry: "general", audience: "everyone" });
    expect(identityOf({ identity: { industry: "spaceships" } }).industry).toBe("general");
  });

  it("the store's name: its own, else the site name, else a plain word", () => {
    expect(storeNameOf({ siteName: "متجر استبرق", header: {} })).toBe("متجر استبرق");
    expect(storeNameOf({ siteName: "x", header: { identity: { name: { ar: "متجر نور" } } } })).toBe("متجر نور");
    expect(storeNameOf({ siteName: "My Store", header: null })).toBe("المتجر");
    expect(markOf({ siteName: "x", header: { identity: { name: { ar: "متجر نور" }, shortName: { ar: "نور" } } } })).toBe("نور");
    expect(storeHost("https://shop.example.com/")).toBe("shop.example.com");
    expect(storeHost("")).toBe("");
  });

  it("needs a name in one language; trims before saving", () => {
    const id = identityOf({});
    expect(identityProblem(id)).toContain("اسم المتجر");
    expect(identityProblem({ ...id, name: { ar: "", en: "Noor", he: "" } })).toBeNull();
    expect(cleanIdentity({ ...id, name: { ar: "  نور ", en: "", he: "" } }).name.ar).toBe("نور");
  });
});

describe("Prices in the store's currency", () => {
  afterEach(() => setStoreCurrency("ILS"));

  it("₪ by default, the store's sign once set", () => {
    expect(money(189)).toBe("₪189");
    expect(money(12.5)).toBe("₪12.50");
    expect(moneyText("240")).toBe("₪240");
    setStoreCurrency("usd");
    expect(storeCurrency()).toBe("USD");
    expect(money(189)).toBe("$189");
    setStoreCurrency("JOD");
    expect(money(189)).toBe("189 د.أ");
    expect(currencySign("XYZ")).toBe("XYZ");
    setStoreCurrency("nonsense");
    expect(storeCurrency()).toBe("JOD");
  });
});

describe("Messages to shoppers in the store's voice", () => {
  it("a shop for women keeps its words; any other speaks to everyone", () => {
    const her = buildMessage("confirm", order, { storeName: "متجر استبرق", audience: "women" });
    expect(her).toContain("أهلاً سارة 🌸");
    expect(her).toContain("وصلنا طلبكِ رقم");
    expect(her).toContain("من متجر استبرق");
    const all = buildMessage("confirm", order, { storeName: "متجر نور", audience: "everyone" });
    expect(all).toContain("أهلاً سارة 👋");
    expect(all).toContain("وصلنا طلبك رقم");
    expect(all).not.toMatch(/كِ|استبرق|🌸/);
    for (const kind of ["accepted", "shipped", "delivered", "unavailable", "canceled", "thanks"] as const) {
      expect(buildMessage(kind, order, { storeName: "متجر نور", audience: "men" }), kind).not.toMatch(/كِ|تِ\b|استبرق/);
    }
    expect(buildMessage("thanks", order, {})).not.toContain("استبرق");
  });

  it("a request's opener carries the store's name", () => {
    expect(askText("سارة أحمد", "CALLBACK", { storeName: "متجر استبرق", audience: "women" })).toBe("مرحباً سارة 🌸 معكِ متجر استبرق، طلبتِ نساعدكِ بطلبيتكِ. كيف فينا نساعدكِ؟");
    expect(askText("خالد", "SIZE", { storeName: "متجر نور", audience: "men" })).toBe("مرحباً خالد 👋 معك متجر نور، وصلنا طلبك وعم ندوّرلك عليه.");
  });
});

// The admin is the store's own panel: the platform's name may appear only where the
// platform speaks (its sign-in, sidebar, launcher). Everything a store sends or shows
// to its shoppers uses the store's name.
describe("No platform name in what a store sends", () => {
  const src = path.resolve(__dirname, "..");
  const allowed = [/components[\\/]Sidebar\.tsx$/, /layouts[\\/]AuthLayout\.tsx$/, /config[\\/]env\.ts$/, /system[\\/]VaultPage\.tsx$/, /\.test\.tsx?$/];
  const files: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name) && !allowed.some((r) => r.test(p))) files.push(p);
    }
  };
  walk(src);

  it("no «استبرق» / Estabrek in strings", () => {
    const hits: string[] = [];
    for (const f of files) {
      fs.readFileSync(f, "utf8").split(/\r?\n/).forEach((line, i) => {
        const code = line.replace(/\/\*.*?\*\//g, "").replace(/(^|[^:])\/\/.*$/, "$1").replace(/^\s*\*.*$/, "");
        for (const m of code.matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/g)) {
          if (/استبرق|Estabrek|ESTABREK/.test(m[2])) hits.push(`${path.relative(src, f)}:${i + 1}: ${m[2].slice(0, 80)}`);
        }
      });
    }
    expect(hits).toEqual([]);
  });
});
