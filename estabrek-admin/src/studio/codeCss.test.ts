import { expect, test } from "vitest";
import { buildCode, classesOf, ownTailwind, tailwindFor } from "./codeCss";
import { cssProblem } from "../../../shared/cssCode";

test("Tailwind classes become the element's own rules: states, screens and dark nested, its theme on itself", async () => {
  const r = await tailwindFor("rounded-xl bg-rose-500 px-4 hover:scale-105 md:px-8 shadow-lg dark:bg-black", "btn");
  expect(r.error).toBeUndefined();
  const out = r.out!;
  expect(out.startsWith(".pt-btn{")).toBe(true);
  expect(out).toContain("--color-rose-500:");
  expect(out).toContain("--tw-shadow: 0 0 #0000");
  expect(out).toContain("&:hover");
  expect(out).toContain("@media (width >= 48rem)");
  expect(out).not.toMatch(/:root|@layer|@property/);
  expect(cssProblem(out, "btn")).toBeNull();
});

test("an unknown class or a word that could close a rule is refused", async () => {
  expect((await tailwindFor("rounded-xl not-a-class", "btn")).error).toBe("unknown:not-a-class");
  expect(classesOf("p-4 } body {")).toBeNull();
  expect((await tailwindFor("p-4;", "btn")).error).toBe("bad");
});

test("written CSS is wrapped in the element's own class and checked; it comes after Tailwind's, so it wins", async () => {
  const r = await buildCode({ tw: "p-2", css: "color: #8b1538;\n&:hover { color: red; }" }, "btn");
  expect(r.out!.endsWith(".pt-btn{color: #8b1538;\n&:hover { color: red; }}")).toBe(true);
  expect((await buildCode({ css: "} body { display: none" }, "btn")).error).toMatch(/^css:/);
  expect((await buildCode({ css: "background: url(https://x.example/a.png)" }, "btn")).error).toBe("css:url");
  expect(ownTailwind("/* x */ .pt-a { color: red; }", "a")).toBe(".pt-a{color: red;}");
});
