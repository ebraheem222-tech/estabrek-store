/**
 * Hands a photo from the image search to «اطلبي قطعتكِ» (/request?from=image)
 * without uploading it twice: it stays in this tab's memory only.
 */
let photo: File | null = null;

export function handOverPhoto(file: File | null) {
  photo = file;
}

/** Takes the photo (once). */
export function takeHandedPhoto() {
  const p = photo;
  photo = null;
  return p;
}

/** Phone photos are big: send at most 1600 px (JPEG). Anything the browser can't read goes as it is. */
export async function shrinkPhoto(file: File, max = 1600): Promise<File> {
  try {
    if (typeof createImageBitmap !== "function") return file;
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) { bmp.close?.(); return file; }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.86));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}
