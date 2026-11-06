/** Serial view requests: a saved edit stays pending until its rendered view commits. */
export class PreviewRefreshCancelled extends Error {
  constructor() { super("Preview context changed"); this.name = "PreviewRefreshCancelled"; }
}

type Pending = { id: string; resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };

export class PreviewRefresh {
  private serial = 0;
  private generation = 0;
  private tail: Promise<unknown> = Promise.resolve();
  private pending: Pending | null = null;
  private disposed = false;
  private readonly send: (requestId: string) => void;
  private readonly timeoutMs: number;

  constructor(send: (requestId: string) => void, timeoutMs = 30_000) { this.send = send; this.timeoutMs = timeoutMs; }

  refresh(): Promise<void> {
    if (this.disposed) return Promise.reject(new PreviewRefreshCancelled());
    const generation = this.generation;
    const task = this.tail.then(() => new Promise<void>((resolve, reject) => {
      if (this.disposed || generation !== this.generation) { reject(new PreviewRefreshCancelled()); return; }
      const id = `view-${generation}-${++this.serial}`;
      const timer = setTimeout(() => {
        if (this.pending?.id !== id) return;
        this.pending = null;
        reject(new Error("Preview view update timed out"));
      }, this.timeoutMs);
      this.pending = { id, resolve, reject, timer };
      try { this.send(id); }
      catch (error) {
        clearTimeout(timer); this.pending = null;
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    }));
    this.tail = task.catch(() => {});
    return task;
  }

  acknowledge(requestId: string): boolean {
    const pending = this.pending;
    if (!pending || pending.id !== requestId) return false;
    clearTimeout(pending.timer); this.pending = null; pending.resolve();
    return true;
  }

  reset() {
    this.generation++;
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(new PreviewRefreshCancelled());
      this.pending = null;
    }
    this.tail = Promise.resolve();
  }

  dispose() { this.disposed = true; this.reset(); }
  activate() { this.disposed = false; }
}
