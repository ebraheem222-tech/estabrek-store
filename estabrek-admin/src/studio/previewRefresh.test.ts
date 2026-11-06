import { afterEach, expect, test, vi } from "vitest";
import { PreviewRefresh, PreviewRefreshCancelled } from "./previewRefresh";

afterEach(() => vi.useRealTimers());
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

test("an update finishes only when the current view acknowledges its request", async () => {
  const send = vi.fn(), queue = new PreviewRefresh(send);
  let complete = false;
  const task = queue.refresh().then(() => { complete = true; });
  await flush();
  expect(send).toHaveBeenCalledOnce(); expect(complete).toBe(false);
  expect(queue.acknowledge("stale")).toBe(false);
  expect(queue.acknowledge(send.mock.calls[0][0])).toBe(true);
  await task; expect(complete).toBe(true);
});

test("consecutive mutations refresh serially so an older response cannot acknowledge a newer edit", async () => {
  const send = vi.fn(), queue = new PreviewRefresh(send);
  const first = queue.refresh(), second = queue.refresh();
  await flush(); expect(send).toHaveBeenCalledTimes(1);
  const old = send.mock.calls[0][0]; queue.acknowledge(old);
  await first; await flush(); expect(send).toHaveBeenCalledTimes(2);
  expect(queue.acknowledge(old)).toBe(false);
  queue.acknowledge(send.mock.calls[1][0]); await second;
});

test("a timeout releases the queue and a retry can update the view", async () => {
  vi.useFakeTimers();
  const send = vi.fn(), queue = new PreviewRefresh(send, 100);
  const failed = queue.refresh().catch(error => error);
  const retry = queue.refresh(); await flush();
  await vi.advanceTimersByTimeAsync(101);
  expect(await failed).toBeInstanceOf(Error); expect(send).toHaveBeenCalledTimes(2);
  queue.acknowledge(send.mock.calls[1][0]); await retry;
});

test("changing frame context cancels active and queued work without cancelling its new context", async () => {
  const send = vi.fn(), queue = new PreviewRefresh(send);
  const first = queue.refresh().catch(error => error), second = queue.refresh().catch(error => error);
  await flush(); const old = send.mock.calls[0][0]; queue.reset();
  const fresh = queue.refresh(); await flush();
  expect(await first).toBeInstanceOf(PreviewRefreshCancelled); expect(await second).toBeInstanceOf(PreviewRefreshCancelled);
  expect(send).toHaveBeenCalledTimes(2); expect(queue.acknowledge(old)).toBe(false);
  queue.acknowledge(send.mock.calls[1][0]); await fresh;
});

test("a failed send does not poison later updates", async () => {
  const send = vi.fn().mockImplementationOnce(() => { throw new Error("Frame unavailable"); });
  const queue = new PreviewRefresh(send);
  await expect(queue.refresh()).rejects.toThrow("Frame unavailable");
  const retry = queue.refresh(); await flush(); queue.acknowledge(send.mock.calls[1][0]); await retry;
});
test("a late save cannot start a refresh on a disposed context; StrictMode can reactivate it", async () => {
  const send=vi.fn(),queue=new PreviewRefresh(send); queue.dispose();
  await expect(queue.refresh()).rejects.toBeInstanceOf(PreviewRefreshCancelled); expect(send).not.toHaveBeenCalled();
  queue.activate(); const fresh=queue.refresh(); await flush(); queue.acknowledge(send.mock.calls[0][0]); await fresh;
});
