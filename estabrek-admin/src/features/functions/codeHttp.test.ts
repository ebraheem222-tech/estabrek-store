import { afterEach, describe, expect, test } from "vitest";
import { setLangForTests } from "../../lib/lang";
import { codeNote, failText, lineText } from "./fnText";

// A code step that calls sites (http() and secret() in the cage): the words the page says about it.
// The cage and the calls are tested on the server (backend fnCodeHttp.spec.ts).

afterEach(() => setLangForTests("ar"));

describe("A code step's calls, in the page's words", () => {
  test("its note says what it may reach, and how a secret is named", () => {
    expect(codeNote(undefined, "en")).toContain('It reaches an allowed site with http.get(url) or http.post(url, body, { headers }), and names a secret as secret("NAME")');
    expect(codeNote(undefined, "en")).toContain("Waiting for a site isn't counted. At most 2 seconds and 32 MB, and no await.");
    expect(codeNote(undefined, "ar")).toContain('السر بيكتبه secret("NAME")');
    expect(codeNote(undefined, "he")).toContain("ההמתנה לאתר לא נספרת");
  });

  test("what a call couldn't do, thrown in the code: the server's words in the page's language, with the code's line", () => {
    expect(failText("A code step calls sites up to 5 times", "ar")).toBe("خطوة الكود بتتصل بمواقع 5 مرات بالكتير");
    expect(failText("A code step calls sites up to 5 times (line 4)", "ar")).toBe("خطوة الكود بتتصل بمواقع 5 مرات بالكتير (السطر 4)");
    expect(failText('"evil.example.org" isn\'t among the allowed sites (line 2)', "en")).toBe("“evil.example.org” isn't among the allowed sites (line 2)");
    expect(failText('The secret "OTHER" isn\'t for "api.example.com" (line 1)', "ar")).toBe("السر «OTHER» مش لـ «api.example.com» (السطر 1)");
    expect(failText("http(method, …): GET, POST, PUT, PATCH or DELETE (line 3)", "he")).toBe("http(method, …): ה-method הוא GET, POST, PUT, PATCH או DELETE (שורה 3)");
    expect(failText('secret("NAME") takes a secret\'s name: letters, digits and _', "ar")).toBe('secret("NAME") بياخد اسم سر: أحرف وأرقام و _');
    expect(failText("The call didn't come back in time", "en")).toBe("The call didn't come back in time");
    expect(failText("The address starts with https:// (line 1)", "ar")).toBe("العنوان لازم يبلّش بـ https:// (السطر 1)");
    // What the code itself threw stays as it threw it, its line too.
    expect(failText("Order 9 is closed (line 7)", "ar")).toBe("Order 9 is closed (line 7)");
    expect(lineText({ ok: false, error: "Calling a site isn't open here" }, "ar")).toBe("الاتصال بموقع مش مفتوح هون");
  });
});
