/**
 * A model's own 3D file (.glb) in the scene editor: upload one (straight to Cloudinary, or
 * to the server without it; the server keeps only real binary glTF 2.0 files), pick one
 * uploaded before, or go back to the theme's built-in model. The shop's frame says what
 * the file holds (its animations, or why it couldn't be opened), so its animation can be
 * picked here.
 */
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "../../api/http";
import { listModels, uploadModel } from "../../api/models3d.api";
import { tr } from "../../lib/words";
import type { StageGlb } from "../../studio/storeThemes";

/** What the frame said about a file: its animations, or why it failed. */
export type GlbInfo = { url: string; clips: string[]; error?: string };

const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-30";
const field = "w-full rounded-md border border-white/[0.1] bg-surface-925 px-1.5 py-1 text-xs text-white";
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function ModelFile({ glb, info, onChange }: { glb?: StageGlb; info?: GlbInfo; onChange: (glb: StageGlb | undefined) => void }) {
  const qc = useQueryClient();
  const library = useQuery({ queryKey: ["models3d"], queryFn: listModels, staleTime: 60_000 });
  const items = Array.isArray(library.data?.items) ? library.data!.items : [];
  const input = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<{ progress: number; error?: string } | null>(null);
  const known = info && glb && info.url === glb.url ? info : undefined;

  const send = async (file: File) => {
    if (!/\.glb$/i.test(file.name)) return setUpload({ progress: 0, error: tr("الملف لازم يكون ‎.glb", "The file must be a .glb") });
    const max = library.data?.maxBytes;
    if (max && file.size > max) return setUpload({ progress: 0, error: tr(`الملف أكبر من ${mb(max)}`, "The file is bigger than {0}", [mb(max)]) });
    setUpload({ progress: 0 });
    try {
      const m = await uploadModel(file, { onProgress: (progress) => setUpload({ progress }) });
      onChange({ url: m.url, name: m.displayName || file.name });
      void qc.invalidateQueries({ queryKey: ["models3d"] });
      setUpload(null);
    } catch (e) {
      setUpload({ progress: 0, error: getApiErrorMessage(e) });
    }
  };

  return (
    <div className="space-y-2" data-testid="scene-glb">
      <p className="text-[11px] leading-5 text-white/50">
        {glb ? (
          <>
            {tr("الموديل من ملفك:", "Drawn from your file:")} <span className="font-medium text-white/80" dir="auto">{glb.name || glb.url.split("/").pop()}</span>
          </>
        ) : (
          tr("الموديل مبني بالكود (موديل الثيم). بتقدر تحط مكانه ملف GLB خاص فيك.", "A built-in model (drawn in code). You can put your own GLB file in its place.")
        )}
      </p>
      <div className="flex flex-wrap gap-1">
        <button type="button" className={btn} disabled={Boolean(upload && !upload.error)} onClick={() => input.current?.click()} data-testid="scene-glb-upload">
          {tr("ارفع ملف GLB", "Upload a GLB file")}
        </button>
        {glb ? (
          <button type="button" className={btn} onClick={() => onChange(undefined)} data-testid="scene-glb-remove">
            {tr("رجوع للموديل المبني", "Back to the built-in model")}
          </button>
        ) : null}
        <input
          ref={input}
          type="file"
          accept=".glb,model/gltf-binary"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void send(f);
          }}
          data-testid="scene-glb-file"
        />
      </div>
      {upload ? (
        upload.error ? (
          <p className="text-[11px] text-red-300" role="alert">
            {upload.error}
          </p>
        ) : (
          <div className="h-1.5 overflow-hidden rounded bg-white/[0.08]" aria-label={tr("عم يرفع…", "Uploading…")}>
            <div className="h-full bg-accent-500 transition-[width]" style={{ width: `${Math.round(upload.progress * 100)}%` }} />
          </div>
        )
      ) : null}
      {items.length ? (
        <select
          className={field}
          value={items.some((m) => m.url === glb?.url) ? glb!.url : ""}
          onChange={(e) => {
            const m = items.find((x) => x.url === e.target.value);
            if (m) onChange({ url: m.url, name: m.displayName || undefined });
          }}
          aria-label={tr("من الملفات المرفوعة", "From uploaded files")}
          data-testid="scene-glb-library"
        >
          <option value="">{tr("من الملفات المرفوعة…", "From uploaded files…")}</option>
          {items.map((m) => (
            <option key={m.id} value={m.url}>
              {m.displayName || m.url.split("/").pop()} · {mb(m.size)}
            </option>
          ))}
        </select>
      ) : null}
      {glb ? (
        known?.error ? (
          <p className="text-[11px] leading-5 text-red-300" role="alert" data-testid="scene-glb-error">
            {tr("ما قدر المتجر يفتح الملف، فبيبيّن موديل الثيم مكانه.", "The store couldn't open the file, so the built-in model shows instead.")} ({known.error})
          </p>
        ) : known ? (
          known.clips.length ? (
            <label className="grid gap-1 text-[11px] text-white/60">
              {tr("حركة الملف", "The file's animation")}
              <select className={field} value={glb.clip ?? ""} onChange={(e) => onChange({ ...glb, clip: e.target.value || undefined })} data-testid="scene-glb-clip">
                <option value="">{tr("بدون", "None")}</option>
                {known.clips.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-[11px] text-white/40">{tr("الملف ما فيه حركات.", "The file has no animations.")}</p>
          )
        ) : (
          <p className="text-[11px] text-white/40">{tr("المعاينة عم تفتح الملف…", "The preview is opening the file…")}</p>
        )
      ) : null}
    </div>
  );
}
