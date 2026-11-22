// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { setLangForTests } from "../lib/lang";
import { SettingMarks } from "./SettingMarks";
import { marksOf } from "./settingMarksOf";
import type { PageTreeNode } from "../api/pages.api";

// A whole site's element tied to its site's settings (sites wave 1): the editor says what the shop does with it,
// and the owner may untie it (one step, with undo).

afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

const node = (props: Record<string, unknown>): PageTreeNode => ({ id: "t1", type: "text", props: { text: { en: "Closed on holidays" }, ...props } }) as PageTreeNode;

test("an element with no marks says nothing", () => {
  render(<SettingMarks node={node({})} busy={false} onOps={vi.fn()} />);
  expect(screen.queryByTestId("studio-setting-marks")).toBeNull();
  expect(marksOf(node({ showIf: "x", fromSetting: { text: 3 } }))).toEqual({ showIf: null, fromSetting: {} });
});

test("shown by a switch, words from a setting: said in words, and each untied on its own", () => {
  setLangForTests("en");
  const onOps = vi.fn();
  render(<SettingMarks node={node({ showIf: { setting: "bookingOpen", is: false }, fromSetting: { text: "bookingClosed" } })} busy={false} onOps={onOps} />);
  expect(screen.getByTestId("studio-setting-show").textContent).toContain("only while the site's setting «bookingOpen» is off");
  expect(screen.getByTestId("studio-setting-words").textContent).toContain("«bookingClosed»");
  fireEvent.click(screen.getByTestId("studio-setting-words-untie"));
  expect(onOps).toHaveBeenCalledWith(expect.any(String), [{ op: "setProps", nodeId: "t1", props: { text: { en: "Closed on holidays" }, showIf: { setting: "bookingOpen", is: false } } }]);
  fireEvent.click(screen.getByTestId("studio-setting-show-untie"));
  expect(onOps.mock.calls[1][1][0].props).toEqual({ text: { en: "Closed on holidays" }, fromSetting: { text: "bookingClosed" } });
});

test("a switch that is on, and a choice", () => {
  setLangForTests("en");
  const { rerender } = render(<SettingMarks node={node({ showIf: { setting: "noticeOn" } })} busy={false} onOps={vi.fn()} />);
  expect(screen.getByTestId("studio-setting-show").textContent).toContain("«noticeOn» is on");
  rerender(<SettingMarks node={node({ showIf: { setting: "mood", is: "calm" } })} busy={false} onOps={vi.fn()} />);
  expect(screen.getByTestId("studio-setting-show").textContent).toContain("«mood» is “calm”");
});
