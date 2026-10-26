// src/components/catalog/ItemImagesManager.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Skeleton } from "../ui/Spinner";
import { AsyncImage } from "../ui/AsyncImage";
import { uploadImages } from "../../api/uploads.api";
import { MediaLibraryModal } from "../media/MediaLibraryModal";
import { extractPaletteFromFile, extractPaletteFromUrl } from "../../lib/colorDetect";
import { compressImage } from "../../lib/imageCompress";
import { isEyeDropperSupported, pickScreenColor } from "../../lib/eyeDropper";
import { toast } from "@/lib/toast";
import { tr } from "@/lib/words";
import { CutoutEditor } from "../media/CutoutEditor";
import { CutoutBatch } from "../media/CutoutBatch";
import type { MediaImage } from "../../api/uploads.api";
import { placeCutout } from "../media/cutoutPlace";

export type LocalImage = {
  id?: string; // موجودة إذا جاية من DB
  localId: string; // دايمًا موجودة للـReact keys
  url: string;
  alt?: string | null;
  position: number;
  isPrimary: boolean;
  view?: string | null;
};

function isModelUrl(url?: string | null) {
  const raw = String(url ?? "").trim().toLowerCase();
  if (!raw) return false;
  const clean = raw.split("?")[0].split("#")[0];
  return clean.endsWith(".glb") || clean.endsWith(".gltf");
}

function normalizePositions(images: LocalImage[]) {
  const sorted = images
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return sorted.map((im, idx) => ({ ...im, position: idx + 1 }));
}

type Props = {
  images: LocalImage[];
  onChange: (next: LocalImage[]) => void;
  pushDeleteId?: (id: string) => void;
  // يرجع palette مقترحة من أول صورة مرفوعة (dominant colors)
  onDetectedColors?: (colors: string[]) => void;
  // ColorZilla-like: pick color from screen and apply on item (الأب هو اللي يغير اللون)
  onPickColor?: (hex: string) => void;
};

