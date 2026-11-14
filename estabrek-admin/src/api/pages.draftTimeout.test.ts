import { expect, test, vi } from "vitest";

vi.mock("./http", () => ({
  api: {
    get: vi.fn(async () => ({ data: { draft: null, main: "ar" } })),
    post: vi.fn(async () => ({ data: { draft: { rev: 1 } } })),
  },
}));

import { api } from "./http";
import { DRAFT_TIMEOUT_MS, changePageDraft, getPageDraft } from "./pages.api";

// The editor is busy while a draft request is out. A request the API never answers must end by itself, or nothing
// in the editor can be moved again until the page is reloaded.

test("the editor's draft requests give up after a while instead of waiting for ever", async () => {
  await changePageDraft("page-1", [], 3);
  const post = vi.mocked(api.post).mock.lastCall!;
  expect(post[1]).toEqual({ ops: [], rev: 3 });
  expect(post[2]).toEqual({ timeout: DRAFT_TIMEOUT_MS });

  await getPageDraft("page-1");
  expect(vi.mocked(api.get).mock.lastCall![1]).toEqual({ timeout: DRAFT_TIMEOUT_MS });

  // Long enough for a slow save, short enough to be waited out.
  expect(DRAFT_TIMEOUT_MS).toBeGreaterThanOrEqual(15_000);
  expect(DRAFT_TIMEOUT_MS).toBeLessThanOrEqual(60_000);
});
