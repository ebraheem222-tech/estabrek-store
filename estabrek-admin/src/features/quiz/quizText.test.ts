import { describe, expect, it } from "vitest";
import { chanceSteps, scheduleText } from "./quizText";

describe("quiz text", () => {
  it("shows who gets a chance", () => {
    expect(scheduleText(2)).toBe("1، 3، 7، 15، 31، 63…");
    expect(scheduleText(3, 4)).toBe("1، 4، 13، 40…");
  });
  it("shows the shrinking odds", () => {
    expect(chanceSteps(20, 2)).toEqual(["20%", "10%", "5%", "2.5%"]);
  });
});
