import { test, expect } from "@playwright/test";
import { markPaths } from "../src/pageTree/ProWidgets";

// The pro widgets in the shop (tests/catalog-server.mjs /pro-widgets-demo, an Arabic page read right to left): the
// page's own contents, moving headlines, a flip card, share buttons, a reading bar, each visitor's own countdown, a
// menu link's own links, a drawer, a time to show, and a popup after the shopper does nothing.
test.describe("pro widgets", () => {
  test.beforeEach(async ({ page, context }) => {
    // This PC's Chrome asks for less motion; these widgets move only when it doesn't.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test("a table of contents over the page's own headings, the one being read lit up, with a reading bar", async ({ page }) => {
    await page.goto("/pro-widgets-demo");
    const toc = page.locator('[data-tree-node="toc"] nav');
    await expect(toc).toHaveAttribute("aria-label", "بهالصفحة");
    // Its headings in order (h2 and h3: the two headlines by their first words, then the page's own), each given an address.
    const links = toc.locator("a");
    await expect(links).toHaveText(["قطع ناعمة", "لكل يوم", "القماش", "العناية", "التوصيل"]);
    await expect(toc.locator("li.pt-tc-l1")).toHaveCount(2);
    expect(await page.locator('[data-tree-node="h-c"]').getAttribute("id")).toBe("pt-h-التوصيل");
    // Pressed: down to it, its address in the bar, and lit up as the one being read.
    await links.nth(4).click();
    await expect(links.nth(4)).toHaveAttribute("aria-current", "location");
    await expect.poll(() => page.evaluate(() => decodeURIComponent(location.hash))).toBe("#pt-h-التوصيل");
    await expect.poll(() => page.locator('[data-tree-node="h-c"]').evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBeLessThan(200);
    // The reading bar along the window's top (on the body), filled as far as the page is read.
    const bar = page.locator("body > .pt-read-bar.pt-read-top");
    await expect(bar).toHaveCount(1);
    expect(await bar.evaluate((el) => [getComputedStyle(el).position, getComputedStyle(el).height].join("|"))).toBe("fixed|6px");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => bar.evaluate((el) => Number(el.style.getPropertyValue("--pt-read")))).toBeGreaterThan(0.98);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => bar.evaluate((el) => Number(el.style.getPropertyValue("--pt-read")))).toBeLessThan(0.02);
  });

  test("moving headlines: words taking turns, a word with a line drawn round it; both read out whole", async ({ page }) => {
    await page.goto("/pro-widgets-demo");
    const rotate = page.locator('[data-tree-node="hl-rotate"]');
    await expect(rotate).toHaveJSProperty("tagName", "H2");
    await expect(rotate.locator(".pt-sr")).toHaveText("قطع ناعمة / أنيقة");
    await expect(rotate.locator(".pt-hl-w-on")).toHaveText("ناعمة");
    await expect(rotate.locator(".pt-hl-w-on")).toHaveText("أنيقة", { timeout: 4000 });
    const mark = page.locator('[data-tree-node="hl-mark"]');
    await expect(mark).toHaveJSProperty("tagName", "H3");
    await expect(mark.locator(".pt-hl-mark")).toHaveClass(/pt-hl-on/);
    await expect(mark.locator(".pt-hl-mark path")).toHaveCount(1);
    await expect.poll(() => mark.locator(".pt-hl-mark path").evaluate((el) => Number(getComputedStyle(el).strokeDashoffset.replace("px", "")))).toBeLessThan(0.05);
    // The shapes are lines of our own on the word's box.
    for (const shape of ["circle", "underline", "curly", "double", "strike", "cross", "zigzag", "box", "swoosh"]) expect(markPaths(shape).every((d) => /^M[\d.,\s LCQHVZ-]+$/.test(d)), shape).toBe(true);
  });

  test("a flip card shows its back under the mouse; share buttons send the page or copy it", async ({ page }) => {
    await page.goto("/pro-widgets-demo");
    const flip = page.locator('[data-tree-node="flip"]');
    const back = flip.locator(".pt-flip-back");
    expect(await back.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
    await flip.hover();
    await expect.poll(() => back.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    await expect(back.locator("a")).toHaveAttribute("href", "/shop");
    // Share: each network's own address with the page and the words; the link copied.
    const share = page.locator('[data-tree-node="shr"] .pt-shr');
    await expect(share).toHaveAttribute("aria-label", "شارك");
    await expect(share.locator(".pt-shr-whatsapp")).toHaveText("واتساب");
    await page.evaluate(() => { (window as unknown as { opened: string[] }).opened = []; window.open = ((u: string) => { (window as unknown as { opened: string[] }).opened.push(String(u)); return null; }) as typeof window.open; });
    await share.locator(".pt-shr-whatsapp").click();
    await share.locator(".pt-shr-facebook").click();
    const opened = await page.evaluate(() => (window as unknown as { opened: string[] }).opened);
    const here = new URL(page.url()).toString();
    expect(opened[0]).toBe(`https://wa.me/?text=${encodeURIComponent(`شوفي هالقطعة ${here}`)}`);
    expect(opened[1]).toBe(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(here)}`);
    await share.locator(".pt-shr-copy").click();
    await expect(share.locator(".pt-shr-copy")).toHaveText("انتسخ الرابط!");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(here);
  });

  test("each visitor's own countdown, kept across a reload; a menu link opens its own links; a time to show", async ({ page }) => {
    await page.goto("/pro-widgets-demo");
    const count = page.locator('[data-tree-node="cd-me"] .pt-count-n');
    await expect.poll(() => count.first().innerText()).not.toBe("--");
    // Ninety minutes: no days, an hour, 29 or 30 minutes.
    expect(await count.allInnerTexts()).toEqual(expect.arrayContaining(["00", "01"]));
    expect(["29", "30"]).toContain(await count.nth(2).innerText());
    const kept = await page.evaluate(() => localStorage.getItem("pt-cd-cd-me"));
    expect(Number(kept)).toBeGreaterThan(Date.now());
    await page.reload();
    await expect.poll(() => count.first().innerText()).not.toBe("--");
    expect(await page.evaluate(() => localStorage.getItem("pt-cd-cd-me"))).toBe(kept);
    // The menu link's own links: out of sight until the mouse comes over it, each with its line of words.
    const nav = page.locator('[data-tree-node="nav"]');
    const sub = nav.locator(":scope > .pt-menu-list .pt-menu-sub");
    await expect(sub).toBeHidden();
    await nav.locator(":scope > .pt-menu-list > li.pt-menu-has > a").hover();
    await expect(sub).toBeVisible();
    await expect(sub.locator("a")).toHaveAttribute("href", "/shop?sort=new");
    await expect(sub.locator("small")).toHaveText("آخر ما نزل");
    // A time to show: only the one whose time it is now.
    await expect(page.locator('[data-tree-node="now"]')).toBeVisible();
    await expect(page.locator('[data-tree-node="soon"]')).toBeHidden();
    await expect(page.locator('[data-tree-node="over"]')).toBeHidden();
  });

  test("a drawer from the page's end side (the left, right to left), its full height", async ({ page }) => {
    await page.goto("/pro-widgets-demo");
    await page.locator('[data-tree-node="open-drawer"]').click();
    const drawer = page.locator('[data-tree-node="drawer"] dialog');
    await expect(drawer).toHaveAttribute("open", "");
    await expect.poll(() => drawer.evaluate((d) => { const r = d.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.height), Math.round(r.width)].join(","); })).toBe("0,0,900,320");
    await page.keyboard.press("Escape");
    await expect(drawer).not.toHaveAttribute("open", "");
  });

  test("a popup after the shopper does nothing for a while; doing something starts the wait over", async ({ page }) => {
    await page.goto("/pro-idle-demo");
    const idle = page.locator('[data-tree-node="idle"] dialog');
    await page.waitForTimeout(3500);
    await page.mouse.move(200, 200);
    await page.waitForTimeout(3000);
    await expect(idle).not.toHaveAttribute("open", "");
    await expect(idle).toHaveAttribute("open", "", { timeout: 4000 });
  });
});
