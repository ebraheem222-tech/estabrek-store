import { describe, expect, it } from "vitest";
import { fieldLabel, nodeName, sectionLabel } from "./treeIndex";

describe("names in the editor", () => {
  it("calls fields and old sections by what they are", () => {
    expect(fieldLabel("roseTitle")).toBe("العنوان الكبير");
    expect(fieldLabel("primaryButton.label")).toBe("الزر الأول");
    expect(fieldLabel("items.2.question")).toBe("سؤال 3");
    expect(fieldLabel("somethingNew")).toBe("somethingNew");
    expect(sectionLabel("HERO")).toBe("الافتتاح");
    expect(nodeName({ id: "s-1", type: "legacy", props: { sectionId: "1" } }, "FAQ")).toBe("أسئلة شائعة");
  });
});