export default function ItemImagesManager({ images, onChange, pushDeleteId, onDetectedColors, onPickColor }: Props) {
  const [busy, setBusy] = useState(false);
  const [paletteBusy, setPaletteBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [modelUrl, setModelUrl] = useState("");
  const [cameraReview, setCameraReview] = useState<{ file: File; url: string } | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const sorted = useMemo(() => normalizePositions(images ?? []), [images]);

  // «شيل الخلفية»: the cut-out goes next to its photo, or takes its place (the original stays in the library).
  const [cutoutOf, setCutoutOf] = useState<LocalImage | null>(null);
  const [cutoutAll, setCutoutAll] = useState(false);
  const latest = useRef(sorted);
  latest.current = sorted;
  const photos = sorted.filter((im) => !isModelUrl(im.url));
  const cutoutTarget = useMemo(() => (cutoutOf ? { url: cutoutOf.url, folder: "products" } : null), [cutoutOf]);
  const addCutout = (sourceLocalId: string, picture: MediaImage, replace: boolean) => {
    const { next, removedId } = placeCutout(latest.current, sourceLocalId, picture.url, replace, `cut_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`);
    if (next === latest.current) return;
    if (removedId) pushDeleteId?.(removedId);
    latest.current = next;
    onChange(next);
  };

  useEffect(() => {
    return () => {
      if (cameraReview?.url) URL.revokeObjectURL(cameraReview.url);
    };
  }, [cameraReview?.url]);

  const setPrimary = (localId: string) => {
    const next = sorted.map((im) => ({ ...im, isPrimary: im.localId === localId }));
    onChange(next);
    toast.success(tr("تم تعيين الصورة الرئيسية", "Main photo set"));
  };

  const addFromLibrary = (urls: string[]) => {
    if (!urls.length) return;

    const existing = new Set(sorted.map((x) => x.url));
    const fresh = urls.filter((u) => !!u && !existing.has(u));
    if (!fresh.length) {
      toast.info(tr("كل الصور المختارة موجودة بالفعل", "All the chosen photos are already there"));
      return;
    }

    const added: LocalImage[] = fresh.map((u, idx) => ({
      localId: `lib_${Date.now()}_${idx}`,
      url: u,
      alt: null,
      position: 0,
      isPrimary: false,
      view: null,
    }));

    let next = normalizePositions([...sorted, ...added]);
    if (!next.some((x) => x.isPrimary) && next.length) next[0].isPrimary = true;
    onChange(next);
    toast.success(tr(`تم إضافة ${added.length} صورة من المكتبة`, "Added {0} photos from the library", [added.length]));
  };

  const move = (localId: string, dir: "UP" | "DOWN") => {
    const idx = sorted.findIndex((x) => x.localId === localId);
    if (idx < 0) return;

    const swapWith = dir === "UP" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= sorted.length) return;

    const arr = sorted.slice();
    const tmp = arr[idx];
    arr[idx] = arr[swapWith];
    arr[swapWith] = tmp;

    onChange(normalizePositions(arr));
  };

  const remove = (localId: string) => {
    const target = sorted.find((x) => x.localId === localId);
    if (target?.id) pushDeleteId?.(target.id);

    const next = normalizePositions(sorted.filter((x) => x.localId !== localId));

    if (!next.some((x) => x.isPrimary) && next.length) {
      next[0].isPrimary = true;
    }

    onChange(next);
  };

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;

    setBusy(true);
    try {
      // ضغط/تصغير قبل الرفع (سريع + أوفر)
      const compressed = await Promise.all(
        files.map(async (f) => {
          try {
            return await compressImage(f, { maxW: 1800, maxH: 1800, quality: 0.86, mime: "image/jpeg" });
          } catch {
            return f;
          }
        })
      );

      // Detect palette من أول ملف قبل الرفع (بدون مشاكل CORS)
      try {
        const palette = await extractPaletteFromFile(compressed[0], 6, 72);
        if (palette?.length) onDetectedColors?.(palette);
      } catch {
        // ignore
      }

      const res = await uploadImages(compressed);

      const uploaded: LocalImage[] = (res.files ?? []).map((f, idx) => ({
        localId: `tmp_${Date.now()}_${idx}`,
        url: f.url,
        alt: null,
        position: 0,
        isPrimary: false,
        view: sorted.length === 0 && idx === 0 ? "Front" : null,
      }));

      let next = normalizePositions([...sorted, ...uploaded]);
      if (!next.some((x) => x.isPrimary) && next.length) next[0].isPrimary = true;

      onChange(next);
      toast.success(tr(`تم رفع ${uploaded.length} صورة`, "Uploaded {0} photos", [uploaded.length]));
    } catch (e: any) {
      toast.error(e?.message ?? tr("فشل رفع الصور", "The photos didn't upload"));
    } finally {
      setBusy(false);
    }
  };

  const onUploadFiles = async (files: FileList | null) => {
    await uploadFiles(Array.from(files ?? []));
  };

  const onCameraFile = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (cameraReview?.url) URL.revokeObjectURL(cameraReview.url);
    setCameraReview({ file, url: URL.createObjectURL(file) });
  };

  const discardCameraShot = () => {
    if (cameraReview?.url) URL.revokeObjectURL(cameraReview.url);
    setCameraReview(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const acceptCameraShot = async () => {
    const shot = cameraReview;
    if (!shot) return;
    setCameraReview(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    try {
      await uploadFiles([shot.file]);
    } finally {
      URL.revokeObjectURL(shot.url);
    }
  };

  const addModelUrl = () => {
    const raw = modelUrl.trim();
    if (!raw) return;
    try {
      const url = new URL(raw);
      if (!isModelUrl(url.toString())) {
        toast.error(tr("رابط نموذج 3D يجب أن ينتهي بـ .glb أو .gltf", "A 3D model link has to end with .glb or .gltf"));
        return;
      }
      const next = normalizePositions([
        ...sorted,
        {
          localId: `model_${Date.now()}`,
          url: url.toString(),
          alt: null,
          position: 0,
          isPrimary: false,
          view: "3d",
        },
      ]);
      onChange(next);
      setModelUrl("");
      toast.success(tr("تم إضافة نموذج 3D", "3D model added"));
    } catch {
      toast.error(tr("رابط غير صالح", "The link isn't valid"));
    }
  };

  const updateAlt = (localId: string, alt: string) => {
    const next = sorted.map((im) => (im.localId === localId ? { ...im, alt } : im));
    onChange(next);
  };

  const updateView = (localId: string, view: string | null) => {
    const nextView = view?.trim() ?? "";
    const target = sorted.find((im) => im.localId === localId);
    if (nextView.toLowerCase() === "3d" && !isModelUrl(target?.url)) {
      toast.error(tr("اختيار 3D يتطلب رابط .glb أو .gltf", "Choosing 3D needs a .glb or .gltf link"));
      return;
    }
    const next = sorted.map((im) =>
      im.localId === localId ? { ...im, view: nextView || null } : im
    );
    onChange(next);
  };

  const analyzeColorsFromPrimary = async () => {
    if (!onDetectedColors) return;
    const primary = sorted.find((x) => x.isPrimary) ?? sorted[0];
    if (!primary?.url) return;

    setPaletteBusy(true);
    try {
      const palette = await extractPaletteFromUrl(primary.url, 6, 72);
      if (palette?.length) {
        onDetectedColors(palette);
        toast.success(tr("تم استخراج ألوان مقترحة", "Suggested colours found"));
      } else {
        toast.info(tr("ما قدرنا نستخرج ألوان واضحة من الصورة", "We couldn't find clear colours in the photo"));
      }
    } catch (e: any) {
      toast.error(e?.message ?? tr("فشل تحليل الألوان", "Colour analysis failed"));
    } finally {
      setPaletteBusy(false);
    }
  };

  const pickColor = async () => {
    if (!onPickColor) return;
    if (!isEyeDropperSupported()) {
      toast.info(tr("القطّارة غير مدعومة على هذا المتصفح", "The colour picker isn't supported on this browser"));
      return;
    }

    try {
      const hex = await pickScreenColor();
      if (hex) onPickColor(hex);
    } catch {
      // ignore (user cancelled)
    }
  };

  const onDropReorder = (targetLocalId: string) => {
    if (!dragId || dragId === targetLocalId) return;
    const fromIdx = sorted.findIndex((x) => x.localId === dragId);
    const toIdx = sorted.findIndex((x) => x.localId === targetLocalId);
    if (fromIdx < 0 || toIdx < 0) return;

    const arr = sorted.slice();
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    setDragId(null);
    onChange(normalizePositions(arr));
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{tr("الصور", "photos")}</div>
          <div className="text-xs opacity-70">{tr("رفع + ترتيب + صورة رئيسية • الكشف التلقائي للألوان ممكن يخطأ، والقطّارة بتأكّد", "Upload + order + main photo • automatic colour detection can be wrong; use the colour picker to confirm")}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onPickColor ? (
            <Button variant="ghost" onClick={pickColor} disabled={!isEyeDropperSupported()} title={isEyeDropperSupported() ? tr("قطّارة (ColorZilla)", "Colour picker (ColorZilla)") : tr("المتصفح لا يدعم EyeDropper", "The browser doesn't support EyeDropper")}>
              {tr("🎨 قطّارة", "🎨 Picker")}
            </Button>
          ) : null}

          {onDetectedColors ? (
            <Button variant="ghost" onClick={analyzeColorsFromPrimary} disabled={paletteBusy || sorted.length === 0}>
              {paletteBusy ? tr("تحليل...", "Analysing...") : tr("تحليل الألوان", "Analyse colours")}
            </Button>
          ) : null}

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
            <input
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={(e) => onUploadFiles(e.target.files)}
            />
            {busy ? tr("جاري الرفع...", "Uploading...") : tr("رفع صور", "Upload photos")}
          </label>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
            <input
              ref={cameraInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              capture="environment"
              onChange={(e) => onCameraFile(e.target.files)}
            />
            {tr("تصوير بالكاميرا", "Take a photo")}
          </label>

          <Button variant="secondary" onClick={() => setLibraryOpen(true)} disabled={busy}>
            {tr("اختيار من المكتبة", "Choose from the library")}
          </Button>

          {photos.length ? (
            <Button variant="ghost" onClick={() => setCutoutAll(true)} disabled={busy} data-testid="photos-cutout-all">
              {tr("✂ شيل الخلفية عن كل الصور", "✂ Remove the background from all photos")}
            </Button>
          ) : null}
        </div>
      </div>

      <CutoutEditor
        open={!!cutoutOf}
        target={cutoutTarget}
        canReplace
        onClose={() => setCutoutOf(null)}
        onSaved={(picture, how) => cutoutOf && addCutout(cutoutOf.localId, picture, how.replace)}
      />
      <CutoutBatch
        open={cutoutAll}
        targets={photos.map((im) => ({ key: im.localId, url: im.url, folder: "products" }))}
        canReplace
        onClose={() => setCutoutAll(false)}
        onSaved={(key, picture, how) => addCutout(key, picture, how.replace)}
      />

      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          label={tr("رابط نموذج 3D (glb/gltf)", "3D model link (glb/gltf)")}
          value={modelUrl}
          onChange={(e) => setModelUrl(e.target.value)}
          placeholder="https://example.com/model.glb"
        />
        <div className="flex items-end">
          <Button variant="secondary" onClick={addModelUrl} disabled={!modelUrl.trim()}>
            {tr("إضافة 3D", "Add 3D")}
          </Button>
        </div>
      </div>

      <MediaLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        multiple
        title={tr("اختيار صور من المكتبة", "Choose photos from the library")}
        onSelectMultiple={(urls) => addFromLibrary(urls)}
      />

      <Modal
        open={!!cameraReview}
        title={tr("مراجعة الصورة", "Review the photo")}
        onClose={discardCameraShot}
        widthClassName="max-w-2xl"
        footer={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={discardCameraShot} disabled={busy}>
              {tr("تجاهل", "Discard")}
            </Button>
            <Button variant="secondary" onClick={() => cameraInputRef.current?.click()} disabled={busy}>
              {tr("إعادة التصوير", "Retake")}
            </Button>
            <Button variant="primary" onClick={acceptCameraShot} isLoading={busy}>
              {tr("استخدام الصورة", "Use the photo")}
            </Button>
          </div>
        }
      >
        {cameraReview ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <img src={cameraReview.url} alt="Camera preview" className="max-h-[62vh] w-full object-contain" />
            </div>
            <div className="text-xs opacity-70">{tr("بعد التأكيد سيتم رفع الصورة وتحليل اللون تلقائيًا.", "After confirming, the photo is uploaded and its colour analysed automatically.")}</div>
          </div>
        ) : null}
      </Modal>

      {sorted.length === 0 ? (
        busy ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex gap-3">
                  <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm opacity-70">{tr("لا توجد صور بعد.", "No photos yet.")}</div>
        )
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sorted.map((im) => (
            <div
              key={im.localId}
              className="rounded-2xl border border-white/10 bg-black/20 p-3"
              draggable
              onDragStart={() => setDragId(im.localId)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropReorder(im.localId)}
              title={tr("السحب بيغيّر الترتيب", "Drag to reorder")}
            >
              <div className="flex gap-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                  <AsyncImage
                    src={im.url}
                    alt={im.alt ?? ""}
                    wrapperClassName="h-full w-full"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex-1">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-xs opacity-70">
                      {tr("ترتيب:", "Order:")} {im.position} {im.isPrimary ? tr("• (رئيسية)", "• (main)") : ""}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" onClick={() => move(im.localId, "UP")}>↑</Button>
                      <Button variant="ghost" onClick={() => move(im.localId, "DOWN")}>↓</Button>
                      <Button variant="secondary" onClick={() => setPrimary(im.localId)}>{tr("تعيينها رئيسية", "Make it main")}</Button>
                      {!isModelUrl(im.url) ? (
                        <Button variant="ghost" onClick={() => setCutoutOf(im)} title={tr("شيل الخلفية", "Remove background")} data-testid="photo-cutout">
                          {tr("✂ شيل الخلفية", "✂ Remove background")}
                        </Button>
                      ) : null}
                      <Button variant="danger" onClick={() => remove(im.localId)}>{tr("حذف", "Delete")}</Button>
                    </div>
                  </div>

                  <Input
                    label={tr("Alt (اختياري)", "Alt (optional)")}
                    value={im.alt ?? ""}
                    onChange={(e) => updateAlt(im.localId, e.target.value)}
                  />

                  <div className="mt-2">
                    <label className="mb-1 block text-xs opacity-70">{tr("نوع الصورة", "Photo type")}</label>
                    <select
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm outline-none"
                      value={im.view ?? ""}
                      onChange={(e) => updateView(im.localId, e.target.value || null)}
                    >
                      <option value="">{tr("عادي", "Normal")}</option>
                      <option value="360">360°</option>
                      <option value="3d">3D</option>
                      <option value="Front">{tr("أمام", "Front")}</option>
                      <option value="Back">{tr("خلف", "Back")}</option>
                      <option value="Side">{tr("جانب", "Side")}</option>
                      <option value="Detail">{tr("تفاصيل", "Detail")}</option>
                    </select>
                  </div>

                  <div className="mt-2 text-xs opacity-60 break-all" dir="ltr">
                    {im.url}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
