import { expect, test } from "@playwright/test";
import { storeThemeOf } from "../src/storeThemes";
import { TEMPLATE_THEMES } from "../src/storeThemes/kits/themes";
import { cinematicEnabled } from "../src/storeThemes/snapshot";
import { importDesign } from "../src/storeThemes/kits/importDesign";

test("a customer's copied theme works without its source template and stays separate", () => {
  const snapshot = structuredClone(TEMPLATE_THEMES[0]);
  snapshot.id = "customer-design";
  snapshot.palettes.light!.bg = "#e0f2f1";
  const header = { storeDesign: { version: 1, mode: "cms" }, storeTheme: { id: "source-template-no-longer-installed", mode: "light", snapshot } };
  const found = storeThemeOf(header);
  expect(found?.theme.id).toBe("customer-design");
  expect(found?.theme.palettes.light?.bg).toBe("#e0f2f1");
  expect(TEMPLATE_THEMES[0].palettes.light?.bg).not.toBe("#e0f2f1");
  expect(cinematicEnabled(header)).toBe(false);
  expect(cinematicEnabled({ identity: { industry: "fashion", audience: "women" } })).toBe(true);
});

test("template import includes copied editable header and footer and a theme snapshot", async ({ request }) => {
  for (const id of ["fashion-quiet", "electronics-lab", "blank"]) {
    const response = await request.get(`/api/templates/${id}`);
    expect(response.ok(), id).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty("design.theme.palettes.light");
    expect(data.design.header.root.children.length).toBeGreaterThan(0);
    expect(data.design.footer.root.children.length).toBeGreaterThan(0);
    expect(data.sections.length).toBeGreaterThan(0);
    const flatten = (nodes: any[]): any[] => nodes.flatMap((n) => [n, ...flatten(n.children ?? [])]);
    expect(flatten(data.design.header.root.children).some((n) => n.type === "button" && n.props.href === "/cart"), id).toBe(true);
    expect(flatten(data.design.footer.root.children).filter((n) => n.type === "button").some((n) => n.props.href === "/contact"), id).toBe(true);
  }
});

test("a customer's live site uses its editable home and global regions without Estabrek chrome", async ({ page, request }) => {
  const imported = importDesign("fashion-quiet")!;
  const own = JSON.parse(JSON.stringify(imported).replaceAll("{{store.name}}", "Paper Shop"));
  own.design.theme.id = "customer-design";
  const prefix = (tree: any, region: string) => {
    let i = 0;
    const walk = (n: any): any => ({ ...n, id: `${region}_${i++}`, ...(n.children ? { children: n.children.map(walk) } : {}) });
    return { ...tree, root: walk(tree.root) };
  };
  const data = { name: "Paper Shop", theme: own.design.theme, regions: { header: prefix(own.design.header, "header"), footer: prefix(own.design.footer, "footer") }, page: { id: "owned-home", name: "My page", slug: "/", status: "PUBLISHED", format: 2, sections: [], tree: { version: 1, root: { id: "page", type: "page", props: {}, children: own.sections } } } };
  try {
    await request.post("http://127.0.0.1:4100/__test/owned-design", { data });
    await request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages"], paths: ["/", "/shop"] } });
    await page.goto("/en");
    await expect(page.locator("[data-store-design-region=header]")).toContainText("Paper Shop");
    await expect(page.locator("[data-store-design-region=footer]")).toContainText("Paper Shop");
    await expect(page.locator("h1").first()).toContainText("Wear your own story");
    await expect(page.locator(".cinematic-shell, .atelier-header, .rose-home")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("data-store-theme", "customer-design");
    const ids = await page.locator("[data-tree-node]").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-tree-node")));
    expect(new Set(ids).size).toBe(ids.length);
    await page.goto("/en/shop");
    await expect(page.locator("[data-store-design-region=header]")).toContainText("Paper Shop");
    await expect(page.locator(".atelier-header, .cinematic-shell")).toHaveCount(0);
    await page.screenshot({ path: "../.tmp/customer-own-design.png" });
    const custom = encodeURIComponent(JSON.stringify({ palette: { light: { bg: "#e0f2f1", ink: "#10201f", strong: "#004d40" } } }));
    await page.goto(`/en/shop?storeTheme=customer-design&themeMode=light&themeCustom=${custom}`);
    await expect(page.locator("[data-store-design-region=header] [data-page-store-theme]")).toHaveCSS("background-color", "rgb(224, 242, 241)");
    // A loading boundary may commit a page after the persistent layout's effects ran.
    await page.evaluate(() => {
      const root = document.createElement("div");
      root.dataset.pageTreeRoot = "";
      const node = document.createElement("div");
      node.dataset.treeNode = "late-motion";
      node.dataset.ptMotion = JSON.stringify({ hover: { kind: "spotlight" } });
      node.textContent = "Late document";
      root.append(node);
      document.body.append(root);
    });
    await expect.poll(() => page.locator('[data-tree-node="late-motion"]').evaluate((node) => {
      node.dispatchEvent(new PointerEvent("pointermove", { clientX: 40, clientY: 40 }));
      return (node as HTMLElement).style.getPropertyValue("--pt-sx");
    })).not.toBe("");
    await request.post("http://127.0.0.1:4100/__test/owned-design", { data: { removeHome: true } });
    await request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages"], paths: ["/"] } });
    const missing = await page.goto("/en");
    expect([200, 404]).toContain(missing?.status()); // Next can stream its not-found UI with HTTP 200.
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.locator(".cinematic-shell, .atelier-header, img[src*=hijab-campaign]")).toHaveCount(0);
  } finally {
    await request.post("http://127.0.0.1:4100/__test/owned-design", { data: {} });
    await request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages"], paths: ["/", "/shop"] } });
  }
});
