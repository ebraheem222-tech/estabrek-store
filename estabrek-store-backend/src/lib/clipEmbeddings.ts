type ClipEmbedResult =
  | { ok: true; embedding: number[]; model: string }
  | { ok: false; error: string };

type ClipRuntime = {
  model: string;
  pipe: (input: any, options?: any) => Promise<any>;
  RawImage: { fromBuffer: (buf: any) => Promise<any> };
};

let runtimePromise: Promise<ClipRuntime> | null = null;

async function getRuntime(): Promise<ClipRuntime> {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const mod = await import("@xenova/transformers");
      const model = process.env.LOCAL_CLIP_MODEL || "Xenova/clip-vit-base-patch32";

      if ((mod as any).env) {
        (mod as any).env.allowRemoteModels = true;
        (mod as any).env.allowLocalModels = true;
        if (process.env.TRANSFORMERS_CACHE) {
          (mod as any).env.cacheDir = process.env.TRANSFORMERS_CACHE;
        }
      }

      const pipe = await (mod as any).pipeline("image-feature-extraction", model, {
        quantized: true,
      });

      return {
        model,
        pipe,
        RawImage: (mod as any).RawImage,
      };
    })();
  }
  return runtimePromise as Promise<ClipRuntime>;
}

export async function clipEmbedImage(buffer: Buffer): Promise<ClipEmbedResult> {
  try {
    if (!buffer?.length) return { ok: false, error: "CLIP_EMPTY_BUFFER" };
    const runtime = await getRuntime();
    const image = await runtime.RawImage.fromBuffer(buffer as any);
    const output = await runtime.pipe(image, { pooling: "mean", normalize: true });
    const raw = output?.data ?? output;
    const arr = Array.from(raw as ArrayLike<number>).map((v) => Number(v));
    if (!arr.length || arr.some((v) => !Number.isFinite(v))) {
      return { ok: false, error: "CLIP_EMBED_INVALID" };
    }
    return { ok: true, embedding: arr, model: runtime.model };
  } catch (e: any) {
    return { ok: false, error: e?.message ? String(e.message) : "CLIP_EMBED_FAILED" };
  }
}
