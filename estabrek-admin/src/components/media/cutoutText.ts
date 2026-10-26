// Words for «شيل الخلفية» (CutoutEditor, CutoutBatch): why it didn't work, and what it's doing.
import { useQuery } from "@tanstack/react-query";
import { getCloudCutoutStatus } from "../../api/uploads.api";
import { BgRemoveError, megabytes, type BrowserPlan } from "../../lib/bgEngine";
import type { BgProgress } from "../../lib/bgRemove";
import { tr } from "@/lib/words";

/** Is Cloudinary switched on for this, and does the store have it? (null while unknown) */
export function useCloudCutout() {
  const q = useQuery({ queryKey: ["media", "cutout"], queryFn: getCloudCutoutStatus, staleTime: 60_000, retry: false });
  return q.data ?? null;
}

export function cutoutErrorText(e: unknown): string {
  if (!(e instanceof BgRemoveError)) return tr("ما زبط شيل الخلفية", "Removing the background didn't work");
  switch (e.serverCode ?? e.code) {
    case "NO_WORKER":
      return tr("هالمتصفح ما بيقدر يشغّل أداة القص — بتشتغل على Chrome أو Edge أو Safari حديث.", "This browser can't run the cut-out tool — it works on a recent Chrome, Edge or Safari.");
    case "IMAGE_LOAD":
      return tr("ما قدرنا نفتح الصورة.", "We couldn't open the picture.");
    case "MODEL_DOWNLOAD":
      return tr("ما نزل نموذج القص — في مشكلة بالإنترنت؟", "The cut-out model didn't download — is the internet working?");
    case "MODEL_CHECK":
      return tr("الملف اللي نزل مش هو نموذج القص المتوقع، فما انستعمل.", "The downloaded file wasn't the expected cut-out model, so it wasn't used.");
    case "ABORTED":
      return tr("انلغى.", "Cancelled.");
    case "CLOUD_OFF":
    case "CLOUD_CUTOUT_OFF":
      return tr("Cloudinary مش مفعّل لشيل الخلفية — بيتفعّل من الوسائط ← إعدادات الرفع.", "Cloudinary isn't switched on for removing backgrounds — it's in Media → Upload settings.");
    case "CLOUD_NOT_READY":
    case "CLOUDINARY_NOT_CONFIGURED":
      return tr("المتجر ما عنده حساب Cloudinary.", "The store has no Cloudinary account.");
    case "CLOUD_NEEDS_URL":
    case "NOT_ON_CLOUDINARY":
      return tr("هالصورة مش محفوظة على Cloudinary تبع المتجر — المحرّك المجاني بيقدر يشيل خلفيتها.", "This picture isn't stored on the store's Cloudinary — the free engine can remove its background.");
    case "CLOUD_CUTOUT_NOT_ENABLED":
      return tr(
        "حساب Cloudinary تبع المتجر ما بيسمح بشيل الخلفية (لازم تتفعّل بالحساب أو بالباقة). المحرّك المجاني شغّال.",
        "The store's Cloudinary account doesn't allow background removal (it has to be enabled on the account or plan). The free engine works.",
      );
    case "CLOUD_CUTOUT_QUOTA":
      return tr("خلصت باقة Cloudinary لهالفترة.", "The Cloudinary plan has run out for now.");
    case "CLOUD_CUTOUT_TIMEOUT":
      return tr("Cloudinary لسا شغّال عليها — بعد دقيقة بتكون جاهزة.", "Cloudinary is still working on it — it'll be ready in a minute.");
    case "NOT_FOUND_ON_CLOUDINARY":
      return tr("الصورة مش موجودة على Cloudinary.", "The picture isn't on Cloudinary.");
    case "CLOUD_FAILED":
    case "CLOUD_CUTOUT_FAILED":
      return tr("ما زبط مع Cloudinary", "It didn't work with Cloudinary") + (e.message && e.message !== e.code ? `: ${e.message}` : "");
    default:
      return tr("ما زبط القص على هالجهاز.", "The cut-out didn't work on this device.");
  }
}

export function progressText(p: BgProgress | null): string {
  if (!p) return tr("شيل الخلفية…", "Removing the background…");
  if (p.phase === "download") {
    return tr(`تنزيل نموذج القص (أول مرة بس): ${megabytes(p.loaded ?? 0)} من ${megabytes(p.total ?? 0)}`, "Downloading the cut-out model (first time only): {0} of {1}", [megabytes(p.loaded ?? 0), megabytes(p.total ?? 0)]);
  }
  if (p.phase === "prepare") return tr("تجهيز النموذج…", "Preparing the model…");
  if (p.phase === "cloud") return tr("Cloudinary عم يشيل الخلفية… (لحد دقيقة أول مرة)", "Cloudinary is removing the background… (up to a minute the first time)");
  return tr("شيل الخلفية…", "Removing the background…");
}

/** What the free engine will do on this device. */
export function planText(plan: BrowserPlan | null): string {
  if (!plan) return "";
  return plan.backend === "webgpu"
    ? tr("على هالجهاز بكرت الشاشة (WebGPU): أحسن جودة", "On this device with the graphics card (WebGPU): best quality")
    : tr("على هالجهاز بدون WebGPU: أبطأ، والحواف أنعم شوي", "On this device without WebGPU: slower, with slightly softer edges");
}

/** The note before the model's first download. */
export function firstDownloadText(plan: BrowserPlan): string {
  return tr(
    `أول مرة: بينزل نموذج القص (${megabytes(plan.model.bytes)}) من Hugging Face وبينحفظ على هالجهاز. بعدها بيشتغل بدون تنزيل، وما في صور بتطلع من الجهاز.`,
    "First time: the cut-out model ({0}) downloads from Hugging Face and is kept on this device. After that it runs without downloading, and no picture leaves the device.",
    [megabytes(plan.model.bytes)],
  );
}
