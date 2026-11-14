// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { setLangForTests } from "../lib/lang";
import { AiWordsCard, plainWords, type AiWordsAsk } from "./AiWordsCard";

// The page editor's words helper: what it offers for words and for a picture, and what it passes on.

afterEach(() => {
  cleanup();
  setLangForTests("ar");
});
const card = (over: Partial<Parameters<typeof AiWordsCard>[0]> = {}) => {
  const props = { kind: "heading" as const, lang: "en" as const, others: ["ar" as const], text: "Summer is here", status: "on" as const, busy: false, ask: vi.fn<AiWordsAsk>(async () => ["One", "Two", "Three"]), onPick: vi.fn(), onClose: vi.fn(), ...over };
  return { props, view: render(<AiWordsCard {...props} />) };
};

test("new words about something: asked, shown as options, and one is picked", async () => {
  setLangForTests("en");
  const { props } = card();
  // Nothing to write about yet.
  expect((screen.getByTestId("studio-ai-write") as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByTestId("studio-ai-about"), { target: { value: "  the summer sale " } });
  fireEvent.click(screen.getByTestId("studio-ai-write"));
  expect(props.ask).toHaveBeenCalledWith("write", { about: "the summer sale", to: undefined });
  expect(screen.getByTestId("studio-ai-working")).toBeTruthy();
  await waitFor(() => expect(screen.getAllByTestId("studio-ai-option")).toHaveLength(3));
  expect(screen.queryByTestId("studio-ai-working")).toBeNull();
  expect(screen.getByTestId("studio-ai-options").textContent).toContain("can be undone");
  fireEvent.click(screen.getAllByTestId("studio-ai-option")[1]);
  expect(props.onPick).toHaveBeenCalledWith("Two", "en");
  fireEvent.click(screen.getByTestId("studio-ai-close"));
  expect(props.onClose).toHaveBeenCalledTimes(1);
});

test("the words there are made better, shorter or longer, or put into another language", async () => {
  setLangForTests("en");
  const { props } = card();
  for (const action of ["improve", "shorter", "longer"] as const) {
    fireEvent.click(screen.getByTestId(`studio-ai-${action}`));
    expect(props.ask).toHaveBeenLastCalledWith(action, { about: undefined, to: undefined });
    await waitFor(() => expect(screen.getAllByTestId("studio-ai-option")).toHaveLength(3));
  }
  // A translation goes into the other language's words, and says so.
  expect((screen.getByTestId("studio-ai-to") as HTMLSelectElement).value).toBe("ar");
  fireEvent.click(screen.getByTestId("studio-ai-translate"));
  expect(props.ask).toHaveBeenLastCalledWith("translate", { about: undefined, to: "ar" });
  await waitFor(() => expect(screen.getByTestId("studio-ai-options").textContent).toContain("Arabic"));
  fireEvent.click(screen.getAllByTestId("studio-ai-option")[0]);
  expect(props.onPick).toHaveBeenCalledWith("One", "ar");
});

test("an empty element can only be written for; a shop with one language has no translation", () => {
  setLangForTests("en");
  card({ text: "<b> </b>", others: [] });
  for (const id of ["studio-ai-improve", "studio-ai-shorter", "studio-ai-longer"]) expect((screen.getByTestId(id) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByTestId("studio-ai-translate")).toBeNull();
  expect(screen.getByTestId("studio-ai-words").textContent).toContain("The element is empty");
  // Formatting's tags are not words.
  expect(plainWords("<b>Summer</b>&nbsp;is <i>here</i>")).toBe("Summer is here");
  expect(plainWords("  ")).toBe("");
});

test("a picture gets its description; what goes wrong is said", async () => {
  setLangForTests("en");
  const ask = vi.fn<AiWordsAsk>(async () => ["A red scarf on a table"]);
  const { props, view } = card({ kind: "picture", text: "", ask });
  expect(screen.queryByTestId("studio-ai-about")).toBeNull();
  fireEvent.click(screen.getByTestId("studio-ai-describe"));
  expect(ask).toHaveBeenCalledWith("describe", { about: undefined, to: undefined });
  await waitFor(() => expect(screen.getAllByTestId("studio-ai-option")).toHaveLength(1));
  fireEvent.click(screen.getByTestId("studio-ai-option"));
  expect(props.onPick).toHaveBeenCalledWith("A red scarf on a table", "en");
  // The API's own words when it refuses; a calm line when nothing comes back.
  const failing = vi.fn<AiWordsAsk>(async () => { throw new Error("The AI didn't answer, try again"); });
  view.rerender(<AiWordsCard {...props} ask={failing} />);
  fireEvent.click(screen.getByTestId("studio-ai-describe"));
  await waitFor(() => expect(screen.getByTestId("studio-ai-error").textContent).toBe("The AI didn't answer, try again"));
  expect(screen.queryByTestId("studio-ai-options")).toBeNull();
  view.rerender(<AiWordsCard {...props} ask={vi.fn<AiWordsAsk>(async () => [])} />);
  fireEvent.click(screen.getByTestId("studio-ai-describe"));
  await waitFor(() => expect(screen.getByTestId("studio-ai-error").textContent).toContain("try again"));
});

test("switched off, the card says where it is switched on, and offers nothing else", () => {
  setLangForTests("en");
  const { props, view } = card({ status: "off" });
  expect(screen.getByTestId("studio-ai-off").textContent).toContain("Page writer");
  expect(screen.getByTestId("studio-ai-settings").getAttribute("href")).toBe("/admin/ai");
  expect(screen.queryByTestId("studio-ai-write")).toBeNull();
  // Still being asked: nothing to press yet.
  view.rerender(<AiWordsCard {...props} status="wait" />);
  expect(screen.queryByTestId("studio-ai-off")).toBeNull();
  expect(screen.queryByTestId("studio-ai-write")).toBeNull();
});
